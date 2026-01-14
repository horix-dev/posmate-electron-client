import { memo, useState } from 'react'
import { Package, Settings2, ChevronRight, ChevronDown, Box, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, getImageUrl } from '@/lib/utils'
import { useCurrency } from '@/hooks'
import type { Product } from '@/types/api.types'
import { getStockStatus } from '../hooks'

// ============================================
// Types
// ============================================

export interface ProductDetailsDialogProps {
  /** Product to display, null if dialog should be closed */
  product: Product | null
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
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function ProductDetailsDialogComponent({ product, open, onOpenChange }: ProductDetailsDialogProps) {
  const { format: formatCurrency } = useCurrency()
  const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set())

  // Reset expanded states when dialog closes or product changes
  if (!open && expandedVariants.size > 0) {
    setExpandedVariants(new Set())
  }

  // Don't render if no product
  if (!product) return null

  const stockStatus = getStockStatus(product)
  const handleClose = () => onOpenChange(false)

  // Calculate total stock
  // Prioritize actual stock records if available, as they represent the real-time physical inventory
  const totalStock =
    product.stocks && product.stocks.length > 0
      ? product.stocks.reduce((sum, s) => sum + (Number(s.productStock) || 0), 0)
      : (product.variants_total_stock ?? product.productStock ?? 0)

  // Calculate total stock value
  const totalStockValue =
    product.stocks && product.stocks.length > 0
      ? product.stocks.reduce(
          (sum, s) => sum + (Number(s.productStock) || 0) * (Number(s.productPurchasePrice) || 0),
          0
        )
      : totalStock * (product.productPurchasePrice || 0)

  const toggleVariant = (variantId: number) => {
    const newSet = new Set(expandedVariants)
    if (newSet.has(variantId)) {
      newSet.delete(variantId)
    } else {
      newSet.add(variantId)
    }
    setExpandedVariants(newSet)
  }

  const getVariantBatches = (variantId: number) => {
    return product.stocks?.filter((s) => s.variant_id === variantId) || []
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[85vh] max-w-4xl flex-col gap-0 !overflow-hidden p-0"
        aria-describedby="product-details-description"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <div className="flex items-start gap-4">
            {/* Header Image - Smaller */}
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted"
              role="img"
              aria-label={product.productPicture ? product.productName : 'No product image'}
            >
              {getImageUrl(product.productPicture) ? (
                <img
                  src={getImageUrl(product.productPicture)!}
                  alt={product.productName}
                  className="max-h-full max-w-full rounded-md object-contain"
                  loading="lazy"
                />
              ) : (
                <Package className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              )}
            </div>

            {/* Header Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl">{product.productName}</DialogTitle>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {product.productCode || `SKU-${product.id}`}
                  </p>

                  {/* Badges Row - Quick Look */}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'h-5 px-2',
                        product.product_type === 'variable' &&
                          'bg-purple-100 text-purple-700 hover:bg-purple-100'
                      )}
                    >
                      {product.product_type === 'variable' ? 'Variable' : 'Simple'}
                    </Badge>
                    {product.unit && (
                      <Badge variant="outline" className="h-5 px-2 text-muted-foreground">
                        Unit: {product.unit.unitName}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Unified Availability Section */}
                <div className="ml-4 flex items-stretch overflow-hidden rounded-lg border bg-muted/30">
                  <div className="flex flex-col items-center justify-center border-r bg-muted/50 px-3 py-1.5">
                    <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Availability
                    </span>
                    <Badge
                      variant={stockStatus.variant === 'warning' ? 'outline' : stockStatus.variant}
                      className={cn(
                        'h-5 px-2 text-[10px]',
                        stockStatus.variant === 'warning' && 'border-yellow-500 text-yellow-600',
                        stockStatus.variant === 'success' &&
                          'border-0 bg-green-100 text-green-700 hover:bg-green-100'
                      )}
                    >
                      {stockStatus.label}
                    </Badge>
                  </div>

                  <div className="flex flex-col items-end justify-center bg-background px-4 py-1.5">
                    <span className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Total Stock
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Box className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xl font-bold tabular-nums">{totalStock}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <p id="product-details-description" className="sr-only">
          Detailed information about {product.productName}
        </p>

        <div className="min-h-0 flex-1">
          <Tabs defaultValue="overview" className="flex h-full flex-col">
            <div className="shrink-0 border-b px-6 pt-2">
              <TabsList className="grid w-full max-w-[400px] grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="variants" disabled={product.product_type !== 'variable'}>
                  Variants ({product.variants?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="batches">Batches ({product.stocks?.length || 0})</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-full flex-1">
              <div className="p-6">
                <TabsContent value="overview" className="mt-0 space-y-6">
                  <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 font-medium">
                        <Settings2 className="h-4 w-4" /> Basic Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                        <DetailItem label="Category" value={product.category?.categoryName} />
                        <DetailItem label="Brand" value={product.brand?.brandName} />
                        <DetailItem label="Model" value={product.product_model?.name} />
                        <DetailItem label="Tax Type" value={product.vat_type} />
                        <DetailItem label="Alert Quantity" value={product.alert_qty} />
                        <DetailItem
                          label="Purchase Price"
                          value={formatCurrency(product.productPurchasePrice || 0)}
                        />
                      </div>
                    </div>

                    <div className="flex h-full flex-col space-y-4">
                      <h4 className="flex items-center gap-2 font-medium">
                        <Layers className="h-4 w-4" /> Inventory Status
                      </h4>
                      <div className="grid flex-1 grid-cols-1 gap-4 rounded-lg border bg-muted/20 p-4">
                        <div className="flex items-center justify-between border-b border-dashed border-gray-300/50 py-1 last:border-0">
                          <span className="text-sm text-muted-foreground">Total Stock</span>
                          <span className="font-mono font-bold">{totalStock}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-dashed border-gray-300/50 py-1 last:border-0">
                          <span className="text-sm text-muted-foreground">
                            Stock Value (Purchase)
                          </span>
                          <span className="font-mono font-medium">
                            {formatCurrency(totalStockValue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-dashed border-gray-300/50 py-1 last:border-0">
                          <span className="text-sm text-muted-foreground">Active Variants</span>
                          <span className="font-mono font-medium">
                            {product.variants?.filter((v) => v.is_active).length || 0} /{' '}
                            {product.variants?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="variants" className="mt-0">
                  {product.variants && product.variants.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>Variant</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="w-[100px] text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {product.variants.map((variant) => {
                            // Group attributes nicely
                            const attributesMap = variant.attribute_values?.reduce(
                              (acc, av) => {
                                if (av.attribute?.name) {
                                  acc[av.attribute.name] = av.value
                                }
                                return acc
                              },
                              {} as Record<string, string>
                            )

                            // If we have proper maps, use them, else fallback
                            const variantLabel =
                              Object.keys(attributesMap || {}).length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {Object.entries(attributesMap || {}).map(([key, val]) => (
                                    <span key={key} className="text-xs">
                                      <span className="text-muted-foreground">{key}: </span>
                                      {val}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm">
                                  {variant.attribute_values?.map((av) => av.value).join(' / ') ||
                                    `Variant ${variant.id}`}
                                </span>
                              )

                            const variantBatches = getVariantBatches(variant.id)
                            const variantTotalStock =
                              variantBatches.length > 0
                                ? variantBatches.reduce((acc, s) => acc + s.productStock, 0)
                                : (product.stocks?.find((s) => s.variant_id === variant.id)
                                    ?.productStock ?? 0)

                            const isExpanded = expandedVariants.has(variant.id)

                            return (
                              <>
                                <TableRow
                                  key={variant.id}
                                  className={cn(
                                    'cursor-pointer transition-colors hover:bg-muted/50',
                                    isExpanded && 'border-b-0 bg-muted/50'
                                  )}
                                  onClick={() => toggleVariant(variant.id)}
                                >
                                  <TableCell>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                  <TableCell>{variantLabel}</TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">
                                    {variant.sku || '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {variant.price ? (
                                      formatCurrency(variant.price)
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'font-mono font-normal',
                                        variantTotalStock > 0
                                          ? 'border-green-200 bg-green-50 text-green-700'
                                          : 'border-red-200 bg-red-50 text-red-700'
                                      )}
                                    >
                                      {variantTotalStock}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div
                                      className={cn(
                                        'inline-flex h-2.5 w-2.5 rounded-full',
                                        variant.is_active ? 'bg-green-500' : 'bg-gray-300'
                                      )}
                                      title={variant.is_active ? 'Active' : 'Inactive'}
                                    />
                                  </TableCell>
                                </TableRow>
                                {isExpanded && variantBatches.length > 0 && (
                                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableCell colSpan={6} className="p-0">
                                      <div className="border-b px-4 py-3">
                                        <p className="mb-2 pl-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                          Active Batches
                                        </p>
                                        <Table>
                                          <TableHeader className="invisible h-0 border-0 p-0">
                                            <TableRow className="h-0 border-0">
                                              <TableHead className="h-0 p-0 text-right"></TableHead>
                                              <TableHead className="h-0 p-0 text-right"></TableHead>
                                              <TableHead className="h-0 p-0 text-right"></TableHead>
                                              <TableHead className="h-0 p-0 text-right"></TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {variantBatches.map((batch) => (
                                              <TableRow
                                                key={batch.id}
                                                className="border-0 hover:bg-transparent"
                                              >
                                                <TableCell className="w-[40px]"></TableCell>
                                                <TableCell className="py-1 text-xs">
                                                  <span className="text-muted-foreground">
                                                    Batch:
                                                  </span>{' '}
                                                  {batch.batch_no || 'Default'}
                                                </TableCell>
                                                <TableCell className="w-[100px] py-1 text-right text-xs">
                                                  Qty:{' '}
                                                  <span className="font-mono">
                                                    {batch.productStock}
                                                  </span>
                                                </TableCell>
                                                <TableCell className="w-[150px] py-1 text-right text-xs">
                                                  <span className="text-muted-foreground">
                                                    Expires:
                                                  </span>{' '}
                                                  {batch.expire_date || '-'}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {isExpanded && variantBatches.length === 0 && (
                                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableCell
                                      colSpan={6}
                                      className="p-4 text-center text-sm text-muted-foreground"
                                    >
                                      No specific batch information available for this variant.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                      <Settings2 className="mx-auto h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No variants found for this product.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="batches" className="mt-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch / SKU</TableHead>
                          <TableHead className="text-right">Purch. Price</TableHead>
                          <TableHead className="text-right">Sale Price</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="w-[80px] text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {product.stocks && product.stocks.length > 0 ? (
                          product.stocks.map((stock) => (
                            <TableRow key={stock.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {stock.batch_no || 'Default Batch'}
                                  </span>
                                  {stock.variant_id && (
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {stock.variant_id}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {formatCurrency(stock.productPurchasePrice)}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {formatCurrency(stock.productSalePrice)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="font-mono font-normal">
                                  {stock.productStock}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div
                                  className={cn(
                                    'inline-flex h-2.5 w-2.5 rounded-full',
                                    stock.productStock > 0 ? 'bg-green-500' : 'bg-red-300'
                                  )}
                                  title={stock.productStock > 0 ? 'Available' : 'Out of Stock'}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-24 text-center text-muted-foreground"
                            >
                              No stock information available.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        <DialogFooter className="mt-auto border-t px-6 py-4">
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
