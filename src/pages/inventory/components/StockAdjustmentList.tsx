/**
 * Stock Adjustment List/Table Component
 * Displays adjustments with filtering, sorting, and sync status
 */

import { memo, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import type { StockAdjustment } from '@/types/stockAdjustment.types'
import type { Product } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface StockAdjustmentListProps {
  adjustments: StockAdjustment[]
  products?: Product[]
  isLoading?: boolean
  onViewDetails?: (adjustment: StockAdjustment) => void
  onRetrySync?: (adjustment: StockAdjustment) => void
}

// ============================================
// Helper Components
// ============================================

interface TypeBadgeProps {
  type: 'in' | 'out'
}

const TypeBadge = memo(function TypeBadge({ type }: TypeBadgeProps) {
  if (type === 'in') {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <TrendingUp className="mr-1 h-3 w-3" />
        In
      </Badge>
    )
  }

  return (
    <Badge variant="default" className="bg-red-600 hover:bg-red-700">
      <TrendingDown className="mr-1 h-3 w-3" />
      Out
    </Badge>
  )
})

interface SyncStatusBadgeProps {
  status: 'pending' | 'synced' | 'error'
  error?: string
}

const SyncStatusBadge = memo(function SyncStatusBadge({ status, error }: SyncStatusBadgeProps) {
  switch (status) {
    case 'synced':
      return (
        <Badge variant="outline" className="border-green-600 text-green-700">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Synced
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="outline" className="border-orange-600 text-orange-700">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      )
    case 'error':
      return (
        <Badge variant="outline" className="border-red-600 text-red-700" title={error}>
          <AlertCircle className="mr-1 h-3 w-3" />
          Error
        </Badge>
      )
    default:
      return null
  }
})

// ============================================
// Main Component
// ============================================

function StockAdjustmentListComponent({
  adjustments,
  products = [],
  isLoading = false,
  onViewDetails,
  onRetrySync,
}: StockAdjustmentListProps) {
  // Create product lookup map for efficient access
  const productMap = useMemo(() => {
    const map = new Map<number, Product>()
    products.forEach((p) => map.set(p.id, p))
    return map
  }, [products])

  // Helper to get product name
  const getProductName = (productId: number): string => {
    const product = productMap.get(productId)
    return product?.productName ?? `Product #${productId}`
  }

  // Helper to get product code
  const getProductCode = (productId: number): string | undefined => {
    return productMap.get(productId)?.productCode
  }

  // Sort adjustments by date (newest first)
  const sortedAdjustments = useMemo(() => {
    return [...adjustments].sort(
      (a, b) => new Date(b.adjustmentDate).getTime() - new Date(a.adjustmentDate).getTime()
    )
  }, [adjustments])

  if (isLoading) {
    return (
      <Card>
        <div className="p-8 text-center text-muted-foreground">
          <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin" />
          <p>Loading adjustments...</p>
        </div>
      </Card>
    )
  }

  if (sortedAdjustments.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center text-muted-foreground">
          <TrendingUp className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No stock adjustments found</p>
          <p className="mt-1 text-sm">Create your first adjustment to get started</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Stock Change</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAdjustments.map((adjustment) => (
              <TableRow key={adjustment.id}>
                {/* Date */}
                <TableCell className="whitespace-nowrap">
                  {adjustment.adjustmentDate ? (
                    <div>
                      <div className="font-medium">
                        {format(new Date(adjustment.adjustmentDate), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(adjustment.adjustmentDate), 'HH:mm')}
                      </div>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>

                {/* Type */}
                <TableCell>
                  <TypeBadge type={adjustment.type} />
                </TableCell>

                {/* Product */}
                <TableCell>
                  <div>
                    <div className="font-medium">{getProductName(adjustment.productId)}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {getProductCode(adjustment.productId) && (
                        <Badge variant="outline" className="text-xs">
                          {getProductCode(adjustment.productId)}
                        </Badge>
                      )}
                      {adjustment.referenceNumber && (
                        <span className="text-xs text-muted-foreground">
                          Ref: {adjustment.referenceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Quantity */}
                <TableCell className="text-right">
                  <span className="font-mono font-medium">
                    {adjustment.type === 'in' ? '+' : '-'}
                    {adjustment.quantity}
                  </span>
                </TableCell>

                {/* Reason */}
                <TableCell>
                  <div className="max-w-[200px]">
                    <div className="truncate text-sm">{adjustment.reason}</div>
                    {adjustment.notes && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {adjustment.notes}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Stock Change */}
                <TableCell>
                  {adjustment.oldQuantity !== undefined && adjustment.newQuantity !== undefined ? (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{adjustment.oldQuantity}</span>
                      {' → '}
                      <span className="font-medium">{adjustment.newQuantity}</span>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>

                {/* Sync Status */}
                <TableCell>
                  <SyncStatusBadge
                    status={adjustment.syncStatus || 'pending'}
                    error={adjustment.syncError}
                  />
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onViewDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(adjustment)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {adjustment.syncStatus === 'error' && onRetrySync && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRetrySync(adjustment)}
                        title="Retry Sync"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  )
}

export const StockAdjustmentList = memo(StockAdjustmentListComponent)
