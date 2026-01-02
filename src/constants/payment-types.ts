/**
 * Payment Type Constants and Helpers
 *
 * Provides utility functions and constants for working with payment types.
 * Handles the distinction between actual payment methods and credit/due payments.
 */

import type { PaymentType } from '@/types/api.types'

// ============================================
// Constants
// ============================================

/**
 * Payment type categories
 */
export const PAYMENT_TYPE_CATEGORIES = {
  PAYMENT: 'payment',
  CREDIT: 'credit',
} as const

/**
 * Common payment type names (for reference/fallback)
 */
export const PAYMENT_TYPE_NAMES = {
  CASH: 'Cash',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  MOBILE_PAY: 'Mobile Pay',
  DUE: 'Due',
} as const

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a payment type represents credit/due (partial payment)
 *
 * @param paymentType - Payment type to check
 * @returns true if this is a credit/due payment type
 *
 * @example
 * ```ts
 * const duePayment = { id: 5, name: 'Due', is_credit: true }
 * isCreditPaymentType(duePayment) // true
 *
 * const cashPayment = { id: 1, name: 'Cash', is_credit: false }
 * isCreditPaymentType(cashPayment) // false
 * ```
 */
export function isCreditPaymentType(paymentType: PaymentType): boolean {
  return paymentType.is_credit === true
}

/**
 * Check if a payment type is an actual payment method (not credit/due)
 *
 * @param paymentType - Payment type to check
 * @returns true if this is an actual payment method
 *
 * @example
 * ```ts
 * const cashPayment = { id: 1, name: 'Cash', is_credit: false }
 * isActualPayment(cashPayment) // true
 *
 * const duePayment = { id: 5, name: 'Due', is_credit: true }
 * isActualPayment(duePayment) // false
 * ```
 */
export function isActualPayment(paymentType: PaymentType): boolean {
  return !isCreditPaymentType(paymentType)
}

/**
 * Filter payment types to only include actual payment methods
 *
 * @param paymentTypes - Array of payment types
 * @returns Array of payment types excluding credit/due
 *
 * @example
 * ```ts
 * const allPayments = [
 *   { id: 1, name: 'Cash', is_credit: false },
 *   { id: 2, name: 'Card', is_credit: false },
 *   { id: 5, name: 'Due', is_credit: true }
 * ]
 * getActualPaymentMethods(allPayments) // Returns only Cash and Card
 * ```
 */
export function getActualPaymentMethods(paymentTypes: PaymentType[]): PaymentType[] {
  return paymentTypes.filter(isActualPayment)
}

/**
 * Find the credit/due payment type from a list
 *
 * @param paymentTypes - Array of payment types
 * @returns The credit payment type, or undefined if not found
 *
 * @example
 * ```ts
 * const allPayments = [
 *   { id: 1, name: 'Cash', is_credit: false },
 *   { id: 5, name: 'Due', is_credit: true }
 * ]
 * getCreditPaymentType(allPayments) // Returns Due payment type
 * ```
 */
export function getCreditPaymentType(paymentTypes: PaymentType[]): PaymentType | undefined {
  return paymentTypes.find(isCreditPaymentType)
}

/**
 * Check if a payment requires full payment (not credit/partial)
 * Used in POS to determine if customer must pay the full amount
 *
 * @param paymentType - Payment type to check
 * @returns true if full payment is required
 */
export function requiresFullPayment(paymentType: PaymentType): boolean {
  return isActualPayment(paymentType)
}

/**
 * Get payment type display label
 * Can be extended to support i18n/translations
 *
 * @param paymentType - Payment type
 * @returns Display label for the payment type
 */
export function getPaymentTypeLabel(paymentType: PaymentType): string {
  // For now, just return the name
  // In the future, this can be extended to support translations
  return paymentType.name
}
