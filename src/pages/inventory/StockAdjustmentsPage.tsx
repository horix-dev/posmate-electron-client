/**
 * Stock Adjustments Page
 * Main page for managing stock adjustments with filtering and stats
 */

import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
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
    refetch,
  } = useAdjustments(filters)

  // Query summary statistics
  const { data: summary, isLoading: isLoadingSummary } = useSummary(filters)

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
      } catch (error) {
        console.error('Failed to save adjustment:', error)
        // Error toast handled by the hook; rethrow so dialog stays open
        throw error
      }
    },
    [user, createAdjustment, refetch, products, refetchProducts]
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
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Stock Adjustments</h1>
          <p className="text-sm text-muted-foreground">
            Manage inventory adjustments for damaged goods, returns, transfers, and corrections
          </p>
        </div>
        <div>
          <Button
            onClick={() => {
              setFormDialogOpen(true)
              void refetchProducts()
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Adjustment
          </Button>
        </div>
      </div>

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
