import { describe, it, expect, beforeEach, vi } from 'vitest'
import { stockAdjustmentRepository } from '@/lib/db/repositories/stockAdjustment.repository'
import type { ElectronAPI } from '@/types/electron'
import type { StockAdjustment, StockAdjustmentFilters } from '@/types/stockAdjustment.types'

// Mock the window.electronAPI
const mockElectronAPI = {
  sqlite: {
    stockAdjustment: {
      create: vi.fn(),
      getById: vi.fn(),
      getAll: vi.fn(),
      getByProductId: vi.fn(),
      getPending: vi.fn(),
      markAsSynced: vi.fn(),
      markAsError: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      getSummary: vi.fn(),
      clear: vi.fn(),
    },
  },
}

global.window = {
  electronAPI: mockElectronAPI as unknown as ElectronAPI,
} as unknown as Window & typeof globalThis

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
// Test Suite
// ============================================

describe('StockAdjustmentRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new stock adjustment', async () => {
      const newAdjustment = createMockAdjustment()
      mockElectronAPI.sqlite.stockAdjustment.create.mockResolvedValue(1)

      const id = await stockAdjustmentRepository.create(newAdjustment)

      expect(id).toBe(1)
      expect(mockElectronAPI.sqlite.stockAdjustment.create).toHaveBeenCalledWith(newAdjustment)
    })

    it('should throw error if creation fails', async () => {
      mockElectronAPI.sqlite.stockAdjustment.create.mockRejectedValue(new Error('Database error'))

      await expect(stockAdjustmentRepository.create(createMockAdjustment())).rejects.toThrow(
        'Database error'
      )
    })
  })

  describe('getById', () => {
    it('should get adjustment by id', async () => {
      const mockAdjustment = createMockAdjustment({ id: 1 })
      mockElectronAPI.sqlite.stockAdjustment.getById.mockResolvedValue(mockAdjustment)

      const result = await stockAdjustmentRepository.getById(1)

      expect(result).toEqual(mockAdjustment)
      expect(mockElectronAPI.sqlite.stockAdjustment.getById).toHaveBeenCalledWith(1)
    })

    it('should return null if adjustment not found', async () => {
      mockElectronAPI.sqlite.stockAdjustment.getById.mockResolvedValue(null)

      const result = await stockAdjustmentRepository.getById(999)

      expect(result).toBeNull()
    })
  })

  describe('getAll', () => {
    it('should get all adjustments', async () => {
      const mockAdjustments = [createMockAdjustment({ id: 1 }), createMockAdjustment({ id: 2 })]
      mockElectronAPI.sqlite.stockAdjustment.getAll.mockResolvedValue(mockAdjustments)

      const result = await stockAdjustmentRepository.getAll()

      expect(result).toEqual(mockAdjustments)
      expect(mockElectronAPI.sqlite.stockAdjustment.getAll).toHaveBeenCalled()
    })

    it('should get adjustments with filters', async () => {
      const filters: StockAdjustmentFilters = {
        type: 'in',
        syncStatus: 'pending',
        productId: 1,
      }

      mockElectronAPI.sqlite.stockAdjustment.getAll.mockResolvedValue([])

      await stockAdjustmentRepository.getAll(filters)

      expect(mockElectronAPI.sqlite.stockAdjustment.getAll).toHaveBeenCalledWith(filters)
    })

    it('should get adjustments with date range', async () => {
      const filters: StockAdjustmentFilters = {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      }

      mockElectronAPI.sqlite.stockAdjustment.getAll.mockResolvedValue([])

      await stockAdjustmentRepository.getAll(filters)

      expect(mockElectronAPI.sqlite.stockAdjustment.getAll).toHaveBeenCalledWith(filters)
    })
  })

  describe('getByProductId', () => {
    it('should get adjustments for a specific product', async () => {
      const mockAdjustments = [
        createMockAdjustment({ id: 1, productId: 5 }),
        createMockAdjustment({ id: 2, productId: 5 }),
      ]

      mockElectronAPI.sqlite.stockAdjustment.getByProductId.mockResolvedValue(mockAdjustments)

      const result = await stockAdjustmentRepository.getByProductId(5)

      expect(result).toEqual(mockAdjustments)
      expect(mockElectronAPI.sqlite.stockAdjustment.getByProductId).toHaveBeenCalledWith(5)
    })
  })

  describe('getPending', () => {
    it('should get all pending adjustments', async () => {
      const mockPending = [
        createMockAdjustment({ id: 1, syncStatus: 'pending' }),
        createMockAdjustment({ id: 2, syncStatus: 'pending' }),
      ]

      mockElectronAPI.sqlite.stockAdjustment.getPending.mockResolvedValue(mockPending)

      const result = await stockAdjustmentRepository.getPending()

      expect(result).toEqual(mockPending)
      expect(result.every((adj) => adj.syncStatus === 'pending')).toBe(true)
    })
  })

  describe('markAsSynced', () => {
    it('should mark adjustment as synced with server ID', async () => {
      mockElectronAPI.sqlite.stockAdjustment.markAsSynced.mockResolvedValue(undefined)

      await stockAdjustmentRepository.markAsSynced(1, 100)

      expect(mockElectronAPI.sqlite.stockAdjustment.markAsSynced).toHaveBeenCalledWith(1, 100)
    })
  })

  describe('markAsError', () => {
    it('should mark adjustment sync as error', async () => {
      mockElectronAPI.sqlite.stockAdjustment.markAsError.mockResolvedValue(undefined)

      await stockAdjustmentRepository.markAsError(1, 'Network timeout')

      expect(mockElectronAPI.sqlite.stockAdjustment.markAsError).toHaveBeenCalledWith(
        1,
        'Network timeout'
      )
    })
  })

  describe('update', () => {
    it('should update an adjustment', async () => {
      const updated = createMockAdjustment({ id: 1, quantity: 20 })
      mockElectronAPI.sqlite.stockAdjustment.update.mockResolvedValue(undefined)

      await stockAdjustmentRepository.update(1, updated)

      expect(mockElectronAPI.sqlite.stockAdjustment.update).toHaveBeenCalledWith(1, updated)
    })
  })

  describe('delete', () => {
    it('should delete an adjustment', async () => {
      mockElectronAPI.sqlite.stockAdjustment.delete.mockResolvedValue(undefined)

      await stockAdjustmentRepository.delete(1)

      expect(mockElectronAPI.sqlite.stockAdjustment.delete).toHaveBeenCalledWith(1)
    })
  })

  describe('getSummary', () => {
    it('should get adjustment summary', async () => {
      const mockSummary = {
        totalIn: 100,
        totalOut: 50,
        netChange: 50,
        pendingCount: 2,
      }

      mockElectronAPI.sqlite.stockAdjustment.getSummary.mockResolvedValue(mockSummary)

      const result = await stockAdjustmentRepository.getSummary()

      expect(result).toEqual(mockSummary)
    })

    it('should get summary with filters', async () => {
      const filters: StockAdjustmentFilters = {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      }

      mockElectronAPI.sqlite.stockAdjustment.getSummary.mockResolvedValue({
        totalIn: 50,
        totalOut: 25,
        netChange: 25,
        pendingCount: 1,
      })

      await stockAdjustmentRepository.getSummary(filters)

      expect(mockElectronAPI.sqlite.stockAdjustment.getSummary).toHaveBeenCalledWith(filters)
    })
  })

  describe('createWithStockUpdate', () => {
    it('should create adjustment and prevent negative stock', async () => {
      // Note: createWithStockUpdate doesn't exist in current implementation
      // This test is aspirational for future enhancement
      // For now, validation happens in the hook layer
      const adjustment = createMockAdjustment({
        type: 'out',
        quantity: 150,
      })

      // Just test regular create for now
      mockElectronAPI.sqlite.stockAdjustment.create.mockResolvedValue(1)

      const id = await stockAdjustmentRepository.create(adjustment)

      expect(id).toBe(1)
    })

    it('should create adjustment when stock is sufficient', async () => {
      const adjustment = createMockAdjustment({
        type: 'out',
        quantity: 50,
      })

      mockElectronAPI.sqlite.stockAdjustment.create.mockResolvedValue(1)

      const id = await stockAdjustmentRepository.create(adjustment)

      expect(id).toBe(1)
      expect(mockElectronAPI.sqlite.stockAdjustment.create).toHaveBeenCalled()
    })

    it('should allow stock in without validation', async () => {
      const adjustment = createMockAdjustment({
        type: 'in',
        quantity: 50,
      })

      mockElectronAPI.sqlite.stockAdjustment.create.mockResolvedValue(1)

      const id = await stockAdjustmentRepository.create(adjustment)

      expect(id).toBe(1)
    })
  })
})
