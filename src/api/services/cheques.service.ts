import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Cheque, ChequeManualEntryRequest } from '@/types/api.types'

// ============================================
// Cheques Service
// ============================================

export const chequesService = {
  /**
   * Get cheques with flexible pagination and filters
   */
  getAll: async (params?: {
    page?: number
    per_page?: number
    limit?: number
    cursor?: number
    status?: string
    type?: string
    bank_id?: number
    party_id?: number
    date_from?: string
    date_to?: string
    search?: string
  }): Promise<PaginatedApiResponse<Cheque[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Cheque[]>>(API_ENDPOINTS.CHEQUES.LIST, {
      params: params || { limit: 100 },
    })
    return data
  },

  /** Get single cheque */
  get: async (id: number): Promise<ApiResponse<Cheque>> => {
    const { data } = await api.get<ApiResponse<Cheque>>(API_ENDPOINTS.CHEQUES.GET(id))
    return data
  },

  /** Create cheque (Type 1 - received with invoice) */
  create: async (payload: Partial<Cheque>): Promise<ApiResponse<Cheque>> => {
    const { data } = await api.post<ApiResponse<Cheque>>(API_ENDPOINTS.CHEQUES.CREATE, payload)
    return data
  },

  /** Create cheque (Type 2 - manual entry) */
  createManualEntry: async (
    payload: ChequeManualEntryRequest
  ): Promise<ApiResponse<Cheque>> => {
    const { data } = await api.post<ApiResponse<Cheque>>(
      API_ENDPOINTS.CHEQUES.MANUAL_ENTRY,
      payload
    )
    return data
  },

  /** Create cheque (Type 3 - issue to supplier) */
  issueToSupplier: async (payload: Partial<Cheque>): Promise<ApiResponse<Cheque>> => {
    const { data } = await api.post<ApiResponse<Cheque>>(
      API_ENDPOINTS.CHEQUES.ISSUE_TO_SUPPLIER,
      payload
    )
    return data
  },

  /** Update cheque (pending only) */
  update: async (id: number, payload: Partial<Cheque>): Promise<ApiResponse<Cheque>> => {
    const { data } = await api.post<ApiResponse<Cheque>>(API_ENDPOINTS.CHEQUES.UPDATE(id), {
      ...payload,
      _method: 'PUT',
    })
    return data
  },

  /** Delete cheque */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.CHEQUES.DELETE(id))
    return data
  },

  /** Deposit cheque */
  deposit: async (id: number, payload?: Record<string, unknown>): Promise<ApiResponse<Cheque>> => {
    const { data } = await api.post<ApiResponse<Cheque>>(API_ENDPOINTS.CHEQUES.DEPOSIT(id), payload)
    return data
  },

  /** Clear cheque */
  clear: async (id: number, payload?: Record<string, unknown>): Promise<ApiResponse<Cheque>> => {
    const { data } = await api.post<ApiResponse<Cheque>>(API_ENDPOINTS.CHEQUES.CLEAR(id), payload)
    return data
  },

  /** Bounce cheque */
  bounce: async (id: number, payload?: Record<string, unknown>): Promise<ApiResponse<Cheque>> => {
    const { data } = await api.post<ApiResponse<Cheque>>(API_ENDPOINTS.CHEQUES.BOUNCE(id), payload)
    return data
  },

  /** Reopen cheque */
  reopen: async (id: number): Promise<ApiResponse<Cheque>> => {
    const { data } = await api.post<ApiResponse<Cheque>>(API_ENDPOINTS.CHEQUES.REOPEN(id))
    return data
  },

  /** Statistics */
  statistics: async (params?: {
    date_from?: string
    date_to?: string
    bank_id?: number
    type?: string
  }): Promise<ApiResponse<unknown>> => {
    const { data } = await api.get<ApiResponse<unknown>>(API_ENDPOINTS.CHEQUES.STATISTICS, { params })
    return data
  },
}

export default chequesService
