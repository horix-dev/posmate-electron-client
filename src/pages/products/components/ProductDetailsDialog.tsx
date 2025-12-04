import { memo } from 'react'
import { Package, Settings2 } from 'lucide-react'
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
              <Badge 
                variant="secondary"
                className={cn(
                  product.product_type === 'variable' && 'bg-purple-100 text-purple-700'
                )}
              >
                {product.product_type === 'variable' ? 'Variable Product' : 'Simple Product'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailItem label="Category" value={product.category?.categoryName} />
              <DetailItem label="Brand" value={product.brand?.brandName} />
              <DetailItem label="Unit" value={product.unit?.unitName} />
              <DetailItem label="Alert Qty" value={product.alert_qty} />
            </div>
          </div>
        </div>

        {/* Variant Information - For Variable Products */}
        {product.product_type === 'variable' && product.variants && product.variants.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">
                  Product Variants ({product.variants.length})
                </h4>
              </div>
              <ScrollArea className="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((variant) => {
                      // Get variant name from attribute values
                      const variantName = variant.attribute_values
                        ?.map((av) => av.value)
                        .join(' / ') || `Variant ${variant.id}`
                      
                      // Get stock info for this variant
                      const variantStock = product.stocks?.find(
                        (s) => s.variant_id === variant.id
                      )
                      const stockQty = variantStock?.productStock ?? 0
                      
                      return (
                        <TableRow key={variant.id}>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {variant.attribute_values?.map((av) => (
                                <Badge
                                  key={av.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {av.attribute?.name}: {av.value}
                                </Badge>
                              ))}
                              {(!variant.attribute_values || variant.attribute_values.length === 0) && (
                                <span className="text-muted-foreground">
                                  {variantName}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {variant.sku || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {variant.price ? (
                              <span>
                                {currencySymbol}
                                {variant.price.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Base</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={stockQty > 0 ? 'default' : 'destructive'}
                              className={cn(
                                'text-xs',
                                stockQty > 0 && 'bg-green-100 text-green-700 hover:bg-green-100'
                              )}
                            >
                              {stockQty}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={variant.is_active ? 'default' : 'secondary'}
                              className={cn(
                                'text-xs',
                                variant.is_active && 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                              )}
                            >
                              {variant.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </>
        )}

        {/* Variable product without variants message */}
        {product.product_type === 'variable' && (!product.variants || product.variants.length === 0) && (
          <>
            <Separator />
            <div className="rounded-lg border border-dashed p-4 text-center">
              <Settings2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No variants configured for this variable product.
              </p>
              <p className="text-xs text-muted-foreground">
                Edit the product to add variants.
              </p>
            </div>
          </>
        )}

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
