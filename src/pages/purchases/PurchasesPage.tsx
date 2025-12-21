import { useState, useCallback, useMemo } from 'react'
import { RefreshCw, Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBusinessStore } from '@/stores'
import { useDebounce } from '@/hooks'
import type { Purchase } from '@/types/api.types'

// Local imports
import {
  PurchasesStatsCards,
  PurchasesFiltersBar,
  PurchasesTable,
  PurchaseDetailsDialog,
  DeletePurchaseDialog,
  NewPurchaseDialog,
} from './components'
import { usePurchases, DEFAULT_FILTERS } from './hooks'
import type { PurchasesFilters } from './hooks'

// ============================================
// Constants
// ============================================

const SEARCH_DEBOUNCE_MS = 300

// ============================================
// PurchasesPage Component
// ============================================

export function PurchasesPage() {
  // ============================================
  // Filter State
  // ============================================
  const [filters, setFilters] = useState<PurchasesFilters>(DEFAULT_FILTERS)

  // Debounce search for performance
  const debouncedSearch = useDebounce(filters.search, SEARCH_DEBOUNCE_MS)

  // Create debounced filters object
  const debouncedFilters = useMemo<PurchasesFilters>(
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
    // purchases - unused, using filteredPurchases instead
    currentPage,
    totalPages,
    totalItems,
    perPage,
    isLoading,
    error,
    filteredPurchases,
    stats,
    refetch,
    deletePurchase,
    setPage,
    setPerPage,
  } = usePurchases(debouncedFilters)

  // ============================================
  // Business Store
  // ============================================
  const business = useBusinessStore((state) => state.business)
  const currencySymbol = business?.business_currency?.symbol || '$'

  // ============================================
  // Dialog State
  // ============================================
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [deletePurchaseState, setDeletePurchaseState] = useState<Purchase | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false)

  // ============================================
  // Derived State
  // ============================================

  // Total purchases count
  const hasPurchases = totalItems > 0

  // ============================================
  // Handlers
  // ============================================

  // Open view purchase dialog
  const handleView = useCallback((purchase: Purchase) => {
    setViewPurchase(purchase)
    setIsViewDialogOpen(true)
  }, [])

  // Open delete confirmation dialog
  const handleDeleteClick = useCallback((purchase: Purchase) => {
    setDeletePurchaseState(purchase)
    setIsDeleteDialogOpen(true)
  }, [])

  // Confirm delete
  const handleDeleteConfirm = useCallback(
    async (purchase: Purchase) => {
      await deletePurchase(purchase.id)
    },
    [deletePurchase]
  )

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  // Refresh data
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // Export handler (placeholder)
  const handleExport = useCallback(() => {
    // TODO: Implement CSV/PDF export
    console.log('Export purchases')
  }, [])

  // New purchase success
  const handleNewPurchaseSuccess = useCallback(() => {
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
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground">
            Manage your purchase orders and inventory
            {stats.total > 0 && ` (${stats.total} purchases)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            aria-label="Refresh purchases"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export
          </Button>
          <Button onClick={() => setIsNewPurchaseOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New Purchase
          </Button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
        >
          <p className="font-medium">Failed to load purchases</p>
          <p className="text-sm">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
            Try again
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <PurchasesStatsCards stats={stats} currencySymbol={currencySymbol} isLoading={isLoading} />

      {/* Filters */}
      <PurchasesFiltersBar filters={filters} onFiltersChange={setFilters} />

      {/* Purchases Table */}
      <PurchasesTable
        purchases={filteredPurchases}
        hasPurchases={hasPurchases}
        currencySymbol={currencySymbol}
        isLoading={isLoading}
        onView={handleView}
        onDelete={handleDeleteClick}
        onClearFilters={handleClearFilters}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />

      {/* View Purchase Dialog */}
      <PurchaseDetailsDialog
        purchase={viewPurchase}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        currencySymbol={currencySymbol}
      />

      {/* Delete Confirmation Dialog */}
      <DeletePurchaseDialog
        purchase={deletePurchaseState}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />

      {/* New Purchase Dialog */}
      <NewPurchaseDialog
        open={isNewPurchaseOpen}
        onOpenChange={setIsNewPurchaseOpen}
        onSuccess={handleNewPurchaseSuccess}
      />
    </div>
  )
}

export default PurchasesPage
