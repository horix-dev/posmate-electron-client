import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type {
  LoyaltyCustomer,
  LoyaltySettings,
  LoyaltyTransaction,
  LoyaltyTransactionsResponse,
  LoyaltyAdjustmentRequest,
  LoyaltyAssignCardRequest,
  LoyaltyLookupParams,
} from '@/types/api.types'

export const loyaltyService = {
  lookupCustomer: async (params: LoyaltyLookupParams): Promise<ApiResponse<LoyaltyCustomer>> => {
    const { data } = await api.get<ApiResponse<LoyaltyCustomer>>(API_ENDPOINTS.LOYALTY.LOOKUP_CUSTOMER, {
      params,
    })
    return data
  },

  quickCardLookup: async (cardCode: string): Promise<ApiResponse<LoyaltyCustomer>> => {
    const { data } = await api.get<ApiResponse<LoyaltyCustomer>>(API_ENDPOINTS.LOYALTY.QUICK_CARD(cardCode))
    return data
  },

  assignCard: async (
    partyId: number,
    payload?: LoyaltyAssignCardRequest
  ): Promise<ApiResponse<LoyaltyCustomer>> => {
    const { data } = await api.post<ApiResponse<LoyaltyCustomer>>(
      API_ENDPOINTS.LOYALTY.ASSIGN_CARD(partyId),
      payload ?? {}
    )
    return data
  },

  getTransactions: async (
    partyId: number,
    params?: { per_page?: number; page?: number }
  ): Promise<LoyaltyTransactionsResponse> => {
    const { data } = await api.get<LoyaltyTransactionsResponse>(
      API_ENDPOINTS.LOYALTY.TRANSACTIONS(partyId),
      { params }
    )
    return data
  },

  adjustPoints: async (
    partyId: number,
    payload: LoyaltyAdjustmentRequest
  ): Promise<ApiResponse<LoyaltyTransaction>> => {
    const { data } = await api.post<ApiResponse<LoyaltyTransaction>>(
      API_ENDPOINTS.LOYALTY.ADJUST(partyId),
      payload
    )
    return data
  },

  getSettings: async (): Promise<ApiResponse<LoyaltySettings>> => {
    const { data } = await api.get<ApiResponse<LoyaltySettings>>(API_ENDPOINTS.LOYALTY.SETTINGS)
    return data
  },

  updateSettings: async (payload: LoyaltySettings): Promise<ApiResponse<LoyaltySettings>> => {
    const { data } = await api.put<ApiResponse<LoyaltySettings>>(API_ENDPOINTS.LOYALTY.SETTINGS, payload)
    return data
  },
}

export default loyaltyService
