import { format } from 'date-fns'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrency } from '@/hooks'
import type { PurchaseReturn } from '@/types/api.types'

interface PurchaseReturnDetailsDialogProps {
  purchaseReturn: PurchaseReturn | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PurchaseReturnDetailsDialog({ purchaseReturn, open, onOpenChange }: PurchaseReturnDetailsDialogProps) {
  const { format: formatCurrency } = useCurrency()

  if (!purchaseReturn) return null

  const totalReturnAmount = purchaseReturn.total_return_amount || 0
  const totalReturnQty = purchaseReturn.total_return_qty || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Return Details</DialogTitle>
          <DialogDescription>Return Invoice: {purchaseReturn.invoice_no}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-semibold">Return Information</h3>
            <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Return Invoice</p>
                <p className="font-mono font-semibold text-base">{purchaseReturn.invoice_no || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Return Date</p>
                <p className="font-medium">{purchaseReturn.return_date ? format(new Date(purchaseReturn.return_date), 'MMM dd, yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{purchaseReturn.created_at ? format(new Date(purchaseReturn.created_at), 'MMM dd, yyyy HH:mm') : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purchase Invoice</p>
                <p className="font-mono font-medium">{purchaseReturn.purchase?.invoiceNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{purchaseReturn.purchase?.party?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-medium">{purchaseReturn.branch?.name || '-'}</p>
              </div>
            </div>
          </div>

          {purchaseReturn.purchase && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 font-semibold">Original Purchase</h3>
                <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                    <p className="font-medium">{purchaseReturn.purchase.purchaseDate ? format(new Date(purchaseReturn.purchase.purchaseDate), 'MMM dd, yyyy') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-medium">{formatCurrency(purchaseReturn.purchase.totalAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="font-medium">{formatCurrency(purchaseReturn.purchase.paidAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <Badge variant={(purchaseReturn.purchase.paidAmount || 0) >= (purchaseReturn.purchase.totalAmount || 0) ? 'default' : 'secondary'} className={(purchaseReturn.purchase.paidAmount || 0) >= (purchaseReturn.purchase.totalAmount || 0) ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}>
                      {(purchaseReturn.purchase.paidAmount || 0) >= (purchaseReturn.purchase.totalAmount || 0) ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />
          <div>
            <h3 className="mb-3 font-semibold">Returned Products</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity Returned</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Return Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseReturn.details && purchaseReturn.details.length > 0 ? (
                    purchaseReturn.details.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <p className="font-medium">{detail.product?.productName || `Product #${detail.purchase_detail_id}`}</p>
                            {detail.batch_no && <p className="text-xs text-muted-foreground">Batch: {detail.batch_no}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{detail.return_qty || 0}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency((detail.return_amount || 0) / (detail.return_qty || 1))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(detail.return_amount || 0)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No products information available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Items:</span>
                <span className="font-medium">{purchaseReturn.details?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Quantity Returned:</span>
                <span className="font-medium">{totalReturnQty}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total Return Amount:</span>
                <span className="font-bold text-primary">{formatCurrency(totalReturnAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
