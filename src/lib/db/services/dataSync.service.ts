/**
 * Data Sync Service
 * Syncs master data from API to IndexedDB
 */

import { productRepository } from '../repositories'
import { db, type LocalProduct } from '../schema'
import { productsService } from '@/api/services/products.service'
import { partiesService } from '@/api/services/parties.service'
import type { Category, Party, Stock } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface DataSyncResult {
  success: boolean
  synced: {
    products: number
    categories: number
    parties: number
  }
  errors: string[]
}

// ============================================
// Data Sync Service Class
// ============================================

export class DataSyncService {
  /**
   * Perform full sync of all master data
   */
  async syncAll(): Promise<DataSyncResult> {
    const result: DataSyncResult = {
      success: true,
      synced: {
        products: 0,
        categories: 0,
        parties: 0,
      },
      errors: [],
    }

    try {
      // Sync in parallel
      const [productsResult, partiesResult] = await Promise.allSettled([
        this.syncProducts(),
        this.syncParties(),
      ])

      // Handle products sync
      if (productsResult.status === 'fulfilled') {
        result.synced.products = productsResult.value.products
        result.synced.categories = productsResult.value.categories
      } else {
        result.success = false
        result.errors.push(`Products sync failed: ${productsResult.reason}`)
      }

      // Handle parties sync
      if (partiesResult.status === 'fulfilled') {
        result.synced.parties = partiesResult.value
      } else {
        result.success = false
        result.errors.push(`Parties sync failed: ${partiesResult.reason}`)
      }

      // Update last sync timestamps
      if (result.success) {
        await Promise.all([
          db.setLastSyncTime('products'),
          db.setLastSyncTime('categories'),
          db.setLastSyncTime('parties'),
        ])
      }
    } catch (error) {
      result.success = false
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown sync error'
      )
    }

    return result
  }

  /**
   * Sync products and categories
   */
  private async syncProducts(): Promise<{
    products: number
    categories: number
  }> {
    try {
      // Fetch products with their stock
      const response = await productsService.getAll()

      const products = response.data
      const categories: Set<Category> = new Set()

      // Transform products to local format
      const localProducts: LocalProduct[] = []

      for (const product of products) {
        if (product.category) {
          categories.add(product.category)
        }

        // Get first stock entry or create default
        const stock: Stock = product.stocks?.[0] || {
          id: product.id,
          product_id: product.id,
          productStock: 0,
          productPurchasePrice: 0,
          productSalePrice: 0,
        }

        const localProduct: LocalProduct = {
          ...product,
          stock,
          lastSyncedAt: new Date().toISOString(),
        }

        localProducts.push(localProduct)
      }

      // Save products to IndexedDB
      await productRepository.bulkSync(localProducts)

      // Save categories to IndexedDB
      const uniqueCategories = Array.from(categories)
      if (uniqueCategories.length > 0) {
        const localCategories = uniqueCategories.map((cat) => ({
          ...cat,
          lastSyncedAt: new Date().toISOString(),
        }))
        await db.categories.bulkPut(localCategories)
      }

      return {
        products: localProducts.length,
        categories: uniqueCategories.length,
      }
    } catch (error) {
      console.error('Product sync error:', error)
      throw new Error(
        `Failed to sync products: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Sync parties (customers/suppliers)
   */
  private async syncParties(): Promise<number> {
    try {
      // Fetch all parties
      const response = await partiesService.getAll()

      const parties = response.data

      // Transform parties to local format
      const localParties = parties.map((party: Party) => ({
        ...party,
        lastSyncedAt: new Date().toISOString(),
      }))

      // Save to IndexedDB
      await db.parties.bulkPut(localParties)

      return localParties.length
    } catch (error) {
      console.error('Parties sync error:', error)
      throw new Error(
        `Failed to sync parties: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Sync only products (quick sync)
   */
  async syncProductsOnly(): Promise<number> {
    const result = await this.syncProducts()
    await db.setLastSyncTime('products')
    return result.products
  }

  /**
   * Check if initial sync is needed
   */
  async needsInitialSync(): Promise<boolean> {
    const [productsCount, lastSync] = await Promise.all([
      db.products.count(),
      db.getLastSyncTime('products'),
    ])

    // Need sync if no products or no last sync time
    return productsCount === 0 || !lastSync
  }

  /**
   * Get last sync time for all entities
   */
  async getLastSyncTimes() {
    const [products, categories, parties] = await Promise.all([
      db.getLastSyncTime('products'),
      db.getLastSyncTime('categories'),
      db.getLastSyncTime('parties'),
    ])

    return { products, categories, parties }
  }
}

// Export singleton instance
export const dataSyncService = new DataSyncService()
