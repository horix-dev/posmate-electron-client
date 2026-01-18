import { memo, useMemo, useCallback, useState, useEffect } from 'react'
import {
  ShoppingCart,
  Pause,
  PlayCircle,
  Trash2,
  User,
  Receipt,
  CreditCard,
  Minus,
  Plus,
  Package,
  X,
  Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CachedImage } from '@/components/common/CachedImage'
import { useCurrency } from '@/hooks'
import { cn, getImageUrl } from '@/lib/utils'
import type { CartItemDisplay } from './CartItem'
import type { Party, PaymentType } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface CartTotals {
  subtotal: number
  vatAmount: number
  discountAmount: number
  total: number
}

export interface CartSidebarProps {
  /** Cart items */
  items: CartItemDisplay[]
  /** Selected customer */
  customer: Party | null
  /** Selected payment type */
  paymentType: PaymentType | null
  /** Cart totals */
  totals: CartTotals
  /** VAT percentage */
  vatPercentage: number
  /** Number of held carts */
  heldCartsCount: number
  /** Invoice number */
  invoiceNumber: string
  /** Discount value */
  discountValue: number
  /** Discount type */
  discountType: 'fixed' | 'percentage'
  /** Callback to update item quantity */
  onUpdateQuantity: (productId: number, quantity: number) => void
  /** Callback to remove item */
  onRemoveItem: (productId: number) => void
  /** Callback to clear cart */
  onClearCart: () => void
  /** Callback to hold cart */
  onHoldCart: () => void
  /** Callback to open held carts dialog */
  onOpenHeldCarts: () => void
  /** Callback to select customer */
  onSelectCustomer: () => void
  /** Callback to change discount */
  onDiscountChange: (value: number, type: 'fixed' | 'percentage') => void
  /** Callback to open payment dialog */
  onPayment: () => void
}

// ============================================
// Sub-components
// ============================================

interface CartHeaderProps {
  itemCount: number
  invoiceNumber: string
  customer: Party | null
  heldCartsCount: number
  onSelectCustomer: () => void
  onOpenHeldCarts: () => void
}

const CartHeader = memo(function CartHeader({
  itemCount,
  invoiceNumber,
  customer,
  heldCartsCount,
  onSelectCustomer,
  onOpenHeldCarts,
}: CartHeaderProps) {
  const { format: formatCurrency } = useCurrency()
  return (
    <CardHeader className="space-y-3 bg-sidebar px-4 pb-3 pt-4">
      {/* Invoice Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-white" aria-hidden="true" />
          <span className="text-sm font-medium text-white">{invoiceNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-white" aria-hidden="true" />
          <Badge variant="secondary">{itemCount}</Badge>
        </div>
      </div>

      {/* Customer & Held Carts */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-auto flex-1 flex-col items-start justify-start gap-2 py-2"
          onClick={onSelectCustomer}
        >
          <div className="flex w-full items-center gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">{customer?.name || 'Walk-in Customer'}</span>
          </div>
          {customer && customer.due > 0 && (
            <span className="text-xs text-muted-foreground">
              Due: {formatCurrency(customer.due)}
            </span>
          )}
        </Button>
        {heldCartsCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onOpenHeldCarts}>
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            <Badge variant="secondary" className="h-5 px-1.5">
              {heldCartsCount}
            </Badge>
          </Button>
        )}
      </div>
    </CardHeader>
  )
})

interface CartTotalsSectionProps {
  totals: CartTotals
  vatPercentage: number
  discountValue: number
  discountType: 'fixed' | 'percentage'
  onDiscountChange: (value: number, type: 'fixed' | 'percentage') => void
}

const CartTotalsSection = memo(function CartTotalsSection({
  totals,
  vatPercentage,
  discountValue,
  discountType,
  onDiscountChange,
}: CartTotalsSectionProps) {
  const { format: formatCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const [amountStr, setAmountStr] = useState('')
  const [percentStr, setPercentStr] = useState('')

  // Sync local state ONLY when popover opens to prevent overwriting user input while typing
  useEffect(() => {
    if (open) {
      if (discountValue === 0 && totals.discountAmount === 0) {
        setAmountStr('')
        setPercentStr('')
        return
      }

      if (discountType === 'fixed') {
        setAmountStr(discountValue.toString())
        const pct = totals.subtotal > 0 ? (discountValue / totals.subtotal) * 100 : 0
        setPercentStr(pct.toFixed(2))
      } else {
        setPercentStr(discountValue.toString())
        const amt = (totals.subtotal * discountValue) / 100
        setAmountStr(amt.toFixed(2))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleAmountChange = (val: string) => {
    setAmountStr(val)
    const num = parseFloat(val)

    if (isNaN(num)) {
      setPercentStr('')
      if (val === '') onDiscountChange(0, 'fixed')
      return
    }

    // Update Percentage local state
    const pct = totals.subtotal > 0 ? (num / totals.subtotal) * 100 : 0
    setPercentStr(pct.toFixed(2))

    // Update Store
    onDiscountChange(num, 'fixed')
  }

  const handlePercentChange = (val: string) => {
    setPercentStr(val)
    const num = parseFloat(val)

    if (isNaN(num)) {
      setAmountStr('')
      if (val === '') onDiscountChange(0, 'percentage')
      return
    }

    // Update Amount local state
    const amt = (totals.subtotal * num) / 100
    setAmountStr(amt.toFixed(2))

    // Update Store
    onDiscountChange(num, 'percentage')
  }

  const handlePreset = (pct: number) => {
    handlePercentChange(pct.toString())
  }

  const handleFlat50 = () => {
    // "Flat 50" -> Amount 50
    handleAmountChange('50')
  }

  const handleClearDiscount = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDiscountChange(0, 'fixed')
  }

  const hasDiscount = totals.discountAmount > 0

  return (
    <div className="shrink-0 space-y-3 border-t-2 border-primary/10 bg-primary/5 px-4 py-3 dark:bg-sidebar">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
      </div>

      {/* Discount Section - Floating Popover Matrix */}
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium transition-colors ${hasDiscount ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
        >
          Discount
        </span>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {hasDiscount ? (
              <div
                className="flex cursor-pointer items-center gap-1 rounded-full bg-green-100 py-0.5 pl-2 pr-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                role="button"
                tabIndex={0}
              >
                <span>
                  -{formatCurrency(totals.discountAmount)} (
                  {discountType === 'percentage' ? `${discountValue}%` : 'Fixed'})
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 rounded-full p-0 hover:bg-green-600 hover:text-white dark:hover:bg-green-400 dark:hover:text-black"
                  onClick={handleClearDiscount}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button variant="link" className="h-auto p-0 text-primary" size="sm">
                Add Discount
              </Button>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end" side="top">
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-xs">
                      Amount
                    </Label>
                    <CurrencyInput
                      id="amount"
                      type="number"
                      value={amountStr}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="0.00"
                      min="0"
                      currencySymbol="Rs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percent" className="text-xs">
                      Percentage
                    </Label>
                    <div className="relative">
                      <Input
                        id="percent"
                        type="number"
                        value={percentStr}
                        onChange={(e) => handlePercentChange(e.target.value)}
                        className="h-9 pr-7 text-sm"
                        placeholder="0"
                        min="0"
                        max="100"
                      />
                      <Percent className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 20].map((pct) => (
                  <Button
                    key={pct}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreset(pct)}
                    className="h-8 text-xs font-medium"
                  >
                    {pct}%
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFlat50}
                  className="h-8 text-xs font-medium"
                >
                  Flat 50
                </Button>
              </div>

              <div className="flex justify-end pt-2">
                <div className="text-xs text-muted-foreground">
                  Total:{' '}
                  <span className="font-bold text-primary">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">VAT ({vatPercentage}%)</span>
        <span>{formatCurrency(totals.vatAmount)}</span>
      </div>
      <Separator />
      <div className="flex items-end justify-between">
        <span className="pb-1 text-lg font-bold">Total</span>
        <span className="text-3xl font-bold tracking-tight text-primary">
          {formatCurrency(totals.total)}
        </span>
      </div>
    </div>
  )
})

interface EmptyCartProps {
  heldCartsCount: number
  onOpenHeldCarts: () => void
}

const EmptyCart = memo(function EmptyCart({ heldCartsCount, onOpenHeldCarts }: EmptyCartProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8">
      <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Cart is empty</p>
      <p className="mt-1 text-xs text-muted-foreground">Add products to start a sale</p>
      {heldCartsCount > 0 && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onOpenHeldCarts}>
          <PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          Recall Held Cart ({heldCartsCount})
        </Button>
      )}
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function CartSidebarComponent({
  items,
  customer,
  totals,
  discountValue,
  discountType,
  vatPercentage,
  heldCartsCount,
  invoiceNumber,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onHoldCart,
  onOpenHeldCarts,
  onSelectCustomer,
  onDiscountChange,
  onPayment,
}: CartSidebarProps) {
  const { format: formatCurrency } = useCurrency()
  const itemCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])

  // Reverse items to show newest first (Hero row at top)
  const reversedItems = useMemo(() => [...items].reverse(), [items])

  const isEmpty = items.length === 0

  const handleKeyboardPayment = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isEmpty) {
        e.preventDefault()
        onPayment()
      }
    },
    [isEmpty, onPayment]
  )

  return (
    <Card
      className="flex h-full min-h-0 flex-col border-0 bg-card shadow-none"
      role="region"
      aria-label="Shopping cart"
      onKeyDown={handleKeyboardPayment}
    >
      {/* Header */}
      <CartHeader
        itemCount={itemCount}
        invoiceNumber={invoiceNumber}
        customer={customer}
        heldCartsCount={heldCartsCount}
        onSelectCustomer={onSelectCustomer}
        onOpenHeldCarts={onOpenHeldCarts}
      />

      <Separator />

      {/* Cart Items */}
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-t-sidebar p-0">
        {isEmpty ? (
          <EmptyCart heldCartsCount={heldCartsCount} onOpenHeldCarts={onOpenHeldCarts} />
        ) : (
          <ScrollArea className="min-h-0 w-full flex-1">
            <div className="min-w-full">
              <table className="w-full text-sm" role="table" aria-label="Cart items">
                <thead className="sticky top-0 z-10 bg-sidebar text-xs text-sidebar-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-2 py-2 text-center font-medium">Qty</th>
                    <th className="px-2 py-2 text-right font-medium">Price</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="w-8 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {reversedItems.map((item, index) => {
                    const lineTotal = item.quantity * item.salePrice
                    const isHero = index === 0

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'border-b transition-colors duration-1000 ease-out',
                          isHero
                            ? 'bg-green-100/80 hover:bg-primary/5 dark:bg-green-900/40 dark:hover:bg-blue-900/50'
                            : 'hover:bg-muted/50'
                        )}
                        role="row"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-primary/5">
                              {getImageUrl(item.productImage) ? (
                                <CachedImage
                                  src={getImageUrl(item.productImage)!}
                                  alt={item.productName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Package className="h-5 w-5 text-primary/40" aria-hidden="true" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="line-clamp-2 font-medium leading-tight">
                                {item.productName}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground/90">
                                {item.productCode}
                              </span>
                              {item.variantName && (
                                <span className="text-[11px] font-normal leading-relaxed text-muted-foreground">
                                  {item.variantName}
                                </span>
                              )}
                              {item.batchNo && (
                                <span className="text-[11px] font-normal leading-3 text-muted-foreground">
                                  Batch: {item.batchNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label={`Decrease ${item.productName} quantity`}
                            >
                              <Minus className="h-3 w-3" aria-hidden="true" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value, 10)
                                if (!isNaN(newQty) && newQty >= 1 && newQty <= item.maxStock) {
                                  onUpdateQuantity(item.productId, newQty)
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              min={1}
                              max={item.maxStock}
                              className="h-6 w-12 cursor-pointer text-center text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              aria-label={`${item.productName} quantity`}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.maxStock}
                              aria-label={`Increase ${item.productName} quantity`}
                            >
                              <Plus className="h-3 w-3" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {formatCurrency(item.salePrice)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            onClick={() => onRemoveItem(item.productId)}
                            aria-label={`Remove ${item.productName} from cart`}
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Totals & Actions (pinned at bottom; items above scroll) */}
      <div className="shrink-0 bg-primary/5 dark:bg-sidebar">
        {!isEmpty && (
          <>
            <Separator className="shrink-0" />
            <CartTotalsSection
              totals={totals}
              vatPercentage={vatPercentage}
              discountValue={discountValue}
              discountType={discountType}
              onDiscountChange={onDiscountChange}
            />
          </>
        )}

        <CardFooter className="shrink-0 flex-col gap-2 bg-primary/5 px-4 pb-4 pt-2 dark:bg-sidebar">
          {/* Action Buttons + Payment in Single Row */}
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="h-14 flex-[1] flex-col gap-1.5 border-destructive text-sm font-bold text-destructive hover:bg-destructive/10"
              onClick={onClearCart}
              disabled={isEmpty}
            >
              <div className="flex items-center justify-center">
                <Trash2 className="mr-2 h-5 w-5" aria-hidden="true" />
                Clear
              </div>
              <kbd className="hidden rounded bg-destructive/20 px-1 text-[10px] font-normal opacity-50 sm:inline-block">
                Esc
              </kbd>
            </Button>
            <Button
              className="h-14 flex-[1] flex-col gap-1 bg-sky-500 text-sm font-bold text-white hover:bg-sky-600"
              onClick={onHoldCart}
              disabled={isEmpty}
            >
              <div className="flex items-center justify-center">
                <Pause className="mr-2 h-5 w-5" aria-hidden="true" />
                Hold
              </div>
              <kbd className="hidden rounded bg-white/20 px-1 text-[10px] font-normal opacity-75 sm:inline-block">
                H
              </kbd>
            </Button>
            <Button
              className="h-16 flex-[3] flex-col gap-1 bg-green-600 text-lg font-bold text-white hover:bg-green-700"
              onClick={onPayment}
              disabled={isEmpty}
            >
              <div className="flex items-center justify-center">
                <CreditCard className="mr-2 h-6 w-6" aria-hidden="true" />
                Pay
              </div>
              <kbd className="hidden rounded border border-white/30 bg-white/20 px-2 py-0.5 text-xs font-normal sm:inline-block">
                Space
              </kbd>
            </Button>
          </div>
        </CardFooter>
      </div>
    </Card>
  )
}

export const CartSidebar = memo(CartSidebarComponent)

CartSidebar.displayName = 'CartSidebar'

export default CartSidebar
