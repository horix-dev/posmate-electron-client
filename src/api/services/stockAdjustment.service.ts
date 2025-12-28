/**
 * Stock Adjustment API Service
 * Handles backend communication for stock adjustments
 */

import api, { ApiResponse } from '../axios'
import type {
  StockAdjustmentApiRequest,
  StockAdjustmentApiResponse,
  Batch,
  BatchMovement,
} from '@/types/stockAdjustment.types'

type BatchesResponse = {
  success: boolean
  batches: Batch[]
  _server_timestamp?: string
}

type BatchResponse = {
  success: boolean
  batch?: Batch
  data?: Batch
  _server_timestamp?: string
}

export const stockAdjustmentService = {
  /**
   * Create a new stock adjustment
   */
  create: async (
    adjustment: StockAdjustmentApiRequest
  ): Promise<ApiResponse<StockAdjustmentApiResponse['data']>> => {
    const { data } = await api.post<ApiResponse<StockAdjustmentApiResponse['data']>>(
      '/stocks',
      adjustment
    )
    return data
  },

  /**
   * Update an existing stock adjustment
   */
  update: async (
    id: number,
    adjustment: Partial<StockAdjustmentApiRequest>
  ): Promise<ApiResponse<StockAdjustmentApiResponse['data']>> => {
    const { data } = await api.put<ApiResponse<StockAdjustmentApiResponse['data']>>(
      `/stocks/${id}`,
      adjustment
    )
    return data
  },

  /**
   * Delete a stock adjustment
   */
  delete: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await api.delete<ApiResponse<{ message: string }>>(`/stocks/${id}`)
    return data
  },

  // ============================================
  // Batch Management (for variant products)
  // ============================================

  /**
   * Get all batches for a product
   */
  getProductBatches: async (productId: number): Promise<BatchesResponse> => {
    const { data } = await api.get<BatchesResponse>(`/products/${productId}/batches`)
    return data
  },

  /**
   * Get batches for a specific variant
   */
  getVariantBatches: async (variantId: number): Promise<BatchesResponse> => {
    const { data } = await api.get<BatchesResponse>(`/variants/${variantId}/batches`)
    return data
  },

  /**
   * Select batches automatically based on FIFO/LIFO/FEFO strategy
   */
  selectBatches: async (
    productId: number,
    quantity: number
  ): Promise<ApiResponse<{ batches: Batch[]; total_quantity: number }>> => {
    const { data } = await api.post<ApiResponse<{ batches: Batch[]; total_quantity: number }>>(
      `/products/${productId}/select-batches`,
      { quantity }
    )
    return data
  },

  /**
   * Get batch by ID
   */
  getBatchById: async (batchId: number): Promise<BatchResponse> => {
    const { data } = await api.get<BatchResponse>(`/batches/${batchId}`)
    return data
  },

  /**
   * Get batch movements (history)
   */
  getBatchMovements: async (batchId: number): Promise<ApiResponse<BatchMovement[]>> => {
    const { data } = await api.get<ApiResponse<BatchMovement[]>>(`/batches/${batchId}/movements`)
    return data
  },

  /**
   * Get expiring batches
   */
  getExpiringBatches: async (days: number = 30): Promise<ApiResponse<Batch[]>> => {
    const { data } = await api.get<ApiResponse<Batch[]>>(`/batches/expiring`, {
      params: { days },
    })
    return data
  },

  /**
   * Get expired batches
   */
  getExpiredBatches: async (): Promise<ApiResponse<Batch[]>> => {
    const { data } = await api.get<ApiResponse<Batch[]>>(`/batches/expired`)
    return data
  },
}
