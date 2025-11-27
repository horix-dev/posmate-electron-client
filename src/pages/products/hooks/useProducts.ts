import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { productsService, categoriesService, brandsService, unitsService } from '@/api/services'
import type { Product, Category, Brand, Unit } from '@/types/api.types'

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
  error: Error | null

  // Filtered data
  filteredProducts: Product[]

  // Stats
  stats: ProductStats

  // Actions
  refetch: () => Promise<void>
  createProduct: (data: FormData) => Promise<Product>
  updateProduct: (id: number, data: FormData) => Promise<Product>
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

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [productsRes, categoriesRes, brandsRes, unitsRes] = await Promise.all([
        productsService.getAll(),
        categoriesService.getAll(),
        brandsService.getAll(),
        unitsService.getAll(),
      ])

      setProducts(productsRes.data)
      setTotalStockValue(productsRes.total_stock_value)
      setCategories(categoriesRes.data)
      setBrands(brandsRes.data)
      setUnits(unitsRes.data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch products')
      setError(error)
      toast.error('Failed to load products. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

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
  const createProduct = useCallback(async (data: FormData): Promise<Product> => {
    const result = await productsService.create(data)
    setProducts((prev) => [result.data, ...prev])
    toast.success('Product created successfully')
    return result.data
  }, [])

  const updateProduct = useCallback(async (id: number, data: FormData): Promise<Product> => {
    const result = await productsService.update(id, data)
    setProducts((prev) => prev.map((p) => (p.id === id ? result.data : p)))
    toast.success('Product updated successfully')
    return result.data
  }, [])

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
