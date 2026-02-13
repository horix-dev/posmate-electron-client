import { memo, useCallback, useState, useEffect } from 'react'
import { Minus, Plus, Trash2, Package, Percent, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CachedImage } from '@/components/common/CachedImage'
import { cn, getImageUrl } from '@/lib/utils'
import { useCurrency } from '@/hooks'

// ============================================
// Types
// ============================================

export interface CartItemBatchOption {
  id: number
  batchNo?: string | null
  expireDate?: string | null
  productStock?: number
  productSalePrice?: number
  disabled?: boolean
}

/** Display-oriented cart item interface for POS */
export interface CartItemDisplay {
  id: string
  productId: number
  productName: string
  productCode: string
  productImage?: string | null
  quantity: number
  salePrice: number
  costPrice?: number | null
  maxStock: number
  // Variant support
  variantId?: number | null
  variantName?: string | null
  variantSku?: string | null
  // Batch support
  batchNo?: string | null
  expiryDate?: string | null
  batchOptions?: CartItemBatchOption[]
  selectedBatchId?: number | null
  // Discount support
  discount?: number
  discountType?: 'fixed' | 'percentage'
}

export interface CartItemProps {
  /** Cart item data */
  item: CartItemDisplay
  /** Whether item is being edited */
  isEditing?: boolean
  /** Callback to update quantity */
  onUpdateQuantity: (itemId: string, quantity: number) => void
  /** Callback to update discount */
  onUpdateDiscount?: (itemId: string, discount: number, type: 'fixed' | 'percentage') => void
  /** Callback to remove item */
  onRemove: (itemId: string) => void
  /** Callback to change batch */
  onChangeBatch?: (itemId: string, batchId: number) => void
}

// ============================================
// Component
// ============================================

function CartItemComponent({
  item,
  isEditing = false,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemove,
  onChangeBatch,
}: CartItemProps) {
  const { format: formatCurrency } = useCurrency()
  const {
    id: itemId,
    productName,
    productCode,
    productImage,
    quantity,
    salePrice,
    maxStock,
    discount = 0,
    discountType = 'fixed',
  } = item
  const batchOptions = item.batchOptions ?? []
  const canChangeBatch = batchOptions.length > 1 && Boolean(onChangeBatch)
  const currentBatch = canChangeBatch
    ? (batchOptions.find((batch) => batch.id === item.selectedBatchId) ?? batchOptions[0])
    : null
  const batchLabel = currentBatch
    ? `${currentBatch.batchNo ? `Batch ${currentBatch.batchNo}` : `Batch #${currentBatch.id}`}${currentBatch.expireDate ? ` · Exp ${new Date(currentBatch.expireDate).toLocaleDateString()}` : ''}`
    : 'Select batch'
  const batchMeta = currentBatch
    ? `Stock: ${currentBatch.productStock ?? 0}${currentBatch.productSalePrice ? ` · ${formatCurrency(currentBatch.productSalePrice)}` : ''}`
    : 'Choose a batch to sync price'

  // Calculate discount amount and final price
  const subtotal = quantity * salePrice
  const discountAmount =
    discountType === 'percentage' ? subtotal * (discount / 100) : discount * quantity
  const lineTotal = Math.max(0, subtotal - discountAmount)

  const imageUrl = getImageUrl(productImage)

  // Discount popover state
  const [discountOpen, setDiscountOpen] = useState(false)
  const [amountStr, setAmountStr] = useState('')
  const [percentStr, setPercentStr] = useState('')
  const [batchOpen, setBatchOpen] = useState(false)

  // Sync local state when popover opens
  useEffect(() => {
    if (discountOpen) {
      if (discount === 0 && discountAmount === 0) {
        setAmountStr('')
        setPercentStr('')
        return
      }

      if (discountType === 'fixed') {
        setAmountStr(discount.toString())
        const pct = salePrice > 0 ? (discount / salePrice) * 100 : 0
        setPercentStr(pct.toFixed(2))
      } else {
        setPercentStr(discount.toString())
        const amt = (salePrice * discount) / 100
        setAmountStr(amt.toFixed(2))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountOpen])

  const handleDiscountAmountChange = (val: string) => {
    if (!onUpdateDiscount) return

    setAmountStr(val)
    const num = parseFloat(val)

    if (isNaN(num)) {
      setPercentStr('')
      if (val === '') onUpdateDiscount(itemId, 0, 'fixed')
      return
    }

    // Update percentage local state
    const pct = salePrice > 0 ? (num / salePrice) * 100 : 0
    setPercentStr(pct.toFixed(2))

    // Update store
    onUpdateDiscount(itemId, num, 'fixed')
  }

  const handleDiscountPercentChange = (val: string) => {
    if (!onUpdateDiscount) return

    setPercentStr(val)
    const num = parseFloat(val)

    if (isNaN(num)) {
      setAmountStr('')
      if (val === '') onUpdateDiscount(itemId, 0, 'percentage')
      return
    }

    // Update amount local state
    const amt = (salePrice * num) / 100
    setAmountStr(amt.toFixed(2))

    // Update store
    onUpdateDiscount(itemId, num, 'percentage')
  }

  const handleDiscountPreset = (pct: number) => {
    handleDiscountPercentChange(pct.toString())
  }

  const handleClearDiscount = (e: React.MouseEvent) => {
    if (!onUpdateDiscount) return
    e.stopPropagation()
    onUpdateDiscount(itemId, 0, 'fixed')
    setDiscountOpen(false)
  }

  const hasDiscount = discountAmount > 0

  const handleDecrement = useCallback(() => {
    if (quantity > 1) {
      onUpdateQuantity(itemId, quantity - 1)
    }
  }, [itemId, quantity, onUpdateQuantity])

  const handleIncrement = useCallback(() => {
    if (quantity < maxStock) {
      onUpdateQuantity(itemId, quantity + 1)
    }
  }, [itemId, quantity, maxStock, onUpdateQuantity])

  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQty = parseInt(e.target.value, 10)
      if (!isNaN(newQty) && newQty >= 1 && newQty <= maxStock) {
        onUpdateQuantity(itemId, newQty)
      }
    },
    [itemId, maxStock, onUpdateQuantity]
  )

  const handleRemove = useCallback(() => {
    onRemove(itemId)
  }, [itemId, onRemove])

  const handleBatchSelect = useCallback(
    (value: string) => {
      if (!onChangeBatch) return
      onChangeBatch(itemId, Number(value))
      setBatchOpen(false)
    },
    [itemId, onChangeBatch, setBatchOpen]
  )

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors',
        isEditing && 'border-primary bg-primary/5'
      )}
      role="listitem"
      aria-label={`${productName}, quantity ${quantity}, ${formatCurrency(lineTotal)}`}
    >
      {/* Product Image */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {imageUrl ? (
          <CachedImage
            src={imageUrl}
            alt={productName}
            className="h-full w-full object-cover"
            loading="lazy"
            fallback={<Package className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
          />
        ) : (
          <Package className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {/* Product Info */}
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium leading-tight">{productName}</h4>
        {/* Show variant name if present */}
        {item.variantName && <p className="truncate text-xs text-primary">{item.variantName}</p>}
        {/* Show batch info if present */}
        {item.batchNo && (
          <div className="flex items-center gap-1 text-xs text-primary">
            <Package className="h-3 w-3" aria-hidden="true" />
            <span>Batch: {item.batchNo}</span>
            {item.expiryDate && (
              <span className="text-muted-foreground">
                · Exp: {new Date(item.expiryDate).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
        {canChangeBatch && onChangeBatch && (
          <Popover open={batchOpen} onOpenChange={setBatchOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-2 inline-flex h-9 w-full items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 text-left text-xs font-semibold text-primary shadow-sm transition hover:border-primary"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Package className="h-3 w-3" aria-hidden="true" />
                  <span className="truncate uppercase tracking-wide">Batch & Pricing</span>
                </span>
                <span className="ml-2 hidden flex-1 truncate text-[10px] font-normal text-muted-foreground lg:block">
                  {batchLabel}
                </span>
                <ChevronDown className="ml-2 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-3 rounded-lg border border-primary/20 bg-background p-4 shadow-2xl">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Selected Batch</p>
                <p className="text-sm font-semibold text-foreground">{batchLabel}</p>
                <p className="text-[11px] text-muted-foreground">{batchMeta}</p>
              </div>
              <Select
                value={item.selectedBatchId ? item.selectedBatchId.toString() : undefined}
                onValueChange={handleBatchSelect}
              >
                <SelectTrigger className="h-10 w-full justify-between rounded-md border border-input bg-muted/40 px-3 text-left text-sm font-medium">
                  <SelectValue placeholder="Choose batch" />
                </SelectTrigger>
                <SelectContent className="max-h-60 w-full text-xs">
                  {batchOptions.map((batch) => (
                    <SelectItem
                      key={batch.id}
                      value={batch.id.toString()}
                      disabled={batch.disabled}
                      className="space-y-0.5 border-b border-border/40 py-2 text-xs last:border-none"
                    >
                      <div className="font-medium text-foreground">
                        {batch.batchNo ? `Batch ${batch.batchNo}` : `Batch #${batch.id}`}
                        {batch.expireDate
                          ? ` · Exp ${new Date(batch.expireDate).toLocaleDateString()}`
                          : ''}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Stock: {batch.productStock ?? 0}
                        {batch.productSalePrice
                          ? ` · ${formatCurrency(batch.productSalePrice)}`
                          : ''}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Selecting a batch automatically updates available quantity and unit price.
              </p>
            </PopoverContent>
          </Popover>
        )}
        <p className="text-xs text-muted-foreground">{item.variantSku || productCode}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {formatCurrency(salePrice)} × {quantity}
          </p>
          {hasDiscount && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              -{formatCurrency(discountAmount)}
            </span>
          )}
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleDecrement}
          disabled={quantity <= 1}
          aria-label={`Decrease ${productName} quantity`}
        >
          <Minus className="h-3 w-3" aria-hidden="true" />
        </Button>
        <Input
          type="number"
          value={quantity}
          onChange={handleQuantityChange}
          min={1}
          max={maxStock}
          className="h-7 w-12 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`${productName} quantity`}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleIncrement}
          disabled={quantity >= maxStock}
          aria-label={`Increase ${productName} quantity`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
        </Button>
      </div>

      {/* Line Total & Actions */}
      <div className="flex flex-col items-end gap-1">
        <span className="font-semibold">{formatCurrency(lineTotal)}</span>
        <div className="flex items-center gap-1">
          {/* Discount Button */}
          {onUpdateDiscount && (
            <Popover open={discountOpen} onOpenChange={setDiscountOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={hasDiscount ? 'default' : 'ghost'}
                  size="icon"
                  className={cn(
                    'h-7 w-7 transition-opacity',
                    hasDiscount
                      ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
                      : 'text-muted-foreground opacity-0 hover:bg-primary/10 group-hover:opacity-100'
                  )}
                  aria-label={`Set discount for ${productName}`}
                >
                  <Percent className="h-4 w-4" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end" side="left">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Item Discount</h4>
                    {hasDiscount && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-destructive hover:bg-destructive/10"
                        onClick={handleClearDiscount}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Clear
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${itemId}`} className="text-xs">
                        Amount
                      </Label>
                      <CurrencyInput
                        id={`amount-${itemId}`}
                        type="number"
                        value={amountStr}
                        onChange={(e) => handleDiscountAmountChange(e.target.value)}
                        className="h-9 text-sm"
                        placeholder="0.00"
                        min="0"
                        max={salePrice}
                        currencySymbol="Rs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`percent-${itemId}`} className="text-xs">
                        Percentage
                      </Label>
                      <div className="relative">
                        <Input
                          id={`percent-${itemId}`}
                          type="number"
                          value={percentStr}
                          onChange={(e) => handleDiscountPercentChange(e.target.value)}
                          className="h-9 pr-7 text-sm"
                          placeholder="0"
                          min="0"
                          max="100"
                        />
                        <Percent className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Quick Discount</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 15, 20].map((pct) => (
                        <Button
                          key={pct}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleDiscountPreset(pct)}
                        >
                          {pct}%
                        </Button>
                      ))}
                    </div>
                  </div>

                  {hasDiscount && (
                    <div className="rounded-md bg-green-50 p-2 dark:bg-green-950/30">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Original Price:</span>
                        <span>{formatCurrency(salePrice)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="text-green-600 dark:text-green-400">
                          -
                          {formatCurrency(
                            discountType === 'percentage' ? (salePrice * discount) / 100 : discount
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-green-200 pt-1 text-xs font-semibold dark:border-green-900">
                        <span>Final Price:</span>
                        <span>
                          {formatCurrency(
                            Math.max(
                              0,
                              salePrice -
                                (discountType === 'percentage'
                                  ? (salePrice * discount) / 100
                                  : discount)
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
            onClick={handleRemove}
            aria-label={`Remove ${productName} from cart`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export const CartItem = memo(CartItemComponent)

CartItem.displayName = 'CartItem'

export default CartItem
