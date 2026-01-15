import { useState, useEffect } from 'react'
import { useCurrency } from '@/hooks'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import type { Stock } from '@/types/api.types'

export interface StocksListProps {
  stocks: Stock[]
  isLoading: boolean
  emptyMessage: string
  onSelectionChange?: (ids: number[]) => void
  onBulkDelete?: (ids: number[]) => void
  // Pagination props
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  totalItems?: number
  perPage?: number
  onPerPageChange?: (perPage: number) => void
  allowClientPagination?: boolean
  showExpiryDate?: boolean
}

export function StocksList({
  stocks,
  isLoading,
  emptyMessage,
  onSelectionChange,
  onBulkDelete,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems = 0,
  perPage = 10,
  onPerPageChange,
  allowClientPagination = false,
  showExpiryDate = false,
}: StocksListProps) {
  const { format: formatCurrency } = useCurrency()
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Calculate entries info
  const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1
  const endEntry = Math.min(currentPage * perPage, totalItems)

  const displayStocks = allowClientPagination
    ? stocks.slice((currentPage - 1) * perPage, currentPage * perPage)
    : stocks

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = displayStocks.map((d) => d.id)
      setSelectedIds(allIds)
      onSelectionChange?.(allIds)
    } else {
      setSelectedIds([])
      onSelectionChange?.([])
    }
  }

  const toggleSelect = (id: number, checked: boolean) => {
    let newSelected = []
    if (checked) {
      newSelected = [...selectedIds, id]
    } else {
      newSelected = selectedIds.filter((sid) => sid !== id)
    }
    setSelectedIds(newSelected)
    onSelectionChange?.(newSelected)
  }

  useEffect(() => {
    setSelectedIds([])
  }, [stocks])

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={String(perPage)}
            onValueChange={(v) => {
              onPerPageChange?.(Number(v))
              onPageChange?.(1)
            }}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue placeholder={perPage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {selectedIds.length} stock(s) selected
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onBulkDelete?.(selectedIds)}
              disabled={!onBulkDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
          </div>
        ) : stocks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      displayStocks.length > 0 &&
                      displayStocks.every((d) => selectedIds.includes(d.id))
                    }
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead>Product ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Sale Price</TableHead>
                <TableHead>Stock Value</TableHead>
                {showExpiryDate && <TableHead>Expired Date</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayStocks.map((stock) => {
                const stockValue = stock.productStock * stock.productPurchasePrice
                const productName = stock.product?.productName || stock.product_name || '-'
                const productCode = stock.product?.productCode || stock.product_code || stock.batch_no || '-'
                const categoryName = stock.category?.categoryName || stock.category_name || (stock.product as { category?: { categoryName?: string } })?.category?.categoryName || '-'
                const variantName = stock.variant?.variant_name || stock.variant_name
                const formattedExpiry = stock.expire_date
                  ? format(new Date(stock.expire_date), 'MMM dd, yyyy')
                  : '-'

                return (
                  <TableRow
                    key={stock.id}
                    data-state={selectedIds.includes(stock.id) && 'selected'}
                    className="h-14 hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(stock.id)}
                        onCheckedChange={(checked) => toggleSelect(stock.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm">#{stock.product_id}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{productName}</span>
                        {variantName && (
                          <span className="text-xs text-muted-foreground">{variantName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{productCode}</TableCell>
                    <TableCell className="text-muted-foreground">{categoryName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(stock.productPurchasePrice)}</TableCell>
                    <TableCell className="font-semibold text-center">{stock.productStock}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(stock.productSalePrice)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(stockValue)}</TableCell>
                    {showExpiryDate && <TableCell className="text-red-600 font-medium">{formattedExpiry}</TableCell>}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalItems > 0 && (
        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-muted-foreground">
            Showing {startEntry} to {endEntry} of {totalItems} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else {
                  if (currentPage <= 3) pageNum = i + 1
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                  else pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => onPageChange?.(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StocksList
