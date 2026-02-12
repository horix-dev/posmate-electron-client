import { memo, useMemo } from 'react'
import { Package, AlertTriangle, Calendar, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCurrency } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Product, Stock } from '@/types/api.types'
import type { ProductVariant } from '@/types/variant.types'

export interface BatchSelectionDialogProps {
  open: boolean
  product: Product | null
  stocks: Stock[]
  variant?: ProductVariant | null
  defaultStockId?: number | null
  onSelect: (stock: Stock) => void
  onClose: () => void
}

const formatDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString()
}

function BatchSelectionDialogComponent({
  open,
  product,
  stocks,
  variant,
  defaultStockId,
  onSelect,
  onClose,
}: BatchSelectionDialogProps) {
  const { format: formatCurrency } = useCurrency()

  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => (b.productStock ?? 0) - (a.productStock ?? 0))
  }, [stocks])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose()
    }
  }

  const description = variant
    ? `Choose which batch of ${variant.variant_name || variant.sku || 'this variant'} to use.`
    : 'Choose the batch/lot you want to use.'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Batch</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {product && (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-semibold text-foreground">{product.productName}</p>
            <p className="text-muted-foreground">
              SKU: {product.productCode || `SKU-${product.id}`}
            </p>
          </div>
        )}

        <ScrollArea className="mt-4 max-h-[60vh] pr-3">
          {sortedStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Package className="mb-2 h-8 w-8 opacity-40" />
              No batch records available for this product.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedStocks.map((stock) => {
                const quantity = stock.productStock ?? 0
                const price = stock.productSalePrice ?? 0
                const isOutOfStock = quantity <= 0
                const expiry = formatDate(stock.expire_date)
                const manufacture = formatDate(stock.mfg_date)
                const isPreselected = defaultStockId != null && stock.id === defaultStockId

                return (
                  <div
                    key={stock.id}
                    className={cn(
                      'rounded-xl border p-4 transition-colors',
                      isPreselected && 'border-primary bg-primary/5',
                      isOutOfStock && 'opacity-60'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          Batch {stock.batch_no || `#${stock.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Warehouse ID: {stock.warehouse_id ?? '—'}
                        </p>
                      </div>
                      {isPreselected && (
                        <Badge className="bg-primary/90 text-primary-foreground">
                          <Check className="mr-1 h-3 w-3" />
                          Suggested
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-md bg-muted/60 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Quantity</p>
                        <p className="text-base font-semibold">{quantity}</p>
                      </div>
                      <div className="rounded-md bg-muted/60 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Sale Price</p>
                        <p className="text-base font-semibold">{formatCurrency(price)}</p>
                      </div>
                      <div className="rounded-md bg-muted/60 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p
                          className={cn(
                            'text-base font-semibold',
                            isOutOfStock ? 'text-destructive' : 'text-green-600'
                          )}
                        >
                          {isOutOfStock ? 'Out of stock' : 'Available'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {manufacture && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> MFG: {manufacture}
                        </span>
                      )}
                      {expiry && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> EXP: {expiry}
                        </span>
                      )}
                      {quantity <= (product?.alert_qty ?? 5) && quantity > 0 && (
                        <span className="inline-flex items-center gap-1 text-pos-warning">
                          <AlertTriangle className="h-3 w-3" /> Low stock
                        </span>
                      )}
                    </div>

                    <Button
                      className="mt-4 w-full"
                      variant={isOutOfStock ? 'outline' : 'default'}
                      disabled={isOutOfStock}
                      onClick={() => onSelect(stock)}
                    >
                      {isOutOfStock ? 'Unavailable' : 'Use this batch'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export const BatchSelectionDialog = memo(BatchSelectionDialogComponent)

BatchSelectionDialog.displayName = 'BatchSelectionDialog'

export default BatchSelectionDialog
