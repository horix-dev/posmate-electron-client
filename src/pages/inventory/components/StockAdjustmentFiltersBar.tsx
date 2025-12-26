/**
 * Stock Adjustments Filters Bar
 * Provides filtering options for stock adjustments
 */

import { memo } from 'react'
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
import { Card } from '@/components/ui/card'
import { X, Filter } from 'lucide-react'
import type { StockAdjustmentFilters } from '@/types/stockAdjustment.types'

// ============================================
// Types
// ============================================

export interface StockAdjustmentFiltersBarProps {
  filters: StockAdjustmentFilters
  onFiltersChange: (filters: StockAdjustmentFilters) => void
  onReset: () => void
}

// ============================================
// Main Component
// ============================================

function StockAdjustmentFiltersBarComponent({
  filters,
  onFiltersChange,
  onReset,
}: StockAdjustmentFiltersBarProps) {
  const hasActiveFilters =
    filters.startDate || filters.endDate || filters.type || filters.syncStatus

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Filters</span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto">
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Date Range - Start */}
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-sm">
            Start Date
          </Label>
          <Input
            id="startDate"
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
          <Label htmlFor="endDate" className="text-sm">
            End Date
          </Label>
          <Input
            id="endDate"
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
          <Label htmlFor="type" className="text-sm">
            Type
          </Label>
          <Select
            value={filters.type || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                type: value === 'all' ? undefined : (value as 'in' | 'out'),
              })
            }
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="in">Stock In (+)</SelectItem>
              <SelectItem value="out">Stock Out (-)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sync Status */}
        <div className="space-y-2">
          <Label htmlFor="syncStatus" className="text-sm">
            Sync Status
          </Label>
          <Select
            value={filters.syncStatus || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                syncStatus: value === 'all' ? undefined : (value as 'pending' | 'synced' | 'error'),
              })
            }
          >
            <SelectTrigger id="syncStatus">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="synced">Synced</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  )
}

export const StockAdjustmentFiltersBar = memo(StockAdjustmentFiltersBarComponent)
