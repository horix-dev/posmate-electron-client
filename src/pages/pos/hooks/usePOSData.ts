import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import {
  productsService,
  categoriesService,
  paymentTypesService,
  vatsService,
} from '@/api/services'
import { storage } from '@/lib/storage'
import type { LocalProduct, LocalCategory } from '@/lib/db/schema'
import { setCache, getCache, CacheKeys } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useIncrementalSync } from '@/hooks/useIncrementalSync'
import { NoDataAvailableError, createAppError } from '@/lib/errors'
import type { Product, Category, PaymentType, Vat, Stock } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface POSFilters {
  search: string
  categoryId: number | null
}

export interface UsePOSDataReturn {
  // Data
  products: Product[]
  categories: Category[]
  paymentTypes: PaymentType[]
  vats: Vat[]

  // Filtered products
  filteredProducts: Product[]

  // Loading & Error
  isLoading: boolean
  isProductsLoading: boolean
  isOffline: boolean
  error: Error | null

  // Actions
  refetch: () => Promise<void>
}

// ============================================
// Default Filters
// ============================================

export const DEFAULT_POS_FILTERS: POSFilters = {
  search: '',
  categoryId: null,
}

// ============================================
// Hook Implementation
// ============================================

export function usePOSData(filters: POSFilters): UsePOSDataReturn {
  // State
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [vats, setVats] = useState<Vat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProductsLoading, setIsProductsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Incremental sync hook
  const { performSync } = useIncrementalSync()

  // Track if combo details have been loaded to prevent redundant fetches
  const comboDetailsLoadedRef = useRef(false)

  // Load cached data from local storage (SQLite in Electron, IndexedDB otherwise)
  const loadCachedData = useCallback(async (): Promise<boolean> => {
    try {
      // Load categories from storage first (needed for product join)
      const cachedCategories = await storage.categories.getAll()
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories)
      }

      // Create category lookup map
      const categoryMap = new Map(cachedCategories.map((c) => [c.id, c]))

      // Load products from storage
      const cachedProducts = await storage.products.getAll()
      if (cachedProducts.length > 0) {
        console.log(`[POS Data] Loaded ${cachedProducts.length} products from cache`)

        const convertedProducts: Product[] = cachedProducts.map((p: LocalProduct) => {
          // Get category ID - SQLite returns camelCase, but type uses snake_case
          const catId = (p as unknown as Record<string, unknown>).categoryId ?? p.category_id
          const categoryId = typeof catId === 'number' ? catId : undefined

          // Preserve stocks array from cache (includes variant_id for variable products)
          const stocks = p.stocks && p.stocks.length > 0 ? p.stocks : p.stock ? [p.stock] : []

          // Debug log for batch products
          const isBatchProduct =
            (p as unknown as Record<string, unknown>).is_batch_tracked || stocks.length > 1
          if (isBatchProduct) {
            console.log(
              `[POS Data] Loaded batch product ${p.id} (${p.productName}) from cache with ${stocks.length} stocks:`,
              stocks
            )
          }

          return {
            ...p,
            stocks, // Use full stocks array, not just [p.stock]
            variants: p.variants || [], // ✅ CRITICAL: Preserve variants array from cache!
            // Ensure stock values are available at top level for UI components
            stocks_sum_product_stock: stocks.reduce((sum, s) => sum + (s.productStock ?? 0), 0),
            productStock: stocks[0]?.productStock ?? 0,
            // Normalize ID to snake_case
            category_id: categoryId,
            // Join category object for display
            category: categoryId ? categoryMap.get(categoryId) : undefined,
          }
        })

        // ✅ Sort by ID descending to match API order (newest first)
        convertedProducts.sort((a, b) => b.id - a.id)

        setProducts(convertedProducts)
      }

      // Load payment types and VATs from localStorage cache (with TTL validation)
      const cachedPaymentTypes = getCache<PaymentType[]>(CacheKeys.POS_PAYMENT_TYPES)
      if (cachedPaymentTypes) {
        setPaymentTypes(cachedPaymentTypes)
      }

      const cachedVats = getCache<Vat[]>(CacheKeys.POS_VATS)
      if (cachedVats) {
        setVats(cachedVats)
      }

      return cachedProducts.length > 0
    } catch (err) {
      console.warn('[usePOSData] Failed to load cached data:', err)
      return false
    }
  }, [])

  // Refresh combo details for combo products (after stock adjustments, etc.)
  const refreshComboDetails = useCallback(async () => {
    try {
      // Get current products to identify combos
      const currentProducts = products
      
      // Filter combos to refresh (all combos, since we want fresh available_combos counts)
      const combosToRefresh = currentProducts.filter((p) => p.product_type === 'combo')

      if (combosToRefresh.length === 0) {
        console.log('[POS] No combos to refresh')
        return
      }

      console.log(
        `[POS] Refreshing combo details for ${combosToRefresh.length} combos`,
        combosToRefresh.map((p) => p.id)
      )

      // Fetch fresh combo details for each combo (getById returns full product with updated combo_details)
      const detailPromises = combosToRefresh.map((combo) =>
        productsService
          .getById(combo.id)
          .then((res) => ({ id: combo.id, data: res.data }))
          .catch((err) => {
            console.warn(`[POS] Failed to fetch combo ${combo.id}:`, err)
            return null
          })
      )
      const detailResults = await Promise.all(detailPromises)

      // Update products with fresh combo details
      setProducts((currentProducts) =>
        currentProducts.map((product) => {
          if (product.product_type !== 'combo') return product

          const detailResult = detailResults.find((r) => r?.id === product.id)

          if (detailResult?.data && detailResult.data.combo_details) {
            console.log(
              `[POS] Loaded combo details for product ${product.id}: ${detailResult.data.combo_details.available_combos} available`
            )
            return {
              ...product,
              combo_details: detailResult.data.combo_details,
              // Keep existing components if not in fresh data
              components: detailResult.data.components || product.components || [],
            }
          }
          return product
        })
      )
    } catch (err) {
      console.warn('[POS] Error refreshing combo details:', err)
    }
  }, [products])

  // Fetch all initial data from API
  const fetchData = useCallback(
    async (showLoadingState = true) => {
      if (showLoadingState) {
        setIsLoading(true)
      } else {
        setIsProductsLoading(true)
      }
      setError(null)

      // If offline, only load from cache
      if (!navigator.onLine) {
        const hasCached = await loadCachedData()
        if (!hasCached) {
          setError(new NoDataAvailableError('POS'))
          toast.error('You are offline. No cached data available.')
        } else {
          toast.info('Working offline with cached data')
        }
        setIsLoading(false)
        setIsProductsLoading(false)
        return
      }

      try {
        const [productsRes, categoriesRes, paymentTypesRes, vatsRes] = await Promise.all([
          productsService.getAll(10000), // Get up to 10,000 products (supports large catalogs)
          categoriesService.getList({ limit: 1000, status: true }), // ✅ Use getList for flat array
          paymentTypesService.getAll(),
          vatsService.getAll({ status: 'active' }),
        ])

        console.log(
          '[POS Data] Loaded categories:',
          categoriesRes.data.map((c) => ({ id: c.id, name: c.categoryName }))
        )
        console.log('[POS Data] Product category IDs:', [
          ...new Set(productsRes.data.map((p) => p.category_id)),
        ])

        // Enrich products with calculated stock fields
        const enrichedProducts = productsRes.data.map((product: Product) => {
          // Ensure stocks array exists
          const stocks = product.stocks && product.stocks.length > 0 ? product.stocks : []
          
          return {
            ...product,
            stocks, // Ensure stocks array is set
            // Calculate total stock across all stocks (needed for display and filtering)
            stocks_sum_product_stock: stocks.reduce((sum, s) => sum + (s.productStock ?? 0), 0),
            // Fallback productStock to first stock or sum
            productStock: product.productStock ?? stocks[0]?.productStock ?? 0,
          }
        })

        setProducts(enrichedProducts)
        setCategories(categoriesRes.data) // ✅ Now flat array, not paginated
        setPaymentTypes(paymentTypesRes.data)
        setVats(vatsRes.data)

        // Cache to storage (non-blocking - don't fail if caching fails)
        try {
          // Cache products to SQLite/IndexedDB for offline use
          const localProducts: LocalProduct[] = productsRes.data.map((product: Product) => {
            const stock: Stock = product.stocks?.[0] || {
              id: product.id,
              product_id: product.id,
              productStock: product.stocks_sum_product_stock ?? product.productStock ?? 0,
              productPurchasePrice: 0,
              productSalePrice: 0,
            }

            // Log batch products for debugging
            const isBatchProduct =
              product.is_batch_tracked || (product.stocks && product.stocks.length > 1)
            if (isBatchProduct) {
              console.log(
                `[POS Data] Preparing to cache batch product ${product.id} (${product.productName}) with ${product.stocks?.length || 0} stocks`
              )
            }

            return {
              ...product,
              stock, // Fallback stock for simple products
              // Preserve full stocks array (includes variant info for variable products)
              stocks: product.stocks || [stock],
              // Preserve variants array for variable products
              variants: product.variants || [],
              lastSyncedAt: new Date().toISOString(),
            }
          })
          await storage.products.bulkUpsert(localProducts)

          // Cache categories to SQLite/IndexedDB for offline use
          const localCategories: LocalCategory[] = categoriesRes.data.map((cat: Category) => ({
            ...cat,
            lastSyncedAt: new Date().toISOString(),
          }))
          await storage.categories.bulkUpsert(localCategories)

          // Cache payment types and VATs to localStorage (with TTL)
          setCache(CacheKeys.POS_PAYMENT_TYPES, paymentTypesRes.data)
          setCache(CacheKeys.POS_VATS, vatsRes.data)
        } catch (cacheError) {
          console.warn('[usePOSData] Failed to cache data, but continuing:', cacheError)
          // Don't throw - caching is optional, we already have the data in state
        }
      } catch (err) {
        console.warn('[usePOSData] API fetch failed, trying cached data:', err)

        // Only load from cache if we don't already have data
        if (products.length === 0) {
          const hasCached = await loadCachedData()

          if (hasCached) {
            toast.warning('Network error. Using cached data.')
          } else {
            const appError = createAppError(err, 'POS data loading')
            setError(appError)
            toast.error('Failed to load POS data and no cache available.')
          }
        } else {
          // Already have data, just show a subtle warning
          toast.warning('Could not refresh data. Using current data.')
        }
      } finally {
        setIsLoading(false)
        setIsProductsLoading(false)
      }
    },
    [loadCachedData, products.length]
  )

  // Use online status hook with callbacks
  const { isOffline } = useOnlineStatus({
    onOnline: () => {
      // Refetch fresh data when coming back online (don't show loading)
      fetchData(false)
    },
  })

  // Initial fetch - load cache first for instant display, then refresh from API
  useEffect(() => {
    const initialize = async () => {
      // First, quickly load cached data for instant UI
      const hasCached = await loadCachedData()

      if (hasCached) {
        // We have cached data, show it immediately
        setIsLoading(false)

        // Fetch combo details if not already loaded
        if (!comboDetailsLoadedRef.current) {
          setTimeout(() => {
            refreshComboDetails()
          }, 100)
        }

        // Then refresh from API in background if online
        if (navigator.onLine) {
          fetchData(false) // false = don't show loading state
        }
      } else {
        // No cache, need to fetch from API
        fetchData(true)
      }
    }

    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run on mount

  // Auto-refresh combo details when products change and combos are missing details
  useEffect(() => {
    if (!comboDetailsLoadedRef.current && products.length > 0) {
      const hasCombosNeedingDetails = products.some(
        (p) => p.product_type === 'combo' && !p.combo_details
      )

      if (hasCombosNeedingDetails) {
        comboDetailsLoadedRef.current = true
        refreshComboDetails()
      }
    }
  }, [products, refreshComboDetails])

  // Poll for fresh data every 30 seconds (Phase 2: Incremental Sync - bandwidth efficient)
  useEffect(() => {
    // Don't poll if offline
    if (!navigator.onLine) return

    // Use incremental sync instead of full fetch (only downloads changes)
    const pollInterval = setInterval(async () => {
      console.log('[POS Polling] Checking for changes via incremental sync...')
      try {
        const hasChanges = await performSync(['products', 'categories'])
        if (hasChanges) {
          // Changes were applied - reload from cache to update UI
          await loadCachedData()
        }
      } catch (error) {
        console.warn('[POS Polling] Incremental sync failed, falling back to full fetch:', error)
        fetchData(false) // Fallback to full fetch
      }
    }, 30 * 1000) // 30 seconds

    return () => clearInterval(pollInterval)
  }, [fetchData, performSync, loadCachedData])

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    console.log('[POS Filter] Total products:', products.length)
    console.log(
      '[POS Filter] Active filter - categoryId:',
      filters.categoryId,
      'search:',
      filters.search
    )

    let debugLogged = false
    const filtered = products.filter((product) => {
      // For combo products, if details are loaded check availability, otherwise show while loading
      if (product.product_type === 'combo') {
        // If combo_details loaded, only show if available_combos > 0
        if (product.combo_details) {
          const hasAvailableCombos = (product.combo_details.available_combos ?? 0) > 0
          if (!hasAvailableCombos) return false
        }
        // If combo_details not loaded yet, show it (will filter once loaded)
      } else {
        // For non-combo products, check regular stock
        const hasStock =
          (product.stocks_sum_product_stock ?? product.productStock ?? 0) > 0 ||
          (product.stocks && product.stocks.length > 0)

        if (!hasStock) return false
      }

      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase().trim()
        const matchesName = product.productName.toLowerCase().includes(query)
        const matchesCode = product.productCode?.toLowerCase().includes(query)
        const matchesBarcode = product.barcode?.toLowerCase().includes(query)

        // Also search in variant barcodes and SKUs for variable products
        const matchesVariant = product.variants?.some((variant) => {
          const matchesSku = variant.sku?.toLowerCase().includes(query)
          const matchesBarcode = variant.barcode?.toLowerCase().includes(query)
          const matchesVariantName = variant.variant_name?.toLowerCase().includes(query)
          return matchesSku || matchesBarcode || matchesVariantName
        })

        if (!matchesName && !matchesCode && !matchesBarcode && !matchesVariant) return false
      }

      // Category filter
      if (filters.categoryId) {
        // Debug: log first product's category_id type and value
        if (!debugLogged) {
          console.log(
            '[POS Filter] Sample product category_id:',
            product.category_id,
            'type:',
            typeof product.category_id
          )
          console.log(
            '[POS Filter] Filter categoryId:',
            filters.categoryId,
            'type:',
            typeof filters.categoryId
          )
          debugLogged = true
        }

        if (product.category_id !== filters.categoryId) return false
      }

      return true
    })

    console.log('[POS Filter] Filtered products count:', filtered.length)
    return filtered
  }, [products, filters])

  return {
    products,
    categories,
    paymentTypes,
    vats,
    filteredProducts,
    isLoading,
    isProductsLoading,
    isOffline,
    error,
    refetch: fetchData,
  }
}

export default usePOSData
