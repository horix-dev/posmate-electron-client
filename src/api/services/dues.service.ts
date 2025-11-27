import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { DueCollection, CreateDueCollectionRequest } from '@/types/api.types'

export const duesService = {
  /**
   * Get all due collections with optional filters
   */
  getAll: async (params?: {
    page?: number
    start_date?: string
    end_date?: string
    party_id?: number
  }): Promise<PaginatedApiResponse<DueCollection[]>> => {
    const { data } = await api.get<PaginatedApiResponse<DueCollection[]>>(API_ENDPOINTS.DUES.LIST, {
      params,
    })
    return data
  },

  /**
   * Create a new due collection
   */
  create: async (
    dueCollection: CreateDueCollectionRequest
  ): Promise<ApiResponse<DueCollection>> => {
    const { data } = await api.post<ApiResponse<DueCollection>>(
      API_ENDPOINTS.DUES.CREATE,
      dueCollection
    )
    return data
  },
}

export default duesService
