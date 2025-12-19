import api, { ApiResponse } from '../axios'

export interface BarcodeSettings {
  barcode_types: Array<{ value: string; label: string }>
  paper_settings: Array<{
    value: string
    label: string
    name: string
    dimensions?: string
    css?: string
    label_width_mm?: number
    label_height_mm?: number
    page_width_mm?: number
    page_height_mm?: number
    gap_mm?: number
    gap_horizontal_mm?: number
    gap_vertical_mm?: number
    margin_top_mm?: number
    margin_left_mm?: number
    columns?: number
    rows?: number | null
  }>
  font_sizes?: number[]
  vat_options: Array<{ value: string; label: string }>
}

export interface SearchProductResult {
  id: number
  productName: string
  productCode: string
  productPicture?: string | null
  product_type?: string
  unit?: { id: number; unitName: string }
  category?: { id: number; categoryName: string }
  brand?: { id: number; brandName: string }
  productSalePrice: number | null
  productDealerPrice: number | null
  productWholeSalePrice?: number | null
  productStock: number
}

export interface ProductBarcodeDetail {
  product: {
    id: number
    productName: string
    productCode: string
    price?: number
    dealer_price?: number
  }
  stocks?: Array<{
    id: number
    product_id: number
    batch_no?: string
    batch_id?: number
    available_quantity?: number
    cost_price?: number
  }>
  total_available?: number
}

export interface BarcodeBatchItem {
  product_id: number
  quantity: number
  batch_id?: number | null
  packing_date?: string | null
}

export interface BarcodePreviewConfig {
  items: BarcodeBatchItem[]
  barcode_type: string
  barcode_setting: string
  show_business_name: boolean
  business_name: string
  business_name_size: number
  show_product_name: boolean
  product_name_size: number
  show_product_price: boolean
  product_price_size: number
  show_product_code: boolean
  product_code_size: number
  show_pack_date: boolean
  pack_date_size: number
  vat_type: 'inclusive' | 'exclusive'
}

export interface BarcodeItem {
  id: string
  product_id: number
  product_name: string
  product_code: string
  product_price?: number
  barcode_svg: string
  packing_date?: string
  business_name?: string
}

export const barcodesService = {
  getSettings: async (): Promise<ApiResponse<BarcodeSettings>> => {
    const { data } = await api.get<ApiResponse<BarcodeSettings>>('/barcodes/settings')
    return data
  },

  /**
   * Search products by name or code (non-paginated, returns all matches)
   */
  searchProducts: async (params: { search?: string } = {}): Promise<ApiResponse<SearchProductResult[]>> => {
    const { data } = await api.get<ApiResponse<SearchProductResult[]>>('/barcodes/search-products', { params })
    return data
  },

  /**
   * Get all products with pagination
   */
  getProducts: async (params: { page?: number; per_page?: number } = {}): Promise<ApiResponse<{
    current_page: number
    data: SearchProductResult[]
    per_page: number
    total: number
    last_page: number
  }>> => {
    const { data } = await api.get<ApiResponse<{
      current_page: number
      data: SearchProductResult[]
      per_page: number
      total: number
      last_page: number
    }>>('/barcodes/products', { params })
    return data
  },

  getProductDetails: async (productId: number): Promise<ApiResponse<ProductBarcodeDetail>> => {
    const { data } = await api.get<ApiResponse<ProductBarcodeDetail>>(`/barcodes/product-details/${productId}`)
    return data
  },

  generatePreview: async (config: BarcodePreviewConfig): Promise<ApiResponse<BarcodeItem[]>> => {
    const { data } = await api.post<ApiResponse<BarcodeItem[]>>('/barcodes/preview', config)
    return data
  },

  generate: async (config: BarcodePreviewConfig): Promise<ApiResponse<BarcodeItem[]>> => {
    const { data } = await api.post<ApiResponse<BarcodeItem[]>>('/barcodes/generate', config)
    return data
  },
}

export default barcodesService
