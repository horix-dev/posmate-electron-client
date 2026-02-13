/**
 * Stock Adjustments Page
 * Main page for managing stock adjustments with filtering and stats
 */

import { useState, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStockAdjustment } from '@/hooks/useStockAdjustment'
import { useProducts } from '@/pages/products/hooks/useProducts'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import type { StockAdjustmentFilters, StockAdjustment } from '@/types/stockAdjustment.types'
import type { StockAdjustmentFormData } from './schemas'
import {
  StockAdjustmentFormDialog,
  StockAdjustmentList,
  StockAdjustmentStatsCards,
  StockAdjustmentFiltersBar,
  StockAdjustmentDetailsDialog,
} from './components'

// ============================================
// Main Component
// ============================================

export default function StockAdjustmentsPage() {
  const user = useAuthStore((state) => state.user)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null)
  const [filters, setFilters] = useState<StockAdjustmentFilters>({})

  // Get products data
  const {
    products,
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
    refreshComboDetails,
  } = useProducts({
    search: '',
    categoryId: '',
    brandId: '',
    stockStatus: 'all',
  })

  // Get stock adjustment hook
  const { createAdjustment, isCreating, retrySync, useAdjustments, useSummary } =
    useStockAdjustment()

  // Query adjustments with filters
  const {
    data: adjustments = [],
    isLoading: isLoadingAdjustments,
    error,
    refetch,
  } = useAdjustments(filters)

  // Query summary statistics
  const { data: summary, isLoading: isLoadingSummary } = useSummary(filters)

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // Handle creating new adjustment
  const handleSaveAdjustment = useCallback(
    async (data: StockAdjustmentFormData & { currentStock: number; batchNo?: string | null }) => {
      if (!user?.id) {
        toast.error('User not authenticated')
        return
      }

      try {
        const selectedProduct = products.find((p) => p.id === data.productId)
        const stockId = data.batchNo
          ? (selectedProduct?.stocks?.find((s) => s.batch_no === data.batchNo)?.id ??
            selectedProduct?.stocks?.[0]?.id)
          : selectedProduct?.stocks?.[0]?.id

        await createAdjustment({
          productId: data.productId,
          variantId: data.variantId,
          batchId: data.batchId,
          batchNo: data.batchNo ?? null,
          stockId: data.variantId ? undefined : stockId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason,
          referenceNumber: data.referenceNumber,
          notes: data.notes,
          adjustedBy: user.id,
          adjustmentDate: data.adjustmentDate || new Date().toISOString(),
          currentStock: data.currentStock,
        })

        // Refetch data
        refetch()
        // Refresh products so stock totals in picker are up to date
        await refetchProducts()
        
        // Small delay to ensure state update propagates
        await new Promise((resolve) => setTimeout(resolve, 100))
        
        // Refresh all combo details since adjusted product might be a component in any combo
        // This ensures available_combos is recalculated with updated component stocks
        await refreshComboDetails()
      } catch (error) {
        console.error('Failed to save adjustment:', error)
        // Error toast handled by the hook; rethrow so dialog stays open
        throw error
      }
    },
    [user, createAdjustment, refetch, products, refetchProducts, refreshComboDetails]
  )

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: StockAdjustmentFilters) => {
    setFilters(newFilters)
  }, [])

  // Handle filter reset
  const handleFiltersReset = useCallback(() => {
    setFilters({})
  }, [])

  // Handle view adjustment details
  const handleViewDetails = useCallback((adjustment: StockAdjustment) => {
    setSelectedAdjustment(adjustment)
    setDetailsDialogOpen(true)
  }, [])

  // Handle retry sync
  const handleRetrySync = useCallback(
    async (adjustment: StockAdjustment) => {
      try {
        await retrySync(adjustment)
        await refetch()
      } catch (error) {
        console.error('Retry sync failed:', error)
        // Error toast already shown by hook
      }
    },
    [retrySync, refetch]
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Adjustments</h1>
          <p className="text-muted-foreground">
            Manage inventory adjustments for damaged goods, returns, transfers, and corrections
            {adjustments.length > 0 && ` (${adjustments.length} adjustments)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            aria-label="Refresh adjustments"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            onClick={() => {
              setFormDialogOpen(true)
              void refetchProducts()
            }}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New Adjustment
          </Button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
        >
          <p className="font-medium">Failed to load adjustments</p>
          <p className="text-sm">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
            Try again
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <StockAdjustmentStatsCards summary={summary ?? undefined} isLoading={isLoadingSummary} />

      {/* Filters */}
      <StockAdjustmentFiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleFiltersReset}
      />

      {/* Adjustments List */}
      <StockAdjustmentList
        adjustments={adjustments}
        products={products}
        isLoading={isLoadingAdjustments}
        onViewDetails={handleViewDetails}
        onRetrySync={handleRetrySync}
      />

      {/* Form Dialog */}
      <StockAdjustmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        products={products}
        onSave={handleSaveAdjustment}
        isSaving={isCreating || isLoadingProducts}
      />

      {/* Details Dialog */}
      <StockAdjustmentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        adjustment={selectedAdjustment}
        product={
          selectedAdjustment
            ? products.find((p) => p.id === selectedAdjustment.productId)
            : undefined
        }
      />
    </div>
  )
}
