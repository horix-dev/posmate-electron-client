/**
 * Sync Service
 * Processes sync queue items with retry logic, exponential backoff, and error handling
 */

import { syncQueueRepository, saleRepository } from '../repositories'
import { stockAdjustmentRepository } from '../repositories/stockAdjustment.repository'
import type { SyncQueueItem } from '../schema'
import api from '@/api/axios'

// ============================================
// Types
// ============================================

export interface SyncProgress {
  total: number
  completed: number
  failed: number
  inProgress: boolean
  currentItem?: SyncQueueItem
}

export interface SyncResult {
  success: boolean
  processed: number
  failed: number
  errors: Array<{ itemId: number; error: string }>
}

// ============================================
// Sync Service Class
// ============================================

export class SyncService {
  private isProcessing = false
  private abortController: AbortController | null = null
  private progressCallbacks: Array<(progress: SyncProgress) => void> = []

  /**
   * Start processing the sync queue
   */
  async start(): Promise<SyncResult> {
    if (this.isProcessing) {
      console.log('Sync already in progress')
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [{ itemId: 0, error: 'Sync already in progress' }],
      }
    }

    this.isProcessing = true
    this.abortController = new AbortController()

    const result: SyncResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    }

    try {
      // Get all pending items
      const pendingItems = await syncQueueRepository.getPending()
      const total = pendingItems.length

      this.notifyProgress({
        total,
        completed: 0,
        failed: 0,
        inProgress: true,
      })

      // Process items one by one
      for (const item of pendingItems) {
        if (this.abortController.signal.aborted) {
          break
        }

        try {
          await this.processItem(item)
          result.processed++

          this.notifyProgress({
            total,
            completed: result.processed,
            failed: result.failed,
            inProgress: true,
            currentItem: item,
          })
        } catch (error) {
          result.failed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push({ itemId: item.id!, error: errorMessage })

          this.notifyProgress({
            total,
            completed: result.processed,
            failed: result.failed,
            inProgress: true,
            currentItem: item,
          })
        }

        // Small delay between items to avoid overwhelming the server
        await this.delay(100)
      }

      // Clean up completed items
      await syncQueueRepository.clearCompleted()

      this.notifyProgress({
        total,
        completed: result.processed,
        failed: result.failed,
        inProgress: false,
      })
    } catch (error) {
      console.error('Sync service error:', error)
      result.success = false
      result.errors.push({
        itemId: 0,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      })
    } finally {
      this.isProcessing = false
      this.abortController = null
    }

    return result
  }

  /**
   * Stop the sync process
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  /**
   * Process a single sync queue item
   */
  private async processItem(item: SyncQueueItem): Promise<void> {
    if (!item.id) throw new Error('Item has no ID')

    // Mark as processing
    await syncQueueRepository.markAsProcessing(item.id)

    try {
      // Wait for exponential backoff if there were previous attempts
      if (item.attempts > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, item.attempts), 30000)
        await this.delay(backoffMs)
      }

      // Make API call based on item configuration
      const response = await this.makeApiCall(item)

      // Handle response based on entity type
      await this.handleSuccess(item, response)

      // Mark as completed
      await syncQueueRepository.markAsCompleted(item.id)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await syncQueueRepository.markAsFailed(item.id, errorMessage)
      throw error
    }
  }

  /**
   * Make API call for sync item
   */
  private async makeApiCall(item: SyncQueueItem): Promise<unknown> {
    const { endpoint, method, data } = item

    switch (method) {
      case 'POST':
        return (await api.post(endpoint, data)).data
      case 'PUT':
        return (await api.put(endpoint, data)).data
      case 'DELETE':
        return (await api.delete(endpoint)).data
      default:
        throw new Error(`Unsupported HTTP method: ${method}`)
    }
  }

  /**
   * Handle successful sync
   */
  private async handleSuccess(item: SyncQueueItem, response: unknown): Promise<void> {
    // Handle entity-specific post-sync logic
    switch (item.entity) {
      case 'sale':
        await this.handleSaleSync(item, response)
        break
      case 'stock':
        await this.handleStockAdjustmentSync(item, response)
        break
      // Add other entity types as needed
      default:
        // Generic handling
        break
    }
  }

  /**
   * Handle sale-specific sync success
   */
  private async handleSaleSync(item: SyncQueueItem, response: unknown): Promise<void> {
    // Extract server ID from response
    const serverSale = (response as { data?: { id?: number } })?.data
    const serverId = serverSale?.id

    // Update local sale record
    if (typeof item.entityId === 'number') {
      await saleRepository.markAsSynced(item.entityId, serverId)
    }
  }

  /**
   * Handle stock adjustment-specific sync success
   */
  private async handleStockAdjustmentSync(item: SyncQueueItem, response: unknown): Promise<void> {
    const data = (response as { data?: any })?.data
    const serverId: number | undefined =
      typeof data?.id === 'number'
        ? data.id
        : typeof data?.stock_record?.id === 'number'
          ? data.stock_record.id
          : undefined

    // Update local stock adjustment record
    if (typeof item.entityId === 'number' && typeof serverId === 'number') {
      await stockAdjustmentRepository.markAsSynced(item.entityId, serverId)
    }
  }

  /**
   * Subscribe to sync progress updates
   */
  onProgress(callback: (progress: SyncProgress) => void): () => void {
    this.progressCallbacks.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.progressCallbacks.indexOf(callback)
      if (index > -1) {
        this.progressCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Notify progress to all subscribers
   */
  private notifyProgress(progress: SyncProgress): void {
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress)
      } catch (error) {
        console.error('Error in progress callback:', error)
      }
    })
  }

  /**
   * Utility: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Check if sync is currently processing
   */
  isActive(): boolean {
    return this.isProcessing
  }

  /**
   * Retry all failed items
   */
  async retryFailed(): Promise<void> {
    await syncQueueRepository.retryAll()
  }

  /**
   * Get sync statistics
   */
  async getStats() {
    const [pending, failed, completed] = await Promise.all([
      syncQueueRepository.countByStatus('pending'),
      syncQueueRepository.countByStatus('failed'),
      syncQueueRepository.countByStatus('completed'),
    ])

    return { pending, failed, completed }
  }
}

// Export singleton instance
export const syncService = new SyncService()
