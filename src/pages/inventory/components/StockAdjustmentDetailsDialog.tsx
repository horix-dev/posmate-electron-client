/**
 * Stock Adjustment Details Dialog
 * Displays detailed information about a stock adjustment
 */

import { memo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TrendingUp, TrendingDown, CheckCircle2, Clock, AlertCircle, Package } from 'lucide-react'
import { format } from 'date-fns'
import type { StockAdjustment } from '@/types/stockAdjustment.types'
import type { Product } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface StockAdjustmentDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adjustment: StockAdjustment | null
  product?: Product
}

// ============================================
// Main Component
// ============================================

function StockAdjustmentDetailsDialogComponent({
  open,
  onOpenChange,
  adjustment,
  product,
}: StockAdjustmentDetailsDialogProps) {
  if (!adjustment) return null

  const isIncrease = adjustment.type === 'in'
  const stockChange = isIncrease ? `+${adjustment.quantity}` : `-${adjustment.quantity}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Adjustment Details
          </DialogTitle>
          <DialogDescription>
            Adjustment ID: {adjustment.id}
            {adjustment.serverId && ` (Server ID: ${adjustment.serverId})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Type */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="mb-1 text-sm text-muted-foreground">Type</div>
              <Badge
                variant="default"
                className={
                  isIncrease ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }
              >
                {isIncrease ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                Stock {isIncrease ? 'In' : 'Out'}
              </Badge>
            </div>
            <div className="flex-1">
              <div className="mb-1 text-sm text-muted-foreground">Sync Status</div>
              {adjustment.syncStatus === 'synced' && (
                <Badge variant="outline" className="border-green-600 text-green-700">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Synced
                </Badge>
              )}
              {adjustment.syncStatus === 'pending' && (
                <Badge variant="outline" className="border-orange-600 text-orange-700">
                  <Clock className="mr-1 h-3 w-3" />
                  Pending Sync
                </Badge>
              )}
              {adjustment.syncStatus === 'error' && (
                <Badge variant="outline" className="border-red-600 text-red-700">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Sync Error
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Product Information */}
          <div>
            <div className="mb-2 text-sm font-medium text-muted-foreground">Product</div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="font-medium">
                {product?.productName || `Product #${adjustment.productId}`}
              </div>
              {product?.productCode && (
                <div className="mt-1 text-sm text-muted-foreground">
                  Code: {product.productCode}
                </div>
              )}
            </div>
          </div>

          {/* Quantity & Stock Changes */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="mb-1 text-sm text-muted-foreground">Quantity</div>
              <div
                className={`text-2xl font-bold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}
              >
                {stockChange}
              </div>
            </div>
            {adjustment.oldQuantity !== null && adjustment.oldQuantity !== undefined && (
              <>
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">Previous Stock</div>
                  <div className="font-mono text-2xl">{adjustment.oldQuantity}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">New Stock</div>
                  <div className="font-mono text-2xl font-bold">{adjustment.newQuantity}</div>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Adjustment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1 text-sm text-muted-foreground">Reason</div>
              <div className="font-medium">{adjustment.reason}</div>
            </div>
            <div>
              <div className="mb-1 text-sm text-muted-foreground">Date</div>
              <div className="font-medium">
                {adjustment.adjustmentDate
                  ? format(new Date(adjustment.adjustmentDate), 'MMM dd, yyyy HH:mm')
                  : '-'}
              </div>
            </div>
          </div>

          {adjustment.referenceNumber && (
            <div>
              <div className="mb-1 text-sm text-muted-foreground">Reference Number</div>
              <div className="rounded bg-muted px-2 py-1 font-mono text-sm">
                {adjustment.referenceNumber}
              </div>
            </div>
          )}

          {adjustment.notes && (
            <div>
              <div className="mb-1 text-sm text-muted-foreground">Notes</div>
              <div className="whitespace-pre-wrap rounded-lg border bg-muted/50 p-3 text-sm">
                {adjustment.notes}
              </div>
            </div>
          )}

          {adjustment.syncStatus === 'error' && adjustment.syncError && (
            <div>
              <div className="mb-1 text-sm text-muted-foreground">Sync Error</div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {adjustment.syncError}
              </div>
            </div>
          )}

          {/* Metadata */}
          <Separator />
          <div className="space-y-1 text-xs text-muted-foreground">
            {adjustment.createdAt && (
              <div>Created: {format(new Date(adjustment.createdAt), 'MMM dd, yyyy HH:mm:ss')}</div>
            )}
            {adjustment.updatedAt && (
              <div>Updated: {format(new Date(adjustment.updatedAt), 'MMM dd, yyyy HH:mm:ss')}</div>
            )}
            {adjustment.adjustedBy && <div>Adjusted by User ID: {adjustment.adjustedBy}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const StockAdjustmentDetailsDialog = memo(StockAdjustmentDetailsDialogComponent)
