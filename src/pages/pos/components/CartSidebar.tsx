import { memo, useMemo, useCallback } from 'react'
import { ShoppingCart, Pause, PlayCircle, Trash2, User, Receipt, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCurrency } from '@/hooks'
import { CartItem, type CartItemDisplay } from './CartItem'
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
}

const CartTotalsSection = memo(function CartTotalsSection({
  totals,
  vatPercentage,
}: CartTotalsSectionProps) {
  const { format: formatCurrency } = useCurrency()
  return (
    <div className="space-y-2 bg-gray-200 px-4 py-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </div>
      {totals.discountAmount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Discount</span>
          <span>-{formatCurrency(totals.discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">VAT ({vatPercentage}%)</span>
        <span>{formatCurrency(totals.vatAmount)}</span>
      </div>
      <Separator />
      <div className="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span className="text-primary">{formatCurrency(totals.total)}</span>
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
  paymentType,
  totals,
  vatPercentage,
  heldCartsCount,
  invoiceNumber,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onHoldCart,
  onOpenHeldCarts,
  onSelectCustomer,
  onPayment,
}: CartSidebarProps) {
  const { format: formatCurrency } = useCurrency()
  const itemCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])

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
      className="flex h-full flex-col border-0 bg-card shadow-none"
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
      <CardContent className="flex-1 overflow-hidden p-0">
        {isEmpty ? (
          <EmptyCart heldCartsCount={heldCartsCount} onOpenHeldCarts={onOpenHeldCarts} />
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4" role="list" aria-label="Cart items">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveItem}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Totals & Actions */}
      {!isEmpty && (
        <>
          <Separator />
          <CartTotalsSection totals={totals} vatPercentage={vatPercentage} />
        </>
      )}

      <CardFooter className="flex-col gap-2 bg-gray-200 px-4 pb-4 pt-2">
        {/* Action Buttons */}
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onClearCart}
            disabled={isEmpty}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onHoldCart}
            disabled={isEmpty}
          >
            <Pause className="mr-2 h-4 w-4" aria-hidden="true" />
            Hold
          </Button>
        </div>

        {/* Payment Button */}
        <Button
          size="lg"
          variant={'success'}
          className="w-full text-base"
          onClick={onPayment}
          disabled={isEmpty}
        >
          <CreditCard className="mr-2 h-5 w-5" aria-hidden="true" />
          Pay {formatCurrency(totals.total)}
        </Button>

        {/* Payment Type Hint */}
        {paymentType && (
          <p className="text-xs text-muted-foreground">Payment: {paymentType.name}</p>
        )}
      </CardFooter>
    </Card>
  )
}

export const CartSidebar = memo(CartSidebarComponent)

CartSidebar.displayName = 'CartSidebar'

export default CartSidebar
