/**
 * Stock Adjustment Form Dialog
 * For creating new stock adjustments with offline-first support
 */

import { memo, useEffect, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Package, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ProductLookup } from '@/components/shared/ProductLookup'
import { ADJUSTMENT_REASONS_BY_TYPE } from '@/types/stockAdjustment.types'
import type { Batch } from '@/types/stockAdjustment.types'
import type { Product } from '@/types/api.types'
import type { ProductVariant } from '@/types/variant.types'
import { variantsService } from '@/api/services'
import { stockAdjustmentService } from '@/api/services/stockAdjustment.service'
import { setCache, getCache, CacheKeys } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  stockAdjustmentFormSchema,
  type StockAdjustmentFormData,
  defaultStockAdjustmentFormValues,
} from '../schemas'

// ============================================
// Types
// ============================================

export interface StockAdjustmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  onSave: (
    data: StockAdjustmentFormData & { currentStock: number; batchNo?: string | null }
  ) => Promise<void>
  isSaving?: boolean
  preselectedProductId?: number
}

// ============================================
// Main Component
// ============================================

function StockAdjustmentFormDialogComponent({
  open,
  onOpenChange,
  products,
  onSave,
  isSaving = false,
  preselectedProductId,
}: StockAdjustmentFormDialogProps) {
  // const user = useAuthStore((state) => state.user) // Reserved for future use
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [customReason, setCustomReason] = useState('')
  const { isOnline } = useOnlineStatus()

  const isDialogBlocked = open && (isSaving || loadingVariants || loadingBatches)

  // Initialize form
  const form = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: defaultStockAdjustmentFormValues,
  })

  const adjustmentType = form.watch('type')
  const quantity = form.watch('quantity')
  const currentReason = form.watch('reason')

  // Reset reason and custom reason when type changes
  useEffect(() => {
    // Clear reason if it's not valid for the new type
    const validReasons = ADJUSTMENT_REASONS_BY_TYPE[adjustmentType]
    if (currentReason && !validReasons.includes(currentReason as never)) {
      form.setValue('reason', '')
      setCustomReason('')
    }
  }, [adjustmentType, currentReason, form])

  // Get current stock from product, variant, or batch
  const getCurrentStock = (
    product: Product | null,
    variant?: ProductVariant | null,
    batch?: Batch | null
  ): number => {
    if (!product) return 0

    if (batch) {
      return batch.quantity ?? 0
    }

    // For variable products with variant selected, use variant stock
    if (variant) {
      return variant.total_stock ?? 0
    }

    // For simple products or no variant selected, use product stock
    return product.stocks_sum_product_stock ?? product.productStock ?? 0
  }

  // Calculate new stock
  const currentStock = getCurrentStock(selectedProduct, selectedVariant, selectedBatch)
  const newStock = adjustmentType === 'in' ? currentStock + quantity : currentStock - quantity

  // Check if adjustment would result in negative stock
  const wouldBeNegative = adjustmentType === 'out' && newStock < 0

  // Fetch variants for variable products (with caching)
  const fetchVariants = useCallback(
    async (productId: number) => {
      setLoadingVariants(true)

      const cacheKey =
        typeof CacheKeys.PRODUCT_VARIANTS === 'function'
          ? CacheKeys.PRODUCT_VARIANTS(productId)
          : `cache:products:${productId}:variants`

      const cached = getCache<ProductVariant[]>(cacheKey)
      const hasCached = Array.isArray(cached) && cached.length > 0

      try {
        // Use cache as a fast initial value (especially helpful offline), but don't
        // treat it as authoritative when online.
        if (hasCached) {
          setVariants(cached)
          setSelectedVariant((current) => {
            if (!current) return current
            return cached.find((v) => v.id === current.id) ?? current
          })
        }

        // If offline, we can only rely on cache.
        if (!isOnline) {
          if (!hasCached) {
            setVariants([])
          }
          return
        }

        // Online: always refresh from API (stale-while-revalidate).
        {
          const response = await variantsService.getStockSummary(productId)
          // Extract variants array from summary response and map to ProductVariant
          const variantItems = response.data.variants || []
          const fetchedVariants: ProductVariant[] = variantItems.map((item) => ({
            id: item.variant_id,
            product_id: productId,
            business_id: 0, // Not available in summary
            sku: item.sku,
            variant_name: item.variant_name,
            total_stock: item.total_stock,
            price: null, // Not in summary
            is_active: true, // Assume active if in summary
            sort_order: 0,
          }))
          setVariants(fetchedVariants)
          setSelectedVariant((current) => {
            if (!current) return current
            return fetchedVariants.find((v) => v.id === current.id) ?? current
          })

          // Cache for 24 hours
          setCache(cacheKey, fetchedVariants, { ttl: 24 * 60 * 60 * 1000 })
        }
      } catch (error) {
        console.error('Failed to fetch variants:', error)
        // If we had cached data, keep showing it; otherwise show empty.
        // (Prevents a network blip from clearing the variant list.)
        if (!hasCached) {
          setVariants([])
        }
      } finally {
        setLoadingVariants(false)
      }
    },
    [isOnline]
  )

  const fetchBatches = useCallback(
    async (args: { productId: number; variantId?: number }) => {
      const { productId, variantId } = args

      setLoadingBatches(true)

      const cacheKey = variantId
        ? `cache:variants:${variantId}:batches`
        : `cache:products:${productId}:batches`

      const cached = getCache<Batch[]>(cacheKey)
      const hasCached = Array.isArray(cached) && cached.length > 0

      try {
        if (hasCached) {
          setBatches(cached)
          setSelectedBatch((current) => {
            if (!current) return current
            return cached.find((b) => b.id === current.id) ?? current
          })
        }

        if (!isOnline) {
          if (!hasCached) {
            setBatches([])
          }
          return
        }

        const response = variantId
          ? await stockAdjustmentService.getVariantBatches(variantId)
          : await stockAdjustmentService.getProductBatches(productId)

        const fetchedBatches = response.batches || []
        setBatches(fetchedBatches)
        setSelectedBatch((current) => {
          if (!current) return current
          return fetchedBatches.find((b) => b.id === current.id) ?? current
        })

        setCache(cacheKey, fetchedBatches, { ttl: 24 * 60 * 60 * 1000 })
      } catch (error) {
        console.error('Failed to fetch batches:', error)
        if (!hasCached) {
          setBatches([])
        }
      } finally {
        setLoadingBatches(false)
      }
    },
    [isOnline]
  )

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        ...defaultStockAdjustmentFormValues,
        adjustmentDate: new Date().toISOString().split('T')[0],
      })

      // Reset custom reason
      setCustomReason('')

      // Preselect product if provided
      if (preselectedProductId) {
        const product = products.find((p) => p.id === preselectedProductId)
        if (product) {
          setSelectedProduct(product)
          form.setValue('productId', product.id)

          // Fetch variants if variable product
          if (product.product_type === 'variable') {
            fetchVariants(product.id)
            setBatches([])
            setSelectedBatch(null)
            form.setValue('batchId', undefined)
          } else {
            // Fetch batches for non-variable products (batch/lot tracking)
            fetchBatches({ productId: product.id })
          }
        }
      } else {
        setSelectedProduct(null)
        setVariants([])
        setSelectedVariant(null)
        setBatches([])
        setSelectedBatch(null)
      }
    }
  }, [open, form, products, preselectedProductId, fetchVariants, fetchBatches])

  // Handle product selection
  const handleProductSelect = useCallback(
    (product: Product) => {
      setSelectedProduct(product)
      form.setValue('productId', product.id)

      // Reset variant selection
      setSelectedVariant(null)
      form.setValue('variantId', undefined)

      // Reset batch selection
      setSelectedBatch(null)
      form.setValue('batchId', undefined)

      // Fetch variants if variable product
      if (product.product_type === 'variable') {
        fetchVariants(product.id)
        setBatches([])
      } else {
        setVariants([])
        fetchBatches({ productId: product.id })
      }
    },
    [form, fetchVariants, fetchBatches]
  )

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StockAdjustmentFormData) => {
      if (loadingVariants || loadingBatches) {
        return
      }
      if (!selectedProduct) {
        form.setError('productId', { message: 'Please select a product' })
        return
      }

      // Validate variant selection for variable products
      if (selectedProduct.product_type === 'variable' && !selectedVariant) {
        form.setError('variantId', { message: 'Please select a variant' })
        return
      }

      // Validate custom reason if "Other" is selected
      if (data.reason === 'Other' && !customReason.trim()) {
        toast.error('Please enter a custom reason')
        return
      }

      // Use custom reason if "Other" is selected
      const finalData = {
        ...data,
        reason: data.reason === 'Other' && customReason.trim() ? customReason.trim() : data.reason,
        currentStock: getCurrentStock(selectedProduct, selectedVariant, selectedBatch),
        variantId: selectedVariant?.id,
        batchNo: selectedBatch?.batch_no ?? selectedBatch?.batch_number ?? null,
      }

      await onSave(finalData)

      onOpenChange(false)
    },
    [
      selectedProduct,
      selectedVariant,
      selectedBatch,
      onSave,
      onOpenChange,
      form,
      loadingVariants,
      loadingBatches,
      customReason,
    ]
  )

  const requestClose = useCallback(() => {
    if (!isDialogBlocked) {
      onOpenChange(false)
    }
  }, [isDialogBlocked, onOpenChange])

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        requestClose()
      }
    },
    [requestClose]
  )

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-2xl flex-col"
        aria-describedby="stock-adjustment-form-description"
        aria-busy={isDialogBlocked}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          {isDialogBlocked && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading…</span>
              </div>
            </div>
          )}

          <DialogHeader>
            <DialogTitle>New Stock Adjustment</DialogTitle>
            <DialogDescription id="stock-adjustment-form-description">
              Adjust stock levels for damaged goods, returns, transfers, or corrections.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-1">
                {/* Product Selection */}
                <FormField
                  control={form.control}
                  name="productId"
                  render={() => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Product *</FormLabel>
                      {selectedProduct ? (
                        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                          <Package className="h-4 w-4 shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">{selectedProduct.productName}</div>
                            {selectedProduct.productCode && (
                              <div className="text-xs text-muted-foreground">
                                Code: {selectedProduct.productCode}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary">
                            Stock: {getCurrentStock(selectedProduct)}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(null)
                              form.setValue('productId', 0)
                              setVariants([])
                              setSelectedVariant(null)
                              setBatches([])
                              setSelectedBatch(null)
                            }}
                          >
                            Change
                          </Button>
                        </div>
                      ) : (
                        <ProductLookup
                          onSelect={handleProductSelect}
                          buttonText="Select product to adjust..."
                          placeholder="Search products by name or code..."
                          width="w-[400px]"
                          showVariants={false}
                        />
                      )}
                      {selectedProduct && selectedProduct.product_type !== 'variable' && (
                        <FormDescription>
                          Current Stock: <strong>{currentStock}</strong>
                          {currentStock <= (selectedProduct.alert_qty ?? 0) && (
                            <span className="ml-2 text-orange-600">(Low Stock)</span>
                          )}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Variant Selection (for variable products) */}
                {selectedProduct?.product_type === 'variable' && (
                  <FormField
                    control={form.control}
                    name="variantId"
                    render={() => (
                      <FormItem>
                        <FormLabel>Variant *</FormLabel>
                        <Select
                          value={selectedVariant?.id.toString()}
                          onValueChange={(value) => {
                            const variant = variants.find((v) => v.id === Number(value))
                            setSelectedVariant(variant || null)
                            form.setValue('variantId', variant?.id)

                            // Reset + fetch batches for the selected variant
                            setSelectedBatch(null)
                            form.setValue('batchId', undefined)
                            setBatches([])
                            if (variant) {
                              fetchBatches({ productId: selectedProduct.id, variantId: variant.id })
                            }
                          }}
                          disabled={loadingVariants || variants.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select variant..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {loadingVariants ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="ml-2 text-sm">Loading variants...</span>
                              </div>
                            ) : variants.length === 0 ? (
                              <div className="py-2 text-center text-sm text-muted-foreground">
                                {isOnline ? 'No variants found' : 'Variants not cached (offline)'}
                              </div>
                            ) : (
                              variants.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id.toString()}>
                                  <div className="flex w-full items-center justify-between">
                                    <span>{variant.variant_name || variant.sku}</span>
                                    <Badge variant="secondary" className="ml-2">
                                      Stock: {variant.total_stock ?? 0}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {selectedVariant && (
                          <FormDescription>
                            Current Stock:{' '}
                            <strong>{getCurrentStock(selectedProduct, selectedVariant)}</strong>
                            {getCurrentStock(selectedProduct, selectedVariant) <=
                              (selectedProduct.alert_qty ?? 0) && (
                              <span className="ml-2 text-orange-600">(Low Stock)</span>
                            )}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Batch/Lot Selection */}
                {selectedProduct &&
                  (selectedProduct.product_type !== 'variable' || selectedVariant) && (
                    <FormField
                      control={form.control}
                      name="batchId"
                      render={() => (
                        <FormItem>
                          <FormLabel>Batch / Lot</FormLabel>
                          <Select
                            value={selectedBatch?.id.toString()}
                            onValueChange={(value) => {
                              const batch = batches.find((b) => b.id === Number(value))
                              setSelectedBatch(batch || null)
                              form.setValue('batchId', batch?.id)
                            }}
                            disabled={loadingBatches || batches.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select batch (optional)..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingBatches ? (
                                <div className="flex items-center justify-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="ml-2 text-sm">Loading batches...</span>
                                </div>
                              ) : batches.length === 0 ? (
                                <div className="py-2 text-center text-sm text-muted-foreground">
                                  {isOnline ? 'No batches found' : 'Batches not cached (offline)'}
                                </div>
                              ) : (
                                batches.map((batch) => (
                                  <SelectItem key={batch.id} value={batch.id.toString()}>
                                    <div className="flex w-full items-center justify-between">
                                      <span>
                                        {batch.batch_no ??
                                          batch.batch_number ??
                                          `Batch ${batch.id}`}
                                      </span>
                                      <Badge variant="secondary" className="ml-2">
                                        Stock: {batch.quantity ?? 0}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {selectedBatch && (
                            <FormDescription>
                              Current Stock:{' '}
                              <strong>
                                {getCurrentStock(selectedProduct, selectedVariant, selectedBatch)}
                              </strong>
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Adjustment Type */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in">Stock In (+)</SelectItem>
                            <SelectItem value="out">Stock Out (-)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Enter quantity"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        {selectedProduct && (
                          <FormDescription>
                            New Stock:{' '}
                            <strong className={wouldBeNegative ? 'text-red-600' : ''}>
                              {newStock}
                            </strong>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Warning for negative stock */}
                {wouldBeNegative && (
                  <Alert className="border-yellow-300 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      This adjustment would result in negative stock ({newStock}). Please reduce the
                      quantity or change the type.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Reason */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ADJUSTMENT_REASONS_BY_TYPE[adjustmentType].map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select "Other" to enter a custom reason below
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Reason (if Other selected) */}
                {form.watch('reason') === 'Other' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Custom Reason
                    </label>
                    <Input
                      placeholder="Enter custom reason"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Reference Number */}
                  <FormField
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional reference" {...field} />
                        </FormControl>
                        <FormDescription>Invoice, PO, or other reference</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Adjustment Date */}
                  <FormField
                    control={form.control}
                    name="adjustmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes or details..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestClose}
                  disabled={isDialogBlocked}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isDialogBlocked || wouldBeNegative || !selectedProduct}
                >
                  {isDialogBlocked && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Saving...' : isDialogBlocked ? 'Loading...' : 'Save Adjustment'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const StockAdjustmentFormDialog = memo(StockAdjustmentFormDialogComponent)
