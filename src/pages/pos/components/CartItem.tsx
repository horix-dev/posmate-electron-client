import { memo, useCallback } from 'react'
import { Minus, Plus, Trash2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
}

export interface CartItemProps {
  /** Cart item data */
  item: CartItemDisplay
  /** Whether item is being edited */
  isEditing?: boolean
  /** Callback to update quantity */
  onUpdateQuantity: (productId: number, quantity: number) => void
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
  onRemove,
}: CartItemProps) {
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency()
  const { productId, productName, productCode, productImage, quantity, salePrice, maxStock } = item
  const lineTotal = quantity * salePrice
  const imageUrl = getImageUrl(productImage)

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
        <p className="mt-1 text-sm text-muted-foreground">
          {formatCurrency(salePrice)} × {quantity}
        </p>
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

      {/* Line Total & Delete */}
      <div className="flex flex-col items-end gap-1">
        <span className="font-semibold">
          {formatCurrency(lineTotal)}
        </span>
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
  )
}

export const CartItem = memo(CartItemComponent)

CartItem.displayName = 'CartItem'

export default CartItem
