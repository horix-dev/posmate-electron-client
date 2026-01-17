import { memo } from 'react'
import { Package, MoreHorizontal, Pencil, Trash2, Eye, AlertTriangle, Layers } from 'lucide-react'
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
import { CachedImage } from '@/components/common/CachedImage'
import { getImageUrl } from '@/lib/utils'
import { useCurrency } from '@/hooks'
import type { Product } from '@/types/api.types'
import { getStockStatus, getTotalStock, getSalePrice, getPurchasePrice } from '../hooks'

// ============================================
// Types
// ============================================

export interface ProductRowProps {
  /** The product to display */
  product: Product
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
function ProductRowComponent({ product, onView, onEdit, onDelete }: ProductRowProps) {
  const { format: formatCurrency } = useCurrency()
  const stockStatus = getStockStatus(product)
  const totalStock = getTotalStock(product)
  const salePrice = getSalePrice(product)
  const purchasePrice = getPurchasePrice(product)
  const isVariable = product.product_type === 'variable'

  // Count variants: use variants array if available, otherwise count unique variant_ids in stocks
  const variantCount =
    product.variants?.length ??
    (product.stocks
      ? new Set(
          product.stocks
            .filter((stock) => stock.variant_id !== null && stock.variant_id !== undefined)
            .map((stock) => stock.variant_id)
        ).size
      : 0)

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
              <CachedImage
                src={getImageUrl(product.productPicture)}
                alt={product.productName}
                className="h-10 w-10 rounded-lg object-cover"
                loading="lazy"
                fallback={<Package className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
              />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{product.productName}</p>
              {isVariable && (
                <Badge variant="outline" className="text-xs font-normal">
                  <Layers className="mr-1 h-3 w-3" />
                  {variantCount} variants
                </Badge>
              )}
            </div>
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
        <span className="text-sm text-muted-foreground">{product.brand?.brandName || '-'}</span>
      </TableCell>

      {/* Price */}
      <TableCell>
        <div className="text-right">
          {isVariable && variantCount > 0 ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">Variable pricing</p>
              <p className="text-xs text-muted-foreground">Base: {formatCurrency(salePrice)}</p>
            </>
          ) : (
            <>
              <p className="font-medium">{formatCurrency(salePrice)}</p>
              <p className="text-xs text-muted-foreground">Cost: {formatCurrency(purchasePrice)}</p>
            </>
          )}
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
          variant={
            stockStatus.status === 'low'
              ? 'destructive'
              : stockStatus.status === 'out'
                ? 'destructive'
                : 'success'
          }
          className={
            stockStatus.status === 'low'
              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
              : ''
          }
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
    prevProps.product.stocks_sum_product_stock === nextProps.product.stocks_sum_product_stock
  )
})

ProductRow.displayName = 'ProductRow'

export default ProductRow
