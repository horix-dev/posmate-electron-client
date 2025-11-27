import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Business, BusinessCategory } from '@/types/api.types'

export const businessService = {
  /**
   * Get current business info
   */
  getBusiness: async (): Promise<ApiResponse<Business>> => {
    const { data } = await api.get<ApiResponse<Business>>(API_ENDPOINTS.BUSINESS.GET)
    return data
  },

  /**
   * Create new business (first time setup)
   */
  createBusiness: async (businessData: FormData): Promise<ApiResponse<Business>> => {
    const { data } = await api.post<ApiResponse<Business>>(
      API_ENDPOINTS.BUSINESS.CREATE,
      businessData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return data
  },

  /**
   * Update business info
   */
  updateBusiness: async (id: number, businessData: FormData): Promise<ApiResponse<Business>> => {
    const { data } = await api.put<ApiResponse<Business>>(
      API_ENDPOINTS.BUSINESS.UPDATE(id),
      businessData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return data
  },

  /**
   * Delete business
   */
  deleteBusiness: async (password: string): Promise<ApiResponse<unknown>> => {
    const { data } = await api.delete<ApiResponse<unknown>>(API_ENDPOINTS.BUSINESS.DELETE, {
      data: { password },
    })
    return data
  },

  /**
   * Get business categories for setup
   */
  getBusinessCategories: async (): Promise<ApiResponse<BusinessCategory[]>> => {
    const { data } = await api.get<ApiResponse<BusinessCategory[]>>(
      API_ENDPOINTS.BUSINESS.CATEGORIES
    )
    return data
  },
}

export default businessService
