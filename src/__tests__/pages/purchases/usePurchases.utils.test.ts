import { describe, it, expect } from 'vitest'
import type { Purchase } from '@/types/api.types'
import {
  buildPurchasesQueryParams,
  calculatePurchasesStats,
  getPaymentStatus,
  type PurchasesFilters,
} from '@/pages/purchases/hooks/usePurchases'

const createPurchase = (overrides: Partial<Purchase> = {}): Purchase => ({
  id: 1,
  invoiceNumber: 'PUR-001',
  purchaseDate: '2025-12-22',
  totalAmount: 100,
  paidAmount: 0,
  dueAmount: 100,
  ...overrides,
})

describe('usePurchases helpers', () => {
  describe('buildPurchasesQueryParams', () => {
    it('always includes pagination', () => {
      const filters: PurchasesFilters = {
        search: '',
        dateFrom: '',
        dateTo: '',
        supplierId: '',
        paymentStatus: 'all',
      }

      expect(buildPurchasesQueryParams(filters, 2, 25)).toEqual({ page: 2, per_page: 25 })
    })

    it('maps search/date range/supplierId to API params', () => {
      const filters: PurchasesFilters = {
        search: 'inv',
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
        supplierId: '5',
        paymentStatus: 'paid', // client-side only; should not affect params
      }

      expect(buildPurchasesQueryParams(filters, 1, 10)).toEqual({
        page: 1,
        per_page: 10,
        search: 'inv',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        party_id: 5,
      })
    })
  })

  describe('getPaymentStatus', () => {
    it('returns paid when due <= 0', () => {
      expect(getPaymentStatus(createPurchase({ paidAmount: 50, dueAmount: 0 })).status).toBe('paid')
    })

    it('returns partial when paid > 0 and due > 0', () => {
      expect(getPaymentStatus(createPurchase({ paidAmount: 1, dueAmount: 99 })).status).toBe(
        'partial'
      )
    })

    it('returns unpaid when paid == 0 and due > 0', () => {
      expect(getPaymentStatus(createPurchase({ paidAmount: 0, dueAmount: 100 })).status).toBe(
        'unpaid'
      )
    })
  })

  describe('calculatePurchasesStats', () => {
    it('computes totals and counts by payment status', () => {
      const purchases: Purchase[] = [
        createPurchase({ id: 1, totalAmount: 100, paidAmount: 100, dueAmount: 0 }), // paid
        createPurchase({ id: 2, totalAmount: 100, paidAmount: 20, dueAmount: 80 }), // partial
        createPurchase({ id: 3, totalAmount: 50, paidAmount: 0, dueAmount: 50 }), // unpaid
      ]

      const stats = calculatePurchasesStats(purchases, 999)

      expect(stats.total).toBe(999)
      expect(stats.totalAmount).toBe(250)
      expect(stats.totalPaid).toBe(120)
      expect(stats.totalDue).toBe(130)
      expect(stats.paidCount).toBe(1)
      expect(stats.partialCount).toBe(1)
      expect(stats.unpaidCount).toBe(1)
    })
  })
})
