/**
 * Smart Tender Component
 *
 * Displays smart cash tender buttons based on the total amount
 * Replaces the product grid when payment is initiated for quick cash transactions
 */

import { memo, useMemo } from 'react'
import { CheckCircle, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrency } from '@/hooks'

// ============================================
// Types
// ============================================

export interface SmartTenderProps {
  /** Total amount to pay */
  totalAmount: number
  /** Callback when amount is selected */
  onAmountSelect: (amount: number) => void
  /** Callback to cancel and go back */
  onCancel: () => void
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate smart tender amounts based on total
 * Uses Sri Lankan currency denominations: 1, 2, 5, 10, 20, 50, 100, 200, 1000, 5000
 * Returns 4 convenient denominations slightly above the total
 */
function generateSmartAmounts(total: number): number[] {
  const amounts: number[] = []

  // Round up to get practical tender amounts
  if (total <= 10) {
    // For very small amounts, use exact denominations
    const denominations = [10, 20, 50, 100]
    for (const denom of denominations) {
      if (denom >= total) amounts.push(denom)
      if (amounts.length >= 4) break
    }
  } else if (total <= 50) {
    // Round to nearest 10 or 20
    amounts.push(Math.ceil(total / 10) * 10)
    amounts.push(Math.ceil(total / 20) * 20 + 20)
    amounts.push(100)
    amounts.push(200)
  } else if (total <= 200) {
    // Round to nearest 50 or 100
    amounts.push(Math.ceil(total / 50) * 50)
    amounts.push(Math.ceil(total / 100) * 100)
    amounts.push(200)
    amounts.push(500)
  } else if (total <= 1000) {
    // Round to nearest 100 or 200
    amounts.push(Math.ceil(total / 100) * 100)
    amounts.push(Math.ceil(total / 200) * 200)
    amounts.push(1000)
    amounts.push(2000)
  } else if (total <= 5000) {
    // For amounts 1000-5000, provide practical increments
    const rounded100 = Math.ceil(total / 100) * 100
    const rounded500 = Math.ceil(total / 500) * 500
    const rounded1000 = Math.ceil(total / 1000) * 1000

    amounts.push(rounded100) // Nearest 100 (e.g., 1280 -> 1300)
    if (rounded500 > rounded100) amounts.push(rounded500) // Nearest 500 (e.g., 1500)
    if (rounded1000 > rounded500) amounts.push(rounded1000) // Nearest 1000 (e.g., 2000)
    amounts.push(5000) // Always include 5000 note
  } else {
    // For large amounts, round to nearest 1000
    const rounded = Math.ceil(total / 1000) * 1000
    amounts.push(rounded)
    amounts.push(rounded + 1000)
    amounts.push(rounded + 2000)
    amounts.push(rounded + 5000)
  }

  // Remove duplicates and sort
  const uniqueAmounts = [...new Set(amounts)].sort((a, b) => a - b)

  return uniqueAmounts.slice(0, 4)
}

// ============================================
// Main Component
// ============================================

function SmartTenderComponent({ totalAmount, onAmountSelect, onCancel }: SmartTenderProps) {
  const { format: formatCurrency } = useCurrency()

  const smartAmounts = useMemo(() => generateSmartAmounts(totalAmount), [totalAmount])

  return (
    <Card className="flex h-full flex-col border-0 bg-background shadow-none">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-5 w-5" />
            Smart Tender
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Back to Products
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Select quick tender amount or use custom payment
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-center gap-4 p-6">
        {/* Total Amount Display */}
        <div className="mb-4 rounded-lg bg-primary/10 p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
        </div>

        {/* Smart Amount Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {smartAmounts.map((amount) => {
            const change = amount - totalAmount
            return (
              <Button
                key={amount}
                variant="outline"
                className="h-24 flex-col gap-1 text-lg font-semibold hover:bg-primary hover:text-primary-foreground"
                onClick={() => onAmountSelect(amount)}
              >
                <span>{formatCurrency(amount)}</span>
                {change > 0 && (
                  <span className="text-xs font-normal opacity-70">
                    Change: {formatCurrency(change)}
                  </span>
                )}
              </Button>
            )
          })}
        </div>

        {/* Exact Amount Button */}
        <Button className="h-16 text-lg font-bold" onClick={() => onAmountSelect(totalAmount)}>
          <CheckCircle className="mr-2 h-5 w-5" />
          Exact Amount - {formatCurrency(totalAmount)}
        </Button>

        {/* Custom Amount Hint */}
        <p className="text-center text-xs text-muted-foreground">
          For custom amounts or card payments, use the payment dialog
        </p>
      </CardContent>
    </Card>
  )
}

export const SmartTender = memo(SmartTenderComponent)

SmartTender.displayName = 'SmartTender'

export default SmartTender
