import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Stock } from '@/types/api.types'

export const stocksService = {
  /**
   * Add stock to a product
   */
  add: async (stock: {
    product_id: number
    batch_no?: string
    productStock: number
    productPurchasePrice: number
    productSalePrice: number
    productDealerPrice?: number
    productWholeSalePrice?: number
    profit_percent?: number
    mfg_date?: string
    expire_date?: string
    warehouse_id?: number
  }): Promise<ApiResponse<Stock>> => {
    const { data } = await api.post<ApiResponse<Stock>>(API_ENDPOINTS.STOCKS.ADD, stock)
    return data
  },

  /**
   * Update stock
   */
  update: async (
    id: number,
    stock: {
      batch_no?: string
      productStock?: number
      productPurchasePrice?: number
      productSalePrice?: number
      productDealerPrice?: number
      productWholeSalePrice?: number
      profit_percent?: number
      mfg_date?: string
      expire_date?: string
    }
  ): Promise<ApiResponse<Stock>> => {
    const { data } = await api.post<ApiResponse<Stock>>(API_ENDPOINTS.STOCKS.UPDATE(id), {
      ...stock,
      _method: 'PUT',
    })
    return data
  },

  /**
   * Delete stock
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.STOCKS.DELETE(id))
    return data
  },
}

export default stocksService
