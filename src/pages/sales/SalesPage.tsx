import { useState, useCallback, useMemo } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useBusinessStore } from '@/stores'
import { useDebounce } from '@/hooks'
import type { Sale } from '@/types/api.types'

// Local imports
import {
  SalesStatsCards,
  SalesFiltersBar,
  SalesTable,
  SaleDetailsDialog,
  DeleteSaleDialog,
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
  const {
    sales,
    offlineSales,
    isLoading,
    error,
    filteredSales,
    stats,
    refetch,
    deleteSale,
  } = useSales(debouncedFilters)

  // ============================================
  // Business Store
  // ============================================
  const business = useBusinessStore((state) => state.business)
  const currencySymbol = business?.business_currency?.symbol || '$'

  // ============================================
  // Dialog State
  // ============================================
  const [viewSale, setViewSale] = useState<Sale | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [deleteSaleState, setDeleteSaleState] = useState<Sale | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

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

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
          <p className="text-muted-foreground">
            View and manage your sales records
            {stats.total > 0 && ` (${stats.total} sales)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh sales">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export
          </Button>
          <Button asChild>
            <Link to="/pos">
              Go to POS
            </Link>
          </Button>
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

      {/* Stats Cards */}
      <SalesStatsCards stats={stats} currencySymbol={currencySymbol} isLoading={isLoading} />

      {/* Filters */}
      <SalesFiltersBar filters={filters} onFiltersChange={setFilters} />

      {/* Sales Table */}
      <SalesTable
        sales={filteredSales}
        hasSales={hasSales}
        currencySymbol={currencySymbol}
        isLoading={isLoading}
        onView={handleView}
        onDelete={handleDeleteClick}
        onClearFilters={handleClearFilters}
      />

      {/* View Sale Dialog */}
      <SaleDetailsDialog
        sale={viewSale}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        currencySymbol={currencySymbol}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteSaleDialog
        sale={deleteSaleState}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export default SalesPage
