import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useDebounce, usePermissions } from '@/hooks'
import { useAuthStore } from '@/stores/auth.store'
import type { Sale } from '@/types/api.types'
import { SaleDetailsDialog } from '@/components/shared'

// Local imports
import {
  SalesStatsCards,
  SalesFiltersBar,
  SalesTable,
  DeleteSaleDialog,
  SaleReturnsTable,
  SaleReturnDialog,
} from './components'
import { useSales, DEFAULT_FILTERS } from './hooks'
import type { SalesFilters } from './hooks'

// ============================================
// Constants
// ============================================

const SEARCH_DEBOUNCE_MS = 300

// ============================================
// SalesPage Component
// ============================================

export function SalesPage() {
  const { canRead, canCreate } = usePermissions()
  const user = useAuthStore((state) => state.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales')

  // Permission checks
  const canReadSales = canRead('sales')
  const canCreateSales = canCreate('sales')
  const canReadReturns = canRead('sale-returns')
  const canCreateReturns = canCreate('sale-returns')
  const canAccessSales = canReadSales || canCreateSales
  const canAccessReturns = canReadReturns || canCreateReturns
  const isShopOwner = user?.role === 'shop-owner'

  // Read tab from URL on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'sales' || tab === 'returns') {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (tab: 'sales' | 'returns') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // ============================================
  // Filter State
  // ============================================
  const [filters, setFilters] = useState<SalesFilters>(DEFAULT_FILTERS)

  // Debounce search for performance
  const debouncedSearch = useDebounce(filters.search, SEARCH_DEBOUNCE_MS)

  // Create debounced filters object
  const debouncedFilters = useMemo<SalesFilters>(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  )

  // ============================================
  // Data Fetching Hook
  // ============================================
  const { sales, offlineSales, isLoading, error, filteredSales, stats, refetch, deleteSale } =
    useSales(debouncedFilters)

  // ============================================
  // Dialog State
  // ============================================
  const [viewSale, setViewSale] = useState<Sale | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [deleteSaleState, setDeleteSaleState] = useState<Sale | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [returnSale, setReturnSale] = useState<Sale | null>(null)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [returnsRefreshKey, setReturnsRefreshKey] = useState(0)
  const [createReturnDialogOpen, setCreateReturnDialogOpen] = useState(false)

  // ============================================
  // Derived State
  // ============================================

  // Total sales count (including offline)
  const hasSales = sales.length > 0 || offlineSales.length > 0

  // ============================================
  // Handlers
  // ============================================

  // Open view sale dialog
  const handleView = useCallback((sale: Sale) => {
    setViewSale(sale)
    setIsViewDialogOpen(true)
  }, [])

  // Open return dialog
  const handleReturn = useCallback((sale: Sale) => {
    setReturnSale(sale)
    setIsReturnDialogOpen(true)
  }, [])

  // Open delete confirmation dialog
  const handleDeleteClick = useCallback((sale: Sale) => {
    setDeleteSaleState(sale)
    setIsDeleteDialogOpen(true)
  }, [])

  // Confirm delete
  const handleDeleteConfirm = useCallback(
    async (sale: Sale) => {
      await deleteSale(sale.id)
    },
    [deleteSale]
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
    console.log('Export sales')
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
            {activeTab === 'sales' ? 'Sales History' : 'Sale Returns'}
          </h1>
          <p className="text-muted-foreground">
            {activeTab === 'sales'
              ? `View and manage your sales records${stats.total > 0 ? ` (${stats.total} sales)` : ''}`
              : 'View and manage all sale returns'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canAccessSales && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                aria-label="Refresh sales"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Export
              </Button>
            </>
          )}
          {activeTab === 'sales' && canCreateSales && (
            <Button asChild>
              <Link to="/pos">Go to POS</Link>
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
          <p className="font-medium">Failed to load sales</p>
          <p className="text-sm">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
            Try again
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => handleTabChange(value as 'sales' | 'returns')}
      >
        <TabsContent value="sales" className="space-y-4">
          {canAccessSales ? (
            <>
              {/* Stats Cards - Only for shop owners */}
              {isShopOwner && <SalesStatsCards stats={stats} isLoading={isLoading} />}

              {/* Filters */}
              <SalesFiltersBar filters={filters} onFiltersChange={setFilters} />

              {/* Sales Table */}
              <SalesTable
                sales={filteredSales}
                hasSales={hasSales}
                isLoading={isLoading}
                onView={handleView}
                onReturn={handleReturn}
                onDelete={handleDeleteClick}
                onClearFilters={handleClearFilters}
              />
            </>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed p-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  You don't have permission to access sales.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          {canAccessReturns ? (
            <SaleReturnsTable refreshKey={returnsRefreshKey} />
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed p-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  You don't have permission to access sale returns.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Sale Dialog */}
      <SaleDetailsDialog
        sale={viewSale}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteSaleDialog
        sale={deleteSaleState}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />

      {/* Sale Return Dialog */}
      <SaleReturnDialog
        sale={returnSale}
        open={isReturnDialogOpen}
        onOpenChange={setIsReturnDialogOpen}
        onSuccess={handleReturnSuccess}
      />

      {/* Create Return Dialog (for create-only permission users) */}
      <SaleReturnDialog
        sale={null}
        open={createReturnDialogOpen}
        onOpenChange={setCreateReturnDialogOpen}
        onSuccess={handleReturnSuccess}
      />
    </div>
  )
}

export default SalesPage
