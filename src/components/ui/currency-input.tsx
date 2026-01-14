import React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps extends React.ComponentProps<typeof Input> {
  currencySymbol?: string
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currencySymbol = 'Rs', className, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {currencySymbol}
        </span>
        <Input ref={ref} {...props} className={cn('pl-9', className)} />
      </div>
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
