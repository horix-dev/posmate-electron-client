import { describe, it, expect } from 'vitest'
import type { Sale, Party } from '@/types/api.types'
import {
  calculateSalesStats,
  filterSales,
  getPaymentStatus,
  isSaleSynced,
  type SalesFilters,
} from '@/pages/sales/hooks/useSales'

const baseFilters: SalesFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
  customerId: '',
  paymentStatus: 'all',
  syncStatus: 'all',
}

const createSale = (overrides: Partial<Sale & { isOffline?: boolean; isSynced?: boolean }> = {}) =>
  ({
    id: 1,
    invoiceNumber: 'INV-001',
    customerId: 1,
    saleDate: '2025-12-22',
    totalAmount: 100,
    discountAmount: 0,
    paidAmount: 0,
    dueAmount: 100,
    paymentTypeId: 1,
    createdAt: '2025-12-22T00:00:00Z',
    updatedAt: '2025-12-22T00:00:00Z',
    saleItems: [],
    ...overrides,
  }) as Sale & { isOffline?: boolean; isSynced?: boolean }

describe('useSales helpers', () => {
  describe('getPaymentStatus', () => {
    it('paid when due <= 0', () => {
      expect(getPaymentStatus(createSale({ paidAmount: 100, dueAmount: 0 })).status).toBe('paid')
    })

    it('partial when paid > 0 and due > 0', () => {
      expect(getPaymentStatus(createSale({ paidAmount: 1, dueAmount: 99 })).status).toBe('partial')
    })

    it('unpaid when paid == 0 and due > 0', () => {
      expect(getPaymentStatus(createSale({ paidAmount: 0, dueAmount: 100 })).status).toBe('unpaid')
    })
  })

  describe('isSaleSynced', () => {
    it('treats API sales as synced (non OFFLINE invoice)', () => {
      expect(isSaleSynced(createSale({ invoiceNumber: 'INV-123' }))).toBe(true)
    })

    it('treats OFFLINE- invoice as not synced when no flags exist', () => {
      expect(isSaleSynced(createSale({ invoiceNumber: 'OFFLINE-123' }))).toBe(false)
    })

    it('uses isSynced/isOffline flags when present', () => {
      expect(isSaleSynced(createSale({ isSynced: true, isOffline: true }))).toBe(true)
      expect(isSaleSynced(createSale({ isSynced: false, isOffline: true }))).toBe(false)
      expect(isSaleSynced(createSale({ isSynced: false, isOffline: false }))).toBe(true)
    })
  })

  describe('filterSales', () => {
    it('filters by search (invoice or customer name)', () => {
      const sales: Sale[] = [
        createSale({
          id: 1,
          invoiceNumber: 'INV-APPLE',
          party: { id: 1, name: 'Alice' } as Party,
        }),
        createSale({
          id: 2,
          invoiceNumber: 'INV-BANANA',
          party: { id: 2, name: 'Bob' } as Party,
        }),
      ]

      const result1 = filterSales(sales, { ...baseFilters, search: 'apple' })
      expect(result1.map((s) => s.id)).toEqual([1])

      const result2 = filterSales(sales, { ...baseFilters, search: 'bob' })
      expect(result2.map((s) => s.id)).toEqual([2])
    })

    it('filters by dateFrom/dateTo inclusive end-of-day', () => {
      const sales: Sale[] = [
        createSale({ id: 1, saleDate: '2025-01-01T00:00:00Z' }),
        createSale({ id: 2, saleDate: '2025-01-31T23:59:59Z' }),
        createSale({ id: 3, saleDate: '2025-02-01T00:00:00Z' }),
      ]

      const result = filterSales(sales, {
        ...baseFilters,
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      })

      expect(result.map((s) => s.id).sort()).toEqual([1, 2])
    })

    it('filters by customerId', () => {
      const sales: Sale[] = [
        createSale({ id: 1, party: { id: 10, name: 'A' } as Party }),
        createSale({ id: 2, party: { id: 20, name: 'B' } as Party }),
      ]

      const result = filterSales(sales, { ...baseFilters, customerId: '20' })
      expect(result.map((s) => s.id)).toEqual([2])
    })

    it('filters by paymentStatus', () => {
      const sales: Sale[] = [
        createSale({ id: 1, paidAmount: 100, dueAmount: 0 }), // paid
        createSale({ id: 2, paidAmount: 1, dueAmount: 99 }), // partial
        createSale({ id: 3, paidAmount: 0, dueAmount: 100 }), // unpaid
      ]

      expect(
        filterSales(sales, { ...baseFilters, paymentStatus: 'paid' }).map((s) => s.id)
      ).toEqual([1])
      expect(
        filterSales(sales, { ...baseFilters, paymentStatus: 'partial' }).map((s) => s.id)
      ).toEqual([2])
      expect(
        filterSales(sales, { ...baseFilters, paymentStatus: 'unpaid' }).map((s) => s.id)
      ).toEqual([3])
    })

    it('filters by syncStatus using invoice prefix fallback', () => {
      const sales: Sale[] = [
        createSale({ id: 1, invoiceNumber: 'INV-1' }),
        createSale({ id: 2, invoiceNumber: 'OFFLINE-2' }),
      ]

      expect(filterSales(sales, { ...baseFilters, syncStatus: 'synced' }).map((s) => s.id)).toEqual(
        [1]
      )
      expect(
        filterSales(sales, { ...baseFilters, syncStatus: 'pending' }).map((s) => s.id)
      ).toEqual([2])
    })
  })

  describe('calculateSalesStats', () => {
    it('computes totals, status counts, and pendingSyncCount', () => {
      const sales: Sale[] = [
        createSale({
          id: 1,
          totalAmount: 100,
          paidAmount: 100,
          dueAmount: 0,
          invoiceNumber: 'INV-1',
        }),
        createSale({
          id: 2,
          totalAmount: 50,
          paidAmount: 0,
          dueAmount: 50,
          invoiceNumber: 'OFFLINE-2',
        }),
      ]

      const stats = calculateSalesStats(sales)

      expect(stats.total).toBe(2)
      expect(stats.totalAmount).toBe(150)
      expect(stats.totalPaid).toBe(100)
      expect(stats.totalDue).toBe(50)
      expect(stats.paidCount).toBe(1)
      expect(stats.unpaidCount).toBe(1)
      expect(stats.pendingSyncCount).toBe(1)
    })
  })
})
