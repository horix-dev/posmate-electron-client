/**
 * Receipt Generator
 *
 * Generates printable HTML receipts from sale data for both online and offline scenarios.
 * Works independently of backend PDF generation - uses structured JSON data.
 */

import type { Sale, Business, Party } from '@/types/api.types'

export interface ReceiptData {
  sale: Sale
  business: Business | null
  customer: Party | null
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currencySymbol = '$'): string {
  return `${currencySymbol}${amount.toFixed(2)}`
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Generate HTML receipt from sale data
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const { sale, business, customer } = data
  const currencySymbol = business?.business_currency?.symbol || '$'

  // Calculate totals (handle both old and new due collection fields)
  const totalPaid = sale.total_paid_amount ?? sale.paidAmount
  const totalDue = sale.remaining_due_amount ?? sale.dueAmount ?? 0
  const changeAmount = sale.change_amount ?? 0

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${sale.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.3;
      padding: 15px;
      max-width: 80mm;
      margin: 0 auto;
      background: white;
      color: #000;
    }
    
    .receipt {
      background: white;
      padding: 10px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 12px;
    }
    
    .logo {
      max-width: 100px;
      height: auto;
      margin-bottom: 8px;
    }
    
    .business-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 6px;
      color: #000;
    }
    
    .receipt-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #000;
    }
    
    .invoice-number {
      font-size: 13px;
      color: #555;
      margin-bottom: 8px;
    }
    
    .info-section {
      margin-bottom: 8px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 13px;
    }
    
    .info-row .label {
      color: #333;
      min-width: 80px;
    }
    
    .info-row .value {
      color: #000;
      text-align: right;
      flex: 1;
    }
    
    .divider {
      border: none;
      border-top: 1px dashed #999;
      margin: 8px 0;
    }
    
    .items-section {
      margin: 6px 0;
    }
    
    .item-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 13px;
    }
    
    .item-name {
      color: #000;
      flex: 1;
    }
    
    .item-price {
      text-align: right;
      color: #000;
      min-width: 60px;
    }
    
    .totals-section {
      margin-top: 6px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 13px;
    }
    
    .total-row .label {
      color: #333;
    }
    
    .total-row .amount {
      text-align: right;
      color: #000;
    }
    
    .total-row.grand-total {
      font-weight: bold;
      font-size: 15px;
      margin-top: 4px;
      padding-top: 4px;
    }
    
    .total-row.grand-total .label,
    .total-row.grand-total .amount {
      color: #000;
    }
    
    .footer {
      text-align: center;
      margin-top: 10px;
      font-size: 12px;
      color: #555;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .receipt {
        padding: 10px;
      }
      
      @page {
        margin: 0;
        size: 80mm auto;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="header">
      ${business?.invoice_logo ? `<img src="${business.invoice_logo}" alt="Logo" class="logo" />` : ''}
      <div class="business-name">${business?.companyName || 'POS Store'}</div>
      <div class="receipt-title">Cash Receipt</div>
      <div class="invoice-number">#${sale.invoiceNumber}</div>
    </div>
    
    <!-- Business & Invoice Info -->
    <div class="info-section">
      ${business?.address ? `<div class="info-row"><span class="label">Address:</span><span class="value">${business.address}</span></div>` : ''}
      ${business?.phoneNumber ? `<div class="info-row"><span class="label">Tel:</span><span class="value">${business.phoneNumber}</span></div>` : ''}
      <div class="info-row">
        <span class="label">Date:</span>
        <span class="value">${formatDate(sale.saleDate)}</span>
      </div>
      ${sale.user?.name ? `<div class="info-row"><span class="label">Manager:</span><span class="value">${sale.user.name}</span></div>` : ''}
      ${customer ? `<div class="info-row"><span class="label">Customer:</span><span class="value">${customer.name}</span></div>` : ''}
    </div>
    
    <hr class="divider">
    
    <!-- Items -->
    <div class="items-section">
      ${(sale.details || [])
        .map(
          (item) => `
      <div class="item-row">
        <span class="item-name">${item.product?.productName || 'Product'}${item.variant_name ? ' (' + item.variant_name + ')' : ''}</span>
        <span class="item-price">${formatCurrency(item.subTotal || item.quantities * item.price, currencySymbol)}</span>
      </div>`
        )
        .join('')}
    </div>
    
    <hr class="divider">
    
    <!-- Totals -->
    <div class="totals-section">
      <div class="total-row">
        <span class="label">Price</span>
        <span class="amount">${formatCurrency(sale.totalAmount - (sale.vat_amount || 0) + (sale.discountAmount || 0), currencySymbol)}</span>
      </div>
      
      ${
        sale.discountAmount && sale.discountAmount > 0
          ? `
      <div class="total-row">
        <span class="label">Sale</span>
        <span class="amount">-${formatCurrency(sale.discountAmount, currencySymbol)}</span>
      </div>
      `
          : ''
      }
      
      ${
        sale.vat_amount && sale.vat_amount > 0
          ? `
      <div class="total-row">
        <span class="label">Tax</span>
        <span class="amount">${formatCurrency(sale.vat_amount, currencySymbol)}</span>
      </div>
      `
          : ''
      }
      
      <hr class="divider">
      
      <div class="total-row grand-total">
        <span class="label">Total</span>
        <span class="amount">${formatCurrency(sale.totalAmount, currencySymbol)}</span>
      </div>
      
      ${
        totalPaid > 0
          ? `
      <div class="total-row">
        <span class="label">Paid</span>
        <span class="amount">${formatCurrency(totalPaid, currencySymbol)}</span>
      </div>
      `
          : ''
      }
      
      ${
        totalDue > 0
          ? `
      <div class="total-row">
        <span class="label">Due</span>
        <span class="amount">${formatCurrency(totalDue, currencySymbol)}</span>
      </div>
      `
          : ''
      }
      
      ${
        changeAmount > 0
          ? `
      <div class="total-row">
        <span class="label">Change</span>
        <span class="amount">${formatCurrency(changeAmount, currencySymbol)}</span>
      </div>
      `
          : ''
      }
    </div>
    
    ${
      sale.note
        ? `
    <div style="text-align: center; margin: 10px 0; font-size: 11px; font-style: italic; color: #666;">
      Note: ${sale.note}
    </div>
    `
        : ''
    }
    
    <!-- Footer -->
    <div class="footer">*** Thank you for shopping ***</div>
  </div>
  
  <script>
    // Auto-print when loaded
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `.trim()
}

/**
 * Open receipt in print window
 */
export function openReceiptInPrintWindow(html: string): Window | null {
  const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes')

  if (!printWindow) {
    console.error('Failed to open print window. Popup might be blocked.')
    return null
  }

  printWindow.document.write(html)
  printWindow.document.close()

  return printWindow
}

/**
 * Check if running in Electron
 */
function isElectron(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.electronAPI !== 'undefined' &&
    typeof window.electronAPI.print?.receiptHTML === 'function'
  )
}

/**
 * Print receipt from structured data (silent print via Electron)
 *
 * @param data - Receipt data including sale, business info, and customer
 * @returns Promise<boolean> - true if print was triggered successfully
 */
export async function printReceipt(data: ReceiptData): Promise<boolean> {
  try {
    const html = generateReceiptHTML(data)

    // Silent print via Electron (no dialogs, no popups)
    if (isElectron()) {
      const result = await window.electronAPI?.print?.receiptHTML(html)
      return result?.success ?? false
    }

    // Not in Electron - cannot print silently
    console.warn('[Print] Silent printing only available in Electron app')
    return false
  } catch (error) {
    console.error('Error printing receipt:', error)
    return false
  }
}

/**
 * Print receipt with error handling and user feedback (silent print via Electron)
 *
 * @param data - Receipt data
 * @param onSuccess - Optional success callback
 * @param onError - Optional error callback
 */
export async function printReceiptWithFeedback(
  data: ReceiptData,
  onSuccess?: () => void,
  onError?: (message: string) => void
): Promise<void> {
  if (!data.sale) {
    const message = 'Cannot print receipt: Sale data not available'
    console.warn(message)
    onError?.(message)
    return
  }

  if (!isElectron()) {
    const message = 'Silent printing only available in desktop app'
    console.warn(message)
    onError?.(message)
    return
  }

  const success = await printReceipt(data)

  if (success) {
    onSuccess?.()
  }
  // Don't show error - on Windows the print dialog may show but still work
  // User can handle printing via the dialog if needed
}
