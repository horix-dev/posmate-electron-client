import { memo } from 'react'
import { Package, MoreHorizontal, Pencil, Trash2, Eye, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, getImageUrl } from '@/lib/utils'
import type { Product } from '@/types/api.types'
import { getStockStatus, getTotalStock, getSalePrice, getPurchasePrice } from '../hooks'

// ============================================
// Types
// ============================================

export interface ProductRowProps {
  /** The product to display */
  product: Product
  /** Currency symbol for price display */
  currencySymbol: string
  /** Callback when view action is clicked */
  onView: (product: Product) => void
  /** Callback when edit action is clicked */
  onEdit: (product: Product) => void
  /** Callback when delete action is clicked */
  onDelete: (product: Product) => void
}

// ============================================
// Component
// ============================================

/**
 * ProductRow component displays a single product in the table.
 * Memoized to prevent unnecessary re-renders when other products change.
 */
function ProductRowComponent({
  product,
  currencySymbol,
  onView,
  onEdit,
  onDelete,
}: ProductRowProps) {
  const stockStatus = getStockStatus(product)
  const totalStock = getTotalStock(product)
  const salePrice = getSalePrice(product)
  const purchasePrice = getPurchasePrice(product)

  const handleView = () => onView(product)
  const handleEdit = () => onEdit(product)
  const handleDelete = () => onDelete(product)

  return (
    <TableRow>
      {/* Product Name & Image */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"
            role="img"
            aria-label={product.productPicture ? product.productName : 'No product image'}
          >
            {getImageUrl(product.productPicture) ? (
              <img
                src={getImageUrl(product.productPicture)!}
                alt={product.productName}
                className="h-10 w-10 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="font-medium">{product.productName}</p>
            <p className="text-xs text-muted-foreground">
              {product.productCode || `SKU-${product.id}`}
            </p>
          </div>
        </div>
      </TableCell>

      {/* Category */}
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {product.category?.categoryName || '-'}
        </span>
      </TableCell>

      {/* Brand */}
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {product.brand?.brandName || '-'}
        </span>
      </TableCell>

      {/* Price */}
      <TableCell>
        <div className="text-right">
          <p className="font-medium">
            {currencySymbol}
            {salePrice.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Cost: {currencySymbol}
            {purchasePrice.toLocaleString()}
          </p>
        </div>
      </TableCell>

      {/* Stock */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{totalStock}</span>
          {product.unit?.unitName && (
            <span className="text-xs text-muted-foreground">{product.unit.unitName}</span>
          )}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant={stockStatus.variant === 'warning' ? 'outline' : stockStatus.variant}
          className={cn(
            stockStatus.variant === 'warning' && 'border-yellow-500 text-yellow-600'
          )}
        >
          {stockStatus.status === 'low' && (
            <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
          )}
          {stockStatus.label}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`Actions for ${product.productName}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleView}>
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// Memoize to prevent re-renders when parent state changes
export const ProductRow = memo(ProductRowComponent, (prevProps, nextProps) => {
  // Custom comparison - only re-render if product data or handlers change
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.productName === nextProps.product.productName &&
    prevProps.product.stocks_sum_product_stock === nextProps.product.stocks_sum_product_stock &&
    prevProps.currencySymbol === nextProps.currencySymbol
  )
})

ProductRow.displayName = 'ProductRow'

export default ProductRow
