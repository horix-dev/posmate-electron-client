import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { CreditCard, Banknote, Wallet, CheckCircle2, Loader2, Calculator, X } from 'lucide-react'
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
import { useCurrency } from '@/hooks'
import { isCreditPaymentType } from '@/constants/payment-types'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import type { PaymentType, Party } from '@/types/api.types'

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
  /** Available payment types */
  paymentTypes: PaymentType[]
  /** Selected payment type */
  selectedPaymentType: PaymentType | null
  /** Selected customer (null for walk-in) */
  customer: Party | null
  /** Loading state */
  isProcessing: boolean
  /** Print receipt toggle */
  autoPrintReceipt: boolean
  /** Payment type change callback */
  onPaymentTypeChange: (paymentType: PaymentType) => void
  /** Process payment callback */
  onProcessPayment: (amountPaid: number, printReceipt: boolean) => void
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
  isDisabled?: boolean
  onClick: () => void
}

const PaymentTypeButton = memo(function PaymentTypeButton({
  paymentType,
  isSelected,
  isDisabled = false,
  onClick,
}: PaymentTypeButtonProps) {
  const icon = PAYMENT_TYPE_ICONS[paymentType.name.toLowerCase()] || PAYMENT_TYPE_ICONS.cash

  const handleClick = () => {
    if (isDisabled) {
      toast.info('💡 Credit payment requires a registered customer')
      return
    }
    onClick()
  }

  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      className={cn(
        'flex h-auto flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all',
        isSelected
          ? 'shadow-sm shadow-primary/30'
          : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600',
        isDisabled && 'opacity-60'
      )}
      onClick={handleClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
    >
      {icon}
      <span>{paymentType.name}</span>
    </Button>
  )
})

interface QuickAmountButtonProps {
  amount: number
  onClick: () => void
}

const QuickAmountButton = memo(function QuickAmountButton({
  amount,
  onClick,
}: QuickAmountButtonProps) {
  const { format: formatCurrency } = useCurrency()
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="h-9">
      {formatCurrency(amount)}
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
  paymentTypes,
  selectedPaymentType,
  customer,
  isProcessing,
  autoPrintReceipt,
  onPaymentTypeChange,
  onProcessPayment,
}: PaymentDialogProps) {
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency()
  const [amountPaid, setAmountPaid] = useState<string>(String(totalAmount))
  const amountInputRef = useRef<HTMLInputElement>(null)
  const [printEnabled, setPrintEnabled] = useState<boolean>(autoPrintReceipt)

  // Check if selected payment is credit/due
  const isCreditPayment = selectedPaymentType ? isCreditPaymentType(selectedPaymentType) : false

  // Check if customer is walk-in (null customer)
  const isWalkInCustomer = customer === null

  // Reset amount and set default payment type when dialog opens
  useEffect(() => {
    if (open) {
      setAmountPaid(String(totalAmount))

      // Set default payment type to Cash if none selected
      if (!selectedPaymentType && paymentTypes.length > 0) {
        const cashPayment = paymentTypes.find((pt) => pt.name.toLowerCase() === 'cash')
        if (cashPayment) {
          onPaymentTypeChange(cashPayment)
        }
      }

      // Auto-focus amount input after a short delay
      setTimeout(() => {
        amountInputRef.current?.focus()
        amountInputRef.current?.select()
      }, 100)
    }
  }, [open, totalAmount, selectedPaymentType, paymentTypes, onPaymentTypeChange])

  // Reset amount to 0 when credit/due payment type is selected
  useEffect(() => {
    if (isCreditPayment) {
      setAmountPaid('0')
    }
  }, [isCreditPayment])

  const numericAmount = useMemo(() => parseFloat(amountPaid) || 0, [amountPaid])

  const changeAmount = useMemo(
    () => Math.max(0, numericAmount - totalAmount),
    [numericAmount, totalAmount]
  )

  const dueAmount = useMemo(
    () => Math.max(0, totalAmount - numericAmount),
    [totalAmount, numericAmount]
  )

  const newCustomerDue = useMemo(
    () => (customer ? customer.due + dueAmount : dueAmount),
    [customer, dueAmount]
  )

  const exceedsCreditLimit = useMemo(() => {
    if (!customer || !customer.credit_limit || customer.credit_limit <= 0) return false
    return newCustomerDue > customer.credit_limit
  }, [customer, newCustomerDue])

  const isValidPayment = useMemo(() => {
    if (!selectedPaymentType) return false

    // For credit/due payment, allow 0 to totalAmount
    if (isCreditPayment) {
      // Must have a customer for credit payment
      if (!customer) return false
      // Amount must be between 0 and total
      if (numericAmount < 0 || numericAmount > totalAmount) return false
      // Cannot exceed credit limit
      if (exceedsCreditLimit) return false
      return true
    }

    // For actual payments, must pay at least the total amount
    return numericAmount >= totalAmount
  }, [
    numericAmount,
    totalAmount,
    selectedPaymentType,
    isCreditPayment,
    customer,
    exceedsCreditLimit,
  ])

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmountPaid(value)
    }
  }, [])

  const handleQuickAmount = useCallback((amount: number) => {
    setAmountPaid(String(amount))
  }, [])

  const handleExactAmount = useCallback(() => {
    setAmountPaid(String(totalAmount))
  }, [totalAmount])

  const handleProcessPayment = useCallback(() => {
    if (isValidPayment) {
      // Pass the entered amount for all payment types (including partial credit)
      onProcessPayment(numericAmount, printEnabled)
    }
  }, [isValidPayment, numericAmount, onProcessPayment, printEnabled])

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
        className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden"
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

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto pr-1 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Amount Summary */}
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
            </div>

            {/* Payment Types */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(paymentTypes || []).map((pt) => {
                  const isCreditType = isCreditPaymentType(pt)
                  const isDisabled = isCreditType && isWalkInCustomer

                  return (
                    <PaymentTypeButton
                      key={pt.id}
                      paymentType={pt}
                      isSelected={selectedPaymentType?.id === pt.id}
                      isDisabled={isDisabled}
                      onClick={() => onPaymentTypeChange(pt)}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Customer Info - Show for registered customers */}
            {customer && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  Customer Balance
                </p>
                <div className="mt-1 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Current Due:</span>
                    <span className="font-semibold text-blue-900 dark:text-blue-100">
                      {formatCurrency(customer.due)}
                    </span>
                  </div>
                  {customer.credit_limit != null && customer.credit_limit > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-700 dark:text-blue-300">Credit Limit:</span>
                        <span className="font-semibold text-blue-900 dark:text-blue-100">
                          {formatCurrency(customer.credit_limit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700 dark:text-blue-300">Available:</span>
                        <span className="font-semibold text-blue-900 dark:text-blue-100">
                          {formatCurrency(Math.max(0, customer.credit_limit - customer.due))}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Amount Paid Input - Now shown for all payment types */}
            <div className="space-y-2">
              <Label htmlFor="amount-paid">
                {isCreditPayment && customer
                  ? 'Amount Paid (Enter partial amount or adjust as needed)'
                  : 'Amount Received'}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currencySymbol}
                  </span>
                  <Input
                    ref={amountInputRef}
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
                <Button variant="outline" onClick={handleExactAmount} title="Exact amount">
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <QuickAmountButton
                    key={amount}
                    amount={amount}
                    onClick={() => handleQuickAmount(amount)}
                  />
                ))}
              </div>
            </div>

            {/* Due Amount Preview - Show for credit/partial payment */}
            {isCreditPayment && dueAmount > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Payment Summary
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-700 dark:text-orange-300">Amount Paying:</span>
                    <span className="font-semibold text-orange-900 dark:text-orange-100">
                      {formatCurrency(numericAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-700 dark:text-orange-300">Remaining Due:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(dueAmount)}
                    </span>
                  </div>
                  {customer && (
                    <div className="flex justify-between border-t border-orange-200 pt-1 dark:border-orange-800">
                      <span className="text-orange-700 dark:text-orange-300">
                        New Customer Due:
                      </span>
                      <span className="font-bold text-orange-900 dark:text-orange-100">
                        {formatCurrency(newCustomerDue)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credit Limit Warning */}
            {exceedsCreditLimit && customer && customer.credit_limit && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  ⚠️ Credit Limit Exceeded
                </p>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                  Customer {customer.name}'s credit limit would be exceeded.
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-red-700 dark:text-red-300">
                    <span>Current Due:</span>
                    <span>{formatCurrency(customer.due)}</span>
                  </div>
                  <div className="flex justify-between text-red-700 dark:text-red-300">
                    <span>New Due:</span>
                    <span>{formatCurrency(dueAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-red-200 pt-1 font-semibold text-red-900 dark:border-red-800 dark:text-red-100">
                    <span>Total:</span>
                    <span>{formatCurrency(newCustomerDue)}</span>
                  </div>
                  <div className="flex justify-between text-red-700 dark:text-red-300">
                    <span>Credit Limit:</span>
                    <span>{formatCurrency(customer.credit_limit)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Change Calculation - Hidden for credit/due payment */}
            {!isCreditPayment && numericAmount >= totalAmount && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
                <p className="text-sm text-green-700 dark:text-green-300">Change</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(changeAmount)}
                </p>
              </div>
            )}

            {/* Insufficient Amount Warning - Hidden for credit/due payment */}
            {!isCreditPayment && numericAmount < totalAmount && numericAmount > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center">
                <p className="text-sm text-destructive">
                  Insufficient amount. Need {formatCurrency(totalAmount - numericAmount)} more.
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <DialogFooter className="gap-2 sm:gap-0">
          {!autoPrintReceipt && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Switch checked={printEnabled} onCheckedChange={setPrintEnabled} />
              <Label htmlFor="print-toggle" className="text-sm">
                Print Receipt
              </Label>
            </div>
          )}

          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Cancel
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={!isValidPayment || isProcessing}
            variant={isCreditPayment ? 'default' : 'success'}
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
                {isCreditPayment ? 'Save Sale' : 'Complete Payment'}
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
