import { memo, useState, useEffect } from 'react'
import { Cloud, CloudOff, Receipt, User, Calendar, CreditCard, Package, Printer, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Sale } from '@/types/api.types'
import type { PrintedReceipt } from '@/lib/db/schema'
import { getPaymentStatus, isSaleSynced, formatSaleDate } from '../hooks'
import { offlineSalesService } from '@/api/services/offlineSales.service'
import { ReceiptPrinter } from '@/components/receipt'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

export interface SaleDetailsDialogProps {
  /** Sale to display details for */
  sale: Sale | null
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Currency symbol for price display */
  currencySymbol: string
}

// ============================================
// Info Row Component
// ============================================

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}

const InfoRow = memo(function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-full bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function SaleDetailsDialogComponent({
  sale,
  open,
  onOpenChange,
  currencySymbol,
}: SaleDetailsDialogProps) {
  const [printedReceipt, setPrintedReceipt] = useState<PrintedReceipt | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)

  if (!sale) return null

  const paymentStatus = getPaymentStatus(sale)
  const synced = isSaleSynced(sale as Sale & { isOffline?: boolean })

  // Load printed receipt info
  useEffect(() => {
    if (sale?.id && open) {
      loadPrintedReceipt()
    }
  }, [sale?.id, open])

  const loadPrintedReceipt = async () => {
    if (!sale?.id) return
    try {
      const receipt = await offlineSalesService.getPrintedReceipt(sale.id)
      setPrintedReceipt(receipt || null)
    } catch (error) {
      console.error('Error loading printed receipt:', error)
    }
  }

  const handleReprint = async () => {
    if (!sale || !printedReceipt?.id) return

    try {
      setShowReceipt(true)
      
      // Wait for render then print
      setTimeout(() => {
        window.print()
        // Mark as reprinted
        offlineSalesService.markAsReprinted(printedReceipt.id!)
        toast.success('Receipt reprinted successfully')
        loadPrintedReceipt() // Reload to update status
      }, 100)
    } catch (error) {
      console.error('Error reprinting receipt:', error)
      toast.error('Failed to reprint receipt')
    }
  }

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getPaymentBadgeVariant = (): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (paymentStatus.status) {
      case 'paid':
        return 'default'
      case 'partial':
        return 'secondary'
      case 'unpaid':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Check if invoice was updated
  const isTemporaryInvoice = sale.invoiceNumber?.startsWith('OFF-')
  const needsReprint = printedReceipt?.status === 'updated' && !isTemporaryInvoice

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sale Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getPaymentBadgeVariant()}>
                {paymentStatus.label}
              </Badge>
              {synced ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Cloud className="h-3 w-3 mr-1" />
                  Synced
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <CloudOff className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Invoice Update Notice */}
        {needsReprint && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-blue-900">Invoice Number Updated</p>
                <p className="text-sm text-blue-700 mt-1">
                  Original: <span className="font-mono">{printedReceipt?.offlineInvoiceNumber}</span>
                  {' → '}
                  Final: <span className="font-mono">{sale.invoiceNumber}</span>
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleReprint}
                className="ml-4"
              >
                <Printer className="h-4 w-4 mr-2" />
                Reprint
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Temporary Invoice Notice */}
        {isTemporaryInvoice && printedReceipt && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <p className="font-medium text-yellow-900">Temporary Invoice</p>
              <p className="text-sm text-yellow-700 mt-1">
                This receipt was printed offline. A final invoice number will be assigned after sync.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Reprint Status */}
        {printedReceipt?.status === 'reprinted' && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Printer className="h-3 w-3 mr-1" />
            Reprinted on {new Date(printedReceipt.reprintedAt!).toLocaleString()}
          </Badge>
        )}

        {/* Sale Info Grid */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <InfoRow
            icon={Receipt}
            label="Invoice Number"
            value={sale.invoiceNumber || `#${sale.id}`}
          />
          <InfoRow
            icon={Calendar}
            label="Date"
            value={formatSaleDate(sale.saleDate)}
          />
          <InfoRow
            icon={User}
            label="Customer"
            value={sale.party?.name || 'Walk-in Customer'}
          />
          <InfoRow
            icon={CreditCard}
            label="Payment Type"
            value={sale.payment_type?.name || 'Cash'}
          />
        </div>

        <Separator className="my-4" />

        {/* Products Table */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Products ({sale.details?.length || 0})</h4>
          </div>
          
          {sale.details && sale.details.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.details.map((detail, index) => (
                    <TableRow key={detail.id || index}>
                      <TableCell className="font-medium">
                        {detail.product?.productName || 'Product'}
                      </TableCell>
                      <TableCell className="text-center">
                        {detail.quantities}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detail.price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(detail.price * detail.quantities)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              No product details available
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(sale.totalAmount ?? 0)}</span>
          </div>
          {(sale.discountAmount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-red-500">-{formatCurrency(sale.discountAmount ?? 0)}</span>
            </div>
          )}
          {(sale.vat_amount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT ({sale.vat?.name || 'Tax'})</span>
              <span>{formatCurrency(sale.vat_amount ?? 0)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-medium text-lg">
            <span>Total</span>
            <span>{formatCurrency(sale.totalAmount ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Paid Amount</span>
            <span className="text-green-600">{formatCurrency(sale.paidAmount ?? 0)}</span>
          </div>
          {(sale.dueAmount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Due Amount</span>
              <span className="text-orange-600">{formatCurrency(sale.dueAmount ?? 0)}</span>
            </div>
          )}
          {(sale.change_amount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Change</span>
              <span>{formatCurrency(sale.change_amount ?? 0)}</span>
            </div>
          )}
        </div>

        {/* Note */}
        {sale.note && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Note</p>
              <p className="text-sm bg-muted/50 rounded-md p-3">{sale.note}</p>
            </div>
          </>
        )}

        {/* Hidden Receipt Printer - only shown when printing */}
        {showReceipt && (
          <div className="hidden print:block">
            <ReceiptPrinter
              sale={sale}
              currencySymbol={currencySymbol}
              printedReceipt={printedReceipt || undefined}
              isPrintMode={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const SaleDetailsDialog = memo(SaleDetailsDialogComponent)

SaleDetailsDialog.displayName = 'SaleDetailsDialog'

export default SaleDetailsDialog
