import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCurrency } from '@/hooks'
import api from '@/api/axios'
import { API_ENDPOINTS } from '@/api/endpoints'
import { createAppError } from '@/lib/errors'
import type { Sale, SaleDetail } from '@/types/api.types'
import { formatSaleDate } from '../hooks'
import { getImageUrl } from '@/lib/utils'

interface SaleReturnDialogProps {
  sale: Sale | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SaleReturnDialog({ sale, open, onOpenChange, onSuccess }: SaleReturnDialogProps) {
  const { format: formatCurrency } = useCurrency()
  const [fullSale, setFullSale] = useState<Sale | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [returnDate, setReturnDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({})

  // Fetch full sale details when dialog opens
  useEffect(() => {
    if (open && sale?.id) {
      const fetchDetails = async () => {
        setIsLoading(true)
        try {
          const { data } = await api.get(API_ENDPOINTS.SALES.GET(sale.id))
          setFullSale(data.data)
        } catch (error) {
          const appError = createAppError(error, 'Failed to load sale details')
          toast.error(appError.message)
          setFullSale(sale) // Fall back to partial sale data
        } finally {
          setIsLoading(false)
        }
      }

      fetchDetails()
    } else {
      setFullSale(null)
      setReturnQuantities({})
      setReturnDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [open, sale])

  const details = useMemo<SaleDetail[]>(() => fullSale?.details ?? sale?.details ?? [], [fullSale?.details, sale?.details])

  const totals = useMemo(() => {
    const totalAmount = details.reduce((sum, detail) => {
      const qty = returnQuantities[detail.id] ?? 0
      return sum + qty * detail.price
    }, 0)
    const totalQty = Object.values(returnQuantities).reduce((sum, qty) => sum + (qty || 0), 0)
    return { totalAmount, totalQty }
  }, [details, returnQuantities])

  const handleQtyChange = (detailId: number, maxQty: number, value: string) => {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return
    const safeValue = Math.max(0, Math.min(parsed, maxQty))
    setReturnQuantities((prev) => ({ ...prev, [detailId]: safeValue }))
  }

  const handleSubmit = async () => {
    if (!sale?.id) return
    
    // Build parallel arrays as required by API
    const sale_detail_id: number[] = []
    const return_qty: number[] = []
    const return_amount: number[] = []
    
    details.forEach((detail) => {
      const qty = returnQuantities[detail.id] ?? 0
      if (qty > 0) {
        sale_detail_id.push(detail.id)
        return_qty.push(qty)
        return_amount.push(qty * detail.price)
      }
    })

    if (sale_detail_id.length === 0) {
      toast.error('Enter at least one return quantity')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post(API_ENDPOINTS.SALE_RETURNS.CREATE, {
        sale_id: sale.id,
        return_date: returnDate,
        sale_detail_id,
        return_qty,
        return_amount,
      })
      toast.success('Sale return created')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const appError = createAppError(error, 'Failed to create sale return')
      toast.error(appError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return Items</DialogTitle>
        </DialogHeader>

        {!sale ? (
          <p className="text-sm text-muted-foreground">No sale selected.</p>
        ) : isLoading ? (
          <div className="py-6 text-sm text-muted-foreground">Loading sale details...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Invoice</p>
                <p className="font-mono font-semibold">{sale.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{sale.party?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Return Date</p>
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Sold Qty</TableHead>
                    <TableHead className="text-center">Return Qty</TableHead>
                    <TableHead className="text-right">Sale Price</TableHead>
                    <TableHead className="text-right">Return Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No products found for this sale
                      </TableCell>
                    </TableRow>
                  ) : (
                    details.map((detail, idx) => {
                      const maxQty = detail.quantities
                      const qty = returnQuantities[detail.id] ?? 0
                      const returnAmount = qty * detail.price
                      return (
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
                                <span className="font-medium">{detail.product?.productName || `Product #${detail.product_id}`}</span>
                                {detail.product?.productCode && (
                                  <span className="text-xs text-muted-foreground">Code: {detail.product.productCode}</span>
                                )}
                                {detail.mfg_date && (
                                  <span className="text-xs text-muted-foreground">Mfg: {formatSaleDate(detail.mfg_date)}</span>
                                )}
                                {detail.expire_date && (
                                  <span className="text-xs text-muted-foreground">Exp: {formatSaleDate(detail.expire_date)}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{maxQty}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={0}
                              max={maxQty}
                              value={qty}
                              onChange={(e) => handleQtyChange(detail.id, maxQty, e.target.value)}
                              className="h-9 w-24"
                            />
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(detail.price)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(returnAmount)}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Total Quantity</span>
                  <span className="font-medium text-foreground">{totals.totalQty}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total Return Amount</span>
                  <span className="font-bold text-primary">{formatCurrency(totals.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Select items and quantities to return. Maximum per item is the sold quantity.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isLoading || !sale}>
              {isSubmitting ? 'Submitting...' : 'Submit Return'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
