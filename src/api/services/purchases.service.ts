import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Purchase, CreatePurchaseRequest, PurchaseReturn } from '@/types/api.types'

export const purchasesService = {
  /**
   * Get all purchases with optional filters and pagination
   */
  getAll: async (params?: {
    page?: number
    per_page?: number
    limit?: number
    cursor?: number
    search?: string
    start_date?: string
    end_date?: string
    party_id?: number
    isPaid?: boolean
    'returned-purchase'?: boolean
    invoiceNumber?: string
  }): Promise<PaginatedApiResponse<Purchase[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Purchase[]>>(API_ENDPOINTS.PURCHASES.LIST, {
      params,
    })
    return data
  },

  /**
   * Filter purchases (alias for getAll with search)
   */
  filter: async (params: {
    page?: number
    per_page?: number
    search?: string
    start_date?: string
    end_date?: string
    party_id?: number
  }): Promise<PaginatedApiResponse<Purchase[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Purchase[]>>(API_ENDPOINTS.PURCHASES.LIST, {
      params,
    })
    return data
  },

  /**
   * Get a single purchase by ID
   */
  getById: async (id: number): Promise<ApiResponse<Purchase>> => {
    const { data } = await api.get<ApiResponse<Purchase>>(API_ENDPOINTS.PURCHASES.GET(id))
    return data
  },

  /**
   * Create a new purchase
   */
  create: async (purchase: CreatePurchaseRequest): Promise<ApiResponse<Purchase>> => {
    const { data } = await api.post<ApiResponse<Purchase>>(API_ENDPOINTS.PURCHASES.CREATE, purchase)
    return data
  },

  /**
   * Update an existing purchase
   */
  update: async (
    id: number,
    purchase: Partial<CreatePurchaseRequest>
  ): Promise<ApiResponse<Purchase>> => {
    const { data } = await api.post<ApiResponse<Purchase>>(API_ENDPOINTS.PURCHASES.UPDATE(id), {
      ...purchase,
      _method: 'PUT',
    })
    return data
  },

  /**
   * Delete a purchase
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.PURCHASES.DELETE(id))
    return data
  },

  /**
   * Generate next invoice number
   */
  getNextInvoiceNumber: async (): Promise<ApiResponse<{ invoice_number: string }>> => {
    const { data } = await api.get<ApiResponse<{ invoice_number: string }>>(
      API_ENDPOINTS.INVOICES.NEW_INVOICE_NUMBER
    )
    return data
  },

  // ============================================
  // Purchase Returns
  // ============================================

  /**
   * Get all purchase returns
   */
  getReturns: async (params?: {
    page?: number
    start_date?: string
    end_date?: string
  }): Promise<PaginatedApiResponse<PurchaseReturn[]>> => {
    const { data } = await api.get<PaginatedApiResponse<PurchaseReturn[]>>(
      API_ENDPOINTS.PURCHASE_RETURNS.LIST,
      { params }
    )
    return data
  },

  /**
   * Get a purchase return by ID
   */
  getReturnById: async (id: number): Promise<ApiResponse<PurchaseReturn>> => {
    const { data } = await api.get<ApiResponse<PurchaseReturn>>(
      API_ENDPOINTS.PURCHASE_RETURNS.GET(id)
    )
    return data
  },

  /**
   * Create a purchase return
   * API expects parallel arrays: purchase_detail_id[], return_qty[], return_amount[]
   */
  createReturn: async (returnData: {
    purchase_id: number
    return_date: string
    purchase_detail_id: number[]
    return_qty: number[]
    return_amount: number[]
  }): Promise<ApiResponse<PurchaseReturn>> => {
    const { data } = await api.post<ApiResponse<PurchaseReturn>>(
      API_ENDPOINTS.PURCHASE_RETURNS.CREATE,
      returnData
    )
    return data
  },
}

export default purchasesService
