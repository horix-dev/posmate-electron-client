import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Bank, BankTransaction } from '@/types/api.types'

// ============================================
// Banks Service
// ============================================

export const banksService = {
  /**
   * Get banks with flexible pagination modes
   */
  getAll: async (params?: {
    page?: number
    per_page?: number
    limit?: number
    cursor?: number
    status?: 'active' | 'inactive' | 'closed'
    search?: string
    branch_id?: number
    min_balance?: number
    max_balance?: number
  }): Promise<PaginatedApiResponse<Bank[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Bank[]>>(API_ENDPOINTS.BANKS.LIST, {
      params: params || { limit: 100 },
    })
    return data
  },

  /** Get single bank */
  get: async (id: number): Promise<ApiResponse<Bank>> => {
    const { data } = await api.get<ApiResponse<Bank>>(API_ENDPOINTS.BANKS.GET(id))
    return data
  },

  /** Create a bank */
  create: async (payload: Partial<Bank>): Promise<ApiResponse<Bank>> => {
    const { data } = await api.post<ApiResponse<Bank>>(API_ENDPOINTS.BANKS.CREATE, payload)
    return data
  },

  /** Update a bank */
  update: async (id: number, payload: Partial<Bank>): Promise<ApiResponse<Bank>> => {
    const { data } = await api.post<ApiResponse<Bank>>(API_ENDPOINTS.BANKS.UPDATE(id), {
      ...payload,
      _method: 'PUT',
    })
    return data
  },

  /** Delete a bank (no transactions allowed) */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.BANKS.DELETE(id))
    return data
  },

  /** Deposit into bank */
  deposit: async (
    id: number,
    payload: { amount: number; description: string; reference?: string }
  ): Promise<ApiResponse<{ transaction: BankTransaction; bank: Bank }>> => {
    const { data } = await api.post<ApiResponse<{ transaction: BankTransaction; bank: Bank }>>(
      API_ENDPOINTS.BANKS.DEPOSIT(id),
      payload
    )
    return data
  },

  /** Withdraw from bank */
  withdraw: async (
    id: number,
    payload: { amount: number; description: string; reference?: string }
  ): Promise<ApiResponse<{ transaction: BankTransaction; bank: Bank }>> => {
    const { data } = await api.post<ApiResponse<{ transaction: BankTransaction; bank: Bank }>>(
      API_ENDPOINTS.BANKS.WITHDRAW(id),
      payload
    )
    return data
  },

  /** Transfer between banks */
  transfer: async (payload: {
    from_bank_id: number
    to_bank_id: number
    amount: number
    description: string
  }): Promise<ApiResponse<unknown>> => {
    const { data } = await api.post<ApiResponse<unknown>>(API_ENDPOINTS.BANKS.TRANSFER, payload)
    return data
  },

  /** Get bank transactions */
  getTransactions: async (
    id: number,
    params?: { type?: string; from_date?: string; to_date?: string; page?: number; per_page?: number }
  ): Promise<PaginatedApiResponse<BankTransaction[]>> => {
    const { data } = await api.get<PaginatedApiResponse<BankTransaction[]>>(
      API_ENDPOINTS.BANKS.TRANSACTIONS(id),
      { params }
    )
    return data
  },

  /** Get all bank transactions across all banks */
  getAllTransactions: async (params?: {
    bank_id?: number
    type?: string
    date_from?: string
    date_to?: string
    page?: number
    per_page?: number
    limit?: number
  }): Promise<PaginatedApiResponse<BankTransaction[]>> => {
    const { data } = await api.get<PaginatedApiResponse<BankTransaction[]>>(
      API_ENDPOINTS.BANKS.ALL_TRANSACTIONS,
      { params }
    )
    return data
  },

  /** Close bank account */
  close: async (id: number): Promise<ApiResponse<{ bank: Bank }>> => {
    const { data } = await api.post<ApiResponse<{ bank: Bank }>>(API_ENDPOINTS.BANKS.CLOSE(id))
    return data
  },
}

export default banksService