import { memo } from 'react'
import {
  Cloud,
  CloudOff,
  Receipt,
  User,
  Calendar,
  CreditCard,
  Package,
  Printer,
  DollarSign,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { toast } from 'sonner'
import { useCurrency } from '@/hooks'
import type { Sale } from '@/types/api.types'
import { printReceipt } from '@/lib/receipt-printer'
import { isSaleSynced, formatSaleDate } from '../hooks'
import { 
  getPaymentStatusBadge, 
  formatPaymentBreakdown,
  hasNewPaymentFields 
} from '@/lib/saleHelpers'

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
}: SaleDetailsDialogProps) {
  const { format: formatCurrency } = useCurrency()

  if (!sale) return null

  const paymentBadge = getPaymentStatusBadge(sale)
  const paymentBreakdown = formatPaymentBreakdown(sale)
  const synced = isSaleSynced(sale as Sale & { isOffline?: boolean })
  const showPaymentBreakdown = hasNewPaymentFields(sale) && paymentBreakdown.dueCollections > 0

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handlePrintReceipt = async () => {
    if (!sale.invoice_url) {
      toast.error('Invoice URL not available for this sale')
      return
    }

    const success = await printReceipt(sale)
    if (success) {
      toast.success('Receipt sent to printer')
    } else {
      toast.error('Failed to open print window. Please check popup blocker settings.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sale Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={paymentBadge.variant} className={paymentBadge.className}>
                {paymentBadge.text}
              </Badge>
              {synced ? (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  <Cloud className="mr-1 h-3 w-3" />
                  Synced
                </Badge>
              ) : (
                <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">
                  <CloudOff className="mr-1 h-3 w-3" />
                  Pending
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Sale Info Grid */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <InfoRow
            icon={Receipt}
            label="Invoice Number"
            value={sale.invoiceNumber || `#${sale.id}`}
          />
          <InfoRow icon={Calendar} label="Date" value={formatSaleDate(sale.saleDate)} />
          <InfoRow icon={User} label="Customer" value={sale.party?.name || 'Walk-in Customer'} />
          <InfoRow
            icon={CreditCard}
            label="Payment Type"
            value={sale.payment_type?.name || 'Cash'}
          />
        </div>

        <Separator className="my-4" />

        {/* Products Table */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Products ({sale.details?.length || 0})</h4>
          </div>

          {sale.details && sale.details.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
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
                      <TableCell className="text-center">{detail.quantities}</TableCell>
                      <TableCell className="text-right">{formatCurrency(detail.price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(detail.price * detail.quantities)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
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
          <div className="flex justify-between text-lg font-medium">
            <span>Total</span>
            <span>{formatCurrency(sale.totalAmount ?? 0)}</span>
          </div>
          
          {/* Payment Breakdown Section */}
          {showPaymentBreakdown ? (
            <>
              <div className="mt-4 rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <h5 className="font-medium text-sm">Payment Breakdown</h5>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Initial Payment</span>
                    <span className="text-green-600">{formatCurrency(paymentBreakdown.initialPaid)}</span>
                  </div>
                  
                  {paymentBreakdown.dueCollections > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Due Collections ({paymentBreakdown.dueCollectionsCount})
                      </span>
                      <span className="text-green-600">
                        +{formatCurrency(paymentBreakdown.dueCollections)}
                      </span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Paid</span>
                    <span className="text-green-600">{formatCurrency(paymentBreakdown.totalPaid)}</span>
                  </div>
                  
                  {paymentBreakdown.remainingDue > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining Due</span>
                      <span className="text-orange-600">{formatCurrency(paymentBreakdown.remainingDue)}</span>
                    </div>
                  )}
                </div>
                
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Payment Progress</span>
                    <span>{paymentBreakdown.paymentPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${paymentBreakdown.paymentPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Old payment display (backward compatibility) */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid Amount</span>
                <span className="text-green-600">{formatCurrency(paymentBreakdown.totalPaid)}</span>
              </div>
              {paymentBreakdown.remainingDue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Amount</span>
                  <span className="text-orange-600">{formatCurrency(paymentBreakdown.remainingDue)}</span>
                </div>
              )}
            </>
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
              <p className="mb-1 text-sm text-muted-foreground">Note</p>
              <p className="rounded-md bg-muted/50 p-3 text-sm">{sale.note}</p>
            </div>
          </>
        )}

        {/* Footer with Print Button */}
        {sale.invoice_url && (
          <DialogFooter className="mt-6">
            <Button onClick={handlePrintReceipt} variant="default">
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const SaleDetailsDialog = memo(SaleDetailsDialogComponent)

SaleDetailsDialog.displayName = 'SaleDetailsDialog'

export default SaleDetailsDialog
