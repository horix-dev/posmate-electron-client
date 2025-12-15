import { memo, useCallback } from 'react'
import { Package, Plus, AlertTriangle, Layers } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CachedImage } from '@/components/common/CachedImage'
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
  /** Callback when simple product is clicked to add to cart */
  onAddToCart: (product: Product, stock: Stock) => void
  /** Callback when variable product is clicked to open variant selection */
  onSelectVariant?: (product: Product) => void
}

// ============================================
// Helpers
// ============================================

function getStockInfo(product: Product) {
  const isVariable = product.product_type === 'variable'

  // For variable products, calculate total stock from all variants
  let totalStock = 0
  if (isVariable && product.variants?.length) {
    // Calculate from variant stocks
    totalStock = product.variants.reduce((sum, variant) => {
      // Sum up stock from variant's stocks array
      const variantStock =
        variant.stocks?.reduce((s, stock) => s + (stock.productStock ?? 0), 0) ?? 0
      return sum + variantStock
    }, 0)

    // Fallback to variants_total_stock if available
    if (totalStock === 0 && product.variants_total_stock) {
      totalStock = product.variants_total_stock
    }
  } else {
    totalStock =
      product.stocks_sum_product_stock ??
      product.productStock ??
      product.stocks?.[0]?.productStock ??
      0
  }

  const stock = product.stocks?.[0]
  const salePrice = stock?.productSalePrice ?? 0
  const isLowStock = totalStock > 0 && totalStock <= (product.alert_qty ?? 5)
  const isOutOfStock = totalStock <= 0

  // For variable products with variants, get price range
  let priceDisplay = salePrice
  let hasPriceRange = false
  if (isVariable && product.variants?.length) {
    const prices = product.variants
      .filter((v) => v.is_active)
      .map((v) => v.effective_price ?? v.price ?? salePrice)
      .filter((p) => p > 0)
    if (prices.length > 0) {
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      priceDisplay = minPrice
      hasPriceRange = minPrice !== maxPrice
    }
  }

  return {
    stock,
    totalStock,
    salePrice: priceDisplay,
    isLowStock,
    isOutOfStock,
    isVariable,
    hasPriceRange,
    variantCount:
      product.variants?.filter((v) => v.is_active).length ??
      (product.stocks
        ? new Set(
            product.stocks
              .filter((s) => s.variant_id !== null && s.variant_id !== undefined)
              .map((s) => s.variant_id)
          ).size
        : 0),
  }
}

// ============================================
// Component
// ============================================

function ProductCardComponent({
  product,
  currencySymbol,
  onAddToCart,
  onSelectVariant,
}: ProductCardProps) {
  const {
    stock,
    totalStock,
    salePrice,
    isLowStock,
    isOutOfStock,
    isVariable,
    hasPriceRange,
    variantCount,
  } = getStockInfo(product)
  const imageUrl = getImageUrl(product.productPicture)

  const handleClick = useCallback(() => {
    if (isOutOfStock) return

    // For variable products, open variant selection dialog
    if (isVariable) {
      if (onSelectVariant) {
        onSelectVariant(product)
        return
      }
      // If no selector provided, fall back to default stock
    }

    // For simple products, add directly to cart
    if (stock) {
      onAddToCart(product, stock)
    }
  }, [product, stock, isOutOfStock, isVariable, onAddToCart, onSelectVariant])

  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all hover:shadow-md',
        isOutOfStock && 'cursor-not-allowed opacity-50'
      )}
      onClick={handleClick}
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      aria-label={
        isVariable
          ? `Select options for ${product.productName}`
          : `Add ${product.productName} to cart`
      }
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
            <CachedImage
              src={imageUrl}
              alt={product.productName}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                </div>
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            </div>
          )}

          {/* Variable Product Badge */}
          {isVariable && !isOutOfStock && (
            <Badge
              variant="secondary"
              className="absolute left-1 top-1 bg-primary/90 text-primary-foreground"
            >
              <Layers className="mr-1 h-3 w-3" aria-hidden="true" />
              {variantCount} options
            </Badge>
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
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleClick()
              }}
              aria-label={
                isVariable
                  ? `Select options for ${product.productName}`
                  : `Quick add ${product.productName}`
              }
            >
              {isVariable ? (
                <Layers className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">{product.productName}</h3>
          <p className="text-xs text-muted-foreground">
            {product.productCode || `SKU-${product.id}`}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-primary">
              {hasPriceRange && 'From '}
              {currencySymbol}
              {salePrice.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">Stock: {totalStock}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const ProductCard = memo(ProductCardComponent)

ProductCard.displayName = 'ProductCard'

export default ProductCard
