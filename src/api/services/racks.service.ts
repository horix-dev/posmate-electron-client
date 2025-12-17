import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Rack, CreateRackRequest } from '@/types/api.types'

export const racksService = {
  getAll: async (params?: { page?: number; per_page?: number }): Promise<PaginatedApiResponse<Rack[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Rack[]>>(API_ENDPOINTS.RACKS.LIST, { params })
    return data
  },

  filter: async (params: { search?: string; page?: number; per_page?: number }): Promise<PaginatedApiResponse<Rack[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Rack[]>>(`${API_ENDPOINTS.RACKS.LIST}/filter`, { params })
    return data
  },

  getById: async (id: number): Promise<ApiResponse<Rack>> => {
    const { data } = await api.get<ApiResponse<Rack>>(API_ENDPOINTS.RACKS.UPDATE(id))
    return data
  },

  create: async (payload: CreateRackRequest): Promise<ApiResponse<Rack>> => {
    const { data } = await api.post<ApiResponse<Rack>>(API_ENDPOINTS.RACKS.CREATE, payload)
    return data
  },

  update: async (id: number, payload: Partial<CreateRackRequest>): Promise<ApiResponse<Rack>> => {
    const { data } = await api.put<ApiResponse<Rack>>(API_ENDPOINTS.RACKS.UPDATE(id), payload)
    return data
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.RACKS.DELETE(id))
    return data
  },

  updateStatus: async (id: number, status: boolean): Promise<ApiResponse<Rack>> => {
    const { data } = await api.patch<ApiResponse<Rack>>(`${API_ENDPOINTS.RACKS.UPDATE(id)}/status`, { status })
    return data
  },

  deleteMultiple: async (ids: number[]): Promise<ApiResponse<null>> => {
    const { data } = await api.post<ApiResponse<null>>(`${API_ENDPOINTS.RACKS.LIST}/delete-all`, { ids })
    return data
  },
}

export default racksService
