/**
 * Cache Clearing Utilities
 *
 * Provides functions to clear all cache layers:
 * - React Query cache (memory)
 * - LocalStorage cache (TTL cache)
 * - IndexedDB/SQLite (persistent storage)
 * - Image cache
 * - Incremental sync state
 */

import { QueryClient } from '@tanstack/react-query'
import { storage } from '@/lib/storage'
import { imageCache } from './imageCache'
import { syncApiService } from '@/api/services/sync.service'

export interface ClearCacheOptions {
  /** Clear React Query cache (memory) */
  reactQuery?: boolean
  /** Clear localStorage cache */
  localStorage?: boolean
  /** Clear persistent storage (IndexedDB/SQLite) */
  persistentStorage?: boolean
  /** Clear image cache */
  images?: boolean
  /** Clear sync state (forces full sync next time) */
  syncState?: boolean
  /** Clear all cache layers */
  all?: boolean
}

/**
 * Clear all cache layers and force fresh data fetch
 */
export async function clearAllCache(
  queryClient: QueryClient,
  options: ClearCacheOptions = { all: true }
): Promise<void> {
  const opts = options.all
    ? {
        reactQuery: true,
        localStorage: true,
        persistentStorage: true,
        images: true,
        syncState: true,
      }
    : options

  const results: { layer: string; status: 'success' | 'error'; error?: string }[] = []

  // 1. Clear React Query cache (memory)
  if (opts.reactQuery) {
    try {
      queryClient.clear()
      results.push({ layer: 'React Query Cache', status: 'success' })
    } catch (error) {
      results.push({
        layer: 'React Query Cache',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // 2. Clear localStorage cache
  if (opts.localStorage) {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('cache:') || key.startsWith('pos_'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
      results.push({
        layer: `LocalStorage Cache (${keysToRemove.length} items)`,
        status: 'success',
      })
    } catch (error) {
      results.push({
        layer: 'LocalStorage Cache',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // 3. Clear persistent storage (IndexedDB/SQLite)
  if (opts.persistentStorage) {
    try {
      // Clear products
      const products = await storage.products.getAll()
      await Promise.all(products.map((p) => storage.products.delete(p.id)))

      // Clear categories
      const categories = await storage.categories.getAll()
      await Promise.all(categories.map((c) => storage.categories.delete(c.id)))

      // Clear offline sales
      const offlineSales = await storage.sales.getOfflineSales()
      await Promise.all(offlineSales.map((sale) => storage.sales.delete(sale.id)))

      // Clear sync queue
      const queueItems = await storage.syncQueue.getAll()
      await Promise.all(
        queueItems
          .filter((item) => item.id !== undefined)
          .map((item) => storage.syncQueue.delete(item.id!))
      )

      results.push({
        layer: `Persistent Storage (${products.length + categories.length + offlineSales.length + queueItems.length} records)`,
        status: 'success',
      })
    } catch (error) {
      results.push({
        layer: 'Persistent Storage',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // 4. Clear image cache
  if (opts.images) {
    try {
      await imageCache.clear()
      results.push({ layer: 'Image Cache', status: 'success' })
    } catch (error) {
      results.push({
        layer: 'Image Cache',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // 5. Clear sync state
  if (opts.syncState) {
    try {
      localStorage.removeItem('last_server_timestamp')
      localStorage.removeItem('sync_token')
      syncApiService.clearLastServerTimestamp()
      results.push({ layer: 'Sync State', status: 'success' })
    } catch (error) {
      results.push({
        layer: 'Sync State',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Log results
  console.log('[Cache Clear] Results:', results)

  // Throw if any critical errors
  const errors = results.filter((r) => r.status === 'error')
  if (errors.length > 0) {
    throw new Error(`Failed to clear some cache layers: ${errors.map((e) => e.layer).join(', ')}`)
  }
}

/**
 * Get cache statistics (sizes, counts)
 */
export async function getCacheStats(): Promise<{
  reactQuery: number
  localStorage: number
  products: number
  categories: number
  offlineSales: number
  syncQueue: number
  images: number
}> {
  const localStorageCount = Object.keys(localStorage).filter(
    (key) => key.startsWith('cache:') || key.startsWith('pos_')
  ).length

  const products = await storage.products.getAll()
  const categories = await storage.categories.getAll()
  const offlineSales = await storage.sales.getOfflineSales()
  const syncQueue = await storage.syncQueue.getAll()

  return {
    reactQuery: 0, // Not easily accessible without QueryClient reference
    localStorage: localStorageCount,
    products: products.length,
    categories: categories.length,
    offlineSales: offlineSales.length,
    syncQueue: syncQueue.length,
    images: 0, // Image cache count not easily accessible
  }
}

/**
 * Quick function to clear everything and force full refresh
 */
export async function clearCacheAndRefresh(queryClient: QueryClient): Promise<void> {
  await clearAllCache(queryClient, { all: true })
  window.location.reload()
}
