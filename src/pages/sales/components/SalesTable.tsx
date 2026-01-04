import { memo } from 'react'
import { Eye, MoreHorizontal, Trash2, CloudOff, Cloud } from 'lucide-react'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCurrency } from '@/hooks'
import type { Sale } from '@/types/api.types'
import { isSaleSynced, formatSaleDate, getSaleItemsCount } from '../hooks'
import { 
  getPaymentStatusBadge, 
  getTotalPaidAmount, 
  getRemainingDueAmount 
} from '@/lib/saleHelpers'

// ============================================
// Types
// ============================================

export interface SalesTableProps {
  /** Sales to display */
  sales: Sale[]
  /** Whether there are any sales at all (before filtering) */
  hasSales: boolean
  /** Whether data is loading */
  isLoading: boolean
  /** Callback when view action is clicked */
  onView: (sale: Sale) => void
  /** Callback when delete action is clicked */
  onDelete: (sale: Sale) => void
  /** Callback when clear filters button is clicked (for no results state) */
  onClearFilters: () => void
}

// ============================================
// Loading Skeleton
// ============================================

const TableSkeleton = memo(function TableSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-8 ml-auto" />
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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <CloudOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No sales yet</h3>
      <p className="text-muted-foreground max-w-sm">
        Sales will appear here once you make your first transaction from the POS screen.
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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <CloudOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No matching sales</h3>
      <p className="text-muted-foreground max-w-sm mb-4">
        Try adjusting your search or filter criteria.
      </p>
      <Button variant="outline" onClick={onClearFilters}>
        Clear Filters
      </Button>
    </div>
  )
})

// ============================================
// Sale Row Component
// ============================================

interface SaleRowProps {
  sale: Sale
  onView: (sale: Sale) => void
  onDelete: (sale: Sale) => void
}

const SaleRow = memo(function SaleRow({
  sale,
  onView,
  onDelete,
}: SaleRowProps) {
  const { format: formatCurrencyAmount } = useCurrency()
  const paymentBadge = getPaymentStatusBadge(sale)
  const synced = isSaleSynced(sale as Sale & { isOffline?: boolean })
  const itemsCount = getSaleItemsCount(sale)
  const totalPaid = getTotalPaidAmount(sale)
  const remainingDue = getRemainingDueAmount(sale)
  
  // Calculate collections with fallback
  const initialPaid = sale.initial_paidAmount ?? sale.paidAmount ?? 0
  const totalAmount = sale.totalAmount ?? 0
  const originalDue = totalAmount - initialPaid
  const collectionsTotal = sale.due_collections_total ?? (originalDue - remainingDue)
  const hasDueCollections = collectionsTotal > 0
  const collectionsCount = sale.due_collections_count ?? (hasDueCollections ? 1 : 0)

  return (
    <TableRow className={!synced ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : undefined}>
      {/* Invoice Number */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {sale.invoiceNumber || `#${sale.id}`}
          {!synced && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <CloudOff className="h-3.5 w-3.5 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pending sync</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>

      {/* Date */}
      <TableCell className="text-muted-foreground">
        {formatSaleDate(sale.saleDate)}
      </TableCell>

      {/* Customer */}
      <TableCell>
        {sale.party?.name || (
          <span className="text-muted-foreground italic">Walk-in</span>
        )}
      </TableCell>

      {/* Items */}
      <TableCell className="text-center">
        {itemsCount}
      </TableCell>

      {/* Total */}
      <TableCell className="text-right font-medium">
        {formatCurrencyAmount(sale.totalAmount ?? 0)}
      </TableCell>

      {/* Paid */}
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span className="text-green-600 dark:text-green-400 font-medium">
            {formatCurrencyAmount(totalPaid)}
          </span>
          {hasDueCollections && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground">
                    (+{collectionsCount} collection{collectionsCount > 1 ? 's' : ''})
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Initial: {formatCurrencyAmount(initialPaid)}</p>
                  <p>Collections: {formatCurrencyAmount(collectionsTotal)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>

      {/* Due */}
      <TableCell className="text-right">
        {remainingDue > 0 ? (
          <span className="text-orange-600 dark:text-orange-400">
            {formatCurrencyAmount(remainingDue)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant={paymentBadge.variant as 'default' | 'secondary' | 'destructive' | 'outline'} className={paymentBadge.className}>
          {paymentBadge.text}
        </Badge>
      </TableCell>

      {/* Sync Status */}
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center">
                {synced ? (
                  <Cloud className="h-4 w-4 text-green-500" />
                ) : (
                  <CloudOff className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{synced ? 'Synced' : 'Pending sync'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(sale)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(sale)}
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
// Table Header Component
// ============================================

const SalesTableHeader = memo(function SalesTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Invoice #</TableHead>
        <TableHead>Date</TableHead>
        <TableHead>Customer</TableHead>
        <TableHead className="text-center">Items</TableHead>
        <TableHead className="text-right">Total</TableHead>
        <TableHead className="text-right">Paid</TableHead>
        <TableHead className="text-right">Due</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-center">Sync</TableHead>
        <TableHead className="w-12">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
})

// ============================================
// Main Component
// ============================================

function SalesTableComponent({
  sales,
  hasSales,
  isLoading,
  onView,
  onDelete,
  onClearFilters,
}: SalesTableProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <TableSkeleton />
        </CardContent>
      </Card>
    )
  }

  // Empty state (no sales at all)
  if (!hasSales) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState />
        </CardContent>
      </Card>
    )
  }

  // No results state (filters active but no matches)
  if (sales.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <NoResultsState onClearFilters={onClearFilters} />
        </CardContent>
      </Card>
    )
  }

  // Sales table
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <SalesTableHeader />
            <TableBody>
              {sales.map((sale) => (
                <SaleRow
                  key={sale.id}
                  sale={sale}
                  onView={onView}
                  onDelete={onDelete}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export const SalesTable = memo(SalesTableComponent)

SalesTable.displayName = 'SalesTable'

export default SalesTable
