import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type {
  ProductModel,
  CreateProductModelRequest,
  Vat,
  CreateVatRequest,
  PaymentType,
  CreatePaymentTypeRequest,
} from '@/types/api.types'

// ============================================
// Categories
// ============================================

// Re-export the full categoriesService with pagination support
export { categoriesService } from './categories.service'

// ============================================
// Brands
// ============================================

// Re-export the full brandsService with pagination support
export { brandsService } from './brands.service'

// ============================================
// Units
// ============================================

// Re-export the full unitsService with pagination support
export { unitsService } from './units.service'

// ============================================
// Product Models
// ============================================

export const productModelsService = {
  getAll: async (): Promise<ApiResponse<ProductModel[]>> => {
    const { data } = await api.get<ApiResponse<ProductModel[]>>(API_ENDPOINTS.PRODUCT_MODELS.LIST)
    return data
  },

  create: async (modelData: CreateProductModelRequest): Promise<ApiResponse<ProductModel>> => {
    const { data } = await api.post<ApiResponse<ProductModel>>(
      API_ENDPOINTS.PRODUCT_MODELS.CREATE,
      modelData
    )
    return data
  },

  update: async (
    id: number,
    modelData: Partial<CreateProductModelRequest>
  ): Promise<ApiResponse<ProductModel>> => {
    const { data } = await api.put<ApiResponse<ProductModel>>(
      API_ENDPOINTS.PRODUCT_MODELS.UPDATE(id),
      modelData
    )
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.PRODUCT_MODELS.DELETE(id))
  },
}

// ============================================
// VAT/Tax
// ============================================

export const vatsService = {
  getAll: async (params?: {
    type?: 'single' | 'group'
    status?: 'active' | 'inactive'
  }): Promise<ApiResponse<Vat[]>> => {
    const { data } = await api.get<ApiResponse<Vat[]>>(API_ENDPOINTS.VATS.LIST, { params })
    return data
  },

  create: async (vatData: CreateVatRequest): Promise<ApiResponse<Vat>> => {
    const { data } = await api.post<ApiResponse<Vat>>(API_ENDPOINTS.VATS.CREATE, vatData)
    return data
  },

  update: async (id: number, vatData: Partial<CreateVatRequest>): Promise<ApiResponse<Vat>> => {
    const { data } = await api.put<ApiResponse<Vat>>(API_ENDPOINTS.VATS.UPDATE(id), vatData)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.VATS.DELETE(id))
  },

  deleteMultiple: async (ids: number[]): Promise<void> => {
    // API doc lists bulk delete, but fall back to sequential deletes if not available
    await Promise.all(ids.map((id) => api.delete(API_ENDPOINTS.VATS.DELETE(id))))
  },
}

// ============================================
// Payment Types
// ============================================

export const paymentTypesService = {
  getAll: async (params?: {
    limit?: number
    page?: number
    per_page?: number
    cursor?: number
    search?: string
    status?: boolean
  }): Promise<ApiResponse<PaymentType[]>> => {
    const { data } = await api.get<ApiResponse<PaymentType[]>>(API_ENDPOINTS.PAYMENT_TYPES.LIST, {
      params,
    })
    return data
  },

  filter: async (params?: {
    search?: string
    status?: boolean
    page?: number
    per_page?: number
  }): Promise<ApiResponse<PaymentType[]>> => {
    const { data } = await api.get<ApiResponse<PaymentType[]>>(API_ENDPOINTS.PAYMENT_TYPES.FILTER, {
      params,
    })
    return data
  },

  create: async (paymentTypeData: CreatePaymentTypeRequest): Promise<ApiResponse<PaymentType>> => {
    const { data } = await api.post<ApiResponse<PaymentType>>(
      API_ENDPOINTS.PAYMENT_TYPES.CREATE,
      paymentTypeData
    )
    return data
  },

  update: async (
    id: number,
    paymentTypeData: Partial<CreatePaymentTypeRequest>
  ): Promise<ApiResponse<PaymentType>> => {
    const { data } = await api.put<ApiResponse<PaymentType>>(
      API_ENDPOINTS.PAYMENT_TYPES.UPDATE(id),
      paymentTypeData
    )
    return data
  },

  toggleStatus: async (id: number, status: boolean): Promise<ApiResponse<PaymentType>> => {
    const { data } = await api.patch<ApiResponse<PaymentType>>(
      API_ENDPOINTS.PAYMENT_TYPES.TOGGLE_STATUS(id),
      { status }
    )
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.PAYMENT_TYPES.DELETE(id))
  },

  deleteMultiple: async (ids: number[]): Promise<ApiResponse<void>> => {
    const { data } = await api.post<ApiResponse<void>>(API_ENDPOINTS.PAYMENT_TYPES.BULK_DELETE, {
      ids,
    })
    return data
  },
}
