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
  ChevronDown,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CachedImage } from '@/components/common/CachedImage'
import { toast } from 'sonner'
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
  onUpdateQuantity: (itemId: string, quantity: number) => void
  /** Callback to update item discount */
  onUpdateItemDiscount?: (itemId: string, discount: number, type: 'fixed' | 'percentage') => void
  /** Callback to remove item */
  onRemoveItem: (itemId: string) => void
  /** Callback to switch batches */
  onChangeBatch?: (itemId: string, batchId: number) => void
  /** Callback to open batch selector dialog */
  onOpenBatchSelector?: (itemId: string) => void
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
  totalCost: number
  vatPercentage: number
  discountValue: number
  discountType: 'fixed' | 'percentage'
  onDiscountChange: (value: number, type: 'fixed' | 'percentage') => void
}

const CartTotalsSection = memo(function CartTotalsSection({
  totals,
  totalCost,
  vatPercentage,
  discountValue,
  discountType,
  onDiscountChange,
}: CartTotalsSectionProps) {
  const { format: formatCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const [amountStr, setAmountStr] = useState('')
  const [percentStr, setPercentStr] = useState('')
  console.log('totals => ', totals)
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
                {[5, 10, 15, 20].map((pct) => (
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
              </div>

              <div className="space-y-1 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Total Cost:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total:</span>
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

// ============================================
// Cart Item Row with Discount Support
// ============================================

interface CartItemRowProps {
  item: CartItemDisplay
  isHero?: boolean
  showDiscountColumn?: boolean
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onUpdateDiscount?: (itemId: string, discount: number, type: 'fixed' | 'percentage') => void
  onRemoveItem: (itemId: string) => void
  onChangeBatch?: (itemId: string, batchId: number) => void
  onOpenBatchSelector?: (itemId: string) => void
}

const CartItemRow = memo(function CartItemRow({
  item,
  isHero = false,
  showDiscountColumn = false,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onChangeBatch,
  onOpenBatchSelector,
}: CartItemRowProps) {
  const { format: formatCurrency } = useCurrency()

  // Calculate discount and line total
  const itemDiscount = item.discount ?? 0
  const itemDiscountType = item.discountType ?? 'fixed'
  const subtotal = item.quantity * item.salePrice
  const discountAmount =
    itemDiscountType === 'percentage'
      ? subtotal * (itemDiscount / 100)
      : itemDiscount * item.quantity
  const lineTotal = Math.max(0, subtotal - discountAmount)
  const costPrice = item.costPrice ?? null
  const hasDiscount = discountAmount > 0
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

  // Discount popover state
  const [discountOpen, setDiscountOpen] = useState(false)
  const [amountStr, setAmountStr] = useState('')
  const [percentStr, setPercentStr] = useState('')
  const [activeDiscountType, setActiveDiscountType] = useState<'fixed' | 'percentage'>('percentage')
  const [batchOpen, setBatchOpen] = useState(false)

  // Sync local state when popover opens
  useEffect(() => {
    if (discountOpen) {
      if (itemDiscount === 0 && discountAmount === 0) {
        setAmountStr('')
        setPercentStr('')
        setActiveDiscountType('percentage')
        return
      }

      setActiveDiscountType(itemDiscountType)
      if (itemDiscountType === 'fixed') {
        setAmountStr(itemDiscount.toString())
        const pct = item.salePrice > 0 ? (itemDiscount / item.salePrice) * 100 : 0
        setPercentStr(pct.toFixed(2))
      } else {
        setPercentStr(itemDiscount.toString())
        const amt = (item.salePrice * itemDiscount) / 100
        setAmountStr(amt.toFixed(2))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountOpen])

  const handleDiscountAmountChange = (val: string) => {
    setAmountStr(val)
    setActiveDiscountType('fixed')
    const num = parseFloat(val)

    if (isNaN(num)) {
      setPercentStr('')
      return
    }

    // Update percentage local state only (don't apply yet)
    const pct = item.salePrice > 0 ? (num / item.salePrice) * 100 : 0
    setPercentStr(pct.toFixed(2))
  }

  const handleDiscountPercentChange = (val: string) => {
    setPercentStr(val)
    setActiveDiscountType('percentage')
    const num = parseFloat(val)

    if (isNaN(num)) {
      setAmountStr('')
      return
    }

    // Update amount local state only (don't apply yet)
    const amt = (item.salePrice * num) / 100
    setAmountStr(amt.toFixed(2))
  }

  const handleDiscountPreset = (pct: number) => {
    handleDiscountPercentChange(pct.toString())
  }

  const handleApplyDiscount = () => {
    if (!onUpdateDiscount) return

    // Apply the discount based on the active discount type
    if (activeDiscountType === 'percentage' && percentStr && parseFloat(percentStr) > 0) {
      const num = parseFloat(percentStr)
      // Validate percentage doesn't exceed 100%
      if (num > 100) {
        toast.error('Discount cannot exceed 100%')
        return
      }
      onUpdateDiscount(item.id, num, 'percentage')
    } else if (activeDiscountType === 'fixed' && amountStr && parseFloat(amountStr) > 0) {
      const num = parseFloat(amountStr)
      // Validate fixed discount doesn't exceed product price
      if (num > item.salePrice) {
        toast.error(`Discount cannot exceed product price (${formatCurrency(item.salePrice)})`)
        return
      }
      onUpdateDiscount(item.id, num, 'fixed')
    } else {
      // Clear discount if both are empty
      onUpdateDiscount(item.id, 0, 'fixed')
    }

    setDiscountOpen(false)
  }

  const handleClearDiscount = () => {
    if (!onUpdateDiscount) return
    onUpdateDiscount(item.id, 0, 'fixed')
    setAmountStr('')
    setPercentStr('')
    setDiscountOpen(false)
  }

  return (
    <tr
      className={cn(
        'group border-b transition-colors duration-1000 ease-out',
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
            <span className="line-clamp-2 font-medium leading-tight">{item.productName}</span>
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
            {canChangeBatch && onChangeBatch && onOpenBatchSelector && (
              <button
                type="button"
                className="mt-2 inline-flex h-9 w-full items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 text-left text-[11px] font-semibold text-primary shadow-sm transition hover:border-primary"
                onClick={() => onOpenBatchSelector(item.id)}
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
            )}
            {canChangeBatch && onChangeBatch && !onOpenBatchSelector && (
              <Popover open={batchOpen} onOpenChange={setBatchOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="mt-2 inline-flex h-9 w-full items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 text-left text-[11px] font-semibold text-primary shadow-sm transition hover:border-primary"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Package className="h-3 w-3" aria-hidden="true" />
                      <span className="truncate uppercase tracking-wide">Batch & Pricing</span>
                    </span>
                    <span className="ml-2 hidden flex-1 truncate text-[10px] font-normal text-muted-foreground lg:block">
                      {batchLabel}
                    </span>
                    <ChevronDown
                      className="ml-2 h-3 w-3 shrink-0 text-primary"
                      aria-hidden="true"
                    />
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
                    onValueChange={(value) => {
                      onChangeBatch(item.id, Number(value))
                      setBatchOpen(false)
                    }}
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
          </div>
        </div>
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
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
                onUpdateQuantity(item.id, newQty)
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
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            disabled={item.quantity >= item.maxStock}
            aria-label={`Increase ${item.productName} quantity`}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.salePrice)}</td>
      {showDiscountColumn && (
        <td className="px-3 py-2 text-right">
          {hasDiscount ? (
            <div className="flex flex-col items-end tabular-nums">
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {formatCurrency(discountAmount)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({itemDiscountType === 'percentage' ? `${itemDiscount}%` : 'Fixed'})
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
      )}
      <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
        {formatCurrency(lineTotal)}
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          {/* Discount Button */}
          {onUpdateDiscount && (
            <Popover open={discountOpen} onOpenChange={setDiscountOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={hasDiscount ? 'default' : 'ghost'}
                  size="icon"
                  className={cn(
                    'h-6 w-6',
                    hasDiscount
                      ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
                      : 'text-muted-foreground hover:bg-primary/10'
                  )}
                  aria-label={`Set discount for ${item.productName}`}
                >
                  <Percent className="h-3 w-3" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-72 p-4"
                align="end"
                side="left"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    handleApplyDiscount()
                  }
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Item Discount</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/30 p-2 text-xs">
                    <div className="flex flex-col items-center justify-between">
                      <span className="text-muted-foreground">Cost Price:</span>
                      <span className="font-medium">
                        {costPrice != null ? formatCurrency(costPrice) : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-between">
                      <span className="text-muted-foreground">Sale Price:</span>
                      <span className="font-medium">{formatCurrency(item.salePrice)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${item.id}`} className="text-xs">
                        Amount (per unit)
                      </Label>
                      <CurrencyInput
                        id={`amount-${item.id}`}
                        type="number"
                        value={amountStr}
                        onChange={(e) => handleDiscountAmountChange(e.target.value)}
                        className="h-9 text-sm"
                        placeholder="0.00"
                        min="0"
                        max={item.salePrice}
                        currencySymbol="Rs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`percent-${item.id}`} className="text-xs">
                        Percentage
                      </Label>
                      <div className="relative">
                        <Input
                          id={`percent-${item.id}`}
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
                        <span className="text-muted-foreground">Unit Price:</span>
                        <span>{formatCurrency(item.salePrice)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Discount (per unit):</span>
                        <span className="text-green-600 dark:text-green-400">
                          -
                          {formatCurrency(
                            itemDiscountType === 'percentage'
                              ? (item.salePrice * itemDiscount) / 100
                              : itemDiscount
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-green-200 pt-1 text-xs font-semibold dark:border-green-900">
                        <span>Final Unit Price:</span>
                        <span>
                          {formatCurrency(
                            Math.max(
                              0,
                              item.salePrice -
                                (itemDiscountType === 'percentage'
                                  ? (item.salePrice * itemDiscount) / 100
                                  : itemDiscount)
                            )
                          )}
                        </span>
                      </div>
                      <div className="mt-2 border-t border-green-200 pt-1 dark:border-green-900">
                        <div className="flex justify-between text-xs font-bold">
                          <span>Total Discount:</span>
                          <span className="text-green-600 dark:text-green-400">
                            -{formatCurrency(discountAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">× {item.quantity} units</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleClearDiscount}
                      disabled={!hasDiscount}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={handleApplyDiscount}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:bg-destructive/10"
            onClick={() => onRemoveItem(item.id)}
            aria-label={`Remove ${item.productName} from cart`}
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
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
  onUpdateItemDiscount,
  onRemoveItem,
  onChangeBatch,
  onOpenBatchSelector,
  onClearCart,
  onHoldCart,
  onOpenHeldCarts,
  onSelectCustomer,
  onDiscountChange,
  onPayment,
}: CartSidebarProps) {
  const itemCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])

  const totalCost = useMemo(
    () => items.reduce((sum, item) => sum + (item.costPrice ?? 0) * item.quantity, 0),
    [items]
  )

  // Check if any item has a discount
  const hasAnyDiscount = useMemo(() => items.some((item) => (item.discount ?? 0) > 0), [items])

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
                    <th className="px-3 py-2 text-right font-medium">Price</th>
                    {hasAnyDiscount && (
                      <th className="px-3 py-2 text-right font-medium">Discount</th>
                    )}
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="w-16 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {reversedItems.map((item, index) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      isHero={index === 0}
                      showDiscountColumn={hasAnyDiscount}
                      onUpdateQuantity={onUpdateQuantity}
                      onUpdateDiscount={onUpdateItemDiscount}
                      onRemoveItem={onRemoveItem}
                      onChangeBatch={onChangeBatch}
                      onOpenBatchSelector={onOpenBatchSelector}
                    />
                  ))}
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
              totalCost={totalCost}
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
