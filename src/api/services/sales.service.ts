import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Sale, CreateSaleRequest, SaleReturn } from '@/types/api.types'

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

  // ============================================
  // Sale Returns
  // ============================================

  /**
   * Get all sale returns
   */
  getReturns: async (params?: {
    page?: number
    per_page?: number
    start_date?: string
    end_date?: string
    search?: string
  }): Promise<PaginatedApiResponse<SaleReturn[]>> => {
    const { data } = await api.get<PaginatedApiResponse<SaleReturn[]>>(
      API_ENDPOINTS.SALE_RETURNS.LIST,
      { params }
    )
    return data
  },

  /**
   * Get a sale return by ID
   */
  getReturnById: async (id: number): Promise<ApiResponse<SaleReturn>> => {
    const { data } = await api.get<ApiResponse<SaleReturn>>(
      API_ENDPOINTS.SALE_RETURNS.GET(id)
    )
    return data
  },

  /**
   * Create a sale return
   * API expects parallel arrays: sale_detail_id[], return_qty[], return_amount[]
   */
  createReturn: async (returnData: {
    sale_id: number
    return_date: string
    sale_detail_id: number[]
    return_qty: number[]
    return_amount: number[]
  }): Promise<ApiResponse<SaleReturn>> => {
    const { data } = await api.post<ApiResponse<SaleReturn>>(
      API_ENDPOINTS.SALE_RETURNS.CREATE,
      returnData
    )
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
    } else if (key === 'products' && Array.isArray(value)) {
      // Send products as JSON string for FormData (backend will parse)
      formData.append(key, JSON.stringify(value))
    } else if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value))
    } else {
      formData.append(key, String(value))
    }
  })

  return formData
}

export default salesService
