import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type {
  Category,
  CreateCategoryRequest,
  Brand,
  CreateBrandRequest,
  Unit,
  CreateUnitRequest,
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

export const categoriesService = {
  getAll: async (): Promise<ApiResponse<Category[]>> => {
    const { data } = await api.get<ApiResponse<Category[]>>(API_ENDPOINTS.CATEGORIES.LIST)
    return data
  },

  create: async (categoryData: CreateCategoryRequest): Promise<ApiResponse<Category>> => {
    const { data } = await api.post<ApiResponse<Category>>(
      API_ENDPOINTS.CATEGORIES.CREATE,
      categoryData
    )
    return data
  },

  update: async (
    id: number,
    categoryData: Partial<CreateCategoryRequest>
  ): Promise<ApiResponse<Category>> => {
    const { data } = await api.put<ApiResponse<Category>>(
      API_ENDPOINTS.CATEGORIES.UPDATE(id),
      categoryData
    )
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.CATEGORIES.DELETE(id))
  },
}

// ============================================
// Brands
// ============================================

export const brandsService = {
  getAll: async (): Promise<ApiResponse<Brand[]>> => {
    const { data } = await api.get<ApiResponse<Brand[]>>(API_ENDPOINTS.BRANDS.LIST)
    return data
  },

  create: async (brandData: CreateBrandRequest): Promise<ApiResponse<Brand>> => {
    const { data } = await api.post<ApiResponse<Brand>>(API_ENDPOINTS.BRANDS.CREATE, brandData)
    return data
  },

  update: async (id: number, brandData: Partial<CreateBrandRequest>): Promise<ApiResponse<Brand>> => {
    const { data } = await api.put<ApiResponse<Brand>>(API_ENDPOINTS.BRANDS.UPDATE(id), brandData)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.BRANDS.DELETE(id))
  },
}

// ============================================
// Units
// ============================================

export const unitsService = {
  getAll: async (): Promise<ApiResponse<Unit[]>> => {
    const { data } = await api.get<ApiResponse<Unit[]>>(API_ENDPOINTS.UNITS.LIST)
    return data
  },

  create: async (unitData: CreateUnitRequest): Promise<ApiResponse<Unit>> => {
    const { data } = await api.post<ApiResponse<Unit>>(API_ENDPOINTS.UNITS.CREATE, unitData)
    return data
  },

  update: async (id: number, unitData: Partial<CreateUnitRequest>): Promise<ApiResponse<Unit>> => {
    const { data } = await api.put<ApiResponse<Unit>>(API_ENDPOINTS.UNITS.UPDATE(id), unitData)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.UNITS.DELETE(id))
  },
}

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
  getAll: async (params?: { type?: 'single' | 'group'; status?: 'active' | 'inactive' }): Promise<
    ApiResponse<Vat[]>
  > => {
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
}

// ============================================
// Payment Types
// ============================================

export const paymentTypesService = {
  getAll: async (): Promise<ApiResponse<PaymentType[]>> => {
    const { data } = await api.get<ApiResponse<PaymentType[]>>(API_ENDPOINTS.PAYMENT_TYPES.LIST)
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

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.PAYMENT_TYPES.DELETE(id))
  },
}
