/**
 * Stock History Card Component
 * Compact view of stock adjustments for a specific product
 * Can be used on product detail pages
 */

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { TrendingUp, TrendingDown, Clock, AlertCircle, ExternalLink } from 'lucide-react'
import { formatDistance } from 'date-fns'
import type { StockAdjustment } from '@/types/stockAdjustment.types'

// ============================================
// Types
// ============================================

export interface StockHistoryCardProps {
  productId: number
  adjustments: StockAdjustment[]
  isLoading?: boolean
  limit?: number
  onViewAll?: () => void
}

// ============================================
// Helper Components
// ============================================

interface AdjustmentItemProps {
  adjustment: StockAdjustment
}

const AdjustmentItem = memo(function AdjustmentItem({ adjustment }: AdjustmentItemProps) {
  const isStockIn = adjustment.type === 'in'

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Icon */}
      <div
        className={`rounded-full p-2 ${
          isStockIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}
      >
        {isStockIn ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={`font-medium ${isStockIn ? 'text-green-700' : 'text-red-700'}`}>
            {isStockIn ? '+' : '-'}
            {adjustment.quantity}
          </span>
          <span className="text-sm text-muted-foreground">{adjustment.reason}</span>
          {adjustment.syncStatus === 'pending' && (
            <Badge variant="outline" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              Pending
            </Badge>
          )}
          {adjustment.syncStatus === 'error' && (
            <Badge variant="outline" className="border-red-600 text-xs text-red-700">
              <AlertCircle className="mr-1 h-3 w-3" />
              Error
            </Badge>
          )}
        </div>

        {/* Stock change */}
        {adjustment.oldQuantity !== undefined && adjustment.newQuantity !== undefined && (
          <div className="mb-1 text-xs text-muted-foreground">
            Stock: {adjustment.oldQuantity} → {adjustment.newQuantity}
          </div>
        )}

        {/* Notes */}
        {adjustment.notes && (
          <div className="mb-1 line-clamp-2 text-xs text-muted-foreground">{adjustment.notes}</div>
        )}

        {/* Date */}
        <div className="text-xs text-muted-foreground">
          {adjustment.adjustmentDate &&
            formatDistance(new Date(adjustment.adjustmentDate), new Date(), {
              addSuffix: true,
            })}
        </div>
      </div>
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function StockHistoryCardComponent({
  productId,
  adjustments,
  isLoading = false,
  limit = 10,
  onViewAll,
}: StockHistoryCardProps) {
  // Limit adjustments for display
  const displayAdjustments = adjustments.slice(0, limit)
  const hasMore = adjustments.length > limit

  // Calculate summary stats
  const totalIn = adjustments.filter((a) => a.type === 'in').reduce((sum, a) => sum + a.quantity, 0)
  const totalOut = adjustments
    .filter((a) => a.type === 'out')
    .reduce((sum, a) => sum + a.quantity, 0)
  const netChange = totalIn - totalOut

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Stock History #{productId}</CardTitle>
          {onViewAll && adjustments.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
              <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Summary Stats */}
        {adjustments.length > 0 && (
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">In:</span>
              <span className="font-medium text-green-700">+{totalIn}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-muted-foreground">Out:</span>
              <span className="font-medium text-red-700">-{totalOut}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Net:</span>
              <span className={`font-medium ${netChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {netChange >= 0 ? '+' : ''}
                {netChange}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="mx-auto mb-2 h-8 w-8 animate-spin" />
            <p className="text-sm">Loading history...</p>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <TrendingUp className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No stock adjustments yet</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px]">
              <div className="divide-y px-6">
                {displayAdjustments.map((adjustment) => (
                  <AdjustmentItem key={adjustment.id} adjustment={adjustment} />
                ))}
              </div>
            </ScrollArea>

            {hasMore && (
              <div className="border-t p-4 text-center">
                <Button variant="outline" size="sm" onClick={onViewAll} className="w-full">
                  View All {adjustments.length} Adjustments
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export const StockHistoryCard = memo(StockHistoryCardComponent)
