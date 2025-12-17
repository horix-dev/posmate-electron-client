import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Shelf, CreateShelfRequest } from '@/types/api.types'

export const shelvesService = {
  getAll: async (params?: { page?: number; per_page?: number }): Promise<PaginatedApiResponse<Shelf[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Shelf[]>>(API_ENDPOINTS.SHELVES.LIST, { params })
    return data
  },

  filter: async (params: { search?: string; page?: number; per_page?: number }): Promise<PaginatedApiResponse<Shelf[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Shelf[]>>(`${API_ENDPOINTS.SHELVES.LIST}/filter`, { params })
    return data
  },

  getById: async (id: number): Promise<ApiResponse<Shelf>> => {
    const { data } = await api.get<ApiResponse<Shelf>>(API_ENDPOINTS.SHELVES.UPDATE(id))
    return data
  },

  create: async (payload: CreateShelfRequest): Promise<ApiResponse<Shelf>> => {
    const { data } = await api.post<ApiResponse<Shelf>>(API_ENDPOINTS.SHELVES.CREATE, payload)
    return data
  },

  update: async (id: number, payload: Partial<CreateShelfRequest>): Promise<ApiResponse<Shelf>> => {
    const { data } = await api.put<ApiResponse<Shelf>>(API_ENDPOINTS.SHELVES.UPDATE(id), payload)
    return data
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.SHELVES.DELETE(id))
    return data
  },

  updateStatus: async (id: number, status: boolean): Promise<ApiResponse<Shelf>> => {
    const { data } = await api.patch<ApiResponse<Shelf>>(`${API_ENDPOINTS.SHELVES.UPDATE(id)}/status`, { status })
    return data
  },

  deleteMultiple: async (ids: number[]): Promise<ApiResponse<null>> => {
    const { data } = await api.post<ApiResponse<null>>(`${API_ENDPOINTS.SHELVES.LIST}/delete-all`, { ids })
    return data
  },
}

export default shelvesService
