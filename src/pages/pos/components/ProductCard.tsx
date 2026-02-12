import { memo, useCallback } from 'react'
import { Package, Plus, AlertTriangle, Layers, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CachedImage } from '@/components/common/CachedImage'
import { cn, getImageUrl } from '@/lib/utils'
import { useCurrency } from '@/hooks'
import type { Product, Stock } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface ProductCardProps {
  /** Product data */
  product: Product
  /** View mode - affects layout */
  viewMode?: 'grid' | 'list'
  /** Callback when simple product is clicked to add to cart */
  onAddToCart: (product: Product, stock: Stock) => void
  /** Callback when variable product is clicked to open variant selection */
  onSelectVariant?: (product: Product) => void
  /** Available stock (total - cart quantity) - passed from parent */
  availableStock?: number
  /** Quantity currently in cart - passed from parent */
  cartQuantity?: number
}

// ============================================
// Helpers
// ============================================

function getStockInfo(product: Product, availableStock?: number) {
  const isVariable = product.product_type === 'variable'
  const isBatchProduct = product.is_batch_tracked || product.product_type === 'variant' // Legacy batch products

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

  // Use provided available stock or fall back to total stock
  const displayStock = availableStock !== undefined ? availableStock : totalStock

  const stock = product.stocks?.[0]
  const salePrice = stock?.productSalePrice ?? 0
  const isLowStock = displayStock > 0 && displayStock <= (product.alert_qty ?? 5)
  const isOutOfStock = displayStock <= 0

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

  // Get batch info (first stock entry that will be used)
  const batchInfo =
    isBatchProduct && stock
      ? {
          batchNo: stock.batch_no,
          expiryDate: stock.expire_date,
          mfgDate: stock.mfg_date,
        }
      : null

  return {
    stock,
    totalStock,
    displayStock, // Available stock to display
    salePrice: priceDisplay,
    isLowStock,
    isOutOfStock,
    isVariable,
    isBatchProduct,
    hasPriceRange,
    batchInfo,
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
  viewMode = 'grid',
  onAddToCart,
  onSelectVariant,
  availableStock,
  cartQuantity,
}: ProductCardProps) {
  const { format: formatCurrency } = useCurrency()
  const {
    stock,
    displayStock,
    salePrice,
    isLowStock,
    isOutOfStock,
    isVariable,
    isBatchProduct,
    hasPriceRange,
    variantCount,
    batchInfo,
  } = getStockInfo(product, availableStock)
  const imageUrl = getImageUrl(product.productPicture)
  const isList = viewMode === 'list'

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
        isOutOfStock && 'cursor-not-allowed bg-muted/40 opacity-60 grayscale'
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
      <CardContent className={cn('p-3', isList && 'flex items-start gap-3')}>
        {/* Image */}
        <div
          className={cn(
            'relative overflow-hidden rounded-lg bg-muted',
            isList ? 'h-14 w-14 shrink-0' : 'mb-2 aspect-square'
          )}
        >
          {imageUrl ? (
            <CachedImage
              src={imageUrl}
              alt={product.productName}
              className={cn(
                'h-full w-full object-cover',
                !isList && 'transition-transform group-hover:scale-105'
              )}
              loading="lazy"
              fallback={
                <div className="flex h-full items-center justify-center bg-primary/5">
                  <Package className="h-8 w-8 text-primary/20" aria-hidden="true" />
                </div>
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-primary/5">
              <Package className="h-8 w-8 text-primary/20" aria-hidden="true" />
            </div>
          )}

          {/* Badges (grid only) */}
          {!isList && isVariable && (
            <Badge
              variant="secondary"
              className="absolute left-1 top-1 bg-primary/90 text-primary-foreground transition-all duration-300"
            >
              <Layers className="mr-1 h-3 w-3" aria-hidden="true" />
              {variantCount} options
            </Badge>
          )}

          {!isList && isLowStock && !isOutOfStock && (
            <Badge
              variant="outline"
              className="absolute right-1 top-1 border-pos-warning bg-pos-warning/10 text-pos-warning"
            >
              <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
              Low
            </Badge>
          )}

          {!isList && isOutOfStock && (
            <Badge variant="destructive" className="absolute right-1 top-1">
              Out
            </Badge>
          )}

          {/* Quick Add (grid only) */}
          {!isList && !isOutOfStock && (
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

        {/* Info */}
        <div className={cn('space-y-1', isList && 'min-w-0 flex-1')}>
          <div className={cn('flex items-start justify-between gap-2', !isList && 'block')}>
            <h3
              className={cn(
                'text-sm font-medium leading-tight',
                isList ? 'truncate' : 'line-clamp-2'
              )}
            >
              {product.productName}
            </h3>

            {/* Status chips (list only) */}
            {isList && (
              <div className="flex shrink-0 items-center gap-1">
                {isVariable && !isOutOfStock && (
                  <Badge variant="secondary" className="bg-primary/90 text-primary-foreground">
                    <Layers className="mr-1 h-3 w-3" aria-hidden="true" />
                    {variantCount}
                  </Badge>
                )}
                {isLowStock && !isOutOfStock && (
                  <Badge
                    variant="outline"
                    className="border-pos-warning bg-pos-warning/10 text-pos-warning"
                  >
                    <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />
                    Low
                  </Badge>
                )}
                {isOutOfStock && <Badge variant="destructive">Out</Badge>}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {product.productCode || `SKU-${product.id}`}
          </p>

          {isBatchProduct && batchInfo?.batchNo && (
            <div
              className={cn(
                'flex flex-col gap-0.5',
                !isList && 'rounded border border-primary/20 bg-primary/5 px-1.5 py-1'
              )}
            >
              <div className="flex items-center gap-1 text-xs font-medium text-primary">
                <Package className="h-3 w-3" aria-hidden="true" />
                <span className={cn(isList ? 'truncate' : undefined)}>
                  Batch: {batchInfo.batchNo}
                </span>
              </div>
              {batchInfo.expiryDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  <span>Exp: {new Date(batchInfo.expiryDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-xs text-muted-foreground">
              Stock:{' '}
              <span
                className={cn(
                  'font-bold',
                  isOutOfStock
                    ? 'text-destructive'
                    : isLowStock
                      ? 'text-pos-warning'
                      : 'text-green-600'
                )}
              >
                {displayStock}
              </span>
              {cartQuantity !== undefined && cartQuantity > 0 && (
                <span className="ml-1 font-normal text-muted-foreground">
                  ({cartQuantity} in cart)
                </span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <span className="text-base font-bold text-primary">
              {hasPriceRange && 'From '}
              {formatCurrency(salePrice)}
            </span>
          </div>
        </div>

        {/* Row action (list only) */}
        {isList && !isOutOfStock && (
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleClick()
            }}
            aria-label={
              isVariable
                ? `Select options for ${product.productName}`
                : `Add ${product.productName} to cart`
            }
          >
            {isVariable ? (
              <Layers className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export const ProductCard = memo(ProductCardComponent)

ProductCard.displayName = 'ProductCard'

export default ProductCard
