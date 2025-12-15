import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Category, CreateCategoryRequest } from '@/types/api.types'

export const categoriesService = {
    /**
     * Get all categories with pagination
     */
    getAll: async (params?: { page?: number; per_page?: number }): Promise<PaginatedApiResponse<Category[]>> => {
        const { data } = await api.get<PaginatedApiResponse<Category[]>>(API_ENDPOINTS.CATEGORIES.LIST, { params })
        return data
    },

    /**
     * Filter categories
     */
    filter: async (params: { search?: string; per_page?: number }): Promise<ApiResponse<Category[]>> => {
        const { data } = await api.get<ApiResponse<Category[]>>(`${API_ENDPOINTS.CATEGORIES.LIST}/filter`, { params })
        return data
    },

    /**
     * Get single category
     */
    getById: async (id: number): Promise<ApiResponse<Category>> => {
        const { data } = await api.get<ApiResponse<Category>>(API_ENDPOINTS.CATEGORIES.UPDATE(id))
        return data
    },

    /**
     * Create category
     */
    create: async (categoryData: CreateCategoryRequest): Promise<ApiResponse<Category>> => {
        const formData = buildFormData(categoryData as unknown as Record<string, unknown>)
        const { data } = await api.post<ApiResponse<Category>>(API_ENDPOINTS.CATEGORIES.CREATE, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
    },

    /**
     * Update category
     */
    update: async (id: number, categoryData: Partial<CreateCategoryRequest>): Promise<ApiResponse<Category>> => {
        const formData = buildFormData(categoryData as unknown as Record<string, unknown>)
        formData.append('_method', 'PUT')
        const { data } = await api.post<ApiResponse<Category>>(API_ENDPOINTS.CATEGORIES.UPDATE(id), formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
    },

    /**
     * Delete category
     */
    delete: async (id: number): Promise<ApiResponse<null>> => {
        const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.CATEGORIES.DELETE(id))
        return data
    },

    /**
     * Update category status
     */
    updateStatus: async (id: number, status: boolean): Promise<ApiResponse<Category>> => {
        const { data } = await api.patch<ApiResponse<Category>>(`${API_ENDPOINTS.CATEGORIES.UPDATE(id)}/status`, { status })
        return data
    },

    /**
     * Delete multiple categories
     */
    deleteMultiple: async (ids: number[]): Promise<ApiResponse<null>> => {
        const { data } = await api.post<ApiResponse<null>>(`${API_ENDPOINTS.CATEGORIES.LIST}/delete-all`, { ids })
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
            formData.append(key, value ? '1' : '0') // Convert boolean to 1/0 for backend
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

export default categoriesService
