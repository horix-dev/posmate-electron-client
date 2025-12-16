import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Unit, CreateUnitRequest } from '@/types/api.types'

export const unitsService = {
  getAll: async (params?: { page?: number; per_page?: number }): Promise<PaginatedApiResponse<Unit[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Unit[]>>(API_ENDPOINTS.UNITS.LIST, { params })
    return data
  },

  filter: async (params: { search?: string; page?: number; per_page?: number }): Promise<PaginatedApiResponse<Unit[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Unit[]>>(`${API_ENDPOINTS.UNITS.LIST}/filter`, { params })
    return data
  },

  getById: async (id: number): Promise<ApiResponse<Unit>> => {
    const { data } = await api.get<ApiResponse<Unit>>(API_ENDPOINTS.UNITS.UPDATE(id))
    return data
  },

  create: async (payload: CreateUnitRequest): Promise<ApiResponse<Unit>> => {
    const { data } = await api.post<ApiResponse<Unit>>(API_ENDPOINTS.UNITS.CREATE, payload)
    return data
  },

  update: async (id: number, payload: Partial<CreateUnitRequest>): Promise<ApiResponse<Unit>> => {
    const { data } = await api.put<ApiResponse<Unit>>(API_ENDPOINTS.UNITS.UPDATE(id), payload)
    return data
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.UNITS.DELETE(id))
    return data
  },

  // Use dedicated status endpoint per updated docs
  updateStatus: async (id: number, status: boolean): Promise<ApiResponse<Unit>> => {
    const { data } = await api.patch<ApiResponse<Unit>>(`${API_ENDPOINTS.UNITS.UPDATE(id)}/status`, { status })
    return data
  },

  // Bulk delete endpoint per updated docs
  deleteMultiple: async (ids: number[]): Promise<ApiResponse<null>> => {
    const { data } = await api.post<ApiResponse<null>>(`${API_ENDPOINTS.UNITS.LIST}/delete-all`, { ids })
    return data
  },
}

export default unitsService
