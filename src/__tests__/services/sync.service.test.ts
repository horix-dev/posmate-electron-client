import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { SyncQueueItem } from '@/lib/db/schema'

// ============================================
// Mock Setup - Must be hoisted
// ============================================

vi.mock('@/lib/db/repositories', () => ({
  syncQueueRepository: {
    getPending: vi.fn(),
    markAsProcessing: vi.fn(),
    markAsCompleted: vi.fn(),
    markAsFailed: vi.fn(),
    clearCompleted: vi.fn(),
    retryAll: vi.fn(),
    countByStatus: vi.fn(),
  },
  saleRepository: {
    markAsSynced: vi.fn(),
  },
}))

vi.mock('@/api/axios', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Import after mocking
import { SyncService } from '@/lib/db/services/sync.service'
import { syncQueueRepository, saleRepository } from '@/lib/db/repositories'
import api from '@/api/axios'

// Cast to mocked types
const mockSyncQueueRepository = syncQueueRepository as unknown as {
  getPending: ReturnType<typeof vi.fn>
  markAsProcessing: ReturnType<typeof vi.fn>
  markAsCompleted: ReturnType<typeof vi.fn>
  markAsFailed: ReturnType<typeof vi.fn>
  clearCompleted: ReturnType<typeof vi.fn>
  retryAll: ReturnType<typeof vi.fn>
  countByStatus: ReturnType<typeof vi.fn>
}

const mockSaleRepository = saleRepository as unknown as {
  markAsSynced: ReturnType<typeof vi.fn>
}

const mockApi = api as unknown as {
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

// ============================================
// Test Fixtures
// ============================================

const createMockQueueItem = (
  overrides: Partial<SyncQueueItem> = {}
): SyncQueueItem => ({
  id: 1,
  operation: 'CREATE',
  entity: 'sale',
  entityId: 100,
  endpoint: '/api/sales',
  method: 'POST',
  data: { amount: 1000 },
  status: 'pending',
  attempts: 0,
  maxAttempts: 5,
  createdAt: new Date().toISOString(),
  idempotencyKey: 'sale_create_1234567890_abc123',
  offlineTimestamp: new Date().toISOString(),
  ...overrides,
})

// ============================================
// Test Suite
// ============================================

describe('SyncService', () => {
  let syncService: SyncService

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    syncService = new SyncService()
  })

  afterEach(() => {
    syncService.stop()
    vi.useRealTimers()
  })

  describe('start', () => {
    it('should process all pending items successfully', async () => {
      const items = [
        createMockQueueItem({ id: 1 }),
        createMockQueueItem({ id: 2 }),
      ]

      mockSyncQueueRepository.getPending.mockResolvedValue(items)
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.post.mockResolvedValue({ data: { data: { id: 999 } } })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      const resultPromise = syncService.start()

      // Fast-forward through delays
      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.processed).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)

      expect(mockSyncQueueRepository.markAsProcessing).toHaveBeenCalledTimes(2)
      expect(mockSyncQueueRepository.markAsCompleted).toHaveBeenCalledTimes(2)
      expect(mockSyncQueueRepository.clearCompleted).toHaveBeenCalled()
    })

    it('should return early if no pending items', async () => {
      mockSyncQueueRepository.getPending.mockResolvedValue([])
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)

      const resultPromise = syncService.start()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.processed).toBe(0)
      expect(result.failed).toBe(0)
      expect(mockApi.post).not.toHaveBeenCalled()
    })

    it('should prevent concurrent sync runs', async () => {
      const items = [createMockQueueItem()]
      mockSyncQueueRepository.getPending.mockResolvedValue(items)
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockApi.post.mockResolvedValue({ data: { data: { id: 999 } } })
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      // Start first sync
      const firstPromise = syncService.start()

      // Try to start second sync immediately
      const secondPromise = syncService.start()
      const secondResult = await secondPromise

      expect(secondResult.success).toBe(false)
      expect(secondResult.errors[0].error).toBe('Sync already in progress')

      // Complete first sync
      await vi.runAllTimersAsync()
      await firstPromise
    })

    it('should handle failed items and continue processing', async () => {
      const items = [
        createMockQueueItem({ id: 1 }),
        createMockQueueItem({ id: 2 }),
        createMockQueueItem({ id: 3 }),
      ]

      mockSyncQueueRepository.getPending.mockResolvedValue(items)
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      // First succeeds, second fails, third succeeds
      mockApi.post
        .mockResolvedValueOnce({ data: { data: { id: 1 } } })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { data: { id: 3 } } })

      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsFailed.mockResolvedValue(undefined)

      const resultPromise = syncService.start()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.processed).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].itemId).toBe(2)
      expect(result.errors[0].error).toBe('Network error')
    })
  })

  describe('API Method Handling', () => {
    it('should use POST for POST method', async () => {
      const item = createMockQueueItem({ method: 'POST' })
      mockSyncQueueRepository.getPending.mockResolvedValue([item])
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.post.mockResolvedValue({ data: { data: { id: 999 } } })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      const resultPromise = syncService.start()
      await vi.runAllTimersAsync()
      await resultPromise

      expect(mockApi.post).toHaveBeenCalledWith('/api/sales', { amount: 1000 })
    })

    it('should use PUT for PUT method', async () => {
      const item = createMockQueueItem({
        method: 'PUT',
        endpoint: '/api/sales/100',
      })
      mockSyncQueueRepository.getPending.mockResolvedValue([item])
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.put.mockResolvedValue({ data: { data: { id: 100 } } })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      const resultPromise = syncService.start()
      await vi.runAllTimersAsync()
      await resultPromise

      expect(mockApi.put).toHaveBeenCalledWith('/api/sales/100', {
        amount: 1000,
      })
    })

    it('should use DELETE for DELETE method', async () => {
      const item = createMockQueueItem({
        method: 'DELETE',
        endpoint: '/api/sales/100',
      })
      mockSyncQueueRepository.getPending.mockResolvedValue([item])
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.delete.mockResolvedValue({ data: {} })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      const resultPromise = syncService.start()
      await vi.runAllTimersAsync()
      await resultPromise

      expect(mockApi.delete).toHaveBeenCalledWith('/api/sales/100')
    })
  })

  describe('Exponential Backoff', () => {
    it('should apply exponential backoff for retry attempts', async () => {
      const item = createMockQueueItem({ attempts: 2 }) // Previous 2 attempts
      mockSyncQueueRepository.getPending.mockResolvedValue([item])
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.post.mockResolvedValue({ data: { data: { id: 999 } } })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      const resultPromise = syncService.start()

      // Backoff for 2 attempts = 1000 * 2^2 = 4000ms
      // Advance time to trigger backoff
      await vi.advanceTimersByTimeAsync(4100)
      await vi.runAllTimersAsync()
      await resultPromise

      expect(mockApi.post).toHaveBeenCalled()
    })

    it('should cap backoff at 30 seconds', async () => {
      const item = createMockQueueItem({ attempts: 10 }) // Many previous attempts
      mockSyncQueueRepository.getPending.mockResolvedValue([item])
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.post.mockResolvedValue({ data: { data: { id: 999 } } })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      const resultPromise = syncService.start()

      // Even with 10 attempts, should cap at 30000ms
      await vi.advanceTimersByTimeAsync(30100)
      await vi.runAllTimersAsync()
      await resultPromise

      expect(mockApi.post).toHaveBeenCalled()
    })
  })

  describe('Progress Callbacks', () => {
    it('should notify progress callbacks during sync', async () => {
      const items = [
        createMockQueueItem({ id: 1 }),
        createMockQueueItem({ id: 2 }),
      ]

      mockSyncQueueRepository.getPending.mockResolvedValue(items)
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.post.mockResolvedValue({ data: { data: { id: 999 } } })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      const progressUpdates: Array<{ completed: number; total: number }> = []
      syncService.onProgress((progress) => {
        progressUpdates.push({
          completed: progress.completed,
          total: progress.total,
        })
      })

      const resultPromise = syncService.start()
      await vi.runAllTimersAsync()
      await resultPromise

      // Should have received multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(0)

      // First update should have total = 2, completed = 0
      expect(progressUpdates[0]).toEqual({ completed: 0, total: 2 })

      // Final update should have completed = 2
      const lastProgress = progressUpdates[progressUpdates.length - 1]
      expect(lastProgress.completed).toBe(2)
    })

    it('should allow unsubscribing from progress', async () => {
      const items = [createMockQueueItem({ id: 1 })]

      mockSyncQueueRepository.getPending.mockResolvedValue(items)
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.post.mockResolvedValue({ data: { data: { id: 999 } } })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      const progressUpdates: number[] = []
      const unsubscribe = syncService.onProgress(() => {
        progressUpdates.push(1)
      })

      // Unsubscribe immediately
      unsubscribe()

      const resultPromise = syncService.start()
      await vi.runAllTimersAsync()
      await resultPromise

      // Should not have received any updates
      expect(progressUpdates).toHaveLength(0)
    })
  })

  describe('stop', () => {
    it('should abort ongoing sync when stop is called', async () => {
      const items = [
        createMockQueueItem({ id: 1 }),
        createMockQueueItem({ id: 2 }),
        createMockQueueItem({ id: 3 }),
      ]

      mockSyncQueueRepository.getPending.mockResolvedValue(items)
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      // Make API call slow
      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { data: { id: 999 } } }), 1000)
          )
      )

      const resultPromise = syncService.start()

      // Stop after first item starts processing
      await vi.advanceTimersByTimeAsync(500)
      syncService.stop()

      // Complete remaining timers
      await vi.runAllTimersAsync()
      const result = await resultPromise

      // Should have processed fewer than all items
      expect(result.processed).toBeLessThan(3)
    })
  })

  describe('isActive', () => {
    it('should return true when sync is in progress', async () => {
      const items = [createMockQueueItem()]
      mockSyncQueueRepository.getPending.mockResolvedValue(items)
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.post.mockResolvedValue({ data: { data: { id: 999 } } })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      expect(syncService.isActive()).toBe(false)

      const resultPromise = syncService.start()

      // Check while processing
      expect(syncService.isActive()).toBe(true)

      await vi.runAllTimersAsync()
      await resultPromise

      expect(syncService.isActive()).toBe(false)
    })
  })

  describe('retryFailed', () => {
    it('should call repository retryAll method', async () => {
      mockSyncQueueRepository.retryAll.mockResolvedValue(undefined)

      await syncService.retryFailed()

      expect(mockSyncQueueRepository.retryAll).toHaveBeenCalled()
    })
  })

  describe('getStats', () => {
    it('should return sync queue statistics', async () => {
      mockSyncQueueRepository.countByStatus
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(2) // failed
        .mockResolvedValueOnce(10) // completed

      const stats = await syncService.getStats()

      expect(stats).toEqual({
        pending: 5,
        failed: 2,
        completed: 10,
      })

      expect(mockSyncQueueRepository.countByStatus).toHaveBeenCalledWith(
        'pending'
      )
      expect(mockSyncQueueRepository.countByStatus).toHaveBeenCalledWith(
        'failed'
      )
      expect(mockSyncQueueRepository.countByStatus).toHaveBeenCalledWith(
        'completed'
      )
    })
  })

  describe('Sale Sync Handling', () => {
    it('should mark sale as synced with server ID on success', async () => {
      const item = createMockQueueItem({
        entity: 'sale',
        entityId: 100,
      })

      mockSyncQueueRepository.getPending.mockResolvedValue([item])
      mockSyncQueueRepository.markAsProcessing.mockResolvedValue(undefined)
      mockSyncQueueRepository.markAsCompleted.mockResolvedValue(undefined)
      mockSyncQueueRepository.clearCompleted.mockResolvedValue(undefined)
      mockApi.post.mockResolvedValue({ data: { data: { id: 999 } } })
      mockSaleRepository.markAsSynced.mockResolvedValue(undefined)

      const resultPromise = syncService.start()
      await vi.runAllTimersAsync()
      await resultPromise

      expect(mockSaleRepository.markAsSynced).toHaveBeenCalledWith(100, 999)
    })
  })
})
