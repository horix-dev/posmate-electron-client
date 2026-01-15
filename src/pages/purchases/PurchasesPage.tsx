import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { RefreshCw, Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useDebounce } from '@/hooks'
import type { Purchase } from '@/types/api.types'

// Local imports
import {
  PurchasesStatsCards,
  PurchasesFiltersBar,
  PurchasesTable,
  PurchaseDetailsDialog,
  DeletePurchaseDialog,
  PurchaseReturnsTable,
  PurchaseReturnDialog,
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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'purchases' | 'returns'>('purchases')

  // Read tab from URL on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'purchases' || tab === 'returns') {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (tab: 'purchases' | 'returns') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

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
  // Dialog State
  // ============================================
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [deletePurchaseState, setDeletePurchaseState] = useState<Purchase | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [returnPurchase, setReturnPurchase] = useState<Purchase | null>(null)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [returnsRefreshKey, setReturnsRefreshKey] = useState(0)

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

  // Open return dialog
  const handleReturn = useCallback((purchase: Purchase) => {
    setReturnPurchase(purchase)
    setIsReturnDialogOpen(true)
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

  const handleReturnSuccess = useCallback(() => {
    refetch()
    setReturnsRefreshKey((prev) => prev + 1)
  }, [refetch])

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {activeTab === 'purchases' ? 'Purchases' : 'Purchase Returns'}
          </h1>
          <p className="text-muted-foreground">
            {activeTab === 'purchases'
              ? `Manage your purchase orders and returns${stats.total > 0 ? ` (${stats.total} purchases)` : ''}`
              : 'View and manage all purchase returns'}
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
          {activeTab === 'purchases' && (
            <Button onClick={() => navigate('/purchases/new')}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New Purchase
            </Button>
          )}
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

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => handleTabChange(value as 'purchases' | 'returns')}
      >
        <TabsContent value="purchases" className="space-y-4">
          {/* Stats Cards */}
          <PurchasesStatsCards stats={stats} isLoading={isLoading} />

          {/* Filters */}
          <PurchasesFiltersBar filters={filters} onFiltersChange={setFilters} />

          {/* Purchases Table */}
          <PurchasesTable
            purchases={filteredPurchases}
            hasPurchases={hasPurchases}
            isLoading={isLoading}
            onView={handleView}
            onReturn={handleReturn}
            onDelete={handleDeleteClick}
            onClearFilters={handleClearFilters}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <PurchaseReturnsTable refreshKey={returnsRefreshKey} />
        </TabsContent>
      </Tabs>

      {/* View Purchase Dialog */}
      <PurchaseDetailsDialog
        purchase={viewPurchase}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <DeletePurchaseDialog
        purchase={deletePurchaseState}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />

      {/* Purchase Return Dialog */}
      <PurchaseReturnDialog
        purchase={returnPurchase}
        open={isReturnDialogOpen}
        onOpenChange={setIsReturnDialogOpen}
        onSuccess={handleReturnSuccess}
      />
    </div>
  )
}

export default PurchasesPage
