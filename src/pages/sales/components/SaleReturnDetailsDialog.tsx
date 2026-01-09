import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrency } from '@/hooks'
import { format } from 'date-fns'
import type { SaleReturn } from '@/types/api.types'
import { getImageUrl } from '@/lib/utils'

interface SaleReturnDetailsDialogProps {
  saleReturn: SaleReturn | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SaleReturnDetailsDialog({ saleReturn, open, onOpenChange }: SaleReturnDetailsDialogProps) {
  const { format: formatCurrency } = useCurrency()

  if (!saleReturn) return null

  const formattedDate = saleReturn.return_date ? format(new Date(saleReturn.return_date), 'MMMM dd, yyyy') : '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sale Return Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Return Information */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Return Invoice</p>
              <p className="font-mono font-semibold">{saleReturn.invoice_no || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Return Date</p>
              <p className="font-medium">{formattedDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sale Invoice</p>
              <p className="font-mono font-medium">{saleReturn.sale?.invoiceNumber || '-'}</p>
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{saleReturn.sale?.party?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Branch</p>
              <p className="font-medium">{saleReturn.branch?.name || '-'}</p>
            </div>
          </div>

          <Separator />

          {/* Products Table */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Returned Products</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Returned Qty</TableHead>
                    <TableHead className="text-right">Return Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!saleReturn.details || saleReturn.details.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    saleReturn.details.map((detail, idx) => (
                      <TableRow key={detail.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                              {getImageUrl(detail.product?.productPicture) ? (
                                <img
                                  src={getImageUrl(detail.product?.productPicture)!}
                                  alt={detail.product?.productName || 'Product'}
                                  className="h-full w-full rounded object-cover"
                                />
                              ) : (
                                <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{detail.product?.productName || '-'}</span>
                              {detail.product?.productCode && (
                                <span className="text-xs text-muted-foreground">Code: {detail.product.productCode}</span>
                              )}
                              {detail.batch_no && (
                                <span className="text-xs text-muted-foreground">Batch: {detail.batch_no}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{detail.return_qty}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(detail.return_amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total Quantity</span>
                <span className="font-medium text-foreground">{saleReturn.total_return_qty || 0}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total Return Amount</span>
                <span className="font-bold text-primary">{formatCurrency(saleReturn.total_return_amount || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
