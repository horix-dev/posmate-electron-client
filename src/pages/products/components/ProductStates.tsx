import { memo } from 'react'
import { Package, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================
// Types
// ============================================

export interface EmptyStateProps {
  /** Callback when add button is clicked */
  onAdd: () => void
}

export interface NoResultsStateProps {
  /** Callback when clear filters button is clicked */
  onClearFilters: () => void
}

// ============================================
// Empty State (No Products)
// ============================================

function EmptyStateComponent({ onAdd }: EmptyStateProps) {
  return (
    <div
      className="flex h-96 flex-col items-center justify-center text-center"
      role="status"
      aria-label="No products in inventory"
    >
      <Package className="mb-4 h-16 w-16 text-muted-foreground/50" aria-hidden="true" />
      <h3 className="text-lg font-semibold">No products yet</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Get started by adding your first product to your inventory
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Add Product
      </Button>
    </div>
  )
}

export const EmptyState = memo(EmptyStateComponent)
EmptyState.displayName = 'EmptyState'

// ============================================
// No Results State (Filters active)
// ============================================

function NoResultsStateComponent({ onClearFilters }: NoResultsStateProps) {
  return (
    <div
      className="flex h-96 flex-col items-center justify-center text-center"
      role="status"
      aria-label="No products match your search"
    >
      <Search className="mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
      <h3 className="text-lg font-semibold">No products found</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Try adjusting your search or filter criteria
      </p>
      <Button variant="outline" onClick={onClearFilters}>
        Clear filters
      </Button>
    </div>
  )
}

export const NoResultsState = memo(NoResultsStateComponent)
NoResultsState.displayName = 'NoResultsState'

// ============================================
// Loading Skeleton
// ============================================

function TableSkeletonComponent() {
  return (
    <div className="space-y-3 p-4" role="status" aria-label="Loading products...">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
      <span className="sr-only">Loading products...</span>
    </div>
  )
}

export const TableSkeleton = memo(TableSkeletonComponent)
TableSkeleton.displayName = 'TableSkeleton'
