import { memo, useState, useEffect } from 'react'
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
import { printReceipt } from '@/lib/receipt-generator'
import { useBusinessStore } from '@/stores/business.store'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks'
import type { Sale } from '@/types/api.types'
import { isSaleSynced, formatSaleDate } from '@/pages/sales/hooks'
import {
  getPaymentStatusBadge,
  formatPaymentBreakdown,
  hasNewPaymentFields,
} from '@/pages/sales/helpers'

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

function SaleDetailsDialogComponent({ sale, open, onOpenChange }: SaleDetailsDialogProps) {
  const { format: formatCurrencyAmount } = useCurrency()
  const business = useBusinessStore((state) => state.business)
  const fetchBusiness = useBusinessStore((state) => state.fetchBusiness)
  const [isPrinting, setIsPrinting] = useState(false)

  // Fetch business data when component mounts if not already loaded
  useEffect(() => {
    if (!business) {
      fetchBusiness()
    }
  }, [business, fetchBusiness])

  if (!sale) return null

  // Debug: Log sale details to see what discount data we're receiving
  console.log('[SaleDetailsDialog] Sale data:', {
    invoiceNumber: sale.invoiceNumber,
    details: sale.details?.map((d) => ({
      product: d.product?.productName,
      price: d.price,
      subTotal: d.subTotal,
      discount_type: d.discount_type,
      discount_value: d.discount_value,
      discount_amount: d.discount_amount,
      final_price: d.final_price,
    })),
  })

  const paymentBadge = getPaymentStatusBadge(sale)
  const paymentBreakdown = formatPaymentBreakdown(sale)
  const synced = isSaleSynced(sale as Sale & { isOffline?: boolean })
  const showPaymentBreakdown = hasNewPaymentFields(sale) && paymentBreakdown.dueCollections > 0
  const metaLoyalty =
    sale.meta && typeof sale.meta === 'object' && 'loyalty' in sale.meta
      ? (sale.meta as Record<string, unknown>).loyalty
      : null
  const fallbackLoyalty =
    metaLoyalty && typeof metaLoyalty === 'object'
      ? (metaLoyalty as {
          party_id?: number | null
          card_code?: string | null
          earned_points?: number
          redeemed_points?: number
          redeem_amount?: number
          balance_after?: number | null
        })
      : null
  const loyaltySummary = sale.loyalty ?? fallbackLoyalty

  const handlePrintReceipt = async () => {
    if (isPrinting) return

    setIsPrinting(true)
    console.log('[SaleDetails] Print button clicked, sale:', sale.invoiceNumber)

    try {
      // Find customer from sale data
      const customer = sale.party || null

      console.log('[SaleDetails] Calling printReceipt with:', {
        sale: sale.invoiceNumber,
        business: business?.companyName,
        customer: customer?.name,
      })

      const success = await printReceipt({
        sale,
        business,
        customer,
      })

      if (success) {
        toast.success('Receipt sent to printer')
        console.log('[SaleDetails] Print successful')
      } else {
        toast.error('Failed to print receipt. Please check your printer.')
        console.error('[SaleDetails] Print failed')
      }
    } catch (error) {
      console.error('[SaleDetails] Print error:', error)
      toast.error('Error printing receipt')
    } finally {
      setIsPrinting(false)
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
              <Badge
                variant={
                  paymentBadge.variant as
                    | 'default'
                    | 'secondary'
                    | 'destructive'
                    | 'success'
                    | 'warning'
                    | 'outline'
                }
              >
                {paymentBadge.text}
              </Badge>
              {synced ? (
                <Badge variant="success">
                  <Cloud className="mr-1 h-3 w-3" />
                  Synced
                </Badge>
              ) : (
                <Badge variant="warning">
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
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.details.map((detail, index) => {
                    // Check if this detail has been returned
                    const returnedQty =
                      sale.saleReturns?.reduce((sum, ret) => {
                        const detailReturn = ret.details?.find(
                          (d) => d.sale_detail_id === detail.id
                        )
                        return sum + (detailReturn?.return_qty || 0)
                      }, 0) || 0

                    const isFullyReturned = returnedQty >= detail.quantities
                    const isPartiallyReturned = returnedQty > 0 && !isFullyReturned

                    // Calculate discount information
                    // Check if backend sent discount fields
                    const hasDiscountFields =
                      (detail.discount_amount ?? 0) > 0 || detail.discount_type

                    // Calculate values
                    const originalSubtotal = detail.price * detail.quantities
                    const actualSubtotal = detail.subTotal ?? originalSubtotal

                    // If no explicit discount fields, try to infer from price difference
                    const inferredDiscount = originalSubtotal - actualSubtotal
                    const hasInferredDiscount = inferredDiscount > 0.01 // Account for rounding

                    const hasDiscount = hasDiscountFields || hasInferredDiscount
                    const discountAmount = hasDiscountFields
                      ? (detail.discount_amount ?? 0) * detail.quantities
                      : inferredDiscount

                    const finalSubtotal = detail.final_price
                      ? detail.final_price * detail.quantities
                      : actualSubtotal

                    return (
                      <TableRow
                        key={detail.id || index}
                        className={` ${isFullyReturned ? 'bg-red-50 dark:bg-red-950/20' : ''} ${isPartiallyReturned ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''} `}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{detail.product?.productName || 'Product'}</span>
                            {detail.variant_name && (
                              <span className="text-xs text-muted-foreground">
                                {detail.variant_name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{detail.quantities}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span>{formatCurrencyAmount(detail.price)}</span>
                            {/* {hasDiscount && detail.final_price && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatCurrencyAmount(detail.price)}
                              </span>
                            )} */}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {hasDiscount ? (
                            <div className="flex flex-col items-end">
                              {hasDiscountFields ? (
                                <>
                                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                    {detail.discount_type === 'percentage'
                                      ? `${detail.discount_value}%`
                                      : 'Fixed'}
                                  </span>
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    -{formatCurrencyAmount(discountAmount)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                  -{formatCurrencyAmount(discountAmount)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrencyAmount(finalSubtotal)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isFullyReturned && (
                            <Badge variant="destructive" className="text-xs">
                              Returned ({returnedQty})
                            </Badge>
                          )}
                          {isPartiallyReturned && (
                            <Badge
                              variant="secondary"
                              className="bg-yellow-100 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                            >
                              Partial Return ({returnedQty})
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
          {(() => {
            // Calculate product-level discounts
            const productDiscounts =
              sale.details?.reduce((sum, detail) => {
                return sum + (detail.discount_amount ?? 0) * detail.quantities
              }, 0) ?? 0

            // Calculate subtotal before any discounts
            const subtotalBeforeDiscounts =
              sale.details?.reduce((sum, detail) => {
                return sum + detail.price * detail.quantities
              }, 0) ?? sale.totalAmount

            return (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (before discounts)</span>
                  <span>{formatCurrencyAmount(subtotalBeforeDiscounts)}</span>
                </div>
                {productDiscounts > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Product Discounts</span>
                    <span className="text-green-600 dark:text-green-400">
                      -{formatCurrencyAmount(productDiscounts)}
                    </span>
                  </div>
                )}
                {(sale.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cart Discount</span>
                    <span className="text-green-600 dark:text-green-400">
                      -{formatCurrencyAmount(sale.discountAmount ?? 0)}
                    </span>
                  </div>
                )}
                {(sale.vat_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT ({sale.vat?.name || 'Tax'})</span>
                    <span>{formatCurrencyAmount(sale.vat_amount ?? 0)}</span>
                  </div>
                )}
                {loyaltySummary && (loyaltySummary.redeem_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Loyalty Redemption ({loyaltySummary.redeemed_points ?? 0} pts)</span>
                    <span className="text-purple-600">
                      -{formatCurrencyAmount(loyaltySummary.redeem_amount ?? 0)}
                    </span>
                  </div>
                )}
              </>
            )
          })()}
          <Separator />
          <div className="flex justify-between text-lg font-medium">
            <span>Total</span>
            <span>{formatCurrencyAmount((sale.totalAmount ?? 0) - (loyaltySummary?.redeem_amount ?? 0))}</span>
          </div>

          {/* Payment Breakdown Section */}
          {showPaymentBreakdown ? (
            <>
              <div className="mt-4 space-y-3 rounded-lg bg-muted/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <h5 className="text-sm font-medium">Payment Breakdown</h5>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Initial Payment</span>
                    <span className="text-green-600">
                      {formatCurrencyAmount(paymentBreakdown.initialPaid)}
                    </span>
                  </div>

                  {paymentBreakdown.dueCollections > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Due Collections ({paymentBreakdown.dueCollectionsCount})
                      </span>
                      <span className="text-green-600">
                        +{formatCurrencyAmount(paymentBreakdown.dueCollections)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Paid</span>
                    <span className="text-green-600">
                      {formatCurrencyAmount(paymentBreakdown.totalPaid)}
                    </span>
                  </div>

                  {paymentBreakdown.remainingDue > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining Due</span>
                      <span className="text-orange-600">
                        {formatCurrencyAmount(paymentBreakdown.remainingDue)}
                      </span>
                    </div>
                  )}

                  {/* Net Total after Returns */}
                  {(() => {
                    const returnAmount =
                      sale.saleReturns?.reduce((sum, ret) => {
                        // Try snake_case first (preferred format)
                        if (ret.total_return_amount != null) return sum + ret.total_return_amount
                        // Try camelCase (backend sometimes sends this)
                        if ((ret as unknown as { returnAmount?: number }).returnAmount != null)
                          return sum + (ret as unknown as { returnAmount: number }).returnAmount
                        // Fallback: calculate from details array
                        if (ret.details && Array.isArray(ret.details)) {
                          const detailsSum = ret.details.reduce((detailSum, detail) => {
                            return detailSum + (detail.return_amount || 0)
                          }, 0)
                          return sum + detailsSum
                        }
                        return sum
                      }, 0) || 0

                    if (returnAmount > 0) {
                      const netTotal = (sale.totalAmount ?? 0) - returnAmount
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Return Amount</span>
                            <span className="text-red-600">
                              -{formatCurrencyAmount(returnAmount)}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between text-sm font-medium">
                            <span>Net Total</span>
                            <span className="text-blue-600">{formatCurrencyAmount(netTotal)}</span>
                          </div>
                        </>
                      )
                    }
                    return null
                  })()}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Payment Progress</span>
                    <span>{paymentBreakdown.paymentPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
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
                <span className="text-green-600">
                  {formatCurrencyAmount(paymentBreakdown.totalPaid)}
                </span>
              </div>
              {paymentBreakdown.remainingDue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Amount</span>
                  <span className="text-orange-600">
                    {formatCurrencyAmount(paymentBreakdown.remainingDue)}
                  </span>
                </div>
              )}

              {/* Net Total after Returns */}
              {(() => {
                const returnAmount =
                  sale.saleReturns?.reduce((sum, ret) => {
                    // Try snake_case first (preferred format)
                    if (ret.total_return_amount != null) return sum + ret.total_return_amount
                    // Try camelCase (backend sometimes sends this)
                    if ((ret as unknown as { returnAmount?: number }).returnAmount != null)
                      return sum + (ret as unknown as { returnAmount: number }).returnAmount
                    // Fallback: calculate from details array
                    if (ret.details && Array.isArray(ret.details)) {
                      const detailsSum = ret.details.reduce((detailSum, detail) => {
                        return detailSum + (detail.return_amount || 0)
                      }, 0)
                      return sum + detailsSum
                    }
                    return sum
                  }, 0) || 0

                if (returnAmount > 0) {
                  const netTotal = (sale.totalAmount ?? 0) - returnAmount
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Return Amount</span>
                        <span className="text-red-600">-{formatCurrencyAmount(returnAmount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm font-medium">
                        <span>Net Total</span>
                        <span className="text-blue-600">{formatCurrencyAmount(netTotal)}</span>
                      </div>
                    </>
                  )
                }
                return null
              })()}
            </>
          )}

          {(sale.change_amount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Change</span>
              <span>{formatCurrencyAmount(sale.change_amount ?? 0)}</span>
            </div>
          )}
        </div>

        {loyaltySummary && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <h5 className="text-sm font-medium">Loyalty Summary</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Card</span>
                  <span>{loyaltySummary.card_code || sale.party?.loyalty_card_code || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Earned</span>
                  <span className="text-green-600">+{loyaltySummary.earned_points ?? 0}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Redeemed</span>
                  <span className="text-orange-600">-{loyaltySummary.redeemed_points ?? 0}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Redeem Amount</span>
                  <span>{formatCurrencyAmount(loyaltySummary.redeem_amount ?? 0)}</span>
                </div>
                <div className="col-span-2 flex justify-between gap-2 font-medium">
                  <span>Balance After</span>
                  <span>{loyaltySummary.balance_after ?? '-'}</span>
                </div>
              </div>
            </div>
          </>
        )}

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
            <Button onClick={handlePrintReceipt} variant="default" disabled={isPrinting}>
              <Printer className="mr-2 h-4 w-4" />
              {isPrinting ? 'Printing...' : 'Print Receipt'}
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
