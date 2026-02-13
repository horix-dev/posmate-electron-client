import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Product, CreateProductRequest, ProductComponent } from '@/types/api.types'
import type { VariableProductPayload } from '@/pages/products/schemas/product.schema'
import type { BarcodeLookupResponse } from '@/types/variant.types'
import { variantsService } from './variants.service'

interface ProductsListResponse {
  message: string
  total_stock_value: number
  data: Product[]
}

/**
 * Response format for variable product creation
 */
interface VariableProductResponse {
  success: boolean
  message: string
  data: Product
}

interface ProductComponentsResponse {
  message: string
  data: ProductComponent[]
}

export const productsService = {
  /**
   * Get products list (for POS, dropdowns)
   * Returns flat array with optional limit
   * IMPORTANT: For catalogs with >1000 products, increase limit parameter
   * Example: getList({ limit: 5000 }) for large catalogs
   * Note: Backend may have max_limit. Check API documentation for limits.
   */
  getList: async (params?: { limit?: number; status?: boolean }): Promise<ProductsListResponse> => {
    const { data } = await api.get<ProductsListResponse>(API_ENDPOINTS.PRODUCTS.LIST, { params })
    return data
  },

  /**
   * Get all products with stock info
   * Supports large catalogs by using high limit
   * Uses 10,000 as default to accommodate most businesses
   * For very large catalogs (>10k products), consider implementing pagination
   */
  getAll: async (limit: number = 10000): Promise<ProductsListResponse> => {
    const { data } = await api.get<ProductsListResponse>(API_ENDPOINTS.PRODUCTS.LIST, {
      params: { limit },
    })
    return data
  },

  /**
   * Get single product by ID
   */
  getById: async (id: number): Promise<ApiResponse<Product>> => {
    const { data } = await api.get<ApiResponse<Product>>(API_ENDPOINTS.PRODUCTS.GET(id))
    return data
  },

  /**
   * Get combo components for a product
   */
  getComponents: async (id: number): Promise<ProductComponentsResponse> => {
    const { data } = await api.get<ProductComponentsResponse>(API_ENDPOINTS.PRODUCTS.COMPONENTS(id))
    return data
  },

  /**
   * Create new product
   * - Simple products use multipart/form-data
   * - Variable products use JSON body with variants
   */
  create: async (
    productData: CreateProductRequest | FormData | VariableProductPayload | Record<string, unknown>,
    isVariable = false
  ): Promise<ApiResponse<Product>> => {
    if (isVariable) {
      // Variable product: send JSON body
      const { data } = await api.post<VariableProductResponse>(
        API_ENDPOINTS.PRODUCTS.CREATE,
        productData,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
      return { message: data.message, data: data.data }
    }

    // Simple product: send FormData
    const formData =
      productData instanceof FormData
        ? productData
        : buildFormData(productData as unknown as Record<string, unknown>)
    const { data } = await api.post<ApiResponse<Product>>(API_ENDPOINTS.PRODUCTS.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * Update existing product
   * - Simple products use multipart/form-data
   * - Variable products use JSON body with variants
   */
  update: async (
    id: number,
    productData:
      | Partial<CreateProductRequest>
      | FormData
      | VariableProductPayload
      | Record<string, unknown>,
    isVariable = false
  ): Promise<ApiResponse<Product>> => {
    if (isVariable) {
      // Variable product: update basic info + update variants individually
      const payload = productData as VariableProductPayload
      const { variants } = payload

      // 1. Update basic product info
      await api.put<VariableProductResponse>(API_ENDPOINTS.PRODUCTS.UPDATE(id), productData, {
        headers: { 'Content-Type': 'application/json' },
      })

      // 2. Update variants individually
      if (variants && variants.length > 0) {
        const variantUpdatePromises = variants.map(async (variant) => {
          if (variant.id) {
            // Update existing variant
            await variantsService.update(variant.id, {
              sku: variant.sku,
              price: variant.price,
              cost_price: variant.cost_price,
              wholesale_price: variant.wholesale_price,
              dealer_price: variant.dealer_price,
              is_active: variant.is_active === 1,
            })
          } else {
            // Create new variant
            await variantsService.create(id, {
              attribute_values: variant.attribute_value_ids || [],
              sku: variant.sku,
              price: variant.price,
              is_active: variant.is_active === 1,
            })
          }
        })

        await Promise.all(variantUpdatePromises)
      }

      // 3. Fetch updated product with variants
      const updatedProduct = await api.get<ApiResponse<Product>>(API_ENDPOINTS.PRODUCTS.GET(id))
      return updatedProduct.data
    }

    // Simple product: send FormData
    const formData =
      productData instanceof FormData
        ? productData
        : buildFormData(productData as unknown as Record<string, unknown>)

    // Laravel-friendly method spoofing for multipart updates
    // Some backends do not reliably accept PUT with multipart/form-data, especially with files.
    if (!formData.has('_method')) {
      formData.append('_method', 'PUT')
    }

    const { data } = await api.post<ApiResponse<Product>>(
      API_ENDPOINTS.PRODUCTS.UPDATE(id),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return data
  },

  /**
   * Delete product
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.PRODUCTS.DELETE(id))
  },

  /**
   * Universal barcode lookup
   * Searches across products, variants, and batch numbers
   * Returns the found item with context (product, variant, stock)
   */
  getByBarcode: async (barcode: string): Promise<BarcodeLookupResponse> => {
    const { data } = await api.get<BarcodeLookupResponse>(API_ENDPOINTS.BARCODE.LOOKUP(barcode))
    return data
  },
}

// Helper to build FormData from object
function buildFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData()

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (value instanceof File) {
      formData.append(key, value)
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        formData.append(key, String(item))
      })
    } else {
      formData.append(key, String(value))
    }
  })

  return formData
}

export default productsService
