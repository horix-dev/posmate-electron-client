import api from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { ApiResponse, StaffMember, CreateStaffRequest } from '@/types/api.types'

export const staffService = {
  getAll: async (): Promise<StaffMember[]> => {
    const response = await api.get<ApiResponse<StaffMember[]>>(API_ENDPOINTS.USERS.LIST)
    return response.data.data
  },

  create: async (data: CreateStaffRequest): Promise<ApiResponse<StaffMember>> => {
    const response = await api.post<ApiResponse<StaffMember>>(API_ENDPOINTS.USERS.CREATE, data)
    return response.data
  },

  update: async (
    id: number,
    data: Partial<CreateStaffRequest>
  ): Promise<ApiResponse<StaffMember>> => {
    const response = await api.put<ApiResponse<StaffMember>>(API_ENDPOINTS.USERS.UPDATE(id), data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.USERS.DELETE(id))
  },
}
