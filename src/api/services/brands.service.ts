import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Brand, CreateBrandRequest } from '@/types/api.types'

export const brandsService = {
  /**
   * Get brands list (for dropdowns, filters)
   * Returns flat array with optional limit
   */
  getList: async (params?: { limit?: number; status?: boolean }): Promise<ApiResponse<Brand[]>> => {
    const { data } = await api.get<ApiResponse<Brand[]>>(API_ENDPOINTS.BRANDS.LIST, { params })
    return data
  },

  /**
   * Get all brands with pagination
   */
  getAll: async (params?: {
    page?: number
    per_page?: number
  }): Promise<PaginatedApiResponse<Brand[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Brand[]>>(API_ENDPOINTS.BRANDS.LIST, {
      params,
    })
    return data
  },

  /**
   * Filter brands
   */
  filter: async (params: {
    search?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedApiResponse<Brand[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Brand[]>>(
      `${API_ENDPOINTS.BRANDS.LIST}/filter`,
      { params }
    )
    return data
  },

  /**
   * Get single brand
   */
  getById: async (id: number): Promise<ApiResponse<Brand>> => {
    const { data } = await api.get<ApiResponse<Brand>>(API_ENDPOINTS.BRANDS.UPDATE(id))
    return data
  },

  /**
   * Create brand
   */
  create: async (brandData: CreateBrandRequest): Promise<ApiResponse<Brand>> => {
    const formData = buildFormData(brandData as unknown as Record<string, unknown>)
    const { data } = await api.post<ApiResponse<Brand>>(API_ENDPOINTS.BRANDS.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * Update brand
   */
  update: async (
    id: number,
    brandData: Partial<CreateBrandRequest>
  ): Promise<ApiResponse<Brand>> => {
    const formData = buildFormData(brandData as unknown as Record<string, unknown>)
    formData.append('_method', 'PUT')
    const { data } = await api.post<ApiResponse<Brand>>(API_ENDPOINTS.BRANDS.UPDATE(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * Delete brand
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.BRANDS.DELETE(id))
    return data
  },

  /**
   * Update brand status
   */
  updateStatus: async (id: number, status: boolean): Promise<ApiResponse<Brand>> => {
    const { data } = await api.patch<ApiResponse<Brand>>(
      `${API_ENDPOINTS.BRANDS.UPDATE(id)}/status`,
      { status }
    )
    return data
  },

  /**
   * Delete multiple brands
   */
  deleteMultiple: async (ids: number[]): Promise<ApiResponse<null>> => {
    const { data } = await api.post<ApiResponse<null>>(`${API_ENDPOINTS.BRANDS.LIST}/delete-all`, {
      ids,
    })
    return data
  },
}

// Helper to build FormData
function buildFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData()

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (value instanceof File) {
      formData.append(key, value)
    } else if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0')
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        formData.append(`${key}[]`, String(item))
      })
    } else {
      formData.append(key, String(value))
    }
  })

  return formData
}

export default brandsService
