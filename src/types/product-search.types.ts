/**
 * Unified Product Search Types
 *
 * Types for the unified product search API that searches across:
 * - Products
 * - Variants
 * - Batches
 */

// ============================================
// Search Types
// ============================================

export type ProductSearchType = 'product' | 'variant' | 'batch' | 'all'

// ============================================
// Product Search Result
// ============================================

export interface ProductSearchResultItem {
  id: number
  type: 'product'
  name: string
  code?: string
  barcode?: string
  image?: string
  product_type: 'simple' | 'variable' | 'variant'
  category?: {
    id: number
    name: string
  }
  brand?: {
    id: number
    name: string
  }
  unit?: {
    id: number
    name: string
  }
  sale_price?: number
  purchase_price?: number
  total_stock?: number
}

// ============================================
// Variant Search Result
// ============================================

export interface VariantSearchResultItem {
  id: number
  type: 'variant'
  sku: string
  barcode?: string
  variant_name?: string
  image?: string
  product_id: number
  product_name: string
  product_code?: string
  product_image?: string
  price: number
  cost_price?: number
  wholesale_price?: number
  dealer_price?: number
  total_stock?: number
  is_active: boolean
  attributes?: Array<{
    attribute_id: number
    attribute_name: string
    value_id: number
    value: string
  }>
}

// ============================================
// Batch Search Result
// ============================================

export interface BatchSearchResultItem {
  id: number
  type: 'batch'
  batch_no?: string
  product_id: number
  product_name: string
  product_code?: string
  product_image?: string
  variant_id?: number | null
  variant_sku?: string | null
  variant_name?: string | null
  quantity: number
  cost_price?: number
  sale_price?: number
  expire_date?: string
  is_expired?: boolean
  days_until_expiry?: number
}

// ============================================
// Search Response
// ============================================

export interface UnifiedSearchResponse {
  products: ProductSearchResultItem[]
  variants: VariantSearchResultItem[]
  batches: BatchSearchResultItem[]
  total: number
}

// ============================================
// Quick Barcode Lookup Response
// ============================================

export type QuickBarcodeResult =
  | {
      type: 'product'
      data: ProductSearchResultItem
    }
  | {
      type: 'variant'
      data: VariantSearchResultItem
    }
  | {
      type: 'batch'
      data: BatchSearchResultItem
    }

// ============================================
// Combined Search Result (for UI display)
// ============================================

export type SearchResultItem =
  | ProductSearchResultItem
  | VariantSearchResultItem
  | BatchSearchResultItem

// ============================================
// Search Parameters
// ============================================

export interface ProductSearchParams {
  q: string // Search query (min 2 chars)
  type?: ProductSearchType // Filter by type
  limit?: number // Results per type (1-50, default: 20)
}
