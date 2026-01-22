import { memo, useCallback, useState, useEffect } from 'react'
import { Minus, Plus, Trash2, Package, Percent, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CachedImage } from '@/components/common/CachedImage'
import { cn, getImageUrl } from '@/lib/utils'
import { useCurrency } from '@/hooks'

// ============================================
// Types
// ============================================

/** Display-oriented cart item interface for POS */
export interface CartItemDisplay {
  id: string
  productId: number
  productName: string
  productCode: string
  productImage?: string | null
  quantity: number
  salePrice: number
  maxStock: number
  // Variant support
  variantId?: number | null
  variantName?: string | null
  variantSku?: string | null
  // Batch support
  batchNo?: string | null
  expiryDate?: string | null
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
  onUpdateQuantity: (productId: number, quantity: number) => void
  /** Callback to update discount */
  onUpdateDiscount?: (productId: number, discount: number, type: 'fixed' | 'percentage') => void
  /** Callback to remove item */
  onRemove: (productId: number) => void
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
}: CartItemProps) {
  const { format: formatCurrency } = useCurrency()
  const {
    productId,
    productName,
    productCode,
    productImage,
    quantity,
    salePrice,
    maxStock,
    discount = 0,
    discountType = 'fixed',
  } = item

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
      if (val === '') onUpdateDiscount(productId, 0, 'fixed')
      return
    }

    // Update percentage local state
    const pct = salePrice > 0 ? (num / salePrice) * 100 : 0
    setPercentStr(pct.toFixed(2))

    // Update store
    onUpdateDiscount(productId, num, 'fixed')
  }

  const handleDiscountPercentChange = (val: string) => {
    if (!onUpdateDiscount) return

    setPercentStr(val)
    const num = parseFloat(val)

    if (isNaN(num)) {
      setAmountStr('')
      if (val === '') onUpdateDiscount(productId, 0, 'percentage')
      return
    }

    // Update amount local state
    const amt = (salePrice * num) / 100
    setAmountStr(amt.toFixed(2))

    // Update store
    onUpdateDiscount(productId, num, 'percentage')
  }

  const handleDiscountPreset = (pct: number) => {
    handleDiscountPercentChange(pct.toString())
  }

  const handleClearDiscount = (e: React.MouseEvent) => {
    if (!onUpdateDiscount) return
    e.stopPropagation()
    onUpdateDiscount(productId, 0, 'fixed')
    setDiscountOpen(false)
  }

  const hasDiscount = discountAmount > 0

  const handleDecrement = useCallback(() => {
    if (quantity > 1) {
      onUpdateQuantity(productId, quantity - 1)
    }
  }, [productId, quantity, onUpdateQuantity])

  const handleIncrement = useCallback(() => {
    if (quantity < maxStock) {
      onUpdateQuantity(productId, quantity + 1)
    }
  }, [productId, quantity, maxStock, onUpdateQuantity])

  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQty = parseInt(e.target.value, 10)
      if (!isNaN(newQty) && newQty >= 1 && newQty <= maxStock) {
        onUpdateQuantity(productId, newQty)
      }
    },
    [productId, maxStock, onUpdateQuantity]
  )

  const handleRemove = useCallback(() => {
    onRemove(productId)
  }, [productId, onRemove])

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
                      <Label htmlFor={`amount-${productId}`} className="text-xs">
                        Amount
                      </Label>
                      <CurrencyInput
                        id={`amount-${productId}`}
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
                      <Label htmlFor={`percent-${productId}`} className="text-xs">
                        Percentage
                      </Label>
                      <div className="relative">
                        <Input
                          id={`percent-${productId}`}
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
