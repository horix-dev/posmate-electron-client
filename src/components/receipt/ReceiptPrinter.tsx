/**
 * Receipt Printer Component
 * 
 * Provides print-ready receipt template with support for:
 * - Temporary offline invoice indicators
 * - Final invoice number display after sync
 * - Reprint timestamp
 */

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Sale } from '@/types/api.types'
import type { PrintedReceipt } from '@/lib/db/schema'

// ============================================
// Types
// ============================================

export interface ReceiptPrinterProps {
  /** Sale data to print */
  sale: Sale
  /** Business information */
  business?: {
    name: string
    address?: string
    phone?: string
    email?: string
  }
  /** Currency symbol */
  currencySymbol: string
  /** Printed receipt info (if this is a reprint) */
  printedReceipt?: PrintedReceipt
  /** Whether this is being printed from browser */
  isPrintMode?: boolean
}

// ============================================
// Main Component
// ============================================

function ReceiptPrinterComponent({
  sale,
  business,
  currencySymbol,
  printedReceipt,
  isPrintMode = false,
}: ReceiptPrinterProps) {
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Determine if this is using temporary invoice number
  const isTemporaryInvoice = sale.invoiceNumber?.startsWith('OFF-')
  const hasBeenReprinted = printedReceipt?.status === 'reprinted'

  return (
    <div 
      className={`receipt-container ${isPrintMode ? 'print:block' : ''}`}
      style={{
        maxWidth: '80mm',
        margin: '0 auto',
        padding: '16px',
        fontFamily: 'monospace',
        fontSize: '12px',
        backgroundColor: 'white',
      }}
    >
      {/* Header - Business Info */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold mb-1">{business?.name || 'POS Mate'}</h1>
        {business?.address && <p className="text-xs">{business.address}</p>}
        {business?.phone && <p className="text-xs">Tel: {business.phone}</p>}
        {business?.email && <p className="text-xs">{business.email}</p>}
      </div>

      <Separator className="my-2" />

      {/* Invoice Information */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold">Invoice:</span>
          <span className="font-mono">{sale.invoiceNumber || `#${sale.id}`}</span>
        </div>
        
        {/* Temporary Invoice Warning */}
        {isTemporaryInvoice && (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-2 text-center">
            <Badge variant="outline" className="text-xs bg-yellow-200 border-yellow-400">
              TEMPORARY INVOICE
            </Badge>
            <p className="text-xs mt-1 text-yellow-800">
              This is a temporary invoice number.
              <br />
              Final invoice will be assigned after sync.
            </p>
          </div>
        )}

        {/* Reprint Information */}
        {hasBeenReprinted && printedReceipt?.reprintedAt && (
          <div className="bg-blue-100 border border-blue-300 rounded p-2 mb-2 text-center">
            <Badge variant="outline" className="text-xs bg-blue-200 border-blue-400">
              REPRINT
            </Badge>
            <p className="text-xs mt-1 text-blue-800">
              Original: {printedReceipt.offlineInvoiceNumber}
              <br />
              Reprinted: {formatDate(printedReceipt.reprintedAt)}
            </p>
          </div>
        )}

        <div className="flex justify-between text-xs">
          <span>Date:</span>
          <span>{formatDate(sale.saleDate)}</span>
        </div>
        {sale.party && (
          <div className="flex justify-between text-xs">
            <span>Customer:</span>
            <span>{sale.party.name}</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span>Payment:</span>
          <span>{sale.payment_type?.name || 'Cash'}</span>
        </div>
      </div>

      <Separator className="my-2" />

      {/* Items Table */}
      <div className="mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">Item</th>
              <th className="text-center py-1">Qty</th>
              <th className="text-right py-1">Price</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.details?.map((detail, index) => (
              <tr key={detail.id || index} className="border-b">
                <td className="py-1">
                  {detail.product?.productName || 'Product'}
                  {detail.variant_name && (
                    <div className="text-xs text-gray-600">{detail.variant_name}</div>
                  )}
                </td>
                <td className="text-center">{detail.quantities}</td>
                <td className="text-right">{formatCurrency(detail.price)}</td>
                <td className="text-right font-semibold">
                  {formatCurrency(detail.price * detail.quantities)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Separator className="my-2" />

      {/* Totals */}
      <div className="mb-4 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.totalAmount ?? 0)}</span>
        </div>
        {(sale.discountAmount ?? 0) > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount:</span>
            <span>-{formatCurrency(sale.discountAmount ?? 0)}</span>
          </div>
        )}
        {(sale.vat_amount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>VAT ({sale.vat?.name}):</span>
            <span>{formatCurrency(sale.vat_amount ?? 0)}</span>
          </div>
        )}
        <Separator className="my-1" />
        <div className="flex justify-between font-bold text-base">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.totalAmount ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid:</span>
          <span className="text-green-600">{formatCurrency(sale.paidAmount ?? 0)}</span>
        </div>
        {(sale.dueAmount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>Due:</span>
            <span className="text-orange-600">{formatCurrency(sale.dueAmount ?? 0)}</span>
          </div>
        )}
        {(sale.change_amount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>Change:</span>
            <span>{formatCurrency(sale.change_amount ?? 0)}</span>
          </div>
        )}
      </div>

      {/* Note */}
      {sale.note && (
        <>
          <Separator className="my-2" />
          <div className="mb-4">
            <p className="text-xs font-semibold mb-1">Note:</p>
            <p className="text-xs">{sale.note}</p>
          </div>
        </>
      )}

      {/* Footer */}
      <Separator className="my-2" />
      <div className="text-center text-xs">
        <p>Thank you for your business!</p>
        <p className="mt-2 text-gray-500">Powered by POS Mate</p>
      </div>
    </div>
  )
}

export const ReceiptPrinter = memo(ReceiptPrinterComponent)

ReceiptPrinter.displayName = 'ReceiptPrinter'

/**
 * Helper function to trigger browser print
 */
export function printReceipt() {
  window.print()
}
