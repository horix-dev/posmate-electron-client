import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Currency } from '@/types/api.types'

// ============================================
// Currency Service
// ============================================

export interface CurrencyListParams {
  limit?: number
  page?: number
  per_page?: number
  cursor?: number
  status?: number
  search?: string
  is_default?: number
  country_name?: string
}

export interface CurrencyPaginatedResponse {
  message: string
  data: Currency[]
  current_currency?: Currency
  pagination?: {
    total?: number
    per_page?: number
    current_page?: number
    last_page?: number
    from?: number
    to?: number
    next_cursor?: number
    has_more?: boolean
  }
  _server_timestamp?: string
}

export const currenciesService = {
  /**
   * Get currencies list (for dropdowns, filters)
   * Returns flat array with optional limit
   */
  getList: async (params?: { limit?: number; status?: number }): Promise<ApiResponse<Currency[]>> => {
    const { data } = await api.get<ApiResponse<Currency[]>>(API_ENDPOINTS.CURRENCIES.LIST, { params })
    return data
  },

  /**
   * Get all currencies with pagination
   */
  getAll: async (params?: CurrencyListParams): Promise<CurrencyPaginatedResponse> => {
    const { data } = await api.get<CurrencyPaginatedResponse>(API_ENDPOINTS.CURRENCIES.LIST, {
      params,
    })
    return data
  },

  /**
   * Get currencies with offset pagination (for tables)
   */
  getPaginated: async (params: {
    page?: number
    per_page?: number
    status?: number
    search?: string
  }): Promise<PaginatedApiResponse<Currency[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Currency[]>>(API_ENDPOINTS.CURRENCIES.LIST, {
      params,
    })
    return data
  },

  /**
   * Search/filter currencies using dedicated filter endpoint
   */
  filter: async (params: {
    search?: string
    is_default?: number
    country_name?: string
    page?: number
    per_page?: number
  }): Promise<CurrencyPaginatedResponse> => {
    const { data } = await api.get<CurrencyPaginatedResponse>(API_ENDPOINTS.CURRENCIES.FILTER, {
      params,
    })
    return data
  },

  /**
   * Change business currency (updates user_currencies table)
   */
  changeCurrency: async (id: number): Promise<ApiResponse<Currency>> => {
    const { data } = await api.get<ApiResponse<Currency>>(API_ENDPOINTS.CURRENCIES.CHANGE(id))
    return data
  },

  /**
   * Set global default currency (updates currencies.is_default)
   */
  setDefault: async (id: number): Promise<ApiResponse<Currency>> => {
    const { data } = await api.put<ApiResponse<Currency>>(API_ENDPOINTS.CURRENCIES.SET_DEFAULT(id))
    return data
  },

  /**
   * Get active business currency (from user_currencies table)
   */
  getActive: async (): Promise<ApiResponse<Currency>> => {
    const { data } = await api.get<ApiResponse<Currency>>(API_ENDPOINTS.CURRENCIES.ACTIVE)
    return data
  },
}

export default currenciesService
