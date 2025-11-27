import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Sale, CreateSaleRequest } from '@/types/api.types'

export const salesService = {
  /**
   * Get all sales
   */
  getAll: async (returnedOnly = false): Promise<ApiResponse<Sale[]>> => {
    const params = returnedOnly ? { 'returned-sales': 'true' } : {}
    const { data } = await api.get<ApiResponse<Sale[]>>(API_ENDPOINTS.SALES.LIST, { params })
    return data
  },

  /**
   * Get single sale by ID
   */
  getById: async (id: number): Promise<ApiResponse<Sale>> => {
    const { data } = await api.get<ApiResponse<Sale>>(API_ENDPOINTS.SALES.GET(id))
    return data
  },

  /**
   * Create new sale
   */
  create: async (saleData: CreateSaleRequest | FormData): Promise<ApiResponse<Sale>> => {
    const formData = saleData instanceof FormData ? saleData : buildSaleFormData(saleData)
    const { data } = await api.post<ApiResponse<Sale>>(API_ENDPOINTS.SALES.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * Update existing sale
   */
  update: async (
    id: number,
    saleData: Partial<CreateSaleRequest> | FormData
  ): Promise<ApiResponse<Sale>> => {
    const formData = saleData instanceof FormData ? saleData : buildSaleFormData(saleData)
    const { data } = await api.put<ApiResponse<Sale>>(API_ENDPOINTS.SALES.UPDATE(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * Delete sale
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.SALES.DELETE(id))
  },

  /**
   * Generate new invoice number
   */
  getNewInvoiceNumber: async (): Promise<string> => {
    const { data } = await api.get<string>(API_ENDPOINTS.INVOICES.NEW_INVOICE_NUMBER, {
      params: { platform: 'sales' },
    })
    return data
  },
}

// Helper to build FormData for sale
function buildSaleFormData(saleData: Partial<CreateSaleRequest>): FormData {
  const formData = new FormData()

  Object.entries(saleData).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (value instanceof File) {
      formData.append(key, value)
    } else if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value))
    } else {
      formData.append(key, String(value))
    }
  })

  return formData
}

export default salesService
