/**
 * Product Search Service
 *
 * Unified search across products, variants, and batches
 * Based on: backend_docs/UNIFIED_PRODUCT_SEARCH_IMPLEMENTATION.md
 */

import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type {
  UnifiedSearchResponse,
  QuickBarcodeResult,
  ProductSearchParams,
} from '@/types/product-search.types'

export const productSearchService = {
  /**
   * Unified search across products, variants, and batches
   *
   * @example
   * // Search all types
   * const results = await productSearchService.search({ q: 'shirt' })
   *
   * // Search only variants
   * const variants = await productSearchService.search({ q: 'TSHIRT-S', type: 'variant' })
   *
   * // Search with limit
   * const limited = await productSearchService.search({ q: 'nike', limit: 10 })
   */
  search: async (params: ProductSearchParams): Promise<ApiResponse<UnifiedSearchResponse>> => {
    const { data } = await api.get<ApiResponse<UnifiedSearchResponse>>(
      API_ENDPOINTS.PRODUCTS.SEARCH,
      { params }
    )
    return data
  },

  /**
   * Quick barcode lookup - Returns first match only
   *
   * Search order:
   * 1. Product barcode
   * 2. Variant barcode
   * 3. Batch number
   *
   * @example
   * try {
   *   const result = await productSearchService.quickBarcodeLookup('8901234567001')
   *   if (result.data.type === 'variant') {
   *     addVariantToCart(result.data.data)
   *   } else if (result.data.type === 'product') {
   *     addProductToCart(result.data.data)
   *   }
   * } catch (error) {
   *   // 404 if not found
   *   console.error('Barcode not found')
   * }
   */
  quickBarcodeLookup: async (barcode: string): Promise<ApiResponse<QuickBarcodeResult>> => {
    const { data } = await api.get<ApiResponse<QuickBarcodeResult>>(
      API_ENDPOINTS.PRODUCTS.QUICK_BARCODE(barcode)
    )
    return data
  },
}
