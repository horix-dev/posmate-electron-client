import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Party, CreatePartyRequest } from '@/types/api.types'

export const partiesService = {
  /**
   * Get all parties (customers and suppliers)
   */
  getAll: async (): Promise<ApiResponse<Party[]>> => {
    const { data } = await api.get<ApiResponse<Party[]>>(API_ENDPOINTS.PARTIES.LIST)
    return data
  },

  /**
   * Get single party by ID (also triggers SMS for due reminder)
   */
  getById: async (id: number): Promise<ApiResponse<Party>> => {
    const { data } = await api.get<ApiResponse<Party>>(API_ENDPOINTS.PARTIES.GET(id))
    return data
  },

  /**
   * Create new party
   */
  create: async (partyData: CreatePartyRequest | FormData): Promise<ApiResponse<Party>> => {
    const formData = partyData instanceof FormData ? partyData : buildPartyFormData(partyData)
    const { data } = await api.post<ApiResponse<Party>>(API_ENDPOINTS.PARTIES.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /**
   * Update existing party
   * Uses POST with _method=PUT for Laravel method spoofing (required for multipart/form-data)
   */
  update: async (
    id: number,
    partyData: Partial<CreatePartyRequest> | FormData
  ): Promise<ApiResponse<Party>> => {
    const formData = partyData instanceof FormData ? partyData : buildPartyFormData(partyData)
    // Add _method field for Laravel method spoofing
    formData.append('_method', 'PUT')
    const { data } = await api.post<ApiResponse<Party>>(
      API_ENDPOINTS.PARTIES.UPDATE(id),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return data
  },

  /**
   * Delete party
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINTS.PARTIES.DELETE(id))
  },

  /**
   * Get customers only (Retailer, Dealer, Wholesaler)
   */
  getCustomers: async (): Promise<Party[]> => {
    const { data } = await api.get<ApiResponse<Party[]>>(API_ENDPOINTS.PARTIES.LIST)
    return data.data.filter((p) => p.type !== 'Supplier')
  },

  /**
   * Get suppliers only
   */
  getSuppliers: async (): Promise<Party[]> => {
    const { data } = await api.get<ApiResponse<Party[]>>(API_ENDPOINTS.PARTIES.LIST)
    return data.data.filter((p) => p.type === 'Supplier')
  },

  /**
   * Search parties by query parameter
   */
  search: async (query: string): Promise<Party[]> => {
    const { data } = await api.get<ApiResponse<Party[]>>(API_ENDPOINTS.PARTIES.SEARCH, {
      params: { search: query },
    })
    return data.data
  },
}

// Helper to build FormData for party
function buildPartyFormData(partyData: Partial<CreatePartyRequest>): FormData {
  const formData = new FormData()

  Object.entries(partyData).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (value instanceof File) {
      formData.append(key, value)
    } else {
      formData.append(key, String(value))
    }
  })

  return formData
}

export default partiesService
