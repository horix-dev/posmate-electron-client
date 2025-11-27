import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  productsService,
  categoriesService,
  paymentTypesService,
  vatsService,
} from '@/api/services'
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
  const [isProductsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

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
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load POS data')
      setError(error)
      toast.error('Failed to load POS data. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

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
    error,
    refetch: fetchData,
  }
}

export default usePOSData
