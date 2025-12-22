import { memo, useEffect, useState } from 'react'
import { Search, X, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { partiesService } from '@/api/services'
import type { Party } from '@/types/api.types'
import type { SalesFilters } from '../hooks'

export interface SalesFiltersBarProps {
  filters: SalesFilters
  onFiltersChange: (filters: SalesFilters) => void
}

export const SalesFiltersBar = memo(function SalesFiltersBar({
  filters,
  onFiltersChange,
}: SalesFiltersBarProps) {
  const [customers, setCustomers] = useState<Party[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)

  // Fetch customers for dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoadingCustomers(true)
      try {
        const data = await partiesService.getCustomers()
        setCustomers(data)
      } catch (error) {
        console.error('Failed to fetch customers:', error)
      } finally {
        setIsLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])

  // Check if any filters are active
  const hasActiveFilters =
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.customerId ||
    filters.paymentStatus !== 'all' ||
    filters.syncStatus !== 'all'

  // Clear all filters
  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      dateFrom: '',
      dateTo: '',
      customerId: '',
      paymentStatus: 'all',
      syncStatus: 'all',
    })
  }

  // Update individual filter
  const updateFilter = <K extends keyof SalesFilters>(key: K, value: SalesFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative min-w-[200px] max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice or customer..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10"
        />
      </div>

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
              updateFilter('dateFrom', date ? format(date, 'yyyy-MM-dd') : '')
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
              updateFilter('dateTo', date ? format(date, 'yyyy-MM-dd') : '')
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Customer */}
      <Select
        value={filters.customerId || 'all'}
        onValueChange={(value) => updateFilter('customerId', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Customers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Customers</SelectItem>
          {isLoadingCustomers ? (
            <SelectItem value="_loading" disabled>
              Loading...
            </SelectItem>
          ) : (
            customers.map((customer) => (
              <SelectItem key={customer.id} value={String(customer.id)}>
                {customer.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Payment Status */}
      <Select
        value={filters.paymentStatus}
        onValueChange={(value) =>
          updateFilter('paymentStatus', value as SalesFilters['paymentStatus'])
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="partial">Partial</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
        </SelectContent>
      </Select>

      {/* Sync Status */}
      <Select
        value={filters.syncStatus}
        onValueChange={(value) => updateFilter('syncStatus', value as SalesFilters['syncStatus'])}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Sync Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sync</SelectItem>
          <SelectItem value="synced">Synced</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  )
})

export default SalesFiltersBar
