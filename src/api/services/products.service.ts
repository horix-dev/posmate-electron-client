import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Product, CreateProductRequest } from '@/types/api.types'

interface ProductsListResponse {
  message: string
  total_stock_value: number
  data: Product[]
}

export const productsService = {
  /**
   * Get all products with stock info
   */
  getAll: async (): Promise<ProductsListResponse> => {
    const { data } = await api.get<ProductsListResponse>(API_ENDPOINTS.PRODUCTS.LIST)
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
   * Create new product
   */
  create: async (productData: CreateProductRequest | FormData): Promise<ApiResponse<Product>> => {
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
   */
  update: async (
    id: number,
    productData: Partial<CreateProductRequest> | FormData
  ): Promise<ApiResponse<Product>> => {
    const formData =
      productData instanceof FormData
        ? productData
        : buildFormData(productData as unknown as Record<string, unknown>)
    const { data } = await api.put<ApiResponse<Product>>(
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
