import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { ProductSettings, Currency, User } from '@/types/api.types'

export const settingsService = {
  // ============================================
  // Product Settings
  // ============================================

  /**
   * Get product settings
   */
  getProductSettings: async (): Promise<ApiResponse<ProductSettings>> => {
    const { data } = await api.get<ApiResponse<ProductSettings>>(API_ENDPOINTS.SETTINGS.PRODUCT)
    return data
  },

  /**
   * Update product settings
   */
  updateProductSettings: async (
    settings: Partial<ProductSettings['modules']>
  ): Promise<ApiResponse<ProductSettings>> => {
    const { data } = await api.post<ApiResponse<ProductSettings>>(API_ENDPOINTS.SETTINGS.PRODUCT, {
      ...settings,
      _method: 'PUT',
    })
    return data
  },

  // ============================================
  // Currency Settings
  // ============================================

  /**
   * Get all currencies
   */
  getCurrencies: async (): Promise<ApiResponse<Currency[]>> => {
    const { data } = await api.get<ApiResponse<Currency[]>>(API_ENDPOINTS.CURRENCIES.LIST)
    return data
  },

  /**
   * Change default currency
   */
  changeDefaultCurrency: async (id: number): Promise<ApiResponse<Currency>> => {
    const { data } = await api.post<ApiResponse<Currency>>(API_ENDPOINTS.CURRENCIES.CHANGE(id), {
      _method: 'PUT',
    })
    return data
  },

  // ============================================
  // User Management
  // ============================================

  /**
   * Get all users
   */
  getUsers: async (): Promise<ApiResponse<User[]>> => {
    const { data } = await api.get<ApiResponse<User[]>>(API_ENDPOINTS.USERS.LIST)
    return data
  },

  /**
   * Create a new user
   */
  createUser: async (user: {
    name: string
    email: string
    password: string
    role: 'shop-owner' | 'staff'
    branch_id?: number
  }): Promise<ApiResponse<User>> => {
    const { data } = await api.post<ApiResponse<User>>(API_ENDPOINTS.USERS.CREATE, user)
    return data
  },

  /**
   * Update a user
   */
  updateUser: async (
    id: number,
    user: {
      name?: string
      email?: string
      role?: 'shop-owner' | 'staff'
      branch_id?: number
    }
  ): Promise<ApiResponse<User>> => {
    const { data } = await api.post<ApiResponse<User>>(API_ENDPOINTS.USERS.UPDATE(id), {
      ...user,
      _method: 'PUT',
    })
    return data
  },

  /**
   * Delete a user
   */
  deleteUser: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.USERS.DELETE(id))
    return data
  },

  // ============================================
  // Profile
  // ============================================

  /**
   * Get user profile
   */
  getProfile: async (): Promise<ApiResponse<User>> => {
    const { data } = await api.get<ApiResponse<User>>(API_ENDPOINTS.PROFILE.GET)
    return data
  },

  /**
   * Update user profile
   */
  updateProfile: async (profile: {
    name?: string
    phone?: string
    image?: File
  }): Promise<ApiResponse<User>> => {
    const formData = new FormData()
    Object.entries(profile).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value instanceof File ? value : String(value))
      }
    })
    formData.append('_method', 'PUT')

    const { data } = await api.post<ApiResponse<User>>(API_ENDPOINTS.PROFILE.UPDATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * Change password
   */
  changePassword: async (passwords: {
    current_password: string
    password: string
    password_confirmation: string
  }): Promise<ApiResponse<null>> => {
    const { data } = await api.post<ApiResponse<null>>(
      API_ENDPOINTS.PROFILE.CHANGE_PASSWORD,
      passwords
    )
    return data
  },
}

export default settingsService
