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
