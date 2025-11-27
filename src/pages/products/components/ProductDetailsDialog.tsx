import { memo } from 'react'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, getImageUrl } from '@/lib/utils'
import type { Product } from '@/types/api.types'
import { getStockStatus } from '../hooks'

// ============================================
// Types
// ============================================

export interface ProductDetailsDialogProps {
  /** Product to display, null if dialog should be closed */
  product: Product | null
  /** Currency symbol for price display */
  currencySymbol: string
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
}

// ============================================
// Helper Components
// ============================================

const DetailItem = memo(function DetailItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function ProductDetailsDialogComponent({
  product,
  currencySymbol,
  open,
  onOpenChange,
}: ProductDetailsDialogProps) {
  // Don't render if no product
  if (!product) return null

  const stockStatus = getStockStatus(product)

  const handleClose = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        aria-describedby="product-details-description"
      >
        <DialogHeader>
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>

        <p id="product-details-description" className="sr-only">
          Detailed information about {product.productName}
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Product Image */}
          <div
            className="flex items-center justify-center rounded-lg bg-muted p-8"
            role="img"
            aria-label={product.productPicture ? product.productName : 'No product image'}
          >
            {getImageUrl(product.productPicture) ? (
              <img
                src={getImageUrl(product.productPicture)!}
                alt={product.productName}
                className="max-h-48 rounded-lg object-contain"
                loading="lazy"
              />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/50" aria-hidden="true" />
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{product.productName}</h3>
              <p className="text-sm text-muted-foreground">
                {product.productCode || `SKU-${product.id}`}
              </p>
            </div>

            <div className="flex items-center gap-2" role="group" aria-label="Product status">
              <Badge
                variant={stockStatus.variant === 'warning' ? 'outline' : stockStatus.variant}
                className={cn(
                  stockStatus.variant === 'warning' && 'border-yellow-500 text-yellow-600'
                )}
              >
                {stockStatus.label}
              </Badge>
              <Badge variant="secondary">{product.product_type}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailItem label="Category" value={product.category?.categoryName} />
              <DetailItem label="Brand" value={product.brand?.brandName} />
              <DetailItem label="Unit" value={product.unit?.unitName} />
              <DetailItem label="Alert Qty" value={product.alert_qty} />
            </div>
          </div>
        </div>

        {/* Stock Information */}
        {product.stocks && product.stocks.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-3 font-medium">Stock Information</h4>
              <ScrollArea className="max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Purchase Price</TableHead>
                      <TableHead className="text-right">Sale Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.stocks.map((stock) => (
                      <TableRow key={stock.id}>
                        <TableCell>{stock.batch_no || 'Default'}</TableCell>
                        <TableCell className="text-right">{stock.productStock}</TableCell>
                        <TableCell className="text-right">
                          {currencySymbol}
                          {stock.productPurchasePrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencySymbol}
                          {stock.productSalePrice.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const ProductDetailsDialog = memo(ProductDetailsDialogComponent)

ProductDetailsDialog.displayName = 'ProductDetailsDialog'

export default ProductDetailsDialog
