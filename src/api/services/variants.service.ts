/**
 * Variants Service
 *
 * API operations for managing product variants.
 * Handles CRUD for variants, stock updates, and variant generation.
 */

import api from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type {
  ProductVariant,
  CreateVariantRequest,
  UpdateVariantRequest,
  GenerateVariantsRequest,
  FindVariantRequest,
  UpdateVariantStockRequest,
  VariantListResponse,
  VariantResponse,
  GenerateVariantsResponse,
  // Bulk operations
  BulkUpdateVariantsRequest,
  BulkUpdateVariantsResponse,
  DuplicateVariantRequest,
  DuplicateVariantResponse,
  ToggleActiveResponse,
  // Stock summary
  VariantStockSummaryResponse,
  // Barcode
  VariantByBarcodeResponse,
  // Reports
  VariantSalesSummaryFilter,
  VariantSalesSummaryResponse,
  TopSellingVariantsFilter,
  TopSellingVariantsResponse,
  SlowMovingVariantsFilter,
  SlowMovingVariantsResponse,
} from '@/types/variant.types'

// ============================================
// Product Variants Service
// ============================================

export const variantsService = {
  /**
   * Get all variants for a product
   */
  getByProduct: async (productId: number): Promise<VariantListResponse> => {
    const { data } = await api.get<VariantListResponse>(API_ENDPOINTS.VARIANTS.LIST(productId))
    return data
  },

  /**
   * Get single variant by ID
   */
  getById: async (id: number): Promise<VariantResponse> => {
    const { data } = await api.get<VariantResponse>(API_ENDPOINTS.VARIANTS.GET(id))
    return data
  },

  /**
   * Get variant by barcode
   */
  getByBarcode: async (barcode: string): Promise<VariantByBarcodeResponse> => {
    const { data } = await api.get<VariantByBarcodeResponse>(
      API_ENDPOINTS.VARIANTS.BY_BARCODE(barcode)
    )
    return data
  },

  /**
   * Create single variant for a product
   */
  create: async (
    productId: number,
    variantData: CreateVariantRequest
  ): Promise<VariantResponse> => {
    const { data } = await api.post<VariantResponse>(
      API_ENDPOINTS.VARIANTS.CREATE(productId),
      variantData
    )
    return data
  },

  /**
   * Update variant
   */
  update: async (id: number, variantData: UpdateVariantRequest): Promise<VariantResponse> => {
    const { data } = await api.put<VariantResponse>(API_ENDPOINTS.VARIANTS.UPDATE(id), variantData)
    return data
  },

  /**
   * Delete variant (soft delete)
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.VARIANTS.DELETE(id))
  },

  /**
   * Generate variants in bulk from attribute combinations
   *
   * Example:
   * - attribute_values: [[1, 2, 3], [4, 5]] (Size: S/M/L, Color: Red/Blue)
   * - Creates 6 variants: S-Red, S-Blue, M-Red, M-Blue, L-Red, L-Blue
   */
  generate: async (
    productId: number,
    generateData: GenerateVariantsRequest
  ): Promise<GenerateVariantsResponse> => {
    const { data } = await api.post<GenerateVariantsResponse>(
      API_ENDPOINTS.VARIANTS.GENERATE(productId),
      generateData
    )
    return data
  },

  /**
   * Bulk update multiple variants at once
   * Returns HTTP 207 Multi-Status with partial success support
   */
  bulkUpdate: async (
    productId: number,
    bulkData: BulkUpdateVariantsRequest
  ): Promise<BulkUpdateVariantsResponse> => {
    const { data } = await api.put<BulkUpdateVariantsResponse>(
      API_ENDPOINTS.VARIANTS.BULK_UPDATE(productId),
      bulkData
    )
    return data
  },

  /**
   * Duplicate a variant with new attributes
   */
  duplicate: async (
    productId: number,
    duplicateData: DuplicateVariantRequest
  ): Promise<DuplicateVariantResponse> => {
    const { data } = await api.post<DuplicateVariantResponse>(
      API_ENDPOINTS.VARIANTS.DUPLICATE(productId),
      duplicateData
    )
    return data
  },

  /**
   * Toggle variant active status
   */
  toggleActive: async (id: number): Promise<ToggleActiveResponse> => {
    const { data } = await api.patch<ToggleActiveResponse>(API_ENDPOINTS.VARIANTS.TOGGLE_ACTIVE(id))
    return data
  },

  /**
   * Find variant by attribute values (for POS selection)
   *
   * Example: Find the variant that has Size=Medium AND Color=Blue
   */
  findByAttributes: async (
    productId: number,
    findData: FindVariantRequest
  ): Promise<VariantResponse> => {
    const { data } = await api.post<VariantResponse>(
      API_ENDPOINTS.VARIANTS.FIND_BY_ATTRIBUTES(productId),
      findData
    )
    return data
  },

  /**
   * Update variant stock
   */
  updateStock: async (
    id: number,
    stockData: UpdateVariantStockRequest
  ): Promise<VariantResponse> => {
    const { data } = await api.put<VariantResponse>(
      API_ENDPOINTS.VARIANTS.UPDATE_STOCK(id),
      stockData
    )
    return data
  },

  /**
   * Get stock summary for all variants of a product
   */
  getStockSummary: async (productId: number): Promise<VariantStockSummaryResponse> => {
    const { data } = await api.get<VariantStockSummaryResponse>(
      API_ENDPOINTS.VARIANTS.STOCK_SUMMARY(productId)
    )
    return data
  },
}

// ============================================
// Variant Reports Service
// ============================================

export const variantReportsService = {
  /**
   * Get sales summary by variant
   */
  getSalesSummary: async (
    filters?: VariantSalesSummaryFilter
  ): Promise<VariantSalesSummaryResponse> => {
    const { data } = await api.get<VariantSalesSummaryResponse>(
      API_ENDPOINTS.VARIANT_REPORTS.SALES_SUMMARY,
      { params: filters }
    )
    return data
  },

  /**
   * Get top selling variants
   */
  getTopSelling: async (
    filters?: TopSellingVariantsFilter
  ): Promise<TopSellingVariantsResponse> => {
    const { data } = await api.get<TopSellingVariantsResponse>(
      API_ENDPOINTS.VARIANT_REPORTS.TOP_SELLING,
      { params: filters }
    )
    return data
  },

  /**
   * Get slow moving variants (inventory risk)
   */
  getSlowMoving: async (
    filters?: SlowMovingVariantsFilter
  ): Promise<SlowMovingVariantsResponse> => {
    const { data } = await api.get<SlowMovingVariantsResponse>(
      API_ENDPOINTS.VARIANT_REPORTS.SLOW_MOVING,
      { params: filters }
    )
    return data
  },
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get display name for a variant (e.g., "Medium / Red")
 */
export function getVariantDisplayName(variant: ProductVariant): string {
  if (variant.variant_name) {
    return variant.variant_name
  }

  if (variant.attributes_map) {
    return Object.values(variant.attributes_map).join(' / ')
  }

  if (variant.attribute_values?.length) {
    return variant.attribute_values.map((v) => v.value).join(' / ')
  }

  return variant.sku
}

/**
 * Get effective price for a variant (variant price or parent product price)
 */
export function getVariantEffectivePrice(
  variant: ProductVariant,
  parentProductPrice?: number
): number {
  return variant.price ?? variant.effective_price ?? parentProductPrice ?? 0
}

/**
 * Get total stock for a variant
 */
export function getVariantTotalStock(variant: ProductVariant): number {
  if (variant.total_stock !== undefined) {
    return variant.total_stock
  }

  if (variant.stocks?.length) {
    return variant.stocks.reduce((sum, stock) => sum + stock.productStock, 0)
  }

  return 0
}

/**
 * Check if variant is in stock
 */
export function isVariantInStock(variant: ProductVariant): boolean {
  return getVariantTotalStock(variant) > 0
}

/**
 * Sort variants by sort_order
 */
export function sortVariants(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Get active variants only
 */
export function getActiveVariants(variants: ProductVariant[]): ProductVariant[] {
  return variants.filter((v) => v.is_active)
}

/**
 * Generate all combinations of attribute values
 *
 * @param attributeValues Array of arrays of attribute value IDs
 * @returns Array of combinations (each combination is an array of value IDs)
 *
 * Example:
 * Input: [[1, 2], [3, 4]] (Size: [S, M], Color: [Red, Blue])
 * Output: [[1, 3], [1, 4], [2, 3], [2, 4]] (S-Red, S-Blue, M-Red, M-Blue)
 */
export function generateAttributeCombinations(attributeValues: number[][]): number[][] {
  if (attributeValues.length === 0) return []
  if (attributeValues.length === 1) {
    return attributeValues[0].map((v) => [v])
  }

  const combinations: number[][] = []

  function combine(index: number, current: number[]) {
    if (index === attributeValues.length) {
      combinations.push([...current])
      return
    }

    for (const value of attributeValues[index]) {
      current.push(value)
      combine(index + 1, current)
      current.pop()
    }
  }

  combine(0, [])
  return combinations
}

/**
 * Build variant SKU from format string and attribute values
 *
 * @param format SKU format string (e.g., "{sku}-{size}-{color}")
 * @param baseSku Base product SKU
 * @param attributeValues Map of attribute slug to value slug
 * @returns Generated SKU
 */
export function buildVariantSku(
  format: string,
  baseSku: string,
  attributeValues: Record<string, string>
): string {
  let sku = format.replace('{sku}', baseSku)

  for (const [attrSlug, valueSlug] of Object.entries(attributeValues)) {
    sku = sku.replace(`{${attrSlug}}`, valueSlug)
  }

  // Remove any remaining placeholders
  sku = sku.replace(/\{[^}]+\}/g, '')

  // Clean up multiple dashes
  sku = sku.replace(/-+/g, '-').replace(/^-|-$/g, '')

  return sku.toUpperCase()
}
