import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Product } from '@/types/api.types'
import { ProductRow } from './ProductRow'
import { TableSkeleton, EmptyState, NoResultsState } from './ProductStates'

// ============================================
// Types
// ============================================

export interface ProductTableProps {
  /** Products to display */
  products: Product[]
  /** Whether there are any products at all (before filtering) */
  hasProducts: boolean
  /** Whether data is loading */
  isLoading: boolean
  /** Callback when view action is clicked */
  onView: (product: Product) => void
  /** Callback when edit action is clicked */
  onEdit: (product: Product) => void
  /** Callback when delete action is clicked */
  onDelete: (product: Product) => void
  /** Callback when add button is clicked (for empty state) */
  onAdd: () => void
  /** Callback when clear filters button is clicked (for no results state) */
  onClearFilters: () => void
}

// ============================================
// Table Header Component
// ============================================

const ProductTableHeader = memo(function ProductTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Product</TableHead>
        <TableHead>Category</TableHead>
        <TableHead>Brand</TableHead>
        <TableHead className="text-right">Price</TableHead>
        <TableHead>Stock</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="w-12">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
})

// ============================================
// Main Component
// ============================================

function ProductTableComponent({
  products,
  hasProducts,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onAdd,
  onClearFilters,
}: ProductTableProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <TableSkeleton />
        </CardContent>
      </Card>
    )
  }

  // Empty state (no products at all)
  if (!hasProducts) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState onAdd={onAdd} />
        </CardContent>
      </Card>
    )
  }

  // No results state (filters active but no matches)
  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <NoResultsState onClearFilters={onClearFilters} />
        </CardContent>
      </Card>
    )
  }

  // Products table
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <ProductTableHeader />
          <TableBody>
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export const ProductTable = memo(ProductTableComponent)

ProductTable.displayName = 'ProductTable'

export default ProductTable
