/**
 * Enhanced Sync Service
 * 
 * Processes sync queue using backend batch sync API.
 * Features:
 * - Batch processing (multiple operations in one request)
 * - Idempotency key support (prevents duplicates)
 * - Version conflict handling
 * - Stock discrepancy warnings
 * - Incremental sync for data download
 */

import { syncQueueRepository, saleRepository, productRepository, printedReceiptRepository } from '../repositories'
import { db, type SyncQueueItem, type LocalProduct, type LocalCategory, type LocalParty } from '../schema'
import { syncApiService, type BatchOperation, type BatchOperationResult, type EntityChanges } from '@/api/services/sync.service'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

export interface EnhancedSyncProgress {
  phase: 'preparing' | 'uploading' | 'downloading' | 'processing' | 'complete' | 'error'
  total: number
  completed: number
  failed: number
  conflicts: number
  currentOperation?: string
  message?: string
}

export interface EnhancedSyncResult {
  success: boolean
  upload: {
    total: number
    success: number
    failed: number
    conflicts: number
    errors: Array<{ idempotencyKey: string; error: string; errorCode?: string }>
    warnings: Array<{ idempotencyKey: string; warning: string }>
  }
  download: {
    products: { created: number; updated: number; deleted: number }
    categories: { created: number; updated: number; deleted: number }
    parties: { created: number; updated: number; deleted: number }
  }
  serverTimestamp?: string
}

export interface ConflictItem {
  queueItemId: number
  idempotencyKey: string
  entity: string
  localData: unknown
  serverData: unknown
}

// ============================================
// Enhanced Sync Service
// ============================================

export class EnhancedSyncService {
  private isProcessing = false
  private abortController: AbortController | null = null
  private progressCallbacks: Array<(progress: EnhancedSyncProgress) => void> = []
  private conflicts: ConflictItem[] = []

  // Batch size for upload operations
  private readonly BATCH_SIZE = 50

  /**
   * Perform full sync (upload + download)
   */
  async fullSync(): Promise<EnhancedSyncResult> {
    if (this.isProcessing) {
      throw new Error('Sync already in progress')
    }

    this.isProcessing = true
    this.abortController = new AbortController()
    this.conflicts = []

    const result: EnhancedSyncResult = {
      success: true,
      upload: { total: 0, success: 0, failed: 0, conflicts: 0, errors: [], warnings: [] },
      download: {
        products: { created: 0, updated: 0, deleted: 0 },
        categories: { created: 0, updated: 0, deleted: 0 },
        parties: { created: 0, updated: 0, deleted: 0 },
      },
    }

    try {
      // Phase 1: Upload pending operations
      this.notifyProgress({ phase: 'uploading', total: 0, completed: 0, failed: 0, conflicts: 0, message: 'Uploading offline changes...' })
      await this.uploadPendingOperations(result)

      if (this.abortController?.signal.aborted) {
        throw new Error('Sync aborted')
      }

      // Phase 2: Download server changes
      this.notifyProgress({ phase: 'downloading', total: 0, completed: 0, failed: 0, conflicts: 0, message: 'Downloading updates...' })
      await this.downloadChanges(result)

      // Complete
      this.notifyProgress({ phase: 'complete', total: result.upload.total, completed: result.upload.success, failed: result.upload.failed, conflicts: result.upload.conflicts })

    } catch (error) {
      result.success = false
      this.notifyProgress({
        phase: 'error',
        total: result.upload.total,
        completed: result.upload.success,
        failed: result.upload.failed,
        conflicts: result.upload.conflicts,
        message: error instanceof Error ? error.message : 'Sync failed',
      })
    } finally {
      this.isProcessing = false
      this.abortController = null
    }

    return result
  }

  /**
   * Upload pending operations using batch sync
   */
  private async uploadPendingOperations(result: EnhancedSyncResult): Promise<void> {
    const pendingItems = await syncQueueRepository.getPending()
    result.upload.total = pendingItems.length

    if (pendingItems.length === 0) {
      console.log('[EnhancedSync] No pending items to upload')
      return
    }

    console.log(`[EnhancedSync] Uploading ${pendingItems.length} pending items...`)

    // Process in batches
    for (let i = 0; i < pendingItems.length; i += this.BATCH_SIZE) {
      if (this.abortController?.signal.aborted) break

      const batch = pendingItems.slice(i, i + this.BATCH_SIZE)
      await this.processBatch(batch, result)

      this.notifyProgress({
        phase: 'uploading',
        total: result.upload.total,
        completed: result.upload.success,
        failed: result.upload.failed,
        conflicts: result.upload.conflicts,
        message: `Uploaded ${Math.min(i + this.BATCH_SIZE, pendingItems.length)} of ${pendingItems.length} items`,
      })
    }

    // Clean up completed items
    await syncQueueRepository.clearCompleted()
  }

  /**
   * Process a batch of sync queue items
   */
  private async processBatch(items: SyncQueueItem[], result: EnhancedSyncResult): Promise<void> {
    // Convert queue items to batch operations
    const operations: BatchOperation[] = items.map(item => ({
      idempotency_key: item.idempotencyKey,
      entity: this.mapEntityType(item.entity),
      action: item.operation.toLowerCase() as 'create' | 'update' | 'delete',
      data: item.data as Record<string, unknown>,
      offline_timestamp: item.offlineTimestamp || item.createdAt,
    }))

    try {
      const response = await syncApiService.batchSync(operations)

      // Process results
      for (const opResult of response.results) {
        const item = items.find(i => i.idempotencyKey === opResult.idempotency_key)
        if (!item || !item.id) continue

        switch (opResult.status) {
          case 'created':
          case 'updated':
          case 'deleted':
          case 'skipped':
            result.upload.success++
            await syncQueueRepository.markAsCompleted(item.id)
            
            // Update local entity with server ID
            if (opResult.server_id) {
              await this.updateLocalEntityWithServerId(item, opResult)
            }
            break

          case 'conflict':
            result.upload.conflicts++
            await this.handleConflict(item, opResult)
            break

          case 'error':
            result.upload.failed++
            result.upload.errors.push({
              idempotencyKey: opResult.idempotency_key,
              error: opResult.error || 'Unknown error',
              errorCode: opResult.error_code,
            })
            await syncQueueRepository.markAsFailed(item.id, opResult.error || 'Unknown error')
            break
        }

        // Track warnings
        if (opResult.warnings) {
          for (const warning of opResult.warnings) {
            result.upload.warnings.push({
              idempotencyKey: opResult.idempotency_key,
              warning: `Stock discrepancy for product ${warning.product_id}: expected ${warning.expected}, available ${warning.available}`,
            })
          }
        }
      }

      result.serverTimestamp = response.server_timestamp

    } catch (error) {
      // If batch fails completely, mark all items as failed
      console.error('[EnhancedSync] Batch sync failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Batch sync failed'
      
      for (const item of items) {
        if (item.id) {
          result.upload.failed++
          result.upload.errors.push({
            idempotencyKey: item.idempotencyKey,
            error: errorMessage,
          })
          await syncQueueRepository.markAsFailed(item.id, errorMessage)
        }
      }
    }
  }

  /**
   * Map local entity type to backend entity type
   */
  private mapEntityType(entity: SyncQueueItem['entity']): 'sale' | 'party' | 'due_collection' {
    switch (entity) {
      case 'sale':
        return 'sale'
      case 'party':
      case 'customer':
        return 'party'
      case 'due_collection':
        return 'due_collection'
      default:
        return 'sale' // Default fallback
    }
  }

  /**
   * Update local entity with server-assigned ID
   */
  private async updateLocalEntityWithServerId(item: SyncQueueItem, result: BatchOperationResult): Promise<void> {
    if (!result.server_id) return

    switch (item.entity) {
      case 'sale':
        if (typeof item.entityId === 'number') {
          // Get current sale to check if invoice number changed
          const currentSale = await db.sales.get(item.entityId)
          const oldInvoiceNumber = currentSale?.invoiceNumber
          
          await saleRepository.markAsSynced(item.entityId, result.server_id)
          
          // Also update invoice number if provided
          if (result.invoice_number) {
            await db.sales.update(item.entityId, { invoiceNumber: result.invoice_number })
            
            // Check if invoice number changed and notify user
            if (oldInvoiceNumber && oldInvoiceNumber !== result.invoice_number) {
              await this.handleInvoiceNumberChange(
                item.entityId,
                oldInvoiceNumber,
                result.invoice_number
              )
            }
          }
        }
        break

      case 'party':
      case 'customer':
        // Update local party with server ID
        if (typeof item.entityId === 'number') {
          await db.parties.update(item.entityId, { 
            id: result.server_id,
            lastSyncedAt: new Date().toISOString(),
          })
        }
        break
    }
  }

  /**
   * Handle invoice number change after sync
   * Checks if receipt was printed offline and notifies user
   */
  private async handleInvoiceNumberChange(
    saleId: number,
    oldInvoiceNumber: string,
    newInvoiceNumber: string
  ): Promise<void> {
    try {
      console.log(`[EnhancedSync] Invoice number changed for sale ${saleId}: ${oldInvoiceNumber} → ${newInvoiceNumber}`)
      
      // Check if this receipt was printed offline
      const printedReceipt = await printedReceiptRepository.findBySaleId(saleId)
      
      if (printedReceipt) {
        // Update the printed receipt with final invoice number
        await printedReceiptRepository.updateWithFinalInvoice(printedReceipt.id!, newInvoiceNumber)
        
        // Show notification to user with reprint option
        toast.info('Invoice number updated', {
          description: `Receipt ${oldInvoiceNumber} is now ${newInvoiceNumber}. Click to reprint.`,
          duration: 10000, // Show for 10 seconds
          action: {
            label: 'Reprint',
            onClick: () => {
              // Trigger reprint - this will be handled by the UI component
              window.dispatchEvent(new CustomEvent('reprint-receipt', {
                detail: { saleId, printedReceiptId: printedReceipt.id }
              }))
            }
          }
        })
        
        console.log(`[EnhancedSync] Printed receipt updated for sale ${saleId}`)
      }
    } catch (error) {
      console.error('[EnhancedSync] Error handling invoice number change:', error)
    }
  }

  /**
   * Handle version conflict
   */
  private async handleConflict(item: SyncQueueItem, result: BatchOperationResult): Promise<void> {
    if (!item.id) return

    // Store conflict for resolution
    this.conflicts.push({
      queueItemId: item.id,
      idempotencyKey: item.idempotencyKey,
      entity: item.entity,
      localData: item.data,
      serverData: result.conflict_data,
    })

    // Mark queue item as conflict
    await db.syncQueue.update(item.id, {
      status: 'conflict',
      conflictData: result.conflict_data,
      error: 'Version conflict - server has newer data',
    })
  }

  /**
   * Download changes from server
   */
  private async downloadChanges(result: EnhancedSyncResult): Promise<void> {
    try {
      // Check if we need full sync or incremental
      if (syncApiService.needsFullSync()) {
        console.log('[EnhancedSync] Performing full sync download...')
        await this.downloadFullSync(result)
      } else {
        console.log('[EnhancedSync] Performing incremental sync download...')
        await this.downloadIncrementalSync(result)
      }
    } catch (error) {
      console.error('[EnhancedSync] Download failed:', error)
      // Don't throw - upload may have succeeded
    }
  }

  /**
   * Download full sync data
   */
  private async downloadFullSync(result: EnhancedSyncResult): Promise<void> {
    const response = await syncApiService.fullSync(['products', 'categories', 'parties'])

    // Process products
    if (response.data.products) {
      const products: LocalProduct[] = response.data.products.map(p => ({
        ...p,
        stock: p.stocks?.[0] || { id: p.id, product_id: p.id, productStock: 0, productPurchasePrice: 0, productSalePrice: 0 },
        lastSyncedAt: new Date().toISOString(),
        version: (p as any).version || 1,
      })) as LocalProduct[]

      await productRepository.bulkSync(products)
      result.download.products.created = products.length
    }

    // Process categories
    if (response.data.categories) {
      const categories: LocalCategory[] = response.data.categories.map(c => ({
        ...c,
        lastSyncedAt: new Date().toISOString(),
        version: (c as any).version || 1,
      })) as LocalCategory[]

      await db.categories.bulkPut(categories)
      result.download.categories.created = categories.length
    }

    // Process parties
    if (response.data.parties) {
      const parties: LocalParty[] = response.data.parties.map(p => ({
        ...p,
        lastSyncedAt: new Date().toISOString(),
        version: (p as any).version || 1,
      })) as LocalParty[]

      await db.parties.bulkPut(parties)
      result.download.parties.created = parties.length
    }

    result.serverTimestamp = response.server_timestamp
  }

  /**
   * Download incremental sync data
   */
  private async downloadIncrementalSync(result: EnhancedSyncResult): Promise<void> {
    const response = await syncApiService.getChanges(undefined, ['products', 'categories', 'parties'])

    // Process product changes
    if (response.data.products) {
      await this.applyEntityChanges('products', response.data.products, result.download.products)
    }

    // Process category changes
    if (response.data.categories) {
      await this.applyEntityChanges('categories', response.data.categories, result.download.categories)
    }

    // Process party changes
    if (response.data.parties) {
      await this.applyEntityChanges('parties', response.data.parties, result.download.parties)
    }

    result.serverTimestamp = response.server_timestamp
  }

  /**
   * Apply entity changes from incremental sync
   */
  private async applyEntityChanges<T>(
    entityType: 'products' | 'categories' | 'parties',
    changes: EntityChanges<T>,
    stats: { created: number; updated: number; deleted: number }
  ): Promise<void> {
    const timestamp = new Date().toISOString()

    // Handle created items
    for (const item of changes.created) {
      const localItem = {
        ...item,
        lastSyncedAt: timestamp,
        version: (item as any).version || 1,
      }

      switch (entityType) {
        case 'products':
          await productRepository.create(localItem as any)
          break
        case 'categories':
          await db.categories.add(localItem as any)
          break
        case 'parties':
          await db.parties.add(localItem as any)
          break
      }
      stats.created++
    }

    // Handle updated items
    for (const item of changes.updated) {
      const localItem = {
        ...item,
        lastSyncedAt: timestamp,
        version: (item as any).version || 1,
      }
      const id = (item as any).id

      switch (entityType) {
        case 'products':
          await productRepository.update(id, localItem as any)
          break
        case 'categories':
          await db.categories.update(id, localItem as any)
          break
        case 'parties':
          await db.parties.update(id, localItem as any)
          break
      }
      stats.updated++
    }

    // Handle deleted items
    for (const id of changes.deleted) {
      switch (entityType) {
        case 'products':
          await productRepository.delete(id)
          break
        case 'categories':
          await db.categories.delete(id)
          break
        case 'parties':
          await db.parties.delete(id)
          break
      }
      stats.deleted++
    }
  }

  /**
   * Get pending conflicts for manual resolution
   */
  getConflicts(): ConflictItem[] {
    return [...this.conflicts]
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    queueItemId: number,
    resolution: 'client_wins' | 'server_wins' | 'discard'
  ): Promise<void> {
    const item = await db.syncQueue.get(queueItemId)
    if (!item) return

    switch (resolution) {
      case 'client_wins':
        // Retry with force update flag
        await db.syncQueue.update(queueItemId, {
          status: 'pending',
          attempts: 0,
          data: { ...item.data as object, _force_update: true },
        })
        break

      case 'server_wins':
      case 'discard':
        // Mark as completed (server version wins)
        await syncQueueRepository.markAsCompleted(queueItemId)
        
        // If server_wins, update local entity with server data
        if (resolution === 'server_wins' && item.conflictData) {
          await this.updateLocalWithServerData(item)
        }
        break
    }

    // Remove from conflicts list
    this.conflicts = this.conflicts.filter(c => c.queueItemId !== queueItemId)
  }

  /**
   * Update local entity with server data (for server_wins resolution)
   */
  private async updateLocalWithServerData(item: SyncQueueItem): Promise<void> {
    if (!item.conflictData) return
    const serverData = item.conflictData as Record<string, unknown>

    switch (item.entity) {
      case 'party':
      case 'customer':
        if (typeof item.entityId === 'number') {
          await db.parties.update(item.entityId, {
            ...serverData,
            lastSyncedAt: new Date().toISOString(),
          })
        }
        break
    }
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (progress: EnhancedSyncProgress) => void): () => void {
    this.progressCallbacks.push(callback)
    return () => {
      const index = this.progressCallbacks.indexOf(callback)
      if (index > -1) this.progressCallbacks.splice(index, 1)
    }
  }

  /**
   * Notify progress
   */
  private notifyProgress(progress: EnhancedSyncProgress): void {
    this.progressCallbacks.forEach(cb => {
      try {
        cb(progress)
      } catch (e) {
        console.error('[EnhancedSync] Progress callback error:', e)
      }
    })
  }

  /**
   * Stop sync
   */
  stop(): void {
    this.abortController?.abort()
  }

  /**
   * Check if sync is active
   */
  isActive(): boolean {
    return this.isProcessing
  }
}

// Export singleton
export const enhancedSyncService = new EnhancedSyncService()
