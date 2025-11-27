import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CreateSaleRequest, Sale } from '@/types/api.types'

// ============================================
// Mock Setup - Must be hoisted
// ============================================

vi.mock('@/api/services/sales.service', () => ({
  salesService: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
  },
}))

vi.mock('@/lib/db/repositories', () => ({
  saleRepository: {
    createOffline: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    countPendingSync: vi.fn(),
    getOfflineSales: vi.fn(),
  },
  syncQueueRepository: {
    enqueue: vi.fn(),
  },
}))

vi.mock('@/stores/sync.store', () => ({
  useSyncStore: {
    getState: vi.fn(),
  },
}))

vi.mock('@/api/offlineHandler', () => ({
  isOfflineQueuedError: vi.fn(),
}))

// Import after mocking
import { offlineSalesService } from '@/api/services/offlineSales.service'
import { salesService } from '@/api/services/sales.service'
import { saleRepository, syncQueueRepository } from '@/lib/db/repositories'
import { useSyncStore } from '@/stores/sync.store'
import { isOfflineQueuedError } from '@/api/offlineHandler'

// Cast to mocked types
const mockSalesService = salesService as unknown as {
  create: ReturnType<typeof vi.fn>
  getAll: ReturnType<typeof vi.fn>
  getById: ReturnType<typeof vi.fn>
}

const mockSaleRepository = saleRepository as unknown as {
  createOffline: ReturnType<typeof vi.fn>
  getAll: ReturnType<typeof vi.fn>
  getById: ReturnType<typeof vi.fn>
  countPendingSync: ReturnType<typeof vi.fn>
  getOfflineSales: ReturnType<typeof vi.fn>
}

const mockSyncQueueRepository = syncQueueRepository as unknown as {
  enqueue: ReturnType<typeof vi.fn>
}

const mockUseSyncStore = useSyncStore as unknown as {
  getState: ReturnType<typeof vi.fn>
}

const mockIsOfflineQueuedError = isOfflineQueuedError as ReturnType<typeof vi.fn>

// ============================================
// Test Fixtures
// ============================================

const createMockSaleRequest = (
  overrides: Partial<CreateSaleRequest> = {}
): CreateSaleRequest => ({
  party_id: 1,
  saleDate: '2025-01-01',
  totalAmount: 1000,
  discountAmount: 50,
  paidAmount: 950,
  dueAmount: 0,
  payment_type_id: 1,
  note: 'Test sale',
  products: JSON.stringify([
    {
      stock_id: 1,
      product_name: 'Test Product',
      quantities: 2,
      price: 500,
      lossProfit: 100,
    },
  ]),
  ...overrides,
})

const createMockSale = (overrides: Partial<Sale> = {}): Sale =>
  ({
    id: 1,
    invoiceNumber: 'INV-001',
    customerId: 1,
    saleDate: '2025-01-01',
    totalAmount: 1000,
    discountAmount: 50,
    paidAmount: 950,
    dueAmount: 0,
    paymentTypeId: 1,
    note: 'Test sale',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    saleItems: [],
    ...overrides,
  }) as Sale

const createMockSyncState = (overrides = {}) => ({
  isOnline: true,
  updatePendingSyncCount: vi.fn(),
  ...overrides,
})

// ============================================
// Test Suite
// ============================================

describe('OfflineSalesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    describe('when online', () => {
      it('should create sale via API when online', async () => {
        const saleRequest = createMockSaleRequest()
        const mockSale = createMockSale()

        mockUseSyncStore.getState.mockReturnValue(createMockSyncState({ isOnline: true }))
        mockSalesService.create.mockResolvedValue({ data: mockSale })

        const result = await offlineSalesService.create(saleRequest)

        expect(result.isOffline).toBe(false)
        expect(result.data).toEqual(mockSale)
        expect(mockSalesService.create).toHaveBeenCalledWith(saleRequest)
        expect(mockSaleRepository.createOffline).not.toHaveBeenCalled()
        expect(mockSyncQueueRepository.enqueue).not.toHaveBeenCalled()
      })

      it('should fall back to offline when API fails with offline error', async () => {
        const saleRequest = createMockSaleRequest()
        const syncState = createMockSyncState({ isOnline: true })

        mockUseSyncStore.getState.mockReturnValue(syncState)
        mockSalesService.create.mockRejectedValue(new Error('Network error'))
        mockIsOfflineQueuedError.mockReturnValue(true) // Indicates offline error
        mockSaleRepository.createOffline.mockResolvedValue(123)
        mockSyncQueueRepository.enqueue.mockResolvedValue(1)

        const result = await offlineSalesService.create(saleRequest)

        expect(result.isOffline).toBe(true)
        expect(result.data.invoiceNumber).toMatch(/^OFFLINE-\d+$/)
        expect(mockSaleRepository.createOffline).toHaveBeenCalled()
        expect(mockSyncQueueRepository.enqueue).toHaveBeenCalled()
        expect(syncState.updatePendingSyncCount).toHaveBeenCalled()
      })

      it('should throw error when API fails with non-offline error', async () => {
        const saleRequest = createMockSaleRequest()
        const apiError = new Error('Server validation error')

        mockUseSyncStore.getState.mockReturnValue(createMockSyncState({ isOnline: true }))
        mockSalesService.create.mockRejectedValue(apiError)
        mockIsOfflineQueuedError.mockReturnValue(false) // Not an offline error

        await expect(offlineSalesService.create(saleRequest)).rejects.toThrow(
          'Server validation error'
        )

        expect(mockSaleRepository.createOffline).not.toHaveBeenCalled()
      })
    })

    describe('when offline', () => {
      it('should save sale locally and queue for sync', async () => {
        const saleRequest = createMockSaleRequest()
        const syncState = createMockSyncState({ isOnline: false })

        mockUseSyncStore.getState.mockReturnValue(syncState)
        mockSaleRepository.createOffline.mockResolvedValue(456)
        mockSyncQueueRepository.enqueue.mockResolvedValue(1)

        const result = await offlineSalesService.create(saleRequest)

        expect(result.isOffline).toBe(true)
        expect(result.data.id).toBe(456)
        expect(result.data.invoiceNumber).toMatch(/^OFFLINE-\d+$/)
        expect(result.data.totalAmount).toBe(saleRequest.totalAmount)

        // Verify IndexedDB save
        expect(mockSaleRepository.createOffline).toHaveBeenCalled()

        // Verify sync queue entry
        expect(mockSyncQueueRepository.enqueue).toHaveBeenCalledWith(
          expect.objectContaining({
            operation: 'CREATE',
            entity: 'sale',
            entityId: 456,
            endpoint: '/sales',
            method: 'POST',
            data: saleRequest,
          })
        )

        expect(syncState.updatePendingSyncCount).toHaveBeenCalled()
      })

      it('should generate unique temporary invoice numbers', async () => {
        const syncState = createMockSyncState({ isOnline: false })
        mockUseSyncStore.getState.mockReturnValue(syncState)
        mockSaleRepository.createOffline.mockResolvedValue(1)
        mockSyncQueueRepository.enqueue.mockResolvedValue(1)

        const result1 = await offlineSalesService.create(createMockSaleRequest())

        // Small delay to ensure different timestamp
        await new Promise((r) => setTimeout(r, 10))

        const result2 = await offlineSalesService.create(createMockSaleRequest())

        expect(result1.data.invoiceNumber).not.toBe(result2.data.invoiceNumber)
        expect(result1.data.invoiceNumber).toMatch(/^OFFLINE-\d+$/)
        expect(result2.data.invoiceNumber).toMatch(/^OFFLINE-\d+$/)
      })

      it('should handle sale without optional fields', async () => {
        const minimalSaleRequest: CreateSaleRequest = {
          totalAmount: 500,
          paidAmount: 500,
          products: JSON.stringify([
            {
              stock_id: 1,
              product_name: 'Test Product',
              quantities: 1,
              price: 500,
              lossProfit: 50,
            },
          ]),
        }

        const syncState = createMockSyncState({ isOnline: false })
        mockUseSyncStore.getState.mockReturnValue(syncState)
        mockSaleRepository.createOffline.mockResolvedValue(789)
        mockSyncQueueRepository.enqueue.mockResolvedValue(1)

        const result = await offlineSalesService.create(minimalSaleRequest)

        expect(result.isOffline).toBe(true)
        expect(result.data.totalAmount).toBe(500)
        expect(result.data.discountAmount).toBe(0)
        expect(result.data.dueAmount).toBe(0)
      })
    })
  })

  describe('getAll', () => {
    it('should fetch from API when online', async () => {
      const mockSales = [createMockSale({ id: 1 }), createMockSale({ id: 2 })]

      mockUseSyncStore.getState.mockReturnValue(createMockSyncState({ isOnline: true }))
      mockSalesService.getAll.mockResolvedValue({ data: mockSales })

      const result = await offlineSalesService.getAll()

      expect(result).toEqual(mockSales)
      expect(mockSalesService.getAll).toHaveBeenCalled()
      expect(mockSaleRepository.getAll).not.toHaveBeenCalled()
    })

    it('should fall back to local data when API fails', async () => {
      const localSales = [{ id: 1, invoiceNumber: 'LOCAL-001' }]

      mockUseSyncStore.getState.mockReturnValue(createMockSyncState({ isOnline: true }))
      mockSalesService.getAll.mockRejectedValue(new Error('Network error'))
      mockSaleRepository.getAll.mockResolvedValue(localSales)

      const result = await offlineSalesService.getAll()

      expect(result).toEqual(localSales)
      expect(mockSaleRepository.getAll).toHaveBeenCalled()
    })

    it('should use local data when offline', async () => {
      const localSales = [{ id: 1, invoiceNumber: 'LOCAL-001' }]

      mockUseSyncStore.getState.mockReturnValue(createMockSyncState({ isOnline: false }))
      mockSaleRepository.getAll.mockResolvedValue(localSales)

      const result = await offlineSalesService.getAll()

      expect(result).toEqual(localSales)
      expect(mockSalesService.getAll).not.toHaveBeenCalled()
      expect(mockSaleRepository.getAll).toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('should fetch from API when online', async () => {
      const mockSale = createMockSale({ id: 5 })

      mockUseSyncStore.getState.mockReturnValue(createMockSyncState({ isOnline: true }))
      mockSalesService.getById.mockResolvedValue({ data: mockSale })

      const result = await offlineSalesService.getById(5)

      expect(result).toEqual(mockSale)
      expect(mockSalesService.getById).toHaveBeenCalledWith(5)
    })

    it('should fall back to local data when API fails', async () => {
      const localSale = { id: 5, invoiceNumber: 'LOCAL-005' }

      mockUseSyncStore.getState.mockReturnValue(createMockSyncState({ isOnline: true }))
      mockSalesService.getById.mockRejectedValue(new Error('Network error'))
      mockSaleRepository.getById.mockResolvedValue(localSale)

      const result = await offlineSalesService.getById(5)

      expect(result).toEqual(localSale)
      expect(mockSaleRepository.getById).toHaveBeenCalledWith(5)
    })

    it('should use local data when offline', async () => {
      const localSale = { id: 5, invoiceNumber: 'LOCAL-005' }

      mockUseSyncStore.getState.mockReturnValue(createMockSyncState({ isOnline: false }))
      mockSaleRepository.getById.mockResolvedValue(localSale)

      const result = await offlineSalesService.getById(5)

      expect(result).toEqual(localSale)
      expect(mockSalesService.getById).not.toHaveBeenCalled()
    })
  })

  describe('getOfflineSalesCount', () => {
    it('should return count of pending sync sales', async () => {
      mockSaleRepository.countPendingSync.mockResolvedValue(5)

      const result = await offlineSalesService.getOfflineSalesCount()

      expect(result).toBe(5)
      expect(mockSaleRepository.countPendingSync).toHaveBeenCalled()
    })
  })

  describe('getOfflineSales', () => {
    it('should return all offline sales', async () => {
      const offlineSales = [
        { id: 1, invoiceNumber: 'OFFLINE-001', isSynced: false },
        { id: 2, invoiceNumber: 'OFFLINE-002', isSynced: false },
      ]

      mockSaleRepository.getOfflineSales.mockResolvedValue(offlineSales)

      const result = await offlineSalesService.getOfflineSales()

      expect(result).toEqual(offlineSales)
      expect(mockSaleRepository.getOfflineSales).toHaveBeenCalled()
    })
  })
})
