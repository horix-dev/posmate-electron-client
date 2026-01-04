import { useState, useEffect, useCallback, memo } from 'react'
import {
  Loader2,
  Search,
  Check,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { currenciesService } from '@/api/services'
import { useBusinessStore } from '@/stores'
import type { Currency } from '@/types/api.types'

// ============================================
// Types
// ============================================

interface CurrencySettingsProps {
  onCurrencyChange?: (currency: Currency) => void
}

interface PaginationState {
  currentPage: number
  perPage: number
  total: number
  lastPage: number
}

// ============================================
// Currency Row Component
// ============================================

interface CurrencyRowProps {
  currency: Currency
  isChanging: boolean
  onChangeCurrency: (currency: Currency) => void
  currentCurrencyId?: number
}

const CurrencyRow = memo(function CurrencyRow({
  currency,
  isChanging,
  onChangeCurrency,
  currentCurrencyId,
}: CurrencyRowProps) {
  const isActive = currentCurrencyId === currency.id || currency.active === 1 || currency.active === true

  return (
    <TableRow className={isActive ? 'bg-primary/5' : ''}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium">{currency.symbol}</span>
          <span className="font-medium">{currency.name}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono">{currency.code}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span>{currency.country_name || '-'}</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground">
          {currency.position === 'before'
            ? `${currency.symbol}100`
            : `100${currency.symbol}`}
        </span>
      </TableCell>
      <TableCell>
        {isActive ? (
          <Badge variant="outline" className="border-green-500 text-green-600">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="border-gray-400 text-gray-500">
            Inactive
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {isActive ? (
          <Button size="sm" variant="ghost" disabled className="gap-1">
            <Check className="h-4 w-4 text-green-600" />
            Current
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChangeCurrency(currency)}
            disabled={isChanging}
          >
            {isChanging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Set as Active'
            )}
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
})

// ============================================
// Main Component
// ============================================

function CurrencySettingsComponent({ onCurrencyChange }: CurrencySettingsProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isChanging, setIsChanging] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    perPage: 10,
    total: 0,
    lastPage: 1,
  })

  const business = useBusinessStore((state) => state.business)
  const setBusiness = useBusinessStore((state) => state.setBusiness)

  // Fetch currencies
  const fetchCurrencies = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: Record<string, unknown> = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      if (statusFilter !== 'all') {
        params.active = statusFilter === 'active' ? 1 : 0
      }

      const response = await currenciesService.getAll(params)
      setCurrencies(response.data || [])

      // Update pagination from response
      if (response.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.pagination?.total || 0,
          lastPage: response.pagination?.last_page || 1,
        }))
      } else if ('total' in response) {
        // Handle PaginatedApiResponse format
        const paginatedResponse = response as unknown as {
          total: number
          last_page: number
        }
        setPagination((prev) => ({
          ...prev,
          total: paginatedResponse.total || 0,
          lastPage: paginatedResponse.last_page || 1,
        }))
      }
    } catch (error) {
      console.error('Failed to fetch currencies:', error)
      toast.error('Failed to load currencies')
    } finally {
      setIsLoading(false)
    }
  }, [pagination.currentPage, pagination.perPage, searchQuery, statusFilter])

  // Initial fetch
  useEffect(() => {
    fetchCurrencies()
  }, [fetchCurrencies])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, currentPage: 1 }))
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPagination((prev) => ({ ...prev, currentPage: 1 }))
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }))
  }

  // Handle per page change
  const handlePerPageChange = (value: string) => {
    setPagination((prev) => ({
      ...prev,
      perPage: parseInt(value, 10),
      currentPage: 1,
    }))
  }

  // Handle set active currency (updates active status)
  const handleChangeCurrency = async (currency: Currency) => {
    setIsChanging(currency.id)
    try {
      // Update active status in currencies table
      const response = await currenciesService.setDefault(currency.id)
      
      // Also update user_currencies table for business-specific currency
      await currenciesService.changeCurrency(currency.id)
      
      toast.success(`${currency.name} set as active currency`)

      // Update business store with new currency
      if (business && response.data) {
        setBusiness({
          ...business,
          business_currency: response.data,
        })
      }

      // Notify parent component if callback provided
      if (onCurrencyChange && response.data) {
        onCurrencyChange(response.data)
      }

      // Optimistically update active status in local state
      // Set the selected currency as active and reset others
      setCurrencies((prev) =>
        prev.map((c) => ({
          ...c,
          active: c.id === currency.id ? 1 : 0,
        }))
      )
    } catch (error) {
      console.error('Failed to set active currency:', error)
      toast.error('Failed to set active currency')
      // Refresh to revert on error
      await fetchCurrencies()
    } finally {
      setIsChanging(null)
    }
  }

  // Calculate pagination info
  const startItem = (pagination.currentPage - 1) * pagination.perPage + 1
  const endItem = Math.min(pagination.currentPage * pagination.perPage, pagination.total)

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Currency Settings
              </CardTitle>
              <CardDescription>
                Select the currency for your business transactions
              </CardDescription>
            </div>
            {business?.business_currency && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
                <span className="text-sm text-muted-foreground">Current:</span>
                <span className="text-lg font-semibold">{business.business_currency.symbol}</span>
                <span className="font-medium">{business.business_currency.code}</span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Currencies Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : currencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No Currencies Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'No currencies are available'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((currency) => (
                    <CurrencyRow
                      key={currency.id}
                      currency={currency}
                      isChanging={isChanging === currency.id}
                      onChangeCurrency={handleChangeCurrency}
                      currentCurrencyId={business?.business_currency?.id}
                    />
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.total > pagination.perPage && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Showing {startItem}-{endItem} of {pagination.total}
                    </span>
                    <Select
                      value={pagination.perPage.toString()}
                      onValueChange={handlePerPageChange}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>per page</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2 text-sm">
                      Page {pagination.currentPage} of {pagination.lastPage}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.lastPage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const CurrencySettings = memo(CurrencySettingsComponent)
CurrencySettings.displayName = 'CurrencySettings'

export default CurrencySettings
