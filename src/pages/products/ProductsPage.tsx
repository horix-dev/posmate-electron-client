import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks'
import { productsService } from '@/api/services'
import type { Product } from '@/types/api.types'

// Local imports
import {
  ProductStatsCards,
  ProductFiltersBar,
  ProductTable,
  ProductDetailsDialog,
  DeleteProductDialog,
} from './components'
import { useProducts, DEFAULT_FILTERS } from './hooks'
import type { ProductFilters } from './hooks'

// ============================================
// Constants
// ============================================

const SEARCH_DEBOUNCE_MS = 300

// ============================================
// ProductsPage Component
// ============================================

export function ProductsPage() {
  const navigate = useNavigate()
  // ============================================
  // Filter State
  // ============================================
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS)

  // Debounce search for performance
  const debouncedSearch = useDebounce(filters.search, SEARCH_DEBOUNCE_MS)

  // Create debounced filters object
  const debouncedFilters = useMemo<ProductFilters>(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  )

  // ============================================
  // Data Fetching Hook
  // ============================================
  const {
    products,
    categories,
    brands,
    totalStockValue,
    isLoading,
    error,
    filteredProducts,
    stats,
    refetch,
    deleteProduct,
  } = useProducts(debouncedFilters)

  // ============================================
  // Dialog State
  // ============================================
  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [deleteProductState, setDeleteProductState] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ============================================
  // Handlers
  // ============================================

  // Open add product dialog
  const handleAdd = useCallback(() => {
    navigate('/products/create')
  }, [navigate])

  // Open view product dialog - fetch full product details
  const handleView = useCallback(async (product: Product) => {
    setIsViewDialogOpen(true)

    try {
      // Fetch full product details including variants
      const response = await productsService.getById(product.id)
      setViewProduct(response.data)
    } catch (error) {
      console.error('Failed to fetch product details:', error)
      // Fall back to the list product data
      setViewProduct(product)
    }
  }, [])

  // Navigate to edit product page
  const handleEdit = useCallback(
    (product: Product) => {
      navigate(`/products/${product.id}/edit`)
    },
    [navigate]
  )

  // Open delete confirmation dialog
  const handleDeleteClick = useCallback((product: Product) => {
    setDeleteProductState(product)
  }, [])

  // Confirm delete
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteProductState) return

    setIsDeleting(true)
    try {
      await deleteProduct(deleteProductState.id)
      setDeleteProductState(null)
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast.error('Failed to delete product. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteProductState, deleteProduct])

  // Cancel delete
  const handleDeleteCancel = useCallback(() => {
    setDeleteProductState(null)
  }, [])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  // Refresh data
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product inventory
            {stats.total > 0 && ` (${stats.total} products)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            aria-label="Refresh products"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Product
          </Button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
        >
          <p className="font-medium">Failed to load products</p>
          <p className="text-sm">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
            Try again
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <ProductStatsCards stats={stats} totalStockValue={totalStockValue} isLoading={isLoading} />

      {/* Filters */}
      <ProductFiltersBar
        filters={filters}
        categories={categories}
        brands={brands}
        onFiltersChange={setFilters}
      />

      {/* Products Table */}
      <ProductTable
        products={filteredProducts}
        hasProducts={products.length > 0}
        isLoading={isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onAdd={handleAdd}
        onClearFilters={handleClearFilters}
      />

      {/* View Product Dialog */}
      <ProductDetailsDialog
        product={viewProduct}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        product={deleteProductState}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}

export default ProductsPage
