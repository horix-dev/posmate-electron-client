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
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      padding: 20px;
      max-width: 80mm;
      margin: 0 auto;
    }
    
    .receipt {
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
    }
    
    .logo {
      max-width: 120px;
      margin-bottom: 10px;
    }
    
    .business-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .business-info {
      font-size: 11px;
      color: #333;
    }
    
    .invoice-info {
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px dashed #000;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    
    .label {
      font-weight: bold;
    }
    
    .customer-info {
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px dashed #000;
    }
    
    .items-table {
      width: 100%;
      margin-bottom: 15px;
      border-collapse: collapse;
    }
    
    .items-table th {
      text-align: left;
      border-bottom: 1px solid #000;
      padding: 5px 0;
      font-weight: bold;
    }
    
    .items-table td {
      padding: 8px 0;
      border-bottom: 1px dashed #ccc;
    }
    
    .item-name {
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .item-details {
      font-size: 10px;
      color: #555;
    }
    
    .qty-price {
      text-align: right;
    }
    
    .totals {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 2px solid #000;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    .total-row.grand-total {
      font-size: 16px;
      font-weight: bold;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #000;
    }
    
    .total-row.payment {
      margin-top: 10px;
      padding-top: 5px;
      border-top: 1px dashed #000;
    }
    
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px dashed #000;
      text-align: center;
      font-size: 11px;
    }
    
    .thank-you {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    @media print {
      body {
        padding: 0;
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
      ${
        business?.invoice_logo
          ? `<img src="${business.invoice_logo}" alt="Logo" class="logo" />`
          : ''
      }
      <div class="business-name">${business?.companyName || 'POS Store'}</div>
      <div class="business-info">
        ${business?.address ? `${business.address}<br>` : ''}
        ${business?.phoneNumber ? `Tel: ${business.phoneNumber}<br>` : ''}
      </div>
    </div>
    
    <!-- Invoice Info -->
    <div class="invoice-info">
      <div class="info-row">
        <span class="label">Invoice:</span>
        <span>${sale.invoiceNumber}</span>
      </div>
      <div class="info-row">
        <span class="label">Date:</span>
        <span>${formatDate(sale.saleDate)}</span>
      </div>
      ${
        sale.payment_type
          ? `
      <div class="info-row">
        <span class="label">Payment:</span>
        <span>${sale.payment_type.name}</span>
      </div>
      `
          : ''
      }
    </div>
    
    <!-- Customer Info -->
    ${
      customer
        ? `
    <div class="customer-info">
      <div class="info-row">
        <span class="label">Customer:</span>
        <span>${customer.name}</span>
      </div>
      ${
        customer.phone
          ? `
      <div class="info-row">
        <span class="label">Phone:</span>
        <span>${customer.phone}</span>
      </div>
      `
          : ''
      }
    </div>
    `
        : ''
    }
    
    <!-- Items -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th class="qty-price">Qty × Price</th>
          <th class="qty-price">Total</th>
        </tr>
      </thead>
      <tbody>
        ${(sale.details || [])
          .map(
            (item) => `
        <tr>
          <td>
            <div class="item-name">${item.product?.productName || 'Product'}</div>
            ${
              item.variant_name
                ? `<div class="item-details">Variant: ${item.variant_name}</div>`
                : ''
            }
            ${
              item.stock?.batch_no
                ? `<div class="item-details">Batch: ${item.stock.batch_no}</div>`
                : ''
            }
          </td>
          <td class="qty-price">${item.quantities} × ${formatCurrency(item.price, currencySymbol)}</td>
          <td class="qty-price">${formatCurrency(item.subTotal || item.quantities * item.price, currencySymbol)}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(sale.totalAmount - (sale.vat_amount || 0) + (sale.discountAmount || 0), currencySymbol)}</span>
      </div>
      
      ${
        sale.discountAmount && sale.discountAmount > 0
          ? `
      <div class="total-row">
        <span>Discount:</span>
        <span>-${formatCurrency(sale.discountAmount, currencySymbol)}</span>
      </div>
      `
          : ''
      }
      
      ${
        sale.vat_amount && sale.vat_amount > 0
          ? `
      <div class="total-row">
        <span>VAT ${sale.vat?.rate ? `(${sale.vat.rate}%)` : ''}:</span>
        <span>${formatCurrency(sale.vat_amount, currencySymbol)}</span>
      </div>
      `
          : ''
      }
      
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>${formatCurrency(sale.totalAmount, currencySymbol)}</span>
      </div>
      
      <div class="total-row payment">
        <span>Paid:</span>
        <span>${formatCurrency(totalPaid, currencySymbol)}</span>
      </div>
      
      ${
        totalDue > 0
          ? `
      <div class="total-row payment">
        <span>Due:</span>
        <span>${formatCurrency(totalDue, currencySymbol)}</span>
      </div>
      `
          : ''
      }
      
      ${
        changeAmount > 0
          ? `
      <div class="total-row payment">
        <span>Change:</span>
        <span>${formatCurrency(changeAmount, currencySymbol)}</span>
      </div>
      `
          : ''
      }
    </div>
    
    ${
      sale.note
        ? `
    <div class="footer">
      <div style="margin-bottom: 10px; font-style: italic;">
        Note: ${sale.note}
      </div>
    </div>
    `
        : ''
    }
    
    <!-- Footer -->
    <div class="footer">
      <div class="thank-you">Thank You for Your Business!</div>
      <div>Please visit again</div>
    </div>
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
