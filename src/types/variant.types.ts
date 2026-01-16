/**
 * Variant Product System Types
 *
 * Based on backend implementation:
 * - Attributes: Define attribute types (Size, Color, Material) per business
 * - AttributeValues: Specific values for each attribute (S, M, L, Red, Blue)
 * - ProductVariants: Individual variant records with unique SKU/pricing
 */

// ============================================
// Attribute Types
// ============================================

/**
 * UI display type for attribute values
 * - button: Compact buttons (good for sizes)
 * - color: Color swatches with color preview
 * - select: Dropdown select (good for many options)
 * - image: Image thumbnails
 */
export type AttributeDisplayType = 'button' | 'color' | 'select' | 'image'

/**
 * Attribute definition (e.g., Size, Color, Material)
 */
export interface Attribute {
  id: number
  business_id: number
  name: string
  slug: string
  type: AttributeDisplayType
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  // Relationships
  values?: AttributeValue[]
}

/**
 * Attribute value (e.g., Small, Medium, Large, Red, Blue)
 */
export interface AttributeValue {
  id: number
  attribute_id: number
  business_id: number
  value: string
  slug: string
  color_code?: string | null // For color type attributes (#FF0000)
  image?: string | null // For image type attributes
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  // Relationships
  attribute?: Attribute
}

// ============================================
// Product Variant Types
// ============================================

/**
 * Product variant (e.g., T-Shirt in Size M, Color Red)
 */
export interface ProductVariant {
  id: number
  product_id: number
  business_id: number
  sku: string
  barcode?: string | null
  initial_stock?: number | null
  price: number | null // Null means inherit from parent product
  image?: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  // Computed/joined fields
  variant_name?: string // e.g., "Medium / Red"
  total_stock?: number
  effective_price?: number // Price or parent product price
  attributes_map?: Record<string, string> // { "Size": "Medium", "Color": "Red" }
  // Relationships
  attribute_values?: AttributeValue[]
  stocks?: import('./api.types').Stock[]
}

/**
 * Pivot table linking product to its attributes
 */
export interface ProductAttribute {
  id: number
  product_id: number
  attribute_id: number
  is_variation: boolean // If true, this attribute creates variations
  // Relationships
  attribute?: Attribute
}

/**
 * Pivot table linking variant to its attribute values
 */
export interface ProductVariantValue {
  variant_id: number
  attribute_id: number
  attribute_value_id: number
  // Relationships
  attribute?: Attribute
  attribute_value?: AttributeValue
}

// ============================================
// API Request Types
// ============================================

/**
 * Create attribute request
 */
export interface CreateAttributeRequest {
  name: string
  slug?: string // Auto-generated if not provided
  type?: AttributeDisplayType
  sort_order?: number
  values?: CreateAttributeValueRequest[]
}

/**
 * Update attribute request
 */
export interface UpdateAttributeRequest {
  name?: string
  slug?: string
  type?: AttributeDisplayType
  sort_order?: number
  is_active?: boolean
}

/**
 * Create attribute value request
 */
export interface CreateAttributeValueRequest {
  value: string
  slug?: string // Auto-generated if not provided
  color_code?: string
  image?: string
  sort_order?: number
}

/**
 * Update attribute value request
 */
export interface UpdateAttributeValueRequest {
  value?: string
  slug?: string
  color_code?: string
  image?: string
  sort_order?: number
  is_active?: boolean
}

/**
 * Create single variant request
 */
export interface CreateVariantRequest {
  attribute_values: number[] // Array of attribute_value_ids
  sku?: string // Auto-generated if not provided
  price?: number | null
  image?: string
  is_active?: boolean
}

/**
 * Update variant request
 */
export interface UpdateVariantRequest {
  sku?: string
  barcode?: string
  price?: number | null
  cost_price?: number
  dealer_price?: number
  wholesale_price?: number
  image?: string
  is_active?: boolean
  sort_order?: number
}

/**
 * Generate variants request (bulk create)
 */
export interface GenerateVariantsRequest {
  attribute_values: number[][] // Array of attribute value ID arrays for each attribute
  sku_format?: string // e.g., "{sku}-{size}-{color}"
  default_price?: number | null
}

/**
 * Variant input for creating variable products in one API call
 * Used when creating/updating a variable product with variants
 */
export interface VariantInput {
  sku?: string
  enabled?: 0 | 1
  cost_price?: number
  price?: number
  dealer_price?: number
  wholesale_price?: number
  is_active?: 0 | 1
  attribute_value_ids: number[]
}

/**
 * Find variant by attributes request
 */
export interface FindVariantRequest {
  attribute_values: number[] // Array of attribute_value_ids
}

/**
 * Update variant stock request
 */
export interface UpdateVariantStockRequest {
  quantity: number
  operation: 'set' | 'increment' | 'decrement'
  warehouse_id?: number
  batch_no?: string | null
}

/**
 * Update variant stock response
 * Backend returns the updated aggregate and the underlying stock record.
 */
export interface UpdateVariantStockResponse {
  message: string
  data: {
    variant_id: number
    total_stock: string
    stock_record: import('./api.types').Stock
  }
  _server_timestamp?: string
}

// ============================================
// API Response Types
// ============================================

/**
 * Attribute list response
 */
export interface AttributeListResponse {
  message: string
  data: Attribute[]
}

/**
 * Single attribute response
 */
export interface AttributeResponse {
  message: string
  data: Attribute
}

/**
 * Attribute value response
 */
export interface AttributeValueResponse {
  message: string
  data: AttributeValue
}

/**
 * Variant list response
 */
export interface VariantListResponse {
  message: string
  data: ProductVariant[]
}

/**
 * Single variant response
 */
export interface VariantResponse {
  message: string
  data: ProductVariant
}

/**
 * Generate variants response
 * Note: Backend returns variants directly in data array
 */
export interface GenerateVariantsResponse {
  message: string
  data: ProductVariant[]
  _server_timestamp?: string
}

// ============================================
// Bulk Operations Types
// ============================================

/**
 * Bulk update variant request item
 */
export interface BulkUpdateVariantItem {
  id: number
  sku?: string
  barcode?: string
  price?: number | null
  cost_price?: number
  dealer_price?: number
  wholesale_price?: number
  is_active?: boolean
}

/**
 * Bulk update variants request
 */
export interface BulkUpdateVariantsRequest {
  variants: BulkUpdateVariantItem[]
}

/**
 * Bulk update result item
 */
export interface BulkUpdateResultItem {
  id: number
  success: boolean
  error?: string
  data?: ProductVariant
}

/**
 * Bulk update variants response (HTTP 207 Multi-Status)
 */
export interface BulkUpdateVariantsResponse {
  message: string
  success_count: number
  failure_count: number
  results: BulkUpdateResultItem[]
}

/**
 * Duplicate variant request
 */
export interface DuplicateVariantRequest {
  source_variant_id: number
  attribute_value_ids: number[]
  sku?: string
  price_adjustment?: number // Percentage adjustment (+10 = 10% increase)
  price_adjustment_type?: 'percentage' | 'fixed'
  copy_stock?: boolean
}

/**
 * Duplicate variant response
 */
export interface DuplicateVariantResponse {
  message: string
  data: ProductVariant
}

/**
 * Toggle active response
 */
export interface ToggleActiveResponse {
  message: string
  data: {
    id: number
    is_active: boolean
  }
}

// ============================================
// Stock Summary Types
// ============================================

/**
 * Variant stock by location
 */
export interface VariantStockLocation {
  warehouse_id?: number
  warehouse_name?: string
  branch_id?: number
  branch_name?: string
  quantity: number
  value: number
}

/**
 * Variant stock summary item
 */
export interface VariantStockSummaryItem {
  variant_id: number
  variant_name: string
  sku: string
  total_stock: number
  total_value: number
  is_low_stock: boolean
  locations: VariantStockLocation[]
}

/**
 * Stock summary response
 */
export interface VariantStockSummaryResponse {
  message: string
  data: {
    product_id: number
    product_name: string
    total_variants: number
    total_stock: number
    total_value: number
    low_stock_count: number
    variants: VariantStockSummaryItem[]
  }
}

// ============================================
// Barcode Lookup Types
// ============================================

/**
 * Barcode lookup response - universal barcode search
 * Canonical schema with explicit product, stock, and optional variant
 */
export interface BarcodeLookupResponse {
  message: string
  data: {
    found_in: 'product' | 'variant' | 'batch'
    product: import('./api.types').Product
    stock: import('./api.types').Stock
    variant?: ProductVariant
  } | null
  _server_timestamp?: string
}

/**
 * Variant by barcode response
 */
export interface VariantByBarcodeResponse {
  message: string
  data: ProductVariant | null
}

// ============================================
// Report Types
// ============================================

/**
 * Sales summary filter options
 */
export interface VariantSalesSummaryFilter {
  start_date?: string
  end_date?: string
  product_id?: number
  variant_ids?: number[]
  group_by?: 'variant' | 'product' | 'day' | 'month'
  sort_by?: 'quantity' | 'revenue' | 'profit'
  sort_order?: 'asc' | 'desc'
}

/**
 * Variant sales summary item
 */
export interface VariantSalesSummaryItem {
  variant_id?: number
  variant_name?: string
  product_id: number
  product_name: string
  period?: string // For date grouping
  quantity_sold: number
  revenue: number
  cost: number
  profit: number
  profit_margin: number
}

/**
 * Variant sales summary response
 */
export interface VariantSalesSummaryResponse {
  message: string
  data: {
    summary: VariantSalesSummaryItem[]
    totals: {
      quantity_sold: number
      revenue: number
      cost: number
      profit: number
    }
  }
}

/**
 * Top selling variants filter
 */
export interface TopSellingVariantsFilter {
  start_date?: string
  end_date?: string
  limit?: number
  sort_by?: 'quantity' | 'revenue' | 'profit'
}

/**
 * Top selling variant item
 */
export interface TopSellingVariantItem {
  variant_id: number
  variant_name: string
  product_id: number
  product_name: string
  sku: string
  quantity_sold: number
  revenue: number
  profit: number
  rank: number
}

/**
 * Top selling variants response
 */
export interface TopSellingVariantsResponse {
  message: string
  data: TopSellingVariantItem[]
}

/**
 * Slow moving variants filter
 */
export interface SlowMovingVariantsFilter {
  days_threshold?: number // Default 30
  min_stock?: number
  limit?: number
}

/**
 * Slow moving variant item
 */
export interface SlowMovingVariantItem {
  variant_id: number
  variant_name: string
  product_id: number
  product_name: string
  sku: string
  current_stock: number
  days_since_last_sale: number | null
  last_sale_date: string | null
  stock_value: number
}

/**
 * Slow moving variants response
 */
export interface SlowMovingVariantsResponse {
  message: string
  data: SlowMovingVariantItem[]
}

// ============================================
// Extended Product Type for Variants
// ============================================

/**
 * Product type discriminator
 */
export type ProductType = 'simple' | 'variable'

/**
 * Extended Product with variant support
 * Merges with existing Product type from api.types.ts
 */
export interface VariableProduct {
  id: number
  product_type: 'variable'
  has_variants: boolean
  variant_sku_format?: string
  // Relationships
  variants?: ProductVariant[]
  attributes?: ProductAttribute[]
  // Computed
  variants_total_stock?: number
}

// ============================================
// Cart/Sale Types with Variant Support
// ============================================

/**
 * Sale product item with variant support
 */
export interface SaleProductItemWithVariant {
  stock_id: number
  product_name: string
  quantities: number
  price: number
  lossProfit: number
  variant_id?: number
  variant_name?: string
}

/**
 * Cart item with variant support
 */
export interface CartItemVariant {
  variant_id: number
  variant_name: string
  variant_sku: string
  attributes: Record<string, string> // { "Size": "Medium", "Color": "Red" }
}

// ============================================
// Local Storage Types (for SQLite/IndexedDB)
// ============================================

/**
 * Local attribute for offline storage
 */
export interface LocalAttribute extends Attribute {
  lastSyncedAt: string
  version?: number
}

/**
 * Local attribute value for offline storage
 */
export interface LocalAttributeValue extends AttributeValue {
  lastSyncedAt: string
  version?: number
}

/**
 * Local product variant for offline storage
 */
export interface LocalProductVariant extends ProductVariant {
  lastSyncedAt: string
  version?: number
}

// ============================================
// UI Helper Types
// ============================================

/**
 * Variant selection state for POS
 */
export interface VariantSelectionState {
  productId: number
  selectedAttributes: Record<number, number> // { attributeId: attributeValueId }
  availableVariants: ProductVariant[]
  selectedVariant: ProductVariant | null
}

/**
 * Variant form data for product creation/editing
 */
export interface VariantFormData {
  attributes: number[] // Selected attribute IDs for variations
  generatedVariants: Array<{
    attributeValues: number[]
    sku: string
    price: number | null
    isActive: boolean
  }>
}
