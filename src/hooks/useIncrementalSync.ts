import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { syncApiService } from '@/api/services/sync.service'
import { storage } from '@/lib/storage'
import type { LocalProduct, LocalCategory } from '@/lib/db/schema'
import type { Product, Stock, Category } from '@/types/api.types'

/**
 * Hook for incremental sync with backend
 * Checks for changes and applies only deltas (added/updated/deleted)
 * Drastically reduces bandwidth compared to full fetch
 */
export function useIncrementalSync() {
  const queryClient = useQueryClient()
  const lastSyncRef = useRef<string | null>(syncApiService.getLastServerTimestamp())

  /**
   * Apply product changes to local storage
   */
  const applyProductChanges = useCallback(
    async (changes: { added: Product[]; updated: Product[]; deleted: number[] }) => {
      console.log(
        `[Incremental Sync] Products - Added: ${changes.added.length}, Updated: ${changes.updated.length}, Deleted: ${changes.deleted.length}`
      )

      // Add/Update products
      const productsToUpsert: LocalProduct[] = [...changes.added, ...changes.updated].map(
        (product) => {
          const stock: Stock = product.stocks?.[0] || {
            id: product.id,
            product_id: product.id,
            productStock: product.stocks_sum_product_stock ?? product.productStock ?? 0,
            productPurchasePrice: 0,
            productSalePrice: 0,
          }
          return {
            ...product,
            stock,
            stocks: product.stocks || [stock],
            variants: product.variants || [],
            lastSyncedAt: new Date().toISOString(),
          }
        }
      )

      if (productsToUpsert.length > 0) {
        await storage.products.bulkUpsert(productsToUpsert)
      }

      // Delete products
      if (changes.deleted.length > 0) {
        await Promise.all(changes.deleted.map((id) => storage.products.delete(id)))
      }
    },
    []
  )

  /**
   * Apply category changes to local storage
   */
  const applyCategoryChanges = useCallback(
    async (changes: { added: Category[]; updated: Category[]; deleted: number[] }) => {
      console.log(
        `[Incremental Sync] Categories - Added: ${changes.added.length}, Updated: ${changes.updated.length}, Deleted: ${changes.deleted.length}`
      )

      // Add/Update categories
      const categoriesToUpsert: LocalCategory[] = [...changes.added, ...changes.updated].map(
        (cat) => ({
          ...cat,
          lastSyncedAt: new Date().toISOString(),
        })
      )

      if (categoriesToUpsert.length > 0) {
        await storage.categories.bulkUpsert(categoriesToUpsert)
      }

      // Delete categories
      if (changes.deleted.length > 0) {
        await Promise.all(changes.deleted.map((id) => storage.categories.delete(id)))
      }
    },
    []
  )

  /**
   * Perform incremental sync
   * Returns true if changes were found and applied
   */
  const performSync = useCallback(
    async (entities: string[] = ['products', 'stocks', 'categories']): Promise<boolean> => {
      try {
        console.log(
          '[Incremental Sync] Checking for changes since:',
          lastSyncRef.current || 'never (full sync)'
        )

        const response = await syncApiService.getChanges(lastSyncRef.current || undefined, entities)

        // Check if there are any changes
        const hasProductChanges =
          response.data.products &&
          (response.data.products.added.length > 0 ||
            response.data.products.updated.length > 0 ||
            response.data.products.deleted.length > 0)

        const hasCategoryChanges =
          response.data.categories &&
          (response.data.categories.added.length > 0 ||
            response.data.categories.updated.length > 0 ||
            response.data.categories.deleted.length > 0)

        if (!hasProductChanges && !hasCategoryChanges) {
          console.log('[Incremental Sync] No changes detected - cache is fresh')
          return false
        }

        console.log('[Incremental Sync] Changes detected - applying...')

        // Apply changes to local storage
        if (hasProductChanges && response.data.products) {
          await applyProductChanges(response.data.products)
        }

        if (hasCategoryChanges && response.data.categories) {
          await applyCategoryChanges(response.data.categories)
        }

        // Invalidate React Query caches to trigger UI refresh
        if (hasProductChanges) {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          queryClient.invalidateQueries({ queryKey: ['pos-products'] })
        }

        if (hasCategoryChanges) {
          queryClient.invalidateQueries({ queryKey: ['categories'] })
        }

        // Update last sync timestamp
        lastSyncRef.current = response.server_timestamp

        console.log('[Incremental Sync] Sync complete')
        return true
      } catch (error) {
        console.error('[Incremental Sync] Failed:', error)

        // If it's a "no previous sync" error, user needs full sync first
        if (error instanceof Error && error.message.includes('no previous sync')) {
          console.log('[Incremental Sync] No previous sync found - use full sync first')
        }

        return false
      }
    },
    [applyProductChanges, applyCategoryChanges, queryClient]
  )

  /**
   * Check if sync is needed (fast check without downloading data)
   * Returns true if changes exist on server
   */
  const needsSync = useCallback(async (): Promise<boolean> => {
    try {
      // This would require a backend endpoint like GET /sync/check-changes?since=X
      // that returns only hasChanges: boolean without data
      // For now, we perform sync and return if changes were found
      return await performSync()
    } catch (error) {
      console.error('[Incremental Sync] Check failed:', error)
      return false
    }
  }, [performSync])

  /**
   * Force clear sync state (next sync will be full)
   */
  const resetSync = useCallback(() => {
    lastSyncRef.current = null
    localStorage.removeItem('last_server_timestamp')
    localStorage.removeItem('sync_token')
    console.log('[Incremental Sync] Sync state cleared - next sync will be full')
  }, [])

  return {
    performSync,
    needsSync,
    resetSync,
    lastSyncTimestamp: lastSyncRef.current,
  }
}
