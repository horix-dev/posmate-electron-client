/**
 * Receipt Generator
 *
 * Generates printable HTML receipts from sale data for both online and offline scenarios.
 * Works independently of backend PDF generation - uses structured JSON data.
 */

import type { Sale, Business, Party } from '@/types/api.types'
import { formatCurrency as formatCurrencyUtil } from '@/hooks/useCurrency'
import { useUIStore } from '@/stores/ui.store'
import { getImageUrl } from './utils'

export interface ReceiptData {
  sale: Sale
  business: Business | null
  customer: Party | null
}

type ReceiptPrintOptions = {
  printerName?: string | null
}

/**
 * Format date for display in local timezone
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)

  // Format in local timezone
  const formatter = new Intl.DateTimeFormat('default', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  return formatter.format(date)
}

/**
 * Generate HTML receipt from sale data
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const { sale, business, customer } = data

  console.log('sale => ', sale)
  console.log('customer => ', customer)
  console.log('business => ', business)
  // Calculate totals (handle both old and new due collection fields)
  const totalPaid = sale.total_paid_amount ?? sale.paidAmount
  const totalDue = sale.remaining_due_amount ?? sale.dueAmount ?? 0
  const changeAmount = sale.change_amount
    ? sale.change_amount
    : sale.paidAmount > sale.totalAmount
      ? sale.paidAmount - sale.totalAmount
      : 0

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
      padding: 5px;
      max-width: 70mm;
      margin: 0 auto;
      margin-left: 0px;
      background: white;
      color: #000;
    }
    
    .receipt {
      width: 100%;
      margin-bottom: 12px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 10px;
    }
    
    .logo {
      max-width: 80px;
      height: auto;
      margin-bottom: 5px;
    }
    
    .business-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    .receipt-title {
      font-size: 14px;
      margin-bottom: 3px;
    }
    
    .invoice-number {
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 5px 0;
      width: 100%;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .info-table td {
      padding: 1px 0;
      font-size: 11px;
    }
    
    .info-table .label {
      width: 35%;
      text-align: left;
    }
    
    .info-table .value {
      width: 65%;
      text-align: right;
    }
    
    .items-table {
      margin: 5px 0;
    }
    
    .items-table td {
      padding: 2px 0;
      font-size: 11px;
      vertical-align: top;
    }
    
    .items-table .item-qty {
      text-align: left;
      width: 15%;
      white-space: nowrap;
    }
    
    .items-table .item-name {
      text-align: left;
      width: 60%;
      word-wrap: break-word;
    }
    
    .items-table .item-price {
      text-align: right;
      width: 30%;
      white-space: nowrap;
    }
    
    .totals-table {
      margin-top: 5px;
    }
    
    .totals-table td {
      padding: 2px 0;
      font-size: 12px;
    }
    
    .totals-table .label {
      text-align: left;
      width: 60%;
    }
    
    .totals-table .amount {
      text-align: right;
      width: 40%;
      font-weight: normal;
    }
    
    .totals-table tr.grand-total td {
      font-weight: bold;
      font-size: 14px;
      padding-top: 5px;
    }
    
    .footer {
      text-align: center;
      margin-top: 10px;
      font-size: 11px;
    }
    
    @media print {
      body {
        padding: 3mm;
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
      ${business?.invoice_logo ? `<img src="${getImageUrl(business.invoice_logo)}" alt="Logo" class="logo" />` : ''}
      <div class="business-name">${business?.companyName || 'Horix'}</div>
      <div class="receipt-title">Cash Receipt</div>
      <div class="invoice-number">#${sale.invoiceNumber}</div>
    </div>
    
    <!-- Business & Invoice Info -->
    <table class="info-table">
      ${business?.address ? `<tr><td class="label">Address:</td><td class="value">${business.address}</td></tr>` : ''}
      ${business?.phoneNumber ? `<tr><td class="label">Tel:</td><td class="value">${business.phoneNumber}</td></tr>` : ''}
      <tr>
        <td class="label">Date:</td>
        <td class="value">${formatDate(sale.saleDate)}</td>
      </tr>
      ${sale.user?.name ? `<tr><td class="label">Manager:</td><td class="value">${sale.user.name}</td></tr>` : ''}
      ${customer ? `<tr><td class="label">Customer:</td><td class="value">${customer.name}</td></tr>` : ''}
    </table>
    
    <hr class="divider">
    
    <!-- Items -->
    <table class="items-table">
    <tr>
      <th class="item-qty">Qty</th>
      <th class="item-name">Item</th>
      <th class="item-price">Price</th>
    </tr>
    ${(sale.details || [])
      .map(
        (item) => {
          const hasDiscount = item.discount_amount && item.discount_amount > 0
          const itemTotal = item.subTotal || item.quantities * item.price
          // const finalPrice = hasDiscount ? item.final_price : itemTotal
          const totalDiscount = hasDiscount ? (item.discount_amount || 0) * item.quantities || 0 : 0

          let discountText = ''
          if (hasDiscount) {
            if (item.discount_type === 'percentage') {
              discountText = `(${item.discount_value}% off)`
            } else {
              discountText = `(${formatCurrencyUtil(item.discount_value)} off)`
            }
          }

          return `
             <tr>
          <td class="item-qty">${item.quantities} x </td>
          <td class="item-name">
            ${item.product?.productName || 'Product'}${item.variant_name ? ' (' + item.variant_name + ')' : ''}
            ${hasDiscount ? `<br/><span style="font-size: 10px; color: #666;">${discountText}</span>` : ''}
          </td>
          <td class="item-price">
            <div>${formatCurrencyUtil(itemTotal)}</div>
            ${hasDiscount ? '-' + formatCurrencyUtil(totalDiscount) : ''}
          </td>
        </tr>
          `

          //     `
          // <tr>
          //   <td class="item-qty">${item.quantities} x </td>
          //   <td class="item-name">
          //     ${item.product?.productName || 'Product'}${item.variant_name ? ' (' + item.variant_name + ')' : ''}
          //     ${hasDiscount ? `<br/><span style="font-size: 10px; color: #666;">${discountText}</span>` : ''}
          //   </td>
          //   <td class="item-price">
          //     ${hasDiscount ? `<div style="font-size: 10px; text-decoration: line-through; color: #999;">${formatCurrencyUtil(itemTotal)}</div>` : ''}
          //     ${formatCurrencyUtil(finalPrice)}
          //   </td>
          // </tr>`
        }
        //   <tr>
        //   <td class="item-qty">${item.quantities} x </td>
        //   <td class="item-name">
        //     ${item.product?.productName || 'Product'}${item.variant_name ? ' (' + item.variant_name + ')' : ''}
        //     ${hasDiscount ? `<br/><span style="font-size: 10px; color: #666;">${discountText}</span>` : ''}
        //   </td>
        //   <td class="item-price">
        //     <div>${formatCurrencyUtil(itemTotal)}</div>
        //     ${hasDiscount ? "-" + formatCurrencyUtil(item.discount_amount) : ""}
        //   </td>
        // </tr>
      )
      .join('')}
    </table>
    
    <hr class="divider">
    
    <!-- Totals -->
    <table class="totals-table">
      <tr>
        <td class="label">Sub Total</td>
        <td class="amount">${formatCurrencyUtil(sale.totalAmount - (sale.vat_amount || 0) + (sale.discountAmount || 0))}</td>
      </tr>
      
      ${
        sale.discountAmount && sale.discountAmount > 0
          ? `
      <tr>
        <td class="label">Discount</td>
        <td class="amount">-${formatCurrencyUtil(sale.discountAmount)}</td>
      </tr>
      `
          : ''
      }
      
      ${
        sale.vat_amount && sale.vat_amount > 0
          ? `
      <tr>
        <td class="label">Tax</td>
        <td class="amount">${formatCurrencyUtil(sale.vat_amount)}</td>
      </tr>
      `
          : ''
      }
    </table>
    
    <hr class="divider">
    
    <table class="totals-table">
      <tr class="grand-total">
        <td class="label">Total</td>
        <td class="amount">${formatCurrencyUtil(sale.totalAmount)}</td>
      </tr>
      
      ${
        totalPaid > 0
          ? `
      <tr>
        <td class="label">Paid</td>
        <td class="amount">${formatCurrencyUtil(totalPaid)}</td>
      </tr>
      `
          : ''
      }
      
      ${
        totalDue > 0
          ? `
      <tr>
        <td class="label">Due</td>
        <td class="amount">${formatCurrencyUtil(totalDue)}</td>
      </tr>
      `
          : ''
      }
      
      ${
        changeAmount > 0
          ? `
      <tr>
        <td class="label">Change</td>
        <td class="amount">${formatCurrencyUtil(changeAmount)}</td>
      </tr>
      `
          : ''
      }
    </table>
    
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
    <div class="footer">*** Thank you for shopping ***
    ${business?.gratitude_message ? `<br />*** ${business.gratitude_message} ***` : ''}
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
export async function printReceipt(
  data: ReceiptData,
  options?: ReceiptPrintOptions
): Promise<boolean> {
  try {
    // console.log('[PrintReceipt] Starting print process...')
    // console.log('[PrintReceipt] Is Electron?', isElectron())
    // console.log('[PrintReceipt] electronAPI exists?', typeof window.electronAPI !== 'undefined')
    // console.log('[PrintReceipt] print exists?', typeof window.electronAPI?.print !== 'undefined')
    // console.log(
    //   '[PrintReceipt] receiptHTML exists?',
    //   typeof window.electronAPI?.print?.receiptHTML !== 'undefined'
    // )

    const html = generateReceiptHTML(data)
    // console.log('[PrintReceipt] Generated HTML length:', html.length)

    // Silent print via Electron (no dialogs, no popups)
    if (isElectron()) {
      const preferredPrinter = options?.printerName ?? useUIStore.getState().receiptPrinterName
      const printOptions = preferredPrinter ? { printerName: preferredPrinter } : undefined
      console.log('[PrintReceipt] Calling Electron print API...')
      const result = await window.electronAPI?.print?.receiptHTML(html, printOptions)
      console.log('[PrintReceipt] Electron API returned:', result)
      return result?.success ?? false
    }

    // Not in Electron - cannot print silently
    console.warn('[Print] Silent printing only available in Electron app')
    return false
  } catch (error) {
    console.error('[PrintReceipt] Error printing receipt:', error)
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
  onError?: (message: string) => void,
  options?: ReceiptPrintOptions
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

  const success = await printReceipt(data, options)

  if (success) {
    onSuccess?.()
  }
  // Don't show error - on Windows the print dialog may show but still work
  // User can handle printing via the dialog if needed
}
