import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, WifiOff, RefreshCw, LayoutDashboard, AlertTriangle, Archive, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/common/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrency } from '@/hooks'
import { useDebounce } from '@/hooks/useDebounce'
import { useStocks, type StocksFilters } from './hooks'
import { StocksList } from './components'
import { toast } from 'sonner'

// ============================================
// Constants
// ============================================

const SEARCH_DEBOUNCE_MS = 300
type TabType = 'all' | 'low' | 'expired'

// ============================================
// StocksPage Component
// ============================================

export function StocksPage() {
  const { format: formatCurrency } = useCurrency()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Read tab from URL on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'all' || tab === 'low' || tab === 'expired') {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS)

  // Filters for the hook
  const filters: StocksFilters = {
    search: debouncedSearch,
  }

  // Use stocks hook
  const {
    allStocks,
    lowStocks,
    expiredStocks,
    isLoading,
    isLoadingLow,
    isLoadingExpired,
    isOffline,
    error,
    refetch,
    currentPage,
    totalItems,
    perPage,
    setPage,
    setPerPage,
  } = useStocks(filters)

  // Handle bulk delete
  const handleBulkDelete = useCallback((ids: number[]) => {
    // TODO: Implement bulk delete
    toast.info(`Delete ${ids.length} items functionality coming soon`)
  }, [])

  // Calculate stats
  const stats = useMemo(
    () => ({
      allCount: allStocks.length,
      lowCount: lowStocks.length,
      expiredCount: expiredStocks.length,
      totalValue: allStocks.reduce((sum, stock) => sum + stock.productStock * stock.productPurchasePrice, 0),
    }),
    [allStocks, lowStocks, expiredStocks]
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-muted-foreground">Monitor and manage your inventory levels</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Stock Items"
          value={String(stats.allCount)}
          description="Total items in inventory"
          icon={Archive}
          iconClassName="text-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Low Stock Items"
          value={String(stats.lowCount)}
          description="Items below alert quantity"
          icon={AlertTriangle}
          iconClassName="text-yellow-600"
          loading={isLoadingLow}
        />
        <StatCard
          title="Expired Items"
          value={String(stats.expiredCount)}
          description="Expired products"
          icon={LayoutDashboard}
          iconClassName="text-red-600"
          loading={isLoadingExpired}
        />
        <StatCard
          title="Total Stock Value"
          value={formatCurrency(stats.totalValue)}
          description="Total inventory value"
          icon={DollarSign}
          iconClassName="text-green-600"
          loading={isLoading}
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => handleTabChange(v as TabType)}
        className="flex flex-1 flex-col space-y-4"
      >
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search stocks by product name, code, or batch number..."
                className="h-10 border border-input bg-background pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={refetch} title="Refresh stocks">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <TabsList className="grid h-10 w-[400px] grid-cols-3 rounded-lg bg-muted/50 p-1">
            <TabsTrigger
              value="all"
              className="rounded-md text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              All Stocks
            </TabsTrigger>
            <TabsTrigger
              value="low"
              className="rounded-md text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Low Stocks
            </TabsTrigger>
            <TabsTrigger
              value="expired"
              className="rounded-md text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Expired
            </TabsTrigger>
          </TabsList>
        </div>

        {/* All Stocks Tab */}
        <TabsContent
          value="all"
          className="mt-0 flex flex-1 flex-col border-none p-0 data-[state=active]:flex"
        >
          <div className="flex flex-1 flex-col rounded-lg border bg-background p-6">
            <StocksList
              stocks={allStocks}
              isLoading={isLoading}
              emptyMessage={
                searchQuery
                  ? `No stocks found matching "${searchQuery}"`
                  : 'No stocks available'
              }
              onBulkDelete={handleBulkDelete}
              // Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalItems / perPage)}
              onPageChange={setPage}
              totalItems={totalItems}
              perPage={perPage}
              onPerPageChange={setPerPage}
              allowClientPagination={true}
            />
          </div>
        </TabsContent>

        {/* Low Stocks Tab */}
        <TabsContent
          value="low"
          className="mt-0 flex flex-1 flex-col border-none p-0 data-[state=active]:flex"
        >
          <div className="flex flex-1 flex-col rounded-lg border bg-background p-6">
            <StocksList
              stocks={lowStocks}
              isLoading={isLoadingLow}
              emptyMessage={
                searchQuery
                  ? `No low stock items found matching "${searchQuery}"`
                  : 'No low stock items at this time'
              }
              onBulkDelete={handleBulkDelete}
              currentPage={currentPage}
              totalPages={Math.ceil(lowStocks.length / perPage)} // Fallback if needed
              onPageChange={setPage}
              totalItems={lowStocks.length}
              perPage={perPage}
              onPerPageChange={setPerPage}
              allowClientPagination={true}
            />
          </div>
        </TabsContent>

        {/* Expired Products Tab */}
        <TabsContent
          value="expired"
          className="mt-0 flex flex-1 flex-col border-none p-0 data-[state=active]:flex"
        >
          <div className="flex flex-1 flex-col rounded-lg border bg-background p-6">
            <StocksList
              stocks={expiredStocks}
              isLoading={isLoadingExpired}
              emptyMessage={
                searchQuery
                  ? `No expired products found matching "${searchQuery}"`
                  : 'No expired products at this time'
              }
              onBulkDelete={handleBulkDelete}
              currentPage={currentPage}
              totalPages={Math.ceil(expiredStocks.length / perPage)}
              onPageChange={setPage}
              totalItems={expiredStocks.length}
              perPage={perPage}
              onPerPageChange={setPerPage}
              allowClientPagination={true}
              showExpiryDate={true}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Offline Notice */}
      {isOffline && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="flex items-start gap-3 pt-6">
            <WifiOff className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                You are currently offline
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Stock data requires an active internet connection. Please check your connection and try again.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Notice */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="flex items-start gap-3 pt-6">
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">
                Failed to load stocks
              </p>
              <p className="text-sm text-red-800 dark:text-red-200">
                {error.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={refetch}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StocksPage
