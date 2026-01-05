/**
 * Stock Adjustments Filters Bar
 * Provides filtering options for stock adjustments
 */

import { memo, useCallback } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StockAdjustmentFilters } from '@/types/stockAdjustment.types'

// ============================================
// Types
// ============================================

export interface StockAdjustmentFiltersBarProps {
  filters: StockAdjustmentFilters
  onFiltersChange: (filters: StockAdjustmentFilters) => void
  onReset: () => void
}

interface FilterPopoverContentProps {
  filters: StockAdjustmentFilters
  onFiltersChange: (filters: StockAdjustmentFilters) => void
  onClear: () => void
}

// ============================================
// Filter Popover Content
// ============================================

const FilterPopoverContent = memo(function FilterPopoverContent({
  filters,
  onFiltersChange,
  onClear,
}: FilterPopoverContentProps) {
  const hasFilters = filters.startDate || filters.endDate || filters.type || filters.syncStatus

  const handleTypeChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        type: value === 'all' ? undefined : (value as 'in' | 'out'),
      })
    },
    [filters, onFiltersChange]
  )

  const handleSyncStatusChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        syncStatus: value === 'all' ? undefined : (value as 'pending' | 'synced' | 'error'),
      })
    },
    [filters, onFiltersChange]
  )

  return (
    <div className="w-full space-y-4" role="group" aria-label="Stock adjustment filters">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Filters</h4>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-auto px-2 py-1 text-xs"
            aria-label="Clear all filters"
          >
            Clear all
          </Button>
        )}
      </div>

      <Separator />

      {/* Date Range - Start */}
      <div className="space-y-2">
        <Label htmlFor="filter-start-date">Start Date</Label>
        <Input
          id="filter-start-date"
          type="date"
          value={filters.startDate || ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              startDate: e.target.value || undefined,
            })
          }
        />
      </div>

      {/* Date Range - End */}
      <div className="space-y-2">
        <Label htmlFor="filter-end-date">End Date</Label>
        <Input
          id="filter-end-date"
          type="date"
          value={filters.endDate || ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              endDate: e.target.value || undefined,
            })
          }
        />
      </div>

      {/* Adjustment Type */}
      <div className="space-y-2">
        <Label htmlFor="filter-type">Type</Label>
        <Select value={filters.type || 'all'} onValueChange={handleTypeChange}>
          <SelectTrigger id="filter-type" aria-label="Filter by type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="in">Stock In (+)</SelectItem>
            <SelectItem value="out">Stock Out (-)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sync Status */}
      <div className="space-y-2">
        <Label htmlFor="filter-sync-status">Sync Status</Label>
        <Select value={filters.syncStatus || 'all'} onValueChange={handleSyncStatusChange}>
          <SelectTrigger id="filter-sync-status" aria-label="Filter by sync status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="synced">Synced</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function StockAdjustmentFiltersBarComponent({
  filters,
  onFiltersChange,
  onReset,
}: StockAdjustmentFiltersBarProps) {
  // Count active filters
  const activeFilterCount = [
    filters.startDate,
    filters.endDate,
    filters.type,
    filters.syncStatus,
  ].filter(Boolean).length

  return (
    <div
      className="flex items-center justify-end"
      role="search"
      aria-label="Stock adjustment filters"
    >
      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative" aria-label="Open filters">
            <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                aria-label={`${activeFilterCount} active filters`}
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="bottom" sideOffset={8} className="w-80 p-4">
          <FilterPopoverContent
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClear={onReset}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export const StockAdjustmentFiltersBar = memo(StockAdjustmentFiltersBarComponent)

StockAdjustmentFiltersBar.displayName = 'StockAdjustmentFiltersBar'

export default StockAdjustmentFiltersBar
