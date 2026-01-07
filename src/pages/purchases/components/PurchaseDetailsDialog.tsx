import { memo, useEffect, useState } from 'react'
import { Package, Calendar, User, CreditCard, FileText, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCurrency } from '@/hooks'
import { purchasesService } from '@/api/services'
import type { Purchase, PurchaseDetail } from '@/types/api.types'
import { getPaymentStatus, formatPurchaseDate } from '../hooks'
import { getImageUrl } from '@/lib/utils'

// ============================================
// Types
// ============================================

export interface PurchaseDetailsDialogProps {
  purchase: Purchase | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ============================================
// Info Row Component
// ============================================

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}

const InfoRow = memo(function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
})

// ============================================
// Product Row Component
// ============================================

interface ProductRowProps {
  detail: PurchaseDetail
  index: number
}

const ProductRow = memo(function ProductRow({ detail, index }: ProductRowProps) {
  const { format: formatCurrency } = useCurrency()
  const subtotal = detail.quantities * detail.productPurchasePrice

  return (
    <TableRow>
      <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
            {getImageUrl(detail.product?.image) ? (
            <img
              src={getImageUrl(detail.product?.image)!}
              alt={detail.product?.productName}
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
              <span className="text-xs text-muted-foreground">
                Mfg: {formatPurchaseDate(detail.mfg_date)}
              </span>
            )}
            {detail.expire_date && (
              <span className="text-xs text-muted-foreground">
                Exp: {formatPurchaseDate(detail.expire_date)}
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">{detail.quantities}</TableCell>
      <TableCell className="text-right">
        {formatCurrency(detail.productPurchasePrice)}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(detail.productSalePrice)}
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(subtotal)}
      </TableCell>
    </TableRow>
  )
})

// ============================================
// Main Component
// ============================================

export const PurchaseDetailsDialog = memo(function PurchaseDetailsDialog({
  purchase,
  open,
  onOpenChange,
}: PurchaseDetailsDialogProps) {
  const { format: formatCurrency } = useCurrency()
  const [fullPurchase, setFullPurchase] = useState<Purchase | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch full purchase details when dialog opens
  useEffect(() => {
    if (open && purchase?.id) {
      const fetchDetails = async () => {
        setIsLoading(true)
        try {
          const response = await purchasesService.getById(purchase.id)
          setFullPurchase(response.data)
        } catch (error) {
          console.error('Failed to fetch purchase details:', error)
          setFullPurchase(purchase) // Fall back to partial data
        } finally {
          setIsLoading(false)
        }
      }
      fetchDetails()
    } else {
      setFullPurchase(null)
    }
  }, [open, purchase])

  if (!purchase) return null

  const displayPurchase = fullPurchase || purchase
  const paymentStatus = getPaymentStatus(displayPurchase)
  const details = displayPurchase.details || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Purchase Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <InfoRow
                icon={<FileText className="h-4 w-4" />}
                label="Invoice Number"
                value={displayPurchase.invoiceNumber}
              />
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Purchase Date"
                value={formatPurchaseDate(displayPurchase.purchaseDate)}
              />
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Supplier"
                value={
                  displayPurchase.party?.name || (
                    <span className="italic text-muted-foreground">No supplier</span>
                  )
                }
              />
              <InfoRow
                icon={<CreditCard className="h-4 w-4" />}
                label="Payment Status"
                value={
                  <Badge
                    variant={
                      paymentStatus.variant === 'success'
                        ? 'default'
                        : paymentStatus.variant === 'warning'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className={
                      paymentStatus.variant === 'success'
                        ? 'bg-green-100 text-green-800'
                        : paymentStatus.variant === 'warning'
                          ? 'bg-yellow-100 text-yellow-800'
                          : ''
                    }
                  >
                    {paymentStatus.label}
                  </Badge>
                }
              />
            </div>

            <Separator />

            {/* Products Table */}
            <div>
              <h3 className="mb-3 font-semibold">Products ({details.length})</h3>
              {details.length > 0 ? (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Cost Price</TableHead>
                        <TableHead className="text-right">Sale Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.map((detail, index) => (
                        <ProductRow
                          key={detail.id}
                          detail={detail}
                          index={index}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-4 text-center text-muted-foreground">
                  No product details available
                </p>
              )}
            </div>

            <Separator />

            {/* Summary */}
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    {formatCurrency(displayPurchase.totalAmount ?? 0)}
                  </span>
                </div>
                {(displayPurchase.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">
                      -{formatCurrency(displayPurchase.discountAmount ?? 0)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>
                    {formatCurrency(displayPurchase.totalAmount ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-green-600">
                    {formatCurrency(displayPurchase.paidAmount ?? 0)}
                  </span>
                </div>
                {(displayPurchase.dueAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-destructive">Due</span>
                    <span className="text-destructive">
                      {formatCurrency(displayPurchase.dueAmount ?? 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
})

export default PurchaseDetailsDialog
