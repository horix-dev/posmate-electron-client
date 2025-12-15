/**
 * Sync Queue Repository
 * Manages operations waiting to be synced to the server
 */

import { db } from '../schema'
import type { SyncQueueItem } from '../schema'
import { BaseRepository } from './base.repository'

export class SyncQueueRepository extends BaseRepository<
  SyncQueueItem,
  number
> {
  constructor() {
    super(db.syncQueue)
  }

  /**
   * Add item to sync queue
   */
  async enqueue(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
    const queueItem: SyncQueueItem = {
      ...item,
      attempts: 0,
      maxAttempts: item.maxAttempts || 5,
      createdAt: new Date().toISOString(),
      status: 'pending',
    } as SyncQueueItem
    return await this.create(queueItem)
  }

  /**
   * Get pending items (ordered by creation time)
   */
  async getPending(limit?: number): Promise<SyncQueueItem[]> {
    const query = this.table.where('status').equals('pending').sortBy('createdAt')
    
    if (limit) {
      return (await query).slice(0, limit)
    }
    
    return await query
  }

  /**
   * Get failed items
   */
  async getFailed(): Promise<SyncQueueItem[]> {
    return await this.table.where('status').equals('failed').toArray()
  }

  /**
   * Mark item as processing
   */
  async markAsProcessing(id: number): Promise<void> {
    await this.update(id, {
      status: 'processing',
      lastAttemptAt: new Date().toISOString(),
    } as Partial<SyncQueueItem>)
  }

  /**
   * Mark item as completed
   */
  async markAsCompleted(id: number): Promise<void> {
    await this.update(id, {
      status: 'completed',
    } as Partial<SyncQueueItem>)
  }

  /**
   * Mark item as failed
   */
  async markAsFailed(id: number, error: string): Promise<void> {
    const item = await this.getById(id)
    if (!item) return

    const attempts = (item.attempts || 0) + 1
    const status = attempts >= item.maxAttempts ? 'failed' : 'pending'

    await this.update(id, {
      status,
      attempts,
      error,
      lastAttemptAt: new Date().toISOString(),
    } as Partial<SyncQueueItem>)
  }

  /**
   * Retry failed item
   */
  async retry(id: number): Promise<void> {
    await this.update(id, {
      status: 'pending',
      error: undefined,
      lastAttemptAt: undefined,
    } as Partial<SyncQueueItem>)
  }

  /**
   * Retry all failed items
   */
  async retryAll(): Promise<void> {
    const failedItems = await this.getFailed()
    for (const item of failedItems) {
      if (item.id) {
        await this.retry(item.id)
      }
    }
  }

  /**
   * Clear completed items
   */
  async clearCompleted(): Promise<void> {
    const completedItems = await this.table
      .where('status')
      .equals('completed')
      .toArray()
    
    const ids = completedItems
      .map((item) => item.id)
      .filter((id): id is number => id !== undefined)
    
    await this.deleteMany(ids)
  }

  /**
   * Count items by status
   */
  async countByStatus(status: SyncQueueItem['status']): Promise<number> {
    return await this.table.where('status').equals(status).count()
  }

  /**
   * Get items by entity type
   */
  async getByEntity(entity: SyncQueueItem['entity']): Promise<SyncQueueItem[]> {
    return await this.table.where('entity').equals(entity).toArray()
  }
}

// Export singleton instance
export const syncQueueRepository = new SyncQueueRepository()
