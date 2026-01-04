import { Sale } from '@/types/api.types'

/**
 * Sale Helper Utilities
 * 
 * Provides utility functions for working with sales data including
 * payment status, calculations, and formatting.
 */

/**
 * Payment status badge configuration
 */
export interface PaymentStatusBadge {
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'
  text: string
  className?: string
}

/**
 * Gets the payment status badge configuration for a sale
 * Prioritizes new fields, falls back to old fields for backward compatibility
 */
export function getPaymentStatusBadge(sale: Sale): PaymentStatusBadge {
  // Use new fields if available
  if (sale.is_fully_paid !== undefined) {
    if (sale.is_fully_paid) {
      return {
        variant: 'success',
        text: 'Paid',
        className: 'bg-green-500/10 text-green-700 dark:text-green-400'
      }
    }
    
    const totalPaid = sale.total_paid_amount || 0
    
    if (totalPaid === 0) {
      return {
        variant: 'destructive',
        text: 'Unpaid',
        className: 'bg-red-500/10 text-red-700 dark:text-red-400'
      }
    }
    
    return {
      variant: 'warning',
      text: 'Partial',
      className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
    }
  }
  
  // Fallback to old fields
  if (sale.isPaid === 1) {
    return {
      variant: 'success',
      text: 'Paid',
      className: 'bg-green-500/10 text-green-700 dark:text-green-400'
    }
  }
  
  const paidAmount = sale.paidAmount || 0
  const totalAmount = sale.totalAmount || 0
  
  if (paidAmount === 0) {
    return {
      variant: 'destructive',
      text: 'Unpaid',
      className: 'bg-red-500/10 text-red-700 dark:text-red-400'
    }
  }
  
  if (paidAmount < totalAmount) {
    return {
      variant: 'warning',
      text: 'Partial',
      className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
    }
  }
  
  return {
    variant: 'success',
    text: 'Paid',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400'
  }
}

/**
 * Calculates the payment percentage for a sale
 * Returns value between 0-100
 */
export function getPaymentPercentage(sale: Sale): number {
  const totalAmount = sale.totalAmount || 0
  if (totalAmount === 0) return 0
  
  // Use new field if available
  const totalPaid = sale.total_paid_amount !== undefined 
    ? sale.total_paid_amount 
    : (sale.paidAmount || 0)
  
  const percentage = (totalPaid / totalAmount) * 100
  return Math.min(100, Math.max(0, percentage))
}

/**
 * Payment breakdown details
 */
export interface PaymentBreakdown {
  totalAmount: number
  initialPaid: number
  dueCollections: number
  totalPaid: number
  remainingDue: number
  isFullyPaid: boolean
  dueCollectionsCount: number
  paymentPercentage: number
}

/**
 * Formats payment breakdown for display
 * Includes initial payment, due collections, and remaining balance
 */
export function formatPaymentBreakdown(sale: Sale): PaymentBreakdown {
  // Use new fields if available
  if (sale.initial_paidAmount !== undefined || sale.total_paid_amount !== undefined) {
    const totalAmount = sale.totalAmount || 0
    const initialPaid = sale.initial_paidAmount || 0
    const dueCollections = sale.due_collections_total || 0
    const totalPaid = sale.total_paid_amount || initialPaid
    const remainingDue = sale.remaining_due_amount || 0
    const isFullyPaid = sale.is_fully_paid || false
    const dueCollectionsCount = sale.due_collections_count || 0
    
    return {
      totalAmount,
      initialPaid,
      dueCollections,
      totalPaid,
      remainingDue,
      isFullyPaid,
      dueCollectionsCount,
      paymentPercentage: getPaymentPercentage(sale)
    }
  }
  
  // Fallback to old fields
  const totalAmount = sale.totalAmount || 0
  const paidAmount = sale.paidAmount || 0
  const dueAmount = sale.dueAmount || 0
  const isFullyPaid = sale.isPaid === 1
  
  return {
    totalAmount,
    initialPaid: paidAmount,
    dueCollections: 0, // Not tracked in old system
    totalPaid: paidAmount,
    remainingDue: dueAmount,
    isFullyPaid,
    dueCollectionsCount: 0,
    paymentPercentage: getPaymentPercentage(sale)
  }
}

/**
 * Sales statistics summary
 */
export interface SalesStats {
  totalSales: number
  totalAmount: number
  totalPaidAmount: number
  totalDueAmount: number
  fullyPaidCount: number
  partiallyPaidCount: number
  unpaidCount: number
  dueCollectionsTotal: number
  dueCollectionsCount: number
  averageSaleAmount: number
  averagePaymentPercentage: number
}

/**
 * Calculates comprehensive statistics from an array of sales
 * Supports both new and old API field structures
 */
export function calculateSalesStats(sales: Sale[]): SalesStats {
  if (!sales || sales.length === 0) {
    return {
      totalSales: 0,
      totalAmount: 0,
      totalPaidAmount: 0,
      totalDueAmount: 0,
      fullyPaidCount: 0,
      partiallyPaidCount: 0,
      unpaidCount: 0,
      dueCollectionsTotal: 0,
      dueCollectionsCount: 0,
      averageSaleAmount: 0,
      averagePaymentPercentage: 0
    }
  }
  
  let totalAmount = 0
  let totalPaidAmount = 0
  let totalDueAmount = 0
  let fullyPaidCount = 0
  let partiallyPaidCount = 0
  let unpaidCount = 0
  let dueCollectionsTotal = 0
  let dueCollectionsCount = 0
  let totalPaymentPercentage = 0
  
  sales.forEach(sale => {
    const breakdown = formatPaymentBreakdown(sale)
    
    totalAmount += breakdown.totalAmount
    totalPaidAmount += breakdown.totalPaid
    totalDueAmount += breakdown.remainingDue
    dueCollectionsTotal += breakdown.dueCollections
    dueCollectionsCount += breakdown.dueCollectionsCount
    totalPaymentPercentage += breakdown.paymentPercentage
    
    if (breakdown.isFullyPaid) {
      fullyPaidCount++
    } else if (breakdown.totalPaid > 0) {
      partiallyPaidCount++
    } else {
      unpaidCount++
    }
  })
  
  return {
    totalSales: sales.length,
    totalAmount,
    totalPaidAmount,
    totalDueAmount,
    fullyPaidCount,
    partiallyPaidCount,
    unpaidCount,
    dueCollectionsTotal,
    dueCollectionsCount,
    averageSaleAmount: totalAmount / sales.length,
    averagePaymentPercentage: totalPaymentPercentage / sales.length
  }
}

/**
 * Formats currency value with locale support
 */
export function formatCurrency(amount: number, currency: string = 'BDT'): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
}

/**
 * Checks if sale has new API fields
 */
export function hasNewPaymentFields(sale: Sale): boolean {
  return sale.total_paid_amount !== undefined || 
         sale.initial_paidAmount !== undefined ||
         sale.is_fully_paid !== undefined
}

/**
 * Gets total paid amount (supports both old and new fields)
 */
export function getTotalPaidAmount(sale: Sale): number {
  if (sale.total_paid_amount !== undefined) {
    return sale.total_paid_amount
  }
  return sale.paidAmount || 0
}

/**
 * Gets remaining due amount (supports both old and new fields)
 */
export function getRemainingDueAmount(sale: Sale): number {
  if (sale.remaining_due_amount !== undefined) {
    return sale.remaining_due_amount
  }
  return sale.dueAmount || 0
}

/**
 * Checks if sale is fully paid (supports both old and new fields)
 */
export function isFullyPaid(sale: Sale): boolean {
  if (sale.is_fully_paid !== undefined) {
    return sale.is_fully_paid
  }
  return sale.isPaid === 1
}
