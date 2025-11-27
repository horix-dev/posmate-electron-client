import { Search, X, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import type { SalesFilters } from '../hooks'

export interface SalesFiltersBarProps {
  filters: SalesFilters
  onFiltersChange: (filters: SalesFilters) => void
}

export function SalesFiltersBar({ filters, onFiltersChange }: SalesFiltersBarProps) {
  const activeFiltersCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.customerId,
    filters.paymentStatus !== 'all' ? filters.paymentStatus : '',
    filters.syncStatus !== 'all' ? filters.syncStatus : '',
  ].filter(Boolean).length

  const handleClearFilters = () => {
    onFiltersChange({
      search: filters.search, // Keep search
      dateFrom: '',
      dateTo: '',
      customerId: '',
      paymentStatus: 'all',
      syncStatus: 'all',
    })
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice or customer..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10 pr-10"
        />
        {filters.search && (
          <button
            onClick={() => onFiltersChange({ ...filters, search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2">
        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Date Range
              {(filters.dateFrom || filters.dateTo) && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Date Range</h4>
                <p className="text-sm text-muted-foreground">
                  Filter sales by date range
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="dateFrom">From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                    className="col-span-2"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="dateTo">To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                    className="col-span-2"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, dateFrom: '', dateTo: '' })}
              >
                Clear dates
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Payment Status */}
        <Select
          value={filters.paymentStatus}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, paymentStatus: value as SalesFilters['paymentStatus'] })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>

        {/* Sync Status */}
        <Select
          value={filters.syncStatus}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, syncStatus: value as SalesFilters['syncStatus'] })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Sync" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="synced">Synced</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>
    </div>
  )
}

export default SalesFiltersBar
