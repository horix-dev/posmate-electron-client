import { memo, useCallback } from 'react'
import {
  PlayCircle,
  Trash2,
  Clock,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { HeldCart } from '@/stores/cart.store'

// ============================================
// Types
// ============================================

export interface HeldCartsDialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Close dialog callback */
  onClose: () => void
  /** Held carts data */
  heldCarts: HeldCart[]
  /** Currency symbol */
  currencySymbol: string
  /** Recall cart callback */
  onRecallCart: (cartId: string) => void
  /** Delete held cart callback */
  onDeleteCart: (cartId: string) => void
}

// ============================================
// Sub-components
// ============================================

interface HeldCartCardProps {
  cart: HeldCart
  currencySymbol: string
  onRecall: () => void
  onDelete: () => void
}

const HeldCartCard = memo(function HeldCartCard({
  cart,
  currencySymbol,
  onRecall,
  onDelete,
}: HeldCartCardProps) {
  const itemCount = cart.items.reduce((acc, item) => acc + item.quantity, 0)
  const total = cart.items.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  )
  const holdTime = new Date(cart.timestamp)

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {/* Customer Info */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">
              {cart.customer?.name || 'Walk-in Customer'}
            </span>
          </div>

          {/* Hold Note */}
          {cart.note && (
            <p className="text-sm text-muted-foreground italic">
              &quot;{cart.note}&quot;
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              {itemCount} item{itemCount !== 1 && 's'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {holdTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Total & Actions */}
        <div className="flex flex-col items-end gap-2">
          <Badge variant="secondary" className="text-base">
            {currencySymbol}
            {total.toLocaleString()}
          </Badge>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onDelete}
              aria-label="Delete held cart"
            >
              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
            </Button>
            <Button size="sm" className="h-8 gap-1" onClick={onRecall}>
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Recall
            </Button>
          </div>
        </div>
      </div>

      {/* Item Preview */}
      <div className="mt-3 flex flex-wrap gap-1">
        {cart.items.slice(0, 3).map((item) => (
          <Badge key={item.id} variant="outline" className="font-normal">
            {item.product.productName} ×{item.quantity}
          </Badge>
        ))}
        {cart.items.length > 3 && (
          <Badge variant="outline" className="font-normal">
            +{cart.items.length - 3} more
          </Badge>
        )}
      </div>
    </div>
  )
})

interface EmptyStateProps {
  onClose: () => void
}

const EmptyState = memo(function EmptyState({ onClose }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <ShoppingBag
        className="mb-4 h-12 w-12 text-muted-foreground/50"
        aria-hidden="true"
      />
      <h3 className="text-lg font-semibold">No held carts</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Hold a cart to continue later
      </p>
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function HeldCartsDialogComponent({
  open,
  onClose,
  heldCarts,
  currencySymbol,
  onRecallCart,
  onDeleteCart,
}: HeldCartsDialogProps) {
  const handleRecall = useCallback(
    (cartId: string) => {
      onRecallCart(cartId)
      onClose()
    },
    [onRecallCart, onClose]
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg"
        aria-describedby="held-carts-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" aria-hidden="true" />
            Held Carts
            {heldCarts.length > 0 && (
              <Badge variant="secondary">{heldCarts.length}</Badge>
            )}
          </DialogTitle>
          <DialogDescription id="held-carts-description">
            Select a cart to continue where you left off
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {heldCarts.length === 0 ? (
          <EmptyState onClose={onClose} />
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {heldCarts.map((cart) => (
                <HeldCartCard
                  key={cart.id}
                  cart={cart}
                  currencySymbol={currencySymbol}
                  onRecall={() => handleRecall(cart.id)}
                  onDelete={() => onDeleteCart(cart.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {heldCarts.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" aria-hidden="true" />
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const HeldCartsDialog = memo(HeldCartsDialogComponent)

HeldCartsDialog.displayName = 'HeldCartsDialog'

export default HeldCartsDialog
