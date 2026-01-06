import { useCallback, useMemo } from 'react'
import { useBusinessStore, useCurrencyStore } from '@/stores'

// ============================================
// Types
// ============================================

export interface CurrencyConfig {
  id: number
  symbol: string
  code: string
  name: string
  position: 'before' | 'after'
  decimalPlaces: number
}

// Map API position values to internal format
const normalizePosition = (position: string | undefined): 'before' | 'after' => {
  if (position === 'right' || position === 'after') return 'after'
  return 'before' // 'left' or 'before' or undefined -> before
}

export interface UseCurrencyReturn {
  /** Full currency configuration */
  currency: CurrencyConfig
  /** Format a number as currency string */
  format: (amount: number | string | undefined | null) => string
  /** Currency symbol (e.g., "$", "€", "৳") */
  symbol: string
  /** Currency code (e.g., "USD", "EUR", "BDT") */
  code: string
  /** Whether currency is being loaded */
  isLoading: boolean
}

// ============================================
// Default Currency (fallback)
// ============================================

const DEFAULT_CURRENCY: CurrencyConfig = {
  id: 0,
  symbol: '$',
  code: 'USD',
  name: 'US Dollar',
  position: 'before',
  decimalPlaces: 2,
}

// ============================================
// Hook
// ============================================

/**
 * Hook for accessing currency formatting in React components.
 * Uses active currency from Zustand store (pre-fetched on app load) and falls back to business store currency.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { format, symbol } = useCurrency();
 *   return <span>{format(1234.56)}</span>; // "$1234.56" or "1234.56$"
 * }
 * ```
 */
export function useCurrency(): UseCurrencyReturn {
  // Primary source: dedicated currency store (from /currencies/business/active API)
  const activeCurrency = useCurrencyStore((state) => state.activeCurrency)
  const currencyLoading = useCurrencyStore((state) => state.isLoading)

  // Fallback source: business store currency
  const businessCurrency = useBusinessStore((state) => state.business?.business_currency)

  const currency = useMemo<CurrencyConfig>(() => {
    // Priority 1: Active currency from dedicated API
    if (activeCurrency) {
      return {
        id: activeCurrency.id ?? 0,
        symbol: activeCurrency.symbol || '$',
        code: activeCurrency.code || 'USD',
        name: activeCurrency.name || 'US Dollar',
        position: normalizePosition(activeCurrency.position),
        decimalPlaces: 2,
      }
    }

    // Priority 2: Business store currency (fallback)
    if (businessCurrency && typeof businessCurrency !== 'string') {
      return {
        id: businessCurrency.id ?? 0,
        symbol: businessCurrency.symbol || '$',
        code: businessCurrency.code || 'USD',
        name: businessCurrency.name || 'US Dollar',
        position: normalizePosition(businessCurrency.position),
        decimalPlaces: 2,
      }
    }

    // Priority 3: Default
    return DEFAULT_CURRENCY
  }, [activeCurrency, businessCurrency])

  const format = useCallback(
    (amount: number | string | undefined | null): string => {
      if (amount === undefined || amount === null || amount === '') {
        return currency.position === 'before'
          ? `${currency.symbol} 0.00`
          : `0.00 ${currency.symbol}`
      }

      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount

      if (isNaN(numericAmount)) {
        return currency.position === 'before'
          ? `${currency.symbol} 0.00`
          : `0.00 ${currency.symbol}`
      }

      const formatted = numericAmount.toLocaleString('en-US', {
        minimumFractionDigits: currency.decimalPlaces,
        maximumFractionDigits: currency.decimalPlaces,
      })

      if (currency.position === 'after') {
        return `${formatted} ${currency.symbol}`
      }
      return `${currency.symbol} ${formatted}`
    },
    [currency]
  )

  return {
    currency,
    format,
    symbol: currency.symbol,
    code: currency.code,
    isLoading: currencyLoading,
  }
}

// ============================================
// Utility function for non-React usage
// ============================================

/**
 * Format a number as currency using the current active currency.
 * For use outside of React components.
 *
 * Priority: Active currency store > Business store currency > Default
 *
 * @example
 * ```ts
 * import { formatCurrency } from '@/hooks/useCurrency';
 * const price = formatCurrency(99.99); // "$99.99" or "99.99$"
 * ```
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  options?: Partial<CurrencyConfig>
): string {
  // Priority 1: Currency store (from /currencies/business/active API)
  const currencyState = useCurrencyStore.getState()
  const activeCurrency = currencyState.activeCurrency

  // Priority 2: Business store currency (fallback)
  const businessState = useBusinessStore.getState()
  const businessCurrency = businessState.business?.business_currency

  let config: CurrencyConfig = DEFAULT_CURRENCY

  if (activeCurrency) {
    config = {
      id: activeCurrency.id ?? 0,
      symbol: activeCurrency.symbol || '$',
      code: activeCurrency.code || 'USD',
      name: activeCurrency.name || 'US Dollar',
      position: normalizePosition(activeCurrency.position),
      decimalPlaces: 2,
    }
  } else if (businessCurrency && typeof businessCurrency !== 'string') {
    config = {
      id: businessCurrency.id ?? 0,
      symbol: businessCurrency.symbol || '$',
      code: businessCurrency.code || 'USD',
      name: businessCurrency.name || 'US Dollar',
      position: normalizePosition(businessCurrency.position),
      decimalPlaces: 2,
    }
  }

  // Apply overrides
  if (options) {
    config = { ...config, ...options }
  }

  if (amount === undefined || amount === null || amount === '') {
    return config.position === 'before' ? `${config.symbol} 0.00` : `0.00 ${config.symbol}`
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numericAmount)) {
    return config.position === 'before' ? `${config.symbol} 0.00` : `0.00 ${config.symbol}`
  }

  const formatted = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  })

  if (config.position === 'after') {
    return `${formatted} ${config.symbol}`
  }
  return `${config.symbol} ${formatted}`
}

/**
 * Get just the currency symbol from the store
 * Priority: Active currency store > Business store currency > Default
 */
export function getCurrencySymbol(): string {
  // Priority 1: Currency store
  const currencyState = useCurrencyStore.getState()
  if (currencyState.activeCurrency?.symbol) {
    return currencyState.activeCurrency.symbol
  }

  // Priority 2: Business store
  const businessState = useBusinessStore.getState()
  const businessCurrency = businessState.business?.business_currency

  if (businessCurrency && typeof businessCurrency !== 'string') {
    return businessCurrency.symbol || '$'
  }
  return '$'
}

/**
 * Refresh the active currency from the API
 * Call this after changing currency in settings
 */
export async function refreshActiveCurrency(): Promise<void> {
  await useCurrencyStore.getState().fetchActiveCurrency()
}

export default useCurrency
