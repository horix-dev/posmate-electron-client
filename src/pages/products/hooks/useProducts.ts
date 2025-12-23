import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { productsService, categoriesService, brandsService, unitsService } from '@/api/services'
import { storage } from '@/lib/storage'
import type { LocalProduct, LocalCategory } from '@/lib/db/schema'
import { setCache, getCache, CacheKeys } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { NoDataAvailableError, createAppError } from '@/lib/errors'
import type { Product, Category, Brand, Unit, Stock } from '@/types/api.types'
import type { VariableProductPayload } from '../schemas'

// ============================================
// Types
// ============================================

export interface ProductFilters {
  search: string
  categoryId: string
  brandId: string
  stockStatus: 'all' | 'in' | 'low' | 'out'
}

export interface StockStatus {
  status: 'in' | 'low' | 'out'
  label: string
  variant: 'default' | 'destructive' | 'warning'
}

export interface ProductStats {
  total: number
  inStock: number
  lowStock: number
  outOfStock: number
}

interface UseProductsReturn {
  // Data
  products: Product[]
  categories: Category[]
  brands: Brand[]
  units: Unit[]
  totalStockValue: number

  // Loading & Error States
  isLoading: boolean
  isOffline: boolean
  error: Error | null

  // Filtered data
  filteredProducts: Product[]

  // Stats
  stats: ProductStats

  // Actions
  refetch: () => Promise<void>
  createProduct: (data: FormData | VariableProductPayload, isVariable?: boolean) => Promise<Product>
  updateProduct: (
    id: number,
    data: FormData | VariableProductPayload,
    isVariable?: boolean
  ) => Promise<Product>
  deleteProduct: (id: number) => Promise<void>

  // Local state updates (optimistic)
  addProductToList: (product: Product) => void
  updateProductInList: (product: Product) => void
  removeProductFromList: (id: number) => void
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get stock status for a product
 */
export function getStockStatus(product: Product): StockStatus {
  const totalStock = product.stocks_sum_product_stock ?? product.productStock ?? 0
  const alertQty = product.alert_qty ?? 0

  if (totalStock <= 0) {
    return { status: 'out', label: 'Out of Stock', variant: 'destructive' }
  }
  if (totalStock <= alertQty) {
    return { status: 'low', label: 'Low Stock', variant: 'warning' }
  }
  return { status: 'in', label: 'In Stock', variant: 'default' }
}

/**
 * Get total stock for a product
 */
export function getTotalStock(product: Product): number {
  return product.stocks_sum_product_stock ?? product.productStock ?? 0
}

/**
 * Get sale price for a product
 */
export function getSalePrice(product: Product): number {
  return product.stocks?.[0]?.productSalePrice ?? 0
}

/**
 * Get purchase price for a product
 */
export function getPurchasePrice(product: Product): number {
  return product.stocks?.[0]?.productPurchasePrice ?? product.productPurchasePrice ?? 0
}

const toFiniteNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

const getFormDataNumber = (formData: FormData, key: string): number | undefined => {
  const value = formData.get(key)
  if (value === null) return undefined
  return toFiniteNumber(value)
}

const getFormDataId = (formData: FormData, key: string): number | undefined => {
  const value = formData.get(key)
  if (value === null) return undefined
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const buildStockFromFormData = (productId: number, formData: FormData): Stock => {
  return {
    id: productId,
    product_id: productId,
    productStock: getFormDataNumber(formData, 'productStock') ?? 0,
    productPurchasePrice: getFormDataNumber(formData, 'productPurchasePrice') ?? 0,
    productSalePrice: getFormDataNumber(formData, 'productSalePrice') ?? 0,
  }
}

const hydrateProductForList = (args: {
  product: Product
  categories: Category[]
  brands: Brand[]
  units: Unit[]
  stockOverride?: Stock
  idsOverride?: { category_id?: number; brand_id?: number; unit_id?: number }
}): Product => {
  const { product, categories, brands, units, stockOverride, idsOverride } = args

  const categoryId = idsOverride?.category_id ?? product.category_id
  const brandId = idsOverride?.brand_id ?? product.brand_id
  const unitId = idsOverride?.unit_id ?? product.unit_id

  const category = categoryId ? categories.find((c) => c.id === categoryId) : undefined
  const brand = brandId ? brands.find((b) => b.id === brandId) : undefined
  const unit = unitId ? units.find((u) => u.id === unitId) : undefined

  const stocks =
    product.stocks && product.stocks.length > 0
      ? product.stocks
      : stockOverride
        ? [stockOverride]
        : []

  const computedStockSum =
    product.product_type === 'variable'
      ? (product.variants_total_stock ??
        product.stocks_sum_product_stock ??
        product.productStock ??
        0)
      : (product.stocks_sum_product_stock ??
        (stocks.length > 0
          ? stocks.reduce((sum, s) => sum + (s.productStock ?? 0), 0)
          : undefined) ??
        product.productStock ??
        0)

  return {
    ...product,
    category_id: categoryId,
    brand_id: brandId,
    unit_id: unitId,
    category,
    brand,
    unit,
    stocks,
    stocks_sum_product_stock: computedStockSum,
    productStock: product.productStock ?? computedStockSum,
  }
}

// ============================================
// Default Filter State
// ============================================

export const DEFAULT_FILTERS: ProductFilters = {
  search: '',
  categoryId: '',
  brandId: '',
  stockStatus: 'all',
}

// ============================================
// Hook Implementation
// ============================================

export function useProducts(filters: ProductFilters): UseProductsReturn {
  // State
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [totalStockValue, setTotalStockValue] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load cached data from local storage (SQLite in Electron, IndexedDB otherwise)
  const loadCachedData = useCallback(async (): Promise<boolean> => {
    try {
      // Load categories from storage first (needed for product join)
      const cachedCategories = await storage.categories.getAll()
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories)
      }

      // Load brands/units from localStorage cache (with TTL validation)
      const cachedBrands = getCache<Brand[]>(CacheKeys.PRODUCTS_BRANDS)
      if (cachedBrands && Array.isArray(cachedBrands)) setBrands(cachedBrands)

      const cachedUnits = getCache<Unit[]>(CacheKeys.PRODUCTS_UNITS)
      if (cachedUnits && Array.isArray(cachedUnits)) setUnits(cachedUnits)

      // Create lookup maps for joining
      const categoryMap = new Map(cachedCategories.map((c) => [c.id, c]))
      const brandMap = cachedBrands ? new Map(cachedBrands.map((b) => [b.id, b])) : new Map()
      const unitMap = cachedUnits ? new Map(cachedUnits.map((u) => [u.id, u])) : new Map()

      // Load products from storage
      const cachedProducts = await storage.products.getAll()
      if (cachedProducts.length > 0) {
        const convertedProducts: Product[] = cachedProducts.map((p: LocalProduct) => {
          // Get IDs - SQLite returns camelCase, but type uses snake_case
          const catId = (p as unknown as Record<string, unknown>).categoryId ?? p.category_id
          const brId = (p as unknown as Record<string, unknown>).brandId ?? p.brand_id
          const uId = (p as unknown as Record<string, unknown>).unitId ?? p.unit_id

          const categoryId = typeof catId === 'number' ? catId : undefined
          const brandId = typeof brId === 'number' ? brId : undefined
          const unitId = typeof uId === 'number' ? uId : undefined

          return {
            ...p,
            stocks: p.stock ? [p.stock] : [],
            // Ensure stock values are available at top level for getTotalStock()
            stocks_sum_product_stock: p.stock?.productStock ?? 0,
            productStock: p.stock?.productStock ?? 0,
            // Normalize IDs to snake_case for consistency
            category_id: categoryId,
            brand_id: brandId,
            unit_id: unitId,
            // Join category and brand objects for display
            category: categoryId ? categoryMap.get(categoryId) : undefined,
            brand: brandId ? brandMap.get(brandId) : undefined,
            unit: unitId ? unitMap.get(unitId) : undefined,
          }
        })
        setProducts(convertedProducts)

        // Calculate stock value
        const value = convertedProducts.reduce((sum, p) => {
          const stock = p.stocks_sum_product_stock ?? p.productStock ?? 0
          const price = p.stocks?.[0]?.productPurchasePrice ?? 0
          return sum + stock * price
        }, 0)
        setTotalStockValue(value)
      }

      return cachedProducts.length > 0
    } catch (err) {
      console.warn('[useProducts] Failed to load cached data:', err)
      return false
    }
  }, [])

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // If offline, only load from cache
    if (!navigator.onLine) {
      const hasCached = await loadCachedData()
      if (!hasCached) {
        setError(new NoDataAvailableError('products'))
        toast.error('You are offline. No cached data available.')
      } else {
        toast.info('Working offline with cached data')
      }
      setIsLoading(false)
      return
    }

    try {
      const [productsRes, categoriesRes, brandsRes, unitsRes] = await Promise.all([
        productsService.getAll(),
        categoriesService.getList({ limit: 1000, status: true }),
        brandsService.getList({ limit: 1000, status: true }),
        unitsService.getList({ limit: 1000, status: true }),
      ])

      setProducts(productsRes.data)
      setTotalStockValue(productsRes.total_stock_value)
      setCategories(categoriesRes.data)
      setBrands(brandsRes.data)
      setUnits(unitsRes.data)

      // Cache products to local storage for offline use
      const localProducts: LocalProduct[] = productsRes.data.map((product: Product) => {
        const stock: Stock = product.stocks?.[0] || {
          id: product.id,
          product_id: product.id,
          productStock: product.stocks_sum_product_stock ?? product.productStock ?? 0,
          productPurchasePrice: 0,
          productSalePrice: 0,
        }
        return {
          ...product,
          stock,
          lastSyncedAt: new Date().toISOString(),
        }
      })
      await storage.products.bulkUpsert(localProducts)

      // Cache categories to local storage for offline use
      const localCategories: LocalCategory[] = categoriesRes.data.map((cat: Category) => ({
        ...cat,
        lastSyncedAt: new Date().toISOString(),
      }))
      await storage.categories.bulkUpsert(localCategories)

      // Cache brands/units to localStorage (with TTL)
      setCache(CacheKeys.PRODUCTS_BRANDS, brandsRes.data)
      setCache(CacheKeys.PRODUCTS_UNITS, unitsRes.data)
    } catch (err) {
      console.warn('[useProducts] API fetch failed, trying cached data:', err)

      // Try to load from cache on network error
      const hasCached = await loadCachedData()

      if (hasCached) {
        toast.warning('Network error. Using cached data.')
      } else {
        const appError = createAppError(err, 'Products loading')
        setError(appError)
        toast.error('Failed to load products and no cache available.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [loadCachedData])

  // Use online status hook with callbacks
  const { isOffline } = useOnlineStatus({
    onOnline: () => {
      // Refetch fresh data when coming back online
      fetchData()
    },
  })

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtered products with memoization
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase().trim()
        const matchesName = product.productName.toLowerCase().includes(query)
        const matchesCode = product.productCode?.toLowerCase().includes(query)
        if (!matchesName && !matchesCode) return false
      }

      // Category filter
      if (filters.categoryId && filters.categoryId !== 'all') {
        if (product.category_id?.toString() !== filters.categoryId) return false
      }

      // Brand filter
      if (filters.brandId && filters.brandId !== 'all') {
        if (product.brand_id?.toString() !== filters.brandId) return false
      }

      // Stock filter
      if (filters.stockStatus && filters.stockStatus !== 'all') {
        const status = getStockStatus(product).status
        if (status !== filters.stockStatus) return false
      }

      return true
    })
  }, [products, filters])

  // Calculate stats
  const stats = useMemo<ProductStats>(() => {
    return products.reduce(
      (acc, product) => {
        const status = getStockStatus(product).status
        acc.total += 1
        if (status === 'in') acc.inStock += 1
        else if (status === 'low') acc.lowStock += 1
        else if (status === 'out') acc.outOfStock += 1
        return acc
      },
      { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }
    )
  }, [products])

  // CRUD Operations
  const createProduct = useCallback(
    async (data: FormData | VariableProductPayload, isVariable = false): Promise<Product> => {
      const result = await productsService.create(data, isVariable)
      const idsOverride =
        data instanceof FormData
          ? {
              category_id: getFormDataId(data, 'category_id'),
              brand_id: getFormDataId(data, 'brand_id'),
              unit_id: getFormDataId(data, 'unit_id'),
            }
          : undefined

      const stockOverride =
        !isVariable && data instanceof FormData
          ? buildStockFromFormData(result.data.id, data)
          : undefined

      const hydrated = hydrateProductForList({
        product: result.data,
        categories,
        brands,
        units,
        stockOverride,
        idsOverride,
      })

      setProducts((prev) => [hydrated, ...prev.filter((p) => p.id !== hydrated.id)])

      // Persist to offline cache
      const localProduct: LocalProduct = {
        ...hydrated,
        stock:
          hydrated.stocks?.[0] ||
          ({
            id: hydrated.id,
            product_id: hydrated.id,
            productStock: hydrated.stocks_sum_product_stock ?? hydrated.productStock ?? 0,
            productPurchasePrice: 0,
            productSalePrice: 0,
          } satisfies Stock),
        lastSyncedAt: new Date().toISOString(),
      }
      await storage.products.bulkUpsert([localProduct])

      // Best-effort: fetch full product (includes joined category/brand/stocks on some backends)
      try {
        const full = await productsService.getById(hydrated.id)
        const fullHydrated = hydrateProductForList({
          product: full.data,
          categories,
          brands,
          units,
          stockOverride,
          idsOverride,
        })
        setProducts((prev) => [fullHydrated, ...prev.filter((p) => p.id !== fullHydrated.id)])

        const localFull: LocalProduct = {
          ...fullHydrated,
          stock:
            fullHydrated.stocks?.[0] ||
            ({
              id: fullHydrated.id,
              product_id: fullHydrated.id,
              productStock: fullHydrated.stocks_sum_product_stock ?? fullHydrated.productStock ?? 0,
              productPurchasePrice: 0,
              productSalePrice: 0,
            } satisfies Stock),
          lastSyncedAt: new Date().toISOString(),
        }
        await storage.products.bulkUpsert([localFull])
      } catch {
        // Non-fatal: list hydration already applied
      }

      toast.success('Product created successfully')
      return hydrated
    },
    [brands, categories, units]
  )

  const updateProduct = useCallback(
    async (
      id: number,
      data: FormData | VariableProductPayload,
      isVariable = false
    ): Promise<Product> => {
      const result = await productsService.update(id, data, isVariable)

      const idsOverride =
        data instanceof FormData
          ? {
              category_id: getFormDataId(data, 'category_id'),
              brand_id: getFormDataId(data, 'brand_id'),
              unit_id: getFormDataId(data, 'unit_id'),
            }
          : undefined

      const stockOverride =
        !isVariable && data instanceof FormData ? buildStockFromFormData(id, data) : undefined

      const hydrated = hydrateProductForList({
        product: result.data,
        categories,
        brands,
        units,
        stockOverride,
        idsOverride,
      })

      setProducts((prev) => prev.map((p) => (p.id === id ? hydrated : p)))

      const localProduct: LocalProduct = {
        ...hydrated,
        stock:
          hydrated.stocks?.[0] ||
          ({
            id: hydrated.id,
            product_id: hydrated.id,
            productStock: hydrated.stocks_sum_product_stock ?? hydrated.productStock ?? 0,
            productPurchasePrice: 0,
            productSalePrice: 0,
          } satisfies Stock),
        lastSyncedAt: new Date().toISOString(),
      }
      await storage.products.bulkUpsert([localProduct])

      toast.success('Product updated successfully')
      return hydrated
    },
    [brands, categories, units]
  )

  const deleteProduct = useCallback(async (id: number): Promise<void> => {
    await productsService.delete(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    toast.success('Product deleted successfully')
  }, [])

  // Local state updates (for optimistic updates if needed)
  const addProductToList = useCallback((product: Product) => {
    setProducts((prev) => [product, ...prev])
  }, [])

  const updateProductInList = useCallback((product: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)))
  }, [])

  const removeProductFromList = useCallback((id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return {
    products,
    categories,
    brands,
    units,
    totalStockValue,
    isLoading,
    isOffline,
    error,
    filteredProducts,
    stats,
    refetch: fetchData,
    createProduct,
    updateProduct,
    deleteProduct,
    addProductToList,
    updateProductInList,
    removeProductFromList,
  }
}

export default useProducts
