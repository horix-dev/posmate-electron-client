import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================
// Mock Setup - Must be hoisted
// ============================================

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Import after mocking
import api from '@/api/axios'
import { salesService } from '@/api/services/sales.service'

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe('salesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAll calls GET /sales with no params by default', async () => {
    mockApi.get.mockResolvedValue({ data: { data: [], message: 'ok' } })

    await salesService.getAll()

    expect(mockApi.get).toHaveBeenCalledWith('/sales', { params: {} })
  })

  it('getAll supports returnedOnly flag', async () => {
    mockApi.get.mockResolvedValue({ data: { data: [], message: 'ok' } })

    await salesService.getAll(true)

    expect(mockApi.get).toHaveBeenCalledWith('/sales', { params: { 'returned-sales': 'true' } })
  })

  it('getById calls GET /sales/{id}', async () => {
    mockApi.get.mockResolvedValue({ data: { data: { id: 1 }, message: 'ok' } })

    await salesService.getById(123)

    expect(mockApi.get).toHaveBeenCalledWith('/sales/123')
  })

  it('create builds FormData when passed an object', async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: 1 }, message: 'ok' } })

    const appendSpy = vi.spyOn(FormData.prototype, 'append')

    await salesService.create({
      party_id: 1,
      saleDate: '2025-12-22',
      totalAmount: 100,
      paidAmount: 100,
      products: JSON.stringify([{ stock_id: 1, quantities: 1, price: 100, lossProfit: 0 }]),
    } as unknown as FormData)

    expect(mockApi.post).toHaveBeenCalledWith(
      '/sales',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
    )

    // Ensure we appended at least a couple of fields
    expect(appendSpy).toHaveBeenCalled()
    appendSpy.mockRestore()
  })

  it('create uses FormData directly when passed FormData', async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: 1 }, message: 'ok' } })

    const fd = new FormData()
    fd.append('party_id', '1')

    await salesService.create(fd)

    expect(mockApi.post).toHaveBeenCalledWith(
      '/sales',
      fd,
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
    )
  })

  it('update calls PUT /sales/{id} with multipart/form-data', async () => {
    mockApi.put.mockResolvedValue({ data: { data: { id: 1 }, message: 'ok' } })

    await salesService.update(5, { paidAmount: 10 } as unknown as FormData)

    expect(mockApi.put).toHaveBeenCalledWith(
      '/sales/5',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
    )
  })

  it('delete calls DELETE /sales/{id}', async () => {
    mockApi.delete.mockResolvedValue({ data: { data: null, message: 'ok' } })

    await salesService.delete(9)

    expect(mockApi.delete).toHaveBeenCalledWith('/sales/9')
  })

  it('getNewInvoiceNumber calls /new-invoice with platform=sales', async () => {
    mockApi.get.mockResolvedValue({ data: 'INV-NEW' })

    const invoice = await salesService.getNewInvoiceNumber()

    expect(invoice).toBe('INV-NEW')
    expect(mockApi.get).toHaveBeenCalledWith('/new-invoice', { params: { platform: 'sales' } })
  })
})
