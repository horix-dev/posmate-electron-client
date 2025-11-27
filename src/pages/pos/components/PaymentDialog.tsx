import { memo, useState, useCallback, useMemo, useEffect } from 'react'
import {
  CreditCard,
  Banknote,
  Wallet,
  CheckCircle2,
  Loader2,
  Calculator,
  X,
} from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { PaymentType } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface PaymentDialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Close dialog callback */
  onClose: () => void
  /** Total amount to pay */
  totalAmount: number
  /** Currency symbol */
  currencySymbol: string
  /** Available payment types */
  paymentTypes: PaymentType[]
  /** Selected payment type */
  selectedPaymentType: PaymentType | null
  /** Loading state */
  isProcessing: boolean
  /** Payment type change callback */
  onPaymentTypeChange: (paymentType: PaymentType) => void
  /** Process payment callback */
  onProcessPayment: (amountPaid: number) => void
}

// ============================================
// Constants
// ============================================

const PAYMENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-5 w-5" />,
  card: <CreditCard className="h-5 w-5" />,
  credit: <Wallet className="h-5 w-5" />,
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000]

// ============================================
// Sub-components
// ============================================

interface PaymentTypeButtonProps {
  paymentType: PaymentType
  isSelected: boolean
  onClick: () => void
}

const PaymentTypeButton = memo(function PaymentTypeButton({
  paymentType,
  isSelected,
  onClick,
}: PaymentTypeButtonProps) {
  const icon =
    PAYMENT_TYPE_ICONS[paymentType.name.toLowerCase()] ||
    PAYMENT_TYPE_ICONS.cash

  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      className={cn(
        'h-auto flex-col gap-2 py-4',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      {icon}
      <span className="text-sm">{paymentType.name}</span>
    </Button>
  )
})

interface QuickAmountButtonProps {
  amount: number
  currencySymbol: string
  onClick: () => void
}

const QuickAmountButton = memo(function QuickAmountButton({
  amount,
  currencySymbol,
  onClick,
}: QuickAmountButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-9"
    >
      {currencySymbol}
      {amount.toLocaleString()}
    </Button>
  )
})

// ============================================
// Main Component
// ============================================

function PaymentDialogComponent({
  open,
  onClose,
  totalAmount,
  currencySymbol,
  paymentTypes,
  selectedPaymentType,
  isProcessing,
  onPaymentTypeChange,
  onProcessPayment,
}: PaymentDialogProps) {
  const [amountPaid, setAmountPaid] = useState<string>(String(totalAmount))

  // Reset amount when dialog opens
  useEffect(() => {
    if (open) {
      setAmountPaid(String(totalAmount))
    }
  }, [open, totalAmount])

  const numericAmount = useMemo(
    () => parseFloat(amountPaid) || 0,
    [amountPaid]
  )

  const changeAmount = useMemo(
    () => Math.max(0, numericAmount - totalAmount),
    [numericAmount, totalAmount]
  )

  const isValidPayment = useMemo(
    () => numericAmount >= totalAmount && selectedPaymentType !== null,
    [numericAmount, totalAmount, selectedPaymentType]
  )

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      // Allow only numbers and decimal point
      if (/^\d*\.?\d*$/.test(value)) {
        setAmountPaid(value)
      }
    },
    []
  )

  const handleQuickAmount = useCallback((amount: number) => {
    setAmountPaid(String(amount))
  }, [])

  const handleExactAmount = useCallback(() => {
    setAmountPaid(String(totalAmount))
  }, [totalAmount])

  const handleProcessPayment = useCallback(() => {
    if (isValidPayment) {
      onProcessPayment(numericAmount)
    }
  }, [isValidPayment, numericAmount, onProcessPayment])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && isValidPayment && !isProcessing) {
        e.preventDefault()
        handleProcessPayment()
      }
    },
    [isValidPayment, isProcessing, handleProcessPayment]
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md"
        onKeyDown={handleKeyDown}
        aria-describedby="payment-dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            Payment
          </DialogTitle>
          <DialogDescription id="payment-dialog-description">
            Complete the payment for this sale
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Summary */}
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Amount Due</p>
            <p className="text-3xl font-bold text-primary">
              {currencySymbol}
              {totalAmount.toLocaleString()}
            </p>
          </div>

          {/* Payment Types */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {paymentTypes.map((pt) => (
                <PaymentTypeButton
                  key={pt.id}
                  paymentType={pt}
                  isSelected={selectedPaymentType?.id === pt.id}
                  onClick={() => onPaymentTypeChange(pt)}
                />
              ))}
            </div>
          </div>

          {/* Amount Paid Input */}
          <div className="space-y-2">
            <Label htmlFor="amount-paid">Amount Paid</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  id="amount-paid"
                  type="text"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={handleAmountChange}
                  className={cn(
                    'pl-7 text-lg font-medium',
                    numericAmount < totalAmount && 'border-destructive'
                  )}
                  aria-label="Amount paid"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleExactAmount}
                title="Exact amount"
              >
                <Calculator className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((amount) => (
                <QuickAmountButton
                  key={amount}
                  amount={amount}
                  currencySymbol={currencySymbol}
                  onClick={() => handleQuickAmount(amount)}
                />
              ))}
            </div>
          </div>

          {/* Change Calculation */}
          {numericAmount >= totalAmount && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
              <p className="text-sm text-green-700 dark:text-green-300">
                Change
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {currencySymbol}
                {changeAmount.toLocaleString()}
              </p>
            </div>
          )}

          {/* Insufficient Amount Warning */}
          {numericAmount < totalAmount && numericAmount > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center">
              <p className="text-sm text-destructive">
                Insufficient amount. Need {currencySymbol}
                {(totalAmount - numericAmount).toLocaleString()} more.
              </p>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Cancel
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={!isValidPayment || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Complete Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const PaymentDialog = memo(PaymentDialogComponent)

PaymentDialog.displayName = 'PaymentDialog'

export default PaymentDialog
