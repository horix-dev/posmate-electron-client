import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { DueCollection, CreateDueCollectionRequest, Party } from '@/types/api.types'

export interface DueInvoice {
  id: number
  invoiceNumber?: string
  invoice_number?: string
  dueAmount?: number
  due_amount?: number
  totalAmount?: number
  total_amount?: number
}

export interface DueInvoicesResponse {
  party?: Party
  invoices?: DueInvoice[]
}

export const duesService = {
  /**
   * Get all due collections with optional filters
   */
  getAll: async (params?: {
    page?: number
    start_date?: string
    end_date?: string
    party_id?: number
  }): Promise<PaginatedApiResponse<DueCollection[]>> => {
    const { data } = await api.get<PaginatedApiResponse<DueCollection[]>>(API_ENDPOINTS.DUES.LIST, {
      params,
    })
    return data
  },

  /**
   * Get invoices for a specific party
   */
  getInvoices: async (partyId: number): Promise<ApiResponse<DueInvoicesResponse>> => {
    const { data } = await api.get<ApiResponse<DueInvoicesResponse>>(API_ENDPOINTS.DUES.INVOICES, {
      params: { party_id: partyId },
    })
    return data
  },

  /**
   * Create a new due collection
   */
  create: async (
    dueCollection: CreateDueCollectionRequest
  ): Promise<ApiResponse<DueCollection>> => {
    const { data } = await api.post<ApiResponse<DueCollection>>(
      API_ENDPOINTS.DUES.CREATE,
      dueCollection
    )
    return data
  },
}

export default duesService
