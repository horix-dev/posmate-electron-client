import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { ProductModel, CreateProductModelRequest } from '@/types/api.types'

export const modelsService = {
    /**
     * Get all models with pagination
     */
    getAll: async (params?: { page?: number; per_page?: number }): Promise<PaginatedApiResponse<ProductModel[]>> => {
        const { data } = await api.get<PaginatedApiResponse<ProductModel[]>>(API_ENDPOINTS.PRODUCT_MODELS.LIST, { params })
        return data
    },

    /**
     * Filter models
     */
    filter: async (params: { search?: string; page?: number; per_page?: number }): Promise<PaginatedApiResponse<ProductModel[]>> => {
        const { data } = await api.get<PaginatedApiResponse<ProductModel[]>>(`${API_ENDPOINTS.PRODUCT_MODELS.LIST}/filter`, { params })
        return data
    },

    /**
     * Get single model
     */
    getById: async (id: number): Promise<ApiResponse<ProductModel>> => {
        const { data } = await api.get<ApiResponse<ProductModel>>(API_ENDPOINTS.PRODUCT_MODELS.UPDATE(id))
        return data
    },

    /**
     * Create model
     */
    create: async (modelData: CreateProductModelRequest): Promise<ApiResponse<ProductModel>> => {
        const { data } = await api.post<ApiResponse<ProductModel>>(API_ENDPOINTS.PRODUCT_MODELS.CREATE, modelData)
        return data
    },

    /**
     * Update model
     */
    update: async (id: number, modelData: Partial<CreateProductModelRequest>): Promise<ApiResponse<ProductModel>> => {
        const { data } = await api.put<ApiResponse<ProductModel>>(API_ENDPOINTS.PRODUCT_MODELS.UPDATE(id), modelData)
        return data
    },

    /**
     * Delete model
     */
    delete: async (id: number): Promise<ApiResponse<null>> => {
        const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.PRODUCT_MODELS.DELETE(id))
        return data
    },

    /**
     * Update model status
     */
    updateStatus: async (id: number, status: boolean): Promise<ApiResponse<ProductModel>> => {
        const { data } = await api.patch<ApiResponse<ProductModel>>(`${API_ENDPOINTS.PRODUCT_MODELS.UPDATE(id)}/status`, { status })
        return data
    },

    /**
     * Delete multiple models
     */
    deleteMultiple: async (ids: number[]): Promise<ApiResponse<null>> => {
        const { data } = await api.post<ApiResponse<null>>(`${API_ENDPOINTS.PRODUCT_MODELS.LIST}/delete-all`, { ids })
        return data
    },
}

export default modelsService
