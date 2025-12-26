/**
 * Stock Adjustment Repository
 * Handles all SQLite operations for stock adjustments via Electron IPC
 */

import type {
  StockAdjustment,
  StockAdjustmentFilters,
  StockAdjustmentSummary,
} from '@/types/stockAdjustment.types'

export class StockAdjustmentRepository {
  private get api() {
    if (!window.electronAPI?.sqlite?.stockAdjustment) {
      throw new Error('SQLite API not available. Are you running in Electron?')
    }
    return window.electronAPI.sqlite.stockAdjustment
  }

  /**
   * Create a new stock adjustment
   */
  async create(adjustment: Omit<StockAdjustment, 'id'>): Promise<number> {
    return await this.api.create(adjustment)
  }

  /**
   * Get stock adjustment by ID
   */
  async getById(id: number): Promise<StockAdjustment | undefined> {
    return await this.api.getById(id)
  }

  /**
   * Get all stock adjustments with optional filters
   */
  async getAll(filters?: StockAdjustmentFilters): Promise<StockAdjustment[]> {
    return await this.api.getAll(filters)
  }

  /**
   * Get all stock adjustments for a specific product
   */
  async getByProductId(productId: number): Promise<StockAdjustment[]> {
    return await this.api.getByProductId(productId)
  }

  /**
   * Get all pending (unsynced) stock adjustments
   */
  async getPending(): Promise<StockAdjustment[]> {
    return await this.api.getPending()
  }

  /**
   * Mark a stock adjustment as synced with the server
   */
  async markAsSynced(id: number, serverId: number): Promise<void> {
    await this.api.markAsSynced(id, serverId)
  }

  /**
   * Mark a stock adjustment as failed to sync
   */
  async markAsError(id: number, error: string): Promise<void> {
    await this.api.markAsError(id, error)
  }

  /**
   * Update a stock adjustment
   */
  async update(id: number, adjustment: Partial<StockAdjustment>): Promise<void> {
    await this.api.update(id, adjustment)
  }

  /**
   * Delete a stock adjustment
   */
  async delete(id: number): Promise<void> {
    await this.api.delete(id)
  }

  /**
   * Count stock adjustments with optional filter
   */
  async count(filters?: { syncStatus?: 'pending' | 'synced' | 'error' }): Promise<number> {
    return await this.api.count(filters)
  }

  /**
   * Clear all stock adjustments (use with caution)
   */
  async clear(): Promise<void> {
    await this.api.clear()
  }

  /**
   * Get summary statistics for stock adjustments
   */
  async getSummary(filters?: {
    startDate?: string
    endDate?: string
    productId?: number
  }): Promise<StockAdjustmentSummary> {
    return await this.api.getSummary(filters)
  }

  /**
   * Create stock adjustment and update product stock locally
   */
  async createWithStockUpdate(
    adjustment: Omit<StockAdjustment, 'id'>,
    currentStock: number
  ): Promise<{ adjustmentId: number; newStock: number }> {
    // Calculate new stock
    const newStock =
      adjustment.type === 'in'
        ? currentStock + adjustment.quantity
        : currentStock - adjustment.quantity

    // Validation: prevent negative stock
    if (newStock < 0) {
      throw new Error(
        `Cannot reduce stock below 0. Current: ${currentStock}, Requested: ${adjustment.quantity}`
      )
    }

    // Store old and new quantities in adjustment
    const adjustmentWithQuantities: Omit<StockAdjustment, 'id'> = {
      ...adjustment,
      oldQuantity: currentStock,
      newQuantity: newStock,
    }

    // Create adjustment
    const adjustmentId = await this.create(adjustmentWithQuantities)

    // Note: Product stock update should be handled by the calling code
    // (e.g., in the hook or component) since we don't have product repository here

    return { adjustmentId, newStock }
  }
}

// Singleton instance
export const stockAdjustmentRepository = new StockAdjustmentRepository()
