import { memo } from 'react'
import { Eye, MoreHorizontal, Trash2, Pencil, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Purchase } from '@/types/api.types'
import { getPaymentStatus, formatPurchaseDate, getPurchaseItemsCount } from '../hooks'

// ============================================
// Types
// ============================================

export interface PurchasesTableProps {
  /** Purchases to display */
  purchases: Purchase[]
  /** Whether there are any purchases at all (before filtering) */
  hasPurchases: boolean
  /** Currency symbol for price display */
  currencySymbol: string
  /** Whether data is loading */
  isLoading: boolean
  /** Callback when view action is clicked */
  onView: (purchase: Purchase) => void
  /** Callback when edit action is clicked */
  onEdit?: (purchase: Purchase) => void
  /** Callback when delete action is clicked */
  onDelete: (purchase: Purchase) => void
  /** Callback when clear filters button is clicked (for no results state) */
  onClearFilters: () => void
  /** Pagination */
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

// ============================================
// Loading Skeleton
// ============================================

const TableSkeleton = memo(function TableSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="ml-auto h-8 w-8" />
        </div>
      ))}
    </div>
  )
})

// ============================================
// Empty State
// ============================================

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">No purchases yet</h3>
      <p className="max-w-sm text-muted-foreground">
        Purchases will appear here once you create your first purchase order.
      </p>
    </div>
  )
})

// ============================================
// No Results State
// ============================================

interface NoResultsStateProps {
  onClearFilters: () => void
}

const NoResultsState = memo(function NoResultsState({ onClearFilters }: NoResultsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">No matching purchases</h3>
      <p className="mb-4 max-w-sm text-muted-foreground">
        Try adjusting your search or filter criteria.
      </p>
      <Button variant="outline" onClick={onClearFilters}>
        Clear Filters
      </Button>
    </div>
  )
})

// ============================================
// Pagination Component
// ============================================

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * perPage + 1
  const endItem = Math.min(currentPage * perPage, totalItems)

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing {startItem} to {endItem} of {totalItems} purchases
        </span>
        <div className="flex items-center gap-2">
          <span>Per page:</span>
          <Select value={String(perPage)} onValueChange={(value) => onPerPageChange(Number(value))}>
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
})

// ============================================
// Table Row Component
// ============================================

interface PurchaseRowProps {
  purchase: Purchase
  currencySymbol: string
  onView: (purchase: Purchase) => void
  onEdit?: (purchase: Purchase) => void
  onDelete: (purchase: Purchase) => void
}

const PurchaseRow = memo(function PurchaseRow({
  purchase,
  currencySymbol,
  onView,
  onEdit,
  onDelete,
}: PurchaseRowProps) {
  const paymentStatus = getPaymentStatus(purchase)
  const itemsCount = getPurchaseItemsCount(purchase)

  return (
    <TableRow>
      {/* Invoice Number */}
      <TableCell className="font-medium">{purchase.invoiceNumber}</TableCell>

      {/* Supplier */}
      <TableCell>
        {purchase.party?.name || <span className="italic text-muted-foreground">No supplier</span>}
      </TableCell>

      {/* Date */}
      <TableCell>{formatPurchaseDate(purchase.purchaseDate)}</TableCell>

      {/* Items */}
      <TableCell className="text-center">{itemsCount}</TableCell>

      {/* Total */}
      <TableCell className="text-right font-medium">
        {currencySymbol}
        {(purchase.totalAmount ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </TableCell>

      {/* Paid */}
      <TableCell className="text-right">
        {currencySymbol}
        {(purchase.paidAmount ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </TableCell>

      {/* Due */}
      <TableCell className="text-right">
        {(purchase.dueAmount ?? 0) > 0 ? (
          <span className="font-medium text-destructive">
            {currencySymbol}
            {(purchase.dueAmount ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
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
              ? 'bg-green-100 text-green-800 hover:bg-green-100'
              : paymentStatus.variant === 'warning'
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                : ''
          }
        >
          {paymentStatus.label}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(purchase)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(purchase)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(purchase)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
})

// ============================================
// Main Component
// ============================================

export const PurchasesTable = memo(function PurchasesTable({
  purchases,
  hasPurchases,
  currencySymbol,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onClearFilters,
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
}: PurchasesTableProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <TableSkeleton />
      </Card>
    )
  }

  // Empty state (no purchases at all)
  if (!hasPurchases) {
    return (
      <Card>
        <EmptyState />
      </Card>
    )
  }

  // No results after filtering
  if (purchases.length === 0) {
    return (
      <Card>
        <NoResultsState onClearFilters={onClearFilters} />
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((purchase) => (
              <PurchaseRow
                key={purchase.id}
                purchase={purchase}
                currencySymbol={currencySymbol}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </TableBody>
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />
      </CardContent>
    </Card>
  )
})

export default PurchasesTable
