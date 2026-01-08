import { useState, useMemo, useEffect, useRef } from 'react'
import { Eye, Search, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/hooks'
import { useSaleReturns, DEFAULT_RETURN_FILTERS } from '../hooks/useSaleReturns'
import type { SaleReturnsFilters } from '../hooks/useSaleReturns'
import type { SaleReturn } from '@/types/api.types'
import { SaleReturnDetailsDialog } from './index'

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{hasFilters ? 'No returns found' : 'No sale returns yet'}</h3>
        <p className="text-sm text-muted-foreground">
          {hasFilters ? 'Try adjusting your filters to see more results.' : 'Sale returns will appear here once you create them.'}
        </p>
      </div>
      {hasFilters && <Button variant="outline" onClick={onClearFilters}>Clear Filters</Button>}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading sale returns...</p>
      </div>
    </div>
  )
}

export function SaleReturnsTable({ refreshKey }: { refreshKey?: number }) {
  const { format: formatCurrency } = useCurrency()
  const [filters, setFilters] = useState<SaleReturnsFilters>(DEFAULT_RETURN_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const { saleReturns, isLoading, currentPage, totalPages, totalItems, perPage, stats, setPage, setPerPage, refetch } = useSaleReturns(filters)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (refreshKey !== undefined) {
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    // Clear existing timeout
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }))
    }, 300)
  }
  const handleClearFilters = () => { setFilters(DEFAULT_RETURN_FILTERS); setSearchInput('') }
  const handleViewDetails = (returnItem: SaleReturn) => { setSelectedReturn(returnItem); setIsDetailsOpen(true) }
  const hasFilters = useMemo(() => filters.search !== '' || filters.dateFrom !== '' || filters.dateTo !== '', [filters])

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Returns</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                  <svg className="h-4 w-4 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold">{stats.totalQty || 0}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                  <svg className="h-4 w-4 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={String(perPage)} onValueChange={(value) => setPerPage(Number(value))}>
                <SelectTrigger className="h-9 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="flex flex-1 max-w-md gap-2">
              <div className="flex-1 relative">
                <Input placeholder="Search by invoice or customer..." value={searchInput} onChange={(e) => handleSearchChange(e.target.value)} />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-2">
              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[140px] justify-start text-left font-normal',
                      !filters.dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(new Date(filters.dateFrom), 'MMM d, yyyy') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                    onSelect={(date: Date | undefined) =>
                      setFilters((prev) => ({ ...prev, dateFrom: date ? format(date, 'yyyy-MM-dd') : '' }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[140px] justify-start text-left font-normal',
                      !filters.dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(new Date(filters.dateTo), 'MMM d, yyyy') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                    onSelect={(date: Date | undefined) =>
                      setFilters((prev) => ({ ...prev, dateTo: date ? format(date, 'yyyy-MM-dd') : '' }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {hasFilters && <Button variant="ghost" onClick={handleClearFilters}>Clear</Button>}
          </div>

          {isLoading ? <LoadingState /> : saleReturns.length === 0 ? <EmptyState hasFilters={hasFilters} onClearFilters={handleClearFilters} /> : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Return Invoice</TableHead>
                      <TableHead>Sale Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-center">Qty Returned</TableHead>
                      <TableHead className="text-right">Return Amount</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleReturns.map((returnItem) => (
                      <TableRow key={returnItem.id}>
                        <TableCell>{returnItem.return_date ? format(new Date(returnItem.return_date), 'MMM dd, yyyy') : '-'}</TableCell>
                        <TableCell><span className="font-mono text-sm font-semibold">{returnItem.invoice_no || '-'}</span></TableCell>
                        <TableCell><span className="font-mono text-sm">{returnItem.sale?.invoiceNumber || '-'}</span></TableCell>
                        <TableCell>{returnItem.sale?.party?.name || '-'}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{returnItem.total_return_qty || 0}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(returnItem.total_return_amount || 0)}</TableCell>
                        <TableCell className="text-center"><Button variant="ghost" size="sm" onClick={() => handleViewDetails(returnItem)}><Eye className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {saleReturns.length > 0 ? (currentPage - 1) * perPage + 1 : 0} to {saleReturns.length > 0 ? Math.min((currentPage - 1) * perPage + saleReturns.length, totalItems || saleReturns.length) : 0} of {totalItems || saleReturns.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else {
                        if (currentPage <= 3) pageNum = i + 1
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                        else pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SaleReturnDetailsDialog
        saleReturn={selectedReturn}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </>
  )
}
