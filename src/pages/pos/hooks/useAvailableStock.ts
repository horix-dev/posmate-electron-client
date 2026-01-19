import { useMemo } from 'react'
import { useCartStore } from '@/stores/cart.store'
import type { Product } from '@/types/api.types'

/**
 * Hook to calculate available stock for products
 * Available Stock = Total Stock - Quantity in Cart
 *
 * This prevents overselling by showing real-time available quantities
 * while the actual database stock is only updated on sale completion.
 */
export function useAvailableStock() {
  const cartItems = useCartStore((state) => state.items)

  /**
   * Get quantity of a product/variant currently in cart
   */
  const getCartQuantity = useMemo(() => {
    return (productId: number, variantId?: number | null): number => {
      return cartItems.reduce((total, item) => {
        if (variantId != null) {
          // For variants, match by variant ID
          return item.variantId === variantId ? total + item.quantity : total
        }
        // For simple products, match by product ID (no variant)
        if (!item.variantId && item.product.id === productId) {
          return total + item.quantity
        }
        return total
      }, 0)
    }
  }, [cartItems])

  /**
   * Calculate available stock for a product
   * Returns the total stock minus what's currently in the cart
   */
  const getAvailableStock = useMemo(() => {
    return (product: Product, variantId?: number | null): number => {
      const isVariable = product.product_type === 'variable'

      let totalStock = 0

      // For variable products with a specific variant
      if (isVariable && variantId != null && product.variants?.length) {
        const variant = product.variants.find((v) => v.id === variantId)
        if (variant) {
          totalStock =
            variant.stocks?.reduce((sum, stock) => sum + (stock.productStock ?? 0), 0) ?? 0
        }
      }
      // For variable products without specific variant (show total across all variants)
      else if (isVariable && product.variants?.length) {
        totalStock = product.variants.reduce((sum, variant) => {
          const variantStock =
            variant.stocks?.reduce((s, stock) => s + (stock.productStock ?? 0), 0) ?? 0
          return sum + variantStock
        }, 0)

        // Fallback to variants_total_stock if available
        if (totalStock === 0 && product.variants_total_stock) {
          totalStock = product.variants_total_stock
        }
      }
      // For simple products
      else {
        totalStock =
          product.stocks_sum_product_stock ??
          product.productStock ??
          product.stocks?.[0]?.productStock ??
          0
      }

      const cartQty = getCartQuantity(product.id, variantId)
      return Math.max(0, totalStock - cartQty)
    }
  }, [getCartQuantity])

  /**
   * Get cart quantity for a product/variant
   */
  const getProductCartQuantity = useMemo(() => {
    return (productId: number, variantId?: number | null): number => {
      return getCartQuantity(productId, variantId)
    }
  }, [getCartQuantity])

  return {
    getAvailableStock,
    getCartQuantity: getProductCartQuantity,
  }
}
