import { describe, it, expect } from 'vitest'
import {
  buildCreatePurchaseRequest,
  calculatePurchaseTotals,
} from '@/pages/purchases/utils/purchaseCalculations'

describe('purchaseCalculations', () => {
  describe('calculatePurchaseTotals', () => {
    it('calculates subtotal/total/due from lines', () => {
      const totals = calculatePurchaseTotals(
        [
          { quantities: 2, productPurchasePrice: 50 },
          { quantities: 1, productPurchasePrice: 20 },
        ],
        { discountAmount: 10, paidAmount: 30 }
      )

      expect(totals.subtotal).toBe(120)
      expect(totals.totalAmount).toBe(110)
      expect(totals.dueAmount).toBe(80)
    })

    it('never returns negative totals', () => {
      const totals = calculatePurchaseTotals([{ quantities: 1, productPurchasePrice: 10 }], {
        discountAmount: 999,
        paidAmount: 999,
      })

      expect(totals.subtotal).toBe(10)
      expect(totals.totalAmount).toBe(0)
      expect(totals.dueAmount).toBe(0)
    })

    it('treats invalid values as zero', () => {
      const totals = calculatePurchaseTotals(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [{ quantities: 'x' as any, productPurchasePrice: NaN }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { discountAmount: 'nope' as any, paidAmount: undefined as any }
      )

      expect(totals.subtotal).toBe(0)
      expect(totals.totalAmount).toBe(0)
      expect(totals.dueAmount).toBe(0)
    })
  })

  describe('buildCreatePurchaseRequest', () => {
    it('maps form-like values to CreatePurchaseRequest and computes totals', () => {
      const req = buildCreatePurchaseRequest({
        party_id: 10,
        invoiceNumber: 'PUR-001',
        purchaseDate: '2025-12-22',
        payment_type_id: 2,
        discountAmount: 5,
        paidAmount: 20,
        products: [
          {
            product_id: 1,
            variant_id: 99,
            batch_no: 'B-001',
            quantities: 2,
            productPurchasePrice: 25,
            productSalePrice: 40,
            mfg_date: '2025-01-01',
            expire_date: '2026-01-01',
          },
        ],
      })

      expect(req.party_id).toBe(10)
      expect(req.invoiceNumber).toBe('PUR-001')
      expect(req.purchaseDate).toBe('2025-12-22')
      expect(req.payment_type_id).toBe(2)

      // subtotal=50, total=45, due=25
      expect(req.totalAmount).toBe(45)
      expect(req.dueAmount).toBe(25)

      expect(req.products).toHaveLength(1)
      expect(req.products[0]).toEqual(
        expect.objectContaining({
          product_id: 1,
          variant_id: 99,
          batch_no: 'B-001',
          quantities: 2,
          productPurchasePrice: 25,
          productSalePrice: 40,
          mfg_date: '2025-01-01',
          expire_date: '2026-01-01',
        })
      )
    })

    it('normalizes empty strings to undefined for optional fields', () => {
      const req = buildCreatePurchaseRequest({
        party_id: 1,
        invoiceNumber: '',
        purchaseDate: '',
        discountAmount: 0,
        paidAmount: 0,
        products: [
          {
            product_id: 2,
            batch_no: '   ',
            quantities: 1,
            productPurchasePrice: 10,
            productSalePrice: 20,
            mfg_date: '',
            expire_date: '   ',
          },
        ],
      })

      expect(req.invoiceNumber).toBeUndefined()
      expect(req.purchaseDate).toBeUndefined()

      expect(req.products[0].batch_no).toBeUndefined()
      expect(req.products[0].mfg_date).toBeUndefined()
      expect(req.products[0].expire_date).toBeUndefined()
    })
  })
})
