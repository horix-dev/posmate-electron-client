import { memo, useCallback } from 'react'
import { Package, Plus, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, getImageUrl } from '@/lib/utils'
import type { Product, Stock } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface ProductCardProps {
  /** Product data */
  product: Product
  /** Currency symbol */
  currencySymbol: string
  /** Callback when product is clicked to add to cart */
  onAddToCart: (product: Product, stock: Stock) => void
}

// ============================================
// Helpers
// ============================================

function getStockInfo(product: Product) {
  const stock = product.stocks?.[0]
  const totalStock = product.stocks_sum_product_stock ?? product.productStock ?? stock?.productStock ?? 0
  const salePrice = stock?.productSalePrice ?? 0
  const isLowStock = totalStock > 0 && totalStock <= (product.alert_qty ?? 5)
  const isOutOfStock = totalStock <= 0

  return { stock, totalStock, salePrice, isLowStock, isOutOfStock }
}

// ============================================
// Component
// ============================================

function ProductCardComponent({
  product,
  currencySymbol,
  onAddToCart,
}: ProductCardProps) {
  const { stock, totalStock, salePrice, isLowStock, isOutOfStock } = getStockInfo(product)
  const imageUrl = getImageUrl(product.productPicture)

  const handleClick = useCallback(() => {
    if (stock && !isOutOfStock) {
      onAddToCart(product, stock)
    }
  }, [product, stock, isOutOfStock, onAddToCart])

  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all hover:shadow-md',
        isOutOfStock && 'opacity-50 cursor-not-allowed'
      )}
      onClick={handleClick}
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      aria-label={`Add ${product.productName} to cart`}
      aria-disabled={isOutOfStock}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <CardContent className="p-3">
        {/* Product Image */}
        <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.productName}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            </div>
          )}

          {/* Stock Badge */}
          {isLowStock && !isOutOfStock && (
            <Badge
              variant="outline"
              className="absolute right-1 top-1 border-yellow-500 bg-yellow-500/10 text-yellow-600"
            >
              <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
              Low
            </Badge>
          )}

          {isOutOfStock && (
            <Badge variant="destructive" className="absolute right-1 top-1">
              Out
            </Badge>
          )}

          {/* Quick Add Button */}
          {!isOutOfStock && (
            <Button
              size="icon"
              className="absolute bottom-1 right-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Quick add ${product.productName}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">
            {product.productName}
          </h3>
          <p className="text-xs text-muted-foreground">
            {product.productCode || `SKU-${product.id}`}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-primary">
              {currencySymbol}
              {salePrice.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">
              Stock: {totalStock}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const ProductCard = memo(ProductCardComponent)

ProductCard.displayName = 'ProductCard'

export default ProductCard
