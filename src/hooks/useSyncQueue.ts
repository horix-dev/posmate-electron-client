/**
 * useSyncQueue Hook
 * Provides access to sync queue state and operations
 * Following React Query patterns for data fetching
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { syncQueueRepository } from '@/lib/db/repositories'
import { useSyncStore } from '@/stores/sync.store'
import type { SyncQueueItem } from '@/lib/db/schema'

// ============================================
// Types
// ============================================

export interface SyncQueueStats {
  pending: number
  processing: number
  failed: number
  completed: number
  total: number
}

export interface SyncQueueGrouped {
  sales: SyncQueueItem[]
  products: SyncQueueItem[]
  parties: SyncQueueItem[]
  other: SyncQueueItem[]
}

interface UseSyncQueueReturn {
  // Data
  items: SyncQueueItem[]
  pendingItems: SyncQueueItem[]
  failedItems: SyncQueueItem[]
  
  // Stats
  stats: SyncQueueStats
  
  // Grouped by entity
  grouped: SyncQueueGrouped
  
  // Loading states
  isLoading: boolean
  isSyncing: boolean
  
  // Actions
  refetch: () => Promise<void>
  retryItem: (id: number) => Promise<void>
  retryAllFailed: () => Promise<void>
  deleteItem: (id: number) => Promise<void>
  clearCompleted: () => Promise<void>
  syncNow: () => Promise<void>
}

// ============================================
// Helper Functions
// ============================================

function groupByEntity(items: SyncQueueItem[]): SyncQueueGrouped {
  return items.reduce<SyncQueueGrouped>(
    (acc, item) => {
      switch (item.entity) {
        case 'sale':
          acc.sales.push(item)
          break
        case 'product':
          acc.products.push(item)
          break
        case 'party':
        case 'customer':
          acc.parties.push(item)
          break
        default:
          acc.other.push(item)
      }
      return acc
    },
    { sales: [], products: [], parties: [], other: [] }
  )
}

function calculateStats(items: SyncQueueItem[]): SyncQueueStats {
  return items.reduce<SyncQueueStats>(
    (acc, item) => {
      acc.total++
      switch (item.status) {
        case 'pending':
          acc.pending++
          break
        case 'processing':
          acc.processing++
          break
        case 'failed':
          acc.failed++
          break
        case 'completed':
          acc.completed++
          break
      }
      return acc
    },
    { pending: 0, processing: 0, failed: 0, completed: 0, total: 0 }
  )
}

// ============================================
// Hook Implementation
// ============================================

export function useSyncQueue(): UseSyncQueueReturn {
  const [items, setItems] = useState<SyncQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Get syncing state from store
  const syncStatus = useSyncStore((state) => state.syncStatus)
  const isSyncing = syncStatus === 'syncing'
  const setPendingSyncCount = useSyncStore((state) => state.setPendingSyncCount)
  const startQueueSync = useSyncStore((state) => state.startQueueSync)

  // Fetch all queue items
  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const allItems = await syncQueueRepository.getAll()
      // Sort by creation time (newest first for display)
      const sorted = allItems.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setItems(sorted)
      
      // Update pending count in store
      const pendingCount = sorted.filter(i => i.status === 'pending' || i.status === 'processing').length
      setPendingSyncCount(pendingCount)
    } catch (error) {
      console.error('Failed to fetch sync queue:', error)
    } finally {
      setIsLoading(false)
    }
  }, [setPendingSyncCount])

  // Initial fetch
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Poll for changes every 2 seconds (handles offline sale creation, sync progress, etc.)
  useEffect(() => {
    const interval = setInterval(fetchItems, 2000)
    return () => clearInterval(interval)
  }, [fetchItems])

  // Derived data
  const pendingItems = useMemo(
    () => items.filter((i) => i.status === 'pending' || i.status === 'processing'),
    [items]
  )

  const failedItems = useMemo(
    () => items.filter((i) => i.status === 'failed'),
    [items]
  )

  const stats = useMemo(() => calculateStats(items), [items])
  
  const grouped = useMemo(() => groupByEntity(items), [items])

  // Actions
  const retryItem = useCallback(async (id: number) => {
    await syncQueueRepository.retry(id)
    await fetchItems()
  }, [fetchItems])

  const retryAllFailed = useCallback(async () => {
    await syncQueueRepository.retryAll()
    await fetchItems()
  }, [fetchItems])

  const deleteItem = useCallback(async (id: number) => {
    await syncQueueRepository.delete(id)
    await fetchItems()
  }, [fetchItems])

  const clearCompleted = useCallback(async () => {
    await syncQueueRepository.clearCompleted()
    await fetchItems()
  }, [fetchItems])

  const syncNow = useCallback(async () => {
    await startQueueSync()
    await fetchItems()
  }, [fetchItems, startQueueSync])

  return {
    items,
    pendingItems,
    failedItems,
    stats,
    grouped,
    isLoading,
    isSyncing,
    refetch: fetchItems,
    retryItem,
    retryAllFailed,
    deleteItem,
    clearCompleted,
    syncNow,
  }
}

export default useSyncQueue
