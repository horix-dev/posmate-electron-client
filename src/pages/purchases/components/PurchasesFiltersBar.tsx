import { memo, useEffect, useState } from 'react'
import { Search, X, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import type { PurchasesFilters } from '../hooks'

// ============================================
// Types
// ============================================

export interface PurchasesFiltersBarProps {
  filters: PurchasesFilters
  onFiltersChange: (filters: PurchasesFilters) => void
}

// ============================================
// Component
// ============================================

export const PurchasesFiltersBar = memo(function PurchasesFiltersBar({
  filters,
  onFiltersChange,
}: PurchasesFiltersBarProps) {
  const [suppliers, setSuppliers] = useState<Party[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)

  // Fetch suppliers for dropdown
  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoadingSuppliers(true)
      try {
        const data = await partiesService.getSuppliers()
        setSuppliers(data)
      } catch (error) {
        console.error('Failed to fetch suppliers:', error)
      } finally {
        setIsLoadingSuppliers(false)
      }
    }
    fetchSuppliers()
  }, [])

  // Check if any filters are active
  const hasActiveFilters =
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.supplierId ||
    filters.paymentStatus !== 'all'

  // Clear all filters
  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      dateFrom: '',
      dateTo: '',
      supplierId: '',
      paymentStatus: 'all',
    })
  }

  // Update individual filter
  const updateFilter = <K extends keyof PurchasesFilters>(key: K, value: PurchasesFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative min-w-[200px] max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice number..."
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

      {/* Supplier */}
      <Select
        value={filters.supplierId || 'all'}
        onValueChange={(value) => updateFilter('supplierId', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Suppliers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Suppliers</SelectItem>
          {isLoadingSuppliers ? (
            <SelectItem value="_loading" disabled>
              Loading...
            </SelectItem>
          ) : (
            suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={String(supplier.id)}>
                {supplier.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Payment Status */}
      <Select
        value={filters.paymentStatus}
        onValueChange={(value) =>
          updateFilter('paymentStatus', value as PurchasesFilters['paymentStatus'])
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

export default PurchasesFiltersBar
