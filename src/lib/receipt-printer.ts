/**
 * @deprecated Use `@/lib/receipt-generator` instead.
 * This file is kept for backward compatibility only.
 * All new code should import from receipt-generator.
 *
 * Receipt Printer Utility
 *
 * Handles receipt printing functionality for completed sales.
 * Uses Electron IPC for silent printing in desktop app,
 * falls back to browser window.open() for web.
 */

import type { Sale } from '@/types/api.types'

/**
 * Check if running in Electron environment
 */
function isElectron(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.electronAPI !== 'undefined' &&
    typeof window.electronAPI.print !== 'undefined'
  )
}

/**
 * Print receipt for a sale using the invoice_url from the API response
 *
 * In Electron: Uses silent printing (no dialog, prints to default printer)
 * In Web: Opens invoice in new window with print dialog
 *
 * @param sale - Sale object containing invoice_url
 * @returns Promise<boolean> - true if print was triggered successfully, false otherwise
 */
export async function printReceipt(sale: Sale): Promise<boolean> {
  if (!sale.invoice_url) {
    console.warn('Cannot print receipt: invoice_url is missing from sale response')
    return false
  }

  try {
    // Use Electron silent printing if available
    if (isElectron() && window.electronAPI?.print) {
      const result = await window.electronAPI.print.receipt(sale.invoice_url)
      return result.success
    }

    // Fallback to browser printing for web version
    const printWindow = window.open(
      sale.invoice_url,
      '_blank',
      'width=800,height=600,scrollbars=yes,resizable=yes'
    )

    if (!printWindow) {
      console.error('Failed to open print window. Popup might be blocked.')
      return false
    }

    // Wait for the window to load before triggering print
    printWindow.onload = () => {
      // Small delay to ensure content is fully rendered
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }

    return true
  } catch (error) {
    console.error('Error printing receipt:', error)
    return false
  }
}

/**
 * Print receipt with error handling and user feedback
 *
 * @param sale - Sale object containing invoice_url
 * @param onSuccess - Optional callback for successful print trigger
 * @param onError - Optional callback for failed print trigger
 */
export async function printReceiptWithFeedback(
  sale: Sale,
  onSuccess?: () => void,
  onError?: (message: string) => void
): Promise<void> {
  if (!sale.invoice_url) {
    const message = 'Cannot print receipt: Invoice URL not available'
    console.warn(message)
    onError?.(message)
    return
  }

  const success = await printReceipt(sale)

  if (success) {
    onSuccess?.()
  } else {
    const message = 'Failed to open print window. Please check your popup blocker settings.'
    onError?.(message)
  }
}
