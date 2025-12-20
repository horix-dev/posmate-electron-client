import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { PrintLabel, CreatePrintLabelRequest, Product } from '@/types/api.types'

// Types aligned with server prompt
export type BarcodeType = string
export type LabelFormat = string

export interface GenerateLabelsRequest {
  barcode_setting: '1' | '2' | '3'
  barcode_type?: BarcodeType
  stock_ids: number[]
  qty: number[]
  preview_date: (string | null)[]
  vat_type?: 'inclusive' | 'exclusive'

  product_name?: boolean
  product_name_size?: number
  business_name?: boolean
  business_name_size?: number
  product_price?: boolean
  product_price_size?: number
  product_code?: boolean
  product_code_size?: number
  pack_date?: boolean
  pack_date_size?: number
}

export interface LabelPayload {
  barcode_svg: string
  packing_date: string | null
  product_name: string
  business_name: string
  product_code: string
  product_price: number
  product_stock: number

  show_product_name: boolean
  product_name_size: number
  show_business_name: boolean
  business_name_size: number
  show_product_price: boolean
  product_price_size: number
  show_product_code: boolean
  product_code_size: number
  show_pack_date: boolean
  pack_date_size: number
}

export interface GenerateLabelsResponse {
  message: string
  data: LabelPayload[]
  printer: '1' | '2' | '3'
  _server_timestamp: string
}

export const printLabelsService = {
  /**
   * Get config: barcode types and label formats
   */
  getConfig: async (): Promise<
    ApiResponse<{ barcode_types: string[]; label_formats: string[]; printer_settings: number[] }>
  > => {
    const { data } = await api.get<
      ApiResponse<{ barcode_types: string[]; label_formats: string[]; printer_settings: number[] }>
    >(API_ENDPOINTS.PRINT_LABELS.CONFIG)
    return data
  },

  /**
   * Search products with stocks and stocks_sum
   */
  searchProducts: async (params: { search: string }): Promise<ApiResponse<Product[]>> => {
    const { data } = await api.get<ApiResponse<Product[]>>(API_ENDPOINTS.PRINT_LABELS.PRODUCTS, {
      params,
    })
    return data
  },

  /**
   * Get all print labels with pagination
   */
  getAll: async (params?: {
    page?: number
    per_page?: number
  }): Promise<PaginatedApiResponse<PrintLabel[]>> => {
    const { data } = await api.get<PaginatedApiResponse<PrintLabel[]>>(
      API_ENDPOINTS.PRINT_LABELS.LIST,
      { params }
    )
    return data
  },

  /**
   * Filter/search print labels
   */
  filter: async (params: {
    search?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedApiResponse<PrintLabel[]>> => {
    const { data } = await api.get<PaginatedApiResponse<PrintLabel[]>>(
      `${API_ENDPOINTS.PRINT_LABELS.LIST}/filter`,
      { params }
    )
    return data
  },

  /**
   * Get single print label
   */
  getById: async (id: number): Promise<ApiResponse<PrintLabel>> => {
    const { data } = await api.get<ApiResponse<PrintLabel>>(API_ENDPOINTS.PRINT_LABELS.GET(id))
    return data
  },

  /**
   * Create print label
   */
  create: async (labelData: CreatePrintLabelRequest): Promise<ApiResponse<PrintLabel>> => {
    const { data } = await api.post<ApiResponse<PrintLabel>>(
      API_ENDPOINTS.PRINT_LABELS.CREATE,
      labelData
    )
    return data
  },

  /**
   * Update print label
   */
  update: async (
    id: number,
    labelData: Partial<CreatePrintLabelRequest>
  ): Promise<ApiResponse<PrintLabel>> => {
    const { data } = await api.put<ApiResponse<PrintLabel>>(
      API_ENDPOINTS.PRINT_LABELS.UPDATE(id),
      labelData
    )
    return data
  },

  /**
   * Delete print label
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.PRINT_LABELS.DELETE(id))
    return data
  },

  /**
   * Toggle print label status
   * Backend requires name field in payload
   */
  updateStatus: async (
    id: number,
    status: boolean,
    name: string
  ): Promise<ApiResponse<PrintLabel>> => {
    const payload = { name, status: status ? 1 : 0 }
    const { data } = await api.patch<ApiResponse<PrintLabel>>(
      API_ENDPOINTS.PRINT_LABELS.TOGGLE_STATUS(id),
      payload
    )
    return data
  },

  /**
   * Delete multiple print labels
   */
  deleteMultiple: async (ids: number[]): Promise<ApiResponse<null>> => {
    const { data } = await api.post<ApiResponse<null>>(API_ENDPOINTS.PRINT_LABELS.BULK_DELETE, {
      ids,
    })
    return data
  },

  /**
   * Generate printable labels
   */
  generate: async (
    payload: GenerateLabelsRequest
  ): Promise<ApiResponse<GenerateLabelsResponse>> => {
    const { data } = await api.post<ApiResponse<GenerateLabelsResponse>>(
      API_ENDPOINTS.PRINT_LABELS.GENERATE,
      payload
    )
    return data
  },
}

export default printLabelsService
