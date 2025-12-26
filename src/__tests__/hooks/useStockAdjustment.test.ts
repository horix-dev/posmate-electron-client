import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useStockAdjustment } from '@/hooks/useStockAdjustment'
import { stockAdjustmentRepository } from '@/lib/db/repositories/stockAdjustment.repository'
import { stocksService } from '@/api/services/stocks.service'
import { variantsService } from '@/api/services/variants.service'
import { productsService } from '@/api/services/products.service'
import { syncQueueRepository } from '@/lib/db/repositories/syncQueue.repository'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { StockAdjustment } from '@/types/stockAdjustment.types'

// ============================================
// Mocks
// ============================================

vi.mock('@/lib/db/repositories/stockAdjustment.repository', () => ({
  stockAdjustmentRepository: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    getByProductId: vi.fn(),
    getPending: vi.fn(),
    getSummary: vi.fn(),
    markAsSynced: vi.fn(),
    markAsError: vi.fn(),
  },
}))

vi.mock('@/api/services/stocks.service', () => ({
  stocksService: {
    update: vi.fn(),
  },
}))

vi.mock('@/api/services/variants.service', () => ({
  variantsService: {
    updateStock: vi.fn(),
  },
}))

vi.mock('@/api/services/products.service', () => ({
  productsService: {
    getById: vi.fn(),
  },
}))

vi.mock('@/lib/db/repositories/syncQueue.repository', () => ({
  syncQueueRepository: {
    enqueue: vi.fn(),
  },
}))

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

vi.mock('@/stores/sync.store', () => ({
  useSyncStore: vi.fn((selector) => {
    const mockState = {
      updatePendingSyncCount: vi.fn().mockResolvedValue(undefined),
    }
    return selector(mockState)
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// ============================================
// Test Fixtures
// ============================================

const createMockAdjustment = (overrides: Partial<StockAdjustment> = {}): StockAdjustment => ({
  id: 1,
  serverId: undefined,
  productId: 1,
  variantId: undefined,
  batchId: undefined,
  type: 'in',
  quantity: 10,
  reason: 'Initial Stock',
  referenceNumber: 'REF-001',
  notes: 'Test notes',
  adjustedBy: 1,
  adjustmentDate: '2025-12-26T10:00:00Z',
  syncStatus: 'pending',
  syncError: undefined,
  oldQuantity: 100,
  newQuantity: 110,
  createdAt: '2025-12-26T10:00:00Z',
  updatedAt: '2025-12-26T10:00:00Z',
  ...overrides,
})

// ============================================
// Helper Functions
// ============================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  return Wrapper
}

const createOnlineStatus = (isOnline: boolean) => ({
  isOnline,
  isOffline: !isOnline,
  checkConnection: vi.fn().mockResolvedValue(isOnline),
})

// ============================================
// Test Suite
// ============================================

describe('useStockAdjustment Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createAdjustment - Online', () => {
    beforeEach(() => {
      // Mock online status
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(true))
    })

    it('should create adjustment online and mark as synced', async () => {
      const mockResponse = { message: 'OK', data: { id: 10 } }
      vi.mocked(stocksService.update).mockResolvedValue(
        mockResponse as unknown as Awaited<ReturnType<typeof stocksService.update>>
      )
      vi.mocked(stockAdjustmentRepository.create).mockResolvedValue(1)

      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      await waitFor(async () => {
        await result.current.createAdjustment({
          productId: 1,
          stockId: 10,
          type: 'in',
          quantity: 10,
          reason: 'Initial Stock',
          adjustedBy: 1,
          adjustmentDate: '2025-12-26T10:00:00Z',
          currentStock: 100,
        })
      })

      expect(stocksService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ productStock: 110 })
      )

      expect(stockAdjustmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: 10,
          syncStatus: 'synced',
        })
      )
    })

    it('should handle API error and save offline', async () => {
      vi.mocked(stocksService.update).mockRejectedValue(new Error('Network error'))
      vi.mocked(stockAdjustmentRepository.create).mockResolvedValue(1)

      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      await waitFor(async () => {
        await result.current.createAdjustment({
          productId: 1,
          stockId: 10,
          type: 'in',
          quantity: 10,
          reason: 'Initial Stock',
          adjustedBy: 1,
          adjustmentDate: '2025-12-26T10:00:00Z',
          currentStock: 100,
        })
      })

      expect(stockAdjustmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          syncStatus: 'pending',
        })
      )

      expect(syncQueueRepository.enqueue).toHaveBeenCalled()
    })

    it('should not queue offline on 422 validation error', async () => {
      const axios422 = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            message: 'The product stock field is required.',
            errors: { productStock: ['The product stock field is required.'] },
          },
        },
        message: 'Request failed with status code 422',
      }

      vi.mocked(stocksService.update).mockRejectedValue(axios422)

      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      await expect(
        result.current.createAdjustment({
          productId: 1,
          stockId: 10,
          type: 'in',
          quantity: 10,
          reason: 'Initial Stock',
          adjustedBy: 1,
          adjustmentDate: '2025-12-26T10:00:00Z',
          currentStock: 100,
        })
      ).rejects.toBeDefined()

      expect(stockAdjustmentRepository.create).not.toHaveBeenCalled()
      expect(syncQueueRepository.enqueue).not.toHaveBeenCalled()
    })
  })

  describe('createAdjustment - Offline', () => {
    beforeEach(() => {
      // Mock offline status
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(false))
    })

    it('should save adjustment locally and add to sync queue', async () => {
      const { useOnlineStatus } = await import('@/hooks/useOnlineStatus')
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(false))

      vi.mocked(stockAdjustmentRepository.create).mockResolvedValue(1)

      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      await waitFor(async () => {
        await result.current.createAdjustment({
          productId: 1,
          stockId: 10,
          type: 'in',
          quantity: 10,
          reason: 'Initial Stock',
          adjustedBy: 1,
          adjustmentDate: '2025-12-26T10:00:00Z',
          currentStock: 100,
        })
      })

      expect(stocksService.update).not.toHaveBeenCalled()
      expect(variantsService.updateStock).not.toHaveBeenCalled()

      expect(stockAdjustmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          syncStatus: 'pending',
        })
      )

      expect(syncQueueRepository.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'stock',
          operation: 'UPDATE',
          endpoint: '/stocks/10',
          method: 'POST',
        })
      )
    })
  })

  describe('retrySync', () => {
    it('should retry syncing a pending adjustment', async () => {
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(true))

      const mockAdjustment = createMockAdjustment({ id: 1, syncStatus: 'pending' })
      vi.mocked(productsService.getById).mockResolvedValue({
        message: 'OK',
        data: {
          id: 1,
          productName: 'Test Product',
          product_type: 'simple',
          stocks: [
            {
              id: 10,
              product_id: 1,
              productStock: 110,
              productPurchasePrice: 0,
              productSalePrice: 0,
            },
          ],
        },
      } as unknown as Awaited<ReturnType<typeof productsService.getById>>)

      vi.mocked(stocksService.update).mockResolvedValue({
        message: 'OK',
        data: { id: 10 },
      } as unknown as Awaited<ReturnType<typeof stocksService.update>>)
      vi.mocked(stockAdjustmentRepository.markAsSynced).mockResolvedValue()

      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      await waitFor(async () => {
        await result.current.retrySync(mockAdjustment)
      })

      expect(stocksService.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ productStock: 110 })
      )
      expect(variantsService.updateStock).not.toHaveBeenCalled()
      expect(stockAdjustmentRepository.markAsSynced).toHaveBeenCalledWith(1, 10)
    })

    it('should not retry if already synced', async () => {
      // Mock online status
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(true))

      const mockAdjustment = createMockAdjustment({ syncStatus: 'synced' })

      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      await expect(result.current.retrySync(mockAdjustment)).rejects.toThrow(
        'Adjustment already synced'
      )

      expect(stocksService.update).not.toHaveBeenCalled()
      expect(variantsService.updateStock).not.toHaveBeenCalled()
    })

    it('should not retry if offline', async () => {
      // Mock offline status
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(false))

      const mockAdjustment = createMockAdjustment({ syncStatus: 'pending' })

      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      await expect(result.current.retrySync(mockAdjustment)).rejects.toThrow(
        'Cannot retry sync while offline'
      )
    })
  })

  describe('useAdjustments', () => {
    it('should fetch all adjustments', async () => {
      // Mock online status
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(true))

      const mockAdjustments = [createMockAdjustment({ id: 1 }), createMockAdjustment({ id: 2 })]

      vi.mocked(stockAdjustmentRepository.getAll).mockResolvedValue(mockAdjustments)

      // First get the main hook
      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      // Then use the query hook it returns
      const { result: queryResult } = renderHook(() => result.current.useAdjustments(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(queryResult.current.isLoading).toBe(false)
      })

      expect(queryResult.current.data).toEqual(mockAdjustments)
      expect(stockAdjustmentRepository.getAll).toHaveBeenCalled()
    })

    it('should filter adjustments by filters', async () => {
      // Mock online status
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(true))

      const filters = {
        type: 'in' as const,
        syncStatus: 'pending' as const,
      }

      vi.mocked(stockAdjustmentRepository.getAll).mockResolvedValue([])

      // First get the main hook
      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      // Then use the query hook with filters
      renderHook(() => result.current.useAdjustments(filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(stockAdjustmentRepository.getAll).toHaveBeenCalledWith(filters)
      })
    })
  })

  describe('usePendingAdjustments', () => {
    it('should fetch pending adjustments', async () => {
      // Mock online status
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(true))

      const mockPending = [
        createMockAdjustment({ id: 1, syncStatus: 'pending' }),
        createMockAdjustment({ id: 2, syncStatus: 'pending' }),
      ]

      vi.mocked(stockAdjustmentRepository.getPending).mockResolvedValue(mockPending)

      // First get the main hook
      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      // Then use the pending query hook
      const { result: queryResult } = renderHook(() => result.current.usePendingAdjustments(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(queryResult.current.data).toEqual(mockPending)
        expect(queryResult.current.count).toBe(2)
      })
    })
  })

  describe('useSummary', () => {
    it('should fetch adjustment summary', async () => {
      // Mock online status
      vi.mocked(useOnlineStatus).mockReturnValue(createOnlineStatus(true))

      const mockSummary = {
        totalIn: 100,
        totalOut: 50,
        netChange: 50,
        pendingCount: 2,
      }

      vi.mocked(stockAdjustmentRepository.getSummary).mockResolvedValue(mockSummary)

      // First get the main hook
      const { result } = renderHook(() => useStockAdjustment(), {
        wrapper: createWrapper(),
      })

      // Then use the summary hook
      const { result: queryResult } = renderHook(() => result.current.useSummary(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(queryResult.current.data).toEqual(mockSummary)
      })
    })
  })
})
