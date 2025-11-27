/**
 * Product Repository
 * Handles CRUD operations for products in IndexedDB
 */

import { db } from '../schema'
import type { LocalProduct } from '../schema'
import { BaseRepository } from './base.repository'

export class ProductRepository extends BaseRepository<LocalProduct, number> {
  constructor() {
    super(db.products)
  }

  /**
   * Get products by category
   */
  async getByCategory(categoryId: number): Promise<LocalProduct[]> {
    return await this.table.where('categoryId').equals(categoryId).toArray()
  }

  /**
   * Search products by name or code
   */
  async search(query: string): Promise<LocalProduct[]> {
    const lowerQuery = query.toLowerCase()
    return await this.table
      .filter(
        (product) =>
          product.productName.toLowerCase().includes(lowerQuery) ||
          product.productCode?.toLowerCase().includes(lowerQuery) ||
          false
      )
      .toArray()
  }

  /**
   * Get product by barcode
   */
  async getByBarcode(barcode: string): Promise<LocalProduct | undefined> {
    return await this.table
      .filter((product) => product.productCode === barcode)
      .first()
  }

  /**
   * Get products with low stock
   */
  async getLowStock(threshold: number = 10): Promise<LocalProduct[]> {
    return await this.table
      .filter((product) => product.stock.productStock <= threshold)
      .toArray()
  }

  /**
   * Get recently synced products
   */
  async getRecentlySynced(limit: number = 50): Promise<LocalProduct[]> {
    return await this.table.orderBy('lastSyncedAt').reverse().limit(limit).toArray()
  }

  /**
   * Bulk sync products from API
   */
  async bulkSync(products: LocalProduct[]): Promise<void> {
    const now = new Date().toISOString()
    const productsWithTimestamp = products.map((p) => ({
      ...p,
      lastSyncedAt: now,
    }))
    await this.upsertMany(productsWithTimestamp)
  }
}

// Export singleton instance
export const productRepository = new ProductRepository()
