/**
 * Sale Repository
 * Handles CRUD operations for sales (including offline sales)
 */

import { db } from '../schema'
import type { LocalSale } from '../schema'
import { BaseRepository } from './base.repository'

export class SaleRepository extends BaseRepository<LocalSale, number> {
  constructor() {
    super(db.sales)
  }

  /**
   * Get offline sales (not yet synced)
   */
  async getOfflineSales(): Promise<LocalSale[]> {
    return await this.table
      .where('isOffline')
      .equals(1)
      .and((sale) => !sale.isSynced)
      .toArray()
  }

  /**
   * Get sales by customer
   */
  async getByCustomer(customerId: number): Promise<LocalSale[]> {
    return await this.table.where('customerId').equals(customerId).toArray()
  }

  /**
   * Get sales by date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<LocalSale[]> {
    return await this.table.where('createdAt').between(startDate, endDate, true, true).toArray()
  }

  /**
   * Get sale by invoice number
   */
  async getByInvoiceNo(invoiceNo: string): Promise<LocalSale | undefined> {
    return await this.table.where('invoiceNo').equals(invoiceNo).first()
  }

  /**
   * Get sale by temporary ID (for offline sales)
   */
  async getByTempId(tempId: string): Promise<LocalSale | undefined> {
    return await this.table.where('tempId').equals(tempId).first()
  }

  /**
   * Create offline sale
   */
  async createOffline(sale: Omit<LocalSale, 'id' | 'isOffline' | 'isSynced'>): Promise<number> {
    const offlineSale = {
      ...sale,
      isOffline: true,
      isSynced: false,
      tempId: sale.tempId || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    } as LocalSale
    return await this.create(offlineSale)
  }

  /**
   * Mark sale as synced
   */
  async markAsSynced(id: number, serverId?: number): Promise<void> {
    await this.update(id, {
      isSynced: true,
      serverId: serverId, // Store server ID separately, don't try to change primary key
      lastSyncedAt: new Date().toISOString(),
    } as Partial<LocalSale>)
  }

  /**
   * Update sale with sync error
   */
  async setSyncError(id: number, error: string): Promise<void> {
    await this.update(id, {
      syncError: error,
    } as Partial<LocalSale>)
  }

  /**
   * Get failed sales (with sync errors)
   */
  async getFailedSales(): Promise<LocalSale[]> {
    return await this.table
      .filter((sale) => sale.isOffline && !sale.isSynced && !!sale.syncError)
      .toArray()
  }

  /**
   * Count pending sync sales
   */
  async countPendingSync(): Promise<number> {
    return await this.table
      .where('isOffline')
      .equals(1)
      .and((sale) => !sale.isSynced)
      .count()
  }
}

// Export singleton instance
export const saleRepository = new SaleRepository()
