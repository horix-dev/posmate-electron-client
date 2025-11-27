import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Warehouse, CreateWarehouseRequest } from '@/types/api.types'

export const warehousesService = {
  /**
   * Get all warehouses
   */
  getAll: async (): Promise<ApiResponse<Warehouse[]>> => {
    const { data } = await api.get<ApiResponse<Warehouse[]>>(API_ENDPOINTS.WAREHOUSES.LIST)
    return data
  },

  /**
   * Create a new warehouse
   */
  create: async (warehouse: CreateWarehouseRequest): Promise<ApiResponse<Warehouse>> => {
    const { data } = await api.post<ApiResponse<Warehouse>>(
      API_ENDPOINTS.WAREHOUSES.CREATE,
      warehouse
    )
    return data
  },

  /**
   * Update an existing warehouse
   */
  update: async (
    id: number,
    warehouse: Partial<CreateWarehouseRequest>
  ): Promise<ApiResponse<Warehouse>> => {
    const { data } = await api.post<ApiResponse<Warehouse>>(API_ENDPOINTS.WAREHOUSES.UPDATE(id), {
      ...warehouse,
      _method: 'PUT',
    })
    return data
  },

  /**
   * Delete a warehouse
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.WAREHOUSES.DELETE(id))
    return data
  },
}

export default warehousesService
