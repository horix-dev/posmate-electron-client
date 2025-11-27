import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  productsService,
  categoriesService,
  paymentTypesService,
  vatsService,
} from '@/api/services'
import { productRepository } from '@/lib/db/repositories'
import { db } from '@/lib/db/schema'
import { setCache, getCache, CacheKeys } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { NoDataAvailableError, createAppError } from '@/lib/errors'
import type { Product, Category, PaymentType, Vat } from '@/types/api.types'

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

  // Load cached data from IndexedDB and localStorage
  const loadCachedData = useCallback(async (): Promise<boolean> => {
    try {
      // Load products from IndexedDB
      const cachedProducts = await productRepository.getAll()
      if (cachedProducts.length > 0) {
        const convertedProducts: Product[] = cachedProducts.map((p) => ({
          ...p,
          stocks: p.stock ? [p.stock] : [],
        }))
        setProducts(convertedProducts)
      }

      // Load categories from IndexedDB
      const cachedCategories = await db.categories.toArray()
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories)
      }

      // Load payment types and VATs from cache (with TTL validation)
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

  // Fetch all initial data from API
  const fetchData = useCallback(async (showLoadingState = true) => {
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
        productsService.getAll(),
        categoriesService.getAll(),
        paymentTypesService.getAll(),
        vatsService.getAll({ status: 'active' }),
      ])

      setProducts(productsRes.data)
      setCategories(categoriesRes.data)
      setPaymentTypes(paymentTypesRes.data)
      setVats(vatsRes.data)

      // Cache data for offline use (with TTL)
      setCache(CacheKeys.POS_PAYMENT_TYPES, paymentTypesRes.data)
      setCache(CacheKeys.POS_VATS, vatsRes.data)
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
  }, [loadCachedData, products.length])

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
  }, []) // Empty deps - only run on mount

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Only show products with stock
      const hasStock =
        (product.stocks_sum_product_stock ?? product.productStock ?? 0) > 0 ||
        (product.stocks && product.stocks.length > 0)

      if (!hasStock) return false

      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase().trim()
        const matchesName = product.productName.toLowerCase().includes(query)
        const matchesCode = product.productCode?.toLowerCase().includes(query)
        if (!matchesName && !matchesCode) return false
      }

      // Category filter
      if (filters.categoryId) {
        if (product.category_id !== filters.categoryId) return false
      }

      return true
    })
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
