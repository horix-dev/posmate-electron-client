import api, { PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Stock } from '@/types/api.types'

export interface GetStocksParams {
  page?: number
  per_page?: number
  limit?: number
  cursor?: number
  product_id?: number
  variant_id?: number
  warehouse_id?: number
  branch_id?: number
  batch_no?: string
  stock_status?: 'in_stock' | 'out_of_stock' | 'low_stock'
  expiry_status?: 'expired' | 'expiring_soon'
  days?: number
  search?: string
}

export const stocksListService = {
  /**
   * Get all stocks with optional filtering and pagination
   * Supports multiple pagination modes:
   * - Default (no params): all items, limit 1000
   * - Limit mode (?limit=N): first N items
   * - Offset mode (?page=X&per_page=Y): paginated object
   * - Cursor mode (?cursor=X&per_page=Y): flat array + cursor
   */
  getAll: async (params?: GetStocksParams): Promise<PaginatedApiResponse<Stock[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Stock[]>>(API_ENDPOINTS.STOCKS.LIST, {
      params,
    })
    return data
  },

  /**
   * Get low stock items
   */
  getLowStocks: async (params?: Omit<GetStocksParams, 'stock_status'>): Promise<PaginatedApiResponse<Stock[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Stock[]>>(API_ENDPOINTS.STOCKS.LIST, {
      params: {
        ...params,
        stock_status: 'low_stock',
      },
    })
    return data
  },

  /**
   * Get expired stock items
   */
  getExpiredStocks: async (params?: Omit<GetStocksParams, 'expiry_status'>): Promise<PaginatedApiResponse<Stock[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Stock[]>>(API_ENDPOINTS.STOCKS.LIST, {
      params: {
        ...params,
        stock_status: 'expired',
      },
    })
    return data
  },

  /**
   * Get expiring soon stocks
   */
  getExpiringStocks: async (params?: Omit<GetStocksParams, 'expiry_status'> & { days?: number }): Promise<PaginatedApiResponse<Stock[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Stock[]>>(API_ENDPOINTS.STOCKS.LIST, {
      params: {
        ...params,
        expiry_status: 'expiring_soon',
      },
    })
    return data
  },

  /**
   * Search stocks by product name, code, or batch number
   */
  search: async (query: string, params?: Omit<GetStocksParams, 'search'>): Promise<PaginatedApiResponse<Stock[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Stock[]>>(API_ENDPOINTS.STOCKS.LIST, {
      params: {
        ...params,
        search: query,
      },
    })
    return data
  },
}

export default stocksListService
