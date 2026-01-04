import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================
// Mock Setup - Must be hoisted
// ============================================

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

// Import after mocking
import api from '@/api/axios'
import { purchasesService } from '@/api/services/purchases.service'

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('purchasesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAll calls GET /purchase with params', async () => {
    mockApi.get.mockResolvedValue({ data: { data: [], message: 'ok' } })

    await purchasesService.getAll({ page: 2, per_page: 25, search: 'abc' })

    expect(mockApi.get).toHaveBeenCalledWith('/purchase', {
      params: { page: 2, per_page: 25, search: 'abc' },
    })
  })

  it('filter calls GET /purchase with params', async () => {
    mockApi.get.mockResolvedValue({ data: { data: [], message: 'ok' } })

    await purchasesService.filter({ start_date: '2025-01-01', end_date: '2025-01-31' })

    expect(mockApi.get).toHaveBeenCalledWith('/purchase', {
      params: { start_date: '2025-01-01', end_date: '2025-01-31' },
    })
  })

  it('getById calls GET /purchase/{id}', async () => {
    mockApi.get.mockResolvedValue({ data: { data: { id: 123 }, message: 'ok' } })

    await purchasesService.getById(123)

    expect(mockApi.get).toHaveBeenCalledWith('/purchase/123')
  })

  it('create calls POST /purchase with payload', async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: 1 }, message: 'ok' } })

    const payload = {
      party_id: 1,
      purchaseDate: '2025-12-22',
      totalAmount: 100,
      paidAmount: 100,
      products: [
        {
          product_id: 5,
          quantities: 1,
          productPurchasePrice: 50,
          productSalePrice: 70,
        },
      ],
    }

    await purchasesService.create(payload)

    expect(mockApi.post).toHaveBeenCalledWith('/purchase', payload)
  })

  it('update calls POST /purchase/{id} with _method=PUT', async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: 10 }, message: 'ok' } })

    await purchasesService.update(10, { paidAmount: 25 })

    expect(mockApi.post).toHaveBeenCalledWith('/purchase/10', {
      paidAmount: 25,
      _method: 'PUT',
    })
  })

  it('delete calls DELETE /purchase/{id}', async () => {
    mockApi.delete.mockResolvedValue({ data: { data: null, message: 'ok' } })

    await purchasesService.delete(99)

    expect(mockApi.delete).toHaveBeenCalledWith('/purchase/99')
  })
})
