import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import type { Product, Stock, Party, PaymentType, Vat } from '@/types/api.types'

// Mock the repositories to avoid actual IndexedDB calls in unit tests
vi.mock('@/lib/db/repositories', () => ({
  heldCartRepository: {
    create: vi.fn().mockResolvedValue(1),
    deleteByCartId: vi.fn().mockResolvedValue(undefined),
    getAllSorted: vi.fn().mockResolvedValue([]),
  },
}))

// Import the store after mocking
import { useCartStore } from '@/stores/cart.store'

// ============================================
// Test Fixtures
// ============================================

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  productName: 'Test Product',
  productCode: 'TP001',
  product_type: 'simple',
  ...overrides,
})

const createMockStock = (overrides: Partial<Stock> = {}): Stock => ({
  id: 1,
  product_id: 1,
  productStock: 100,
  productPurchasePrice: 80,
  productSalePrice: 100,
  productDealerPrice: 90,
  productWholeSalePrice: 85,
  ...overrides,
})

const createMockParty = (overrides: Partial<Party> = {}): Party => ({
  id: 1,
  business_id: 1,
  name: 'Test Customer',
  type: 'Retailer',
  due: 0,
  wallet: 0,
  opening_balance: 0,
  opening_balance_type: 'due' as const,
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

const createMockPaymentType = (overrides: Partial<PaymentType> = {}): PaymentType => ({
  id: 1,
  name: 'Cash',
  ...overrides,
})

const createMockVat = (overrides: Partial<Vat> = {}): Vat => ({
  id: 1,
  name: 'VAT 10%',
  rate: 10,
  ...overrides,
})

// ============================================
// Test Suite
// ============================================

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useCartStore.getState().clearCart()
    })
  })

  describe('Initial State', () => {
    it('should start with empty cart', () => {
      const state = useCartStore.getState()

      expect(state.items).toEqual([])
      expect(state.customer).toBeNull()
      expect(state.paymentType).toBeNull()
      expect(state.vat).toBeNull()
      expect(state.discount).toBe(0)
      expect(state.discountType).toBe('fixed')
      expect(state.paidAmount).toBe(0)
      expect(state.note).toBe('')
      expect(state.subtotal).toBe(0)
      expect(state.totalAmount).toBe(0)
    })
  })

  describe('addItem', () => {
    it('should add a new item to the cart', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 1)
      })

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].product.id).toBe(product.id)
      expect(state.items[0].stock.id).toBe(stock.id)
      expect(state.items[0].quantity).toBe(1)
      expect(state.items[0].unitPrice).toBe(100)
      expect(state.items[0].total).toBe(100)
    })

    it('should increase quantity if same stock is added again', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 1)
        useCartStore.getState().addItem(product, stock, 2)
      })

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].quantity).toBe(3)
      expect(state.items[0].total).toBe(300)
    })

    it('should add separate items for different stocks', () => {
      const product1 = createMockProduct({ id: 1 })
      const stock1 = createMockStock({ id: 1, productSalePrice: 100 })
      const product2 = createMockProduct({ id: 2 })
      const stock2 = createMockStock({ id: 2, product_id: 2, productSalePrice: 150 })

      act(() => {
        useCartStore.getState().addItem(product1, stock1, 1)
        useCartStore.getState().addItem(product2, stock2, 2)
      })

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(2)
      expect(state.subtotal).toBe(400) // 100 + (150 * 2)
    })

    it('should use default quantity of 1 when not specified', () => {
      const product = createMockProduct()
      const stock = createMockStock()

      act(() => {
        useCartStore.getState().addItem(product, stock)
      })

      expect(useCartStore.getState().items[0].quantity).toBe(1)
    })
  })

  describe('updateItemQuantity', () => {
    it('should update quantity and recalculate total', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 1)
      })

      const itemId = useCartStore.getState().items[0].id

      act(() => {
        useCartStore.getState().updateItemQuantity(itemId, 5)
      })

      const state = useCartStore.getState()
      expect(state.items[0].quantity).toBe(5)
      expect(state.items[0].total).toBe(500)
      expect(state.subtotal).toBe(500)
    })

    it('should remove item if quantity is 0 or less', () => {
      const product = createMockProduct()
      const stock = createMockStock()

      act(() => {
        useCartStore.getState().addItem(product, stock, 5)
      })

      const itemId = useCartStore.getState().items[0].id

      act(() => {
        useCartStore.getState().updateItemQuantity(itemId, 0)
      })

      expect(useCartStore.getState().items).toHaveLength(0)
    })
  })

  describe('updateItemPrice', () => {
    it('should update price and recalculate total', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 2)
      })

      const itemId = useCartStore.getState().items[0].id

      act(() => {
        useCartStore.getState().updateItemPrice(itemId, 150)
      })

      const state = useCartStore.getState()
      expect(state.items[0].unitPrice).toBe(150)
      expect(state.items[0].total).toBe(300) // 2 * 150
      expect(state.subtotal).toBe(300)
    })
  })

  describe('updateItemDiscount', () => {
    it('should apply fixed discount to item', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 2)
      })

      const itemId = useCartStore.getState().items[0].id

      act(() => {
        useCartStore.getState().updateItemDiscount(itemId, 20, 'fixed')
      })

      const state = useCartStore.getState()
      expect(state.items[0].discount).toBe(20)
      expect(state.items[0].discountType).toBe('fixed')
      expect(state.items[0].total).toBe(180) // (2 * 100) - 20
    })

    it('should apply percentage discount to item', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 2)
      })

      const itemId = useCartStore.getState().items[0].id

      act(() => {
        useCartStore.getState().updateItemDiscount(itemId, 10, 'percentage')
      })

      const state = useCartStore.getState()
      expect(state.items[0].discount).toBe(10)
      expect(state.items[0].discountType).toBe('percentage')
      expect(state.items[0].total).toBe(180) // (2 * 100) - 10% = 200 - 20
    })
  })

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const product = createMockProduct()
      const stock = createMockStock()

      act(() => {
        useCartStore.getState().addItem(product, stock, 1)
      })

      const itemId = useCartStore.getState().items[0].id

      act(() => {
        useCartStore.getState().removeItem(itemId)
      })

      expect(useCartStore.getState().items).toHaveLength(0)
      expect(useCartStore.getState().subtotal).toBe(0)
    })
  })

  describe('clearCart', () => {
    it('should reset cart to initial state', () => {
      const product = createMockProduct()
      const stock = createMockStock()
      const customer = createMockParty()
      const vat = createMockVat()

      act(() => {
        useCartStore.getState().addItem(product, stock, 5)
        useCartStore.getState().setCustomer(customer)
        useCartStore.getState().setVat(vat)
        useCartStore.getState().setDiscount(10, 'percentage')
      })

      act(() => {
        useCartStore.getState().clearCart()
      })

      const state = useCartStore.getState()
      expect(state.items).toEqual([])
      expect(state.customer).toBeNull()
      expect(state.vat).toBeNull()
      expect(state.discount).toBe(0)
      expect(state.subtotal).toBe(0)
      expect(state.totalAmount).toBe(0)
    })
  })

  describe('Cart-Level Discount', () => {
    it('should apply fixed discount to total', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 5) // Subtotal: 500
        useCartStore.getState().setDiscount(50, 'fixed')
      })

      const state = useCartStore.getState()
      expect(state.subtotal).toBe(500)
      expect(state.discountAmount).toBe(50)
      expect(state.totalAmount).toBe(450)
    })

    it('should apply percentage discount to total', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 10) // Subtotal: 1000
        useCartStore.getState().setDiscount(15, 'percentage')
      })

      const state = useCartStore.getState()
      expect(state.subtotal).toBe(1000)
      expect(state.discountAmount).toBe(150) // 15% of 1000
      expect(state.totalAmount).toBe(850)
    })
  })

  describe('VAT Calculations', () => {
    it('should calculate VAT on taxable amount (after discount)', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })
      const vat = createMockVat({ rate: 10 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 10) // Subtotal: 1000
        useCartStore.getState().setDiscount(100, 'fixed') // Discount: 100
        useCartStore.getState().setVat(vat) // VAT: 10%
      })

      const state = useCartStore.getState()
      expect(state.subtotal).toBe(1000)
      expect(state.discountAmount).toBe(100)
      // Taxable: 1000 - 100 = 900
      // VAT: 900 * 10% = 90
      expect(state.vatAmount).toBe(90)
      // Total: 900 + 90 = 990
      expect(state.totalAmount).toBe(990)
    })

    it('should handle zero VAT', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 5)
      })

      const state = useCartStore.getState()
      expect(state.vatAmount).toBe(0)
      expect(state.totalAmount).toBe(500)
    })

    it('should recalculate when VAT is removed', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })
      const vat = createMockVat({ rate: 10 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 10)
        useCartStore.getState().setVat(vat)
      })

      expect(useCartStore.getState().vatAmount).toBe(100) // 10% of 1000

      act(() => {
        useCartStore.getState().setVat(null)
      })

      expect(useCartStore.getState().vatAmount).toBe(0)
      expect(useCartStore.getState().totalAmount).toBe(1000)
    })
  })

  describe('Payment Calculations', () => {
    it('should calculate due amount when underpaid', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 5) // Total: 500
        useCartStore.getState().setPaidAmount(300)
      })

      const state = useCartStore.getState()
      expect(state.totalAmount).toBe(500)
      expect(state.paidAmount).toBe(300)
      expect(state.dueAmount).toBe(200)
      expect(state.changeAmount).toBe(0)
    })

    it('should calculate change amount when overpaid', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 5) // Total: 500
        useCartStore.getState().setPaidAmount(600)
      })

      const state = useCartStore.getState()
      expect(state.totalAmount).toBe(500)
      expect(state.paidAmount).toBe(600)
      expect(state.dueAmount).toBe(0)
      expect(state.changeAmount).toBe(100)
    })

    it('should handle exact payment', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 5)
        useCartStore.getState().setPaidAmount(500)
      })

      const state = useCartStore.getState()
      expect(state.dueAmount).toBe(0)
      expect(state.changeAmount).toBe(0)
    })
  })

  describe('Complex Scenario', () => {
    it('should correctly calculate totals with multiple items, discount, and VAT', () => {
      const product1 = createMockProduct({ id: 1, productName: 'Product A' })
      const stock1 = createMockStock({ id: 1, productSalePrice: 100 })
      const product2 = createMockProduct({ id: 2, productName: 'Product B' })
      const stock2 = createMockStock({ id: 2, product_id: 2, productSalePrice: 50 })
      const vat = createMockVat({ rate: 13 }) // 13% VAT

      act(() => {
        // Add items
        useCartStore.getState().addItem(product1, stock1, 3) // 3 x 100 = 300
        useCartStore.getState().addItem(product2, stock2, 4) // 4 x 50 = 200
        // Subtotal: 500

        // Apply 10% cart discount
        useCartStore.getState().setDiscount(10, 'percentage')
        // Discount: 50, Taxable: 450

        // Apply 13% VAT
        useCartStore.getState().setVat(vat)
        // VAT: 450 * 0.13 = 58.5
        // Total: 450 + 58.5 = 508.5
      })

      const state = useCartStore.getState()
      expect(state.subtotal).toBe(500)
      expect(state.discountAmount).toBe(50)
      expect(state.vatAmount).toBe(58.5)
      expect(state.totalAmount).toBe(508.5)
    })

    it('should handle item-level and cart-level discounts together', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 10) // Subtotal before item discount: 1000
      })

      const itemId = useCartStore.getState().items[0].id

      act(() => {
        // Apply 10% item discount
        useCartStore.getState().updateItemDiscount(itemId, 10, 'percentage')
        // Item total: 1000 - 100 = 900

        // Apply $50 cart discount
        useCartStore.getState().setDiscount(50, 'fixed')
        // Total: 900 - 50 = 850
      })

      const state = useCartStore.getState()
      expect(state.items[0].total).toBe(900)
      expect(state.subtotal).toBe(900)
      expect(state.discountAmount).toBe(50)
      expect(state.totalAmount).toBe(850)
    })
  })

  describe('Customer and Payment Type', () => {
    it('should set customer', () => {
      const customer = createMockParty({ id: 5, name: 'John Doe' })

      act(() => {
        useCartStore.getState().setCustomer(customer)
      })

      expect(useCartStore.getState().customer).toEqual(customer)
    })

    it('should set payment type', () => {
      const paymentType = createMockPaymentType({ id: 2, name: 'Card' })

      act(() => {
        useCartStore.getState().setPaymentType(paymentType)
      })

      expect(useCartStore.getState().paymentType).toEqual(paymentType)
    })

    it('should set note', () => {
      act(() => {
        useCartStore.getState().setNote('Special instructions')
      })

      expect(useCartStore.getState().note).toBe('Special instructions')
    })
  })

  describe('Edge Cases', () => {
    it('should handle discount greater than subtotal (fixed)', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 1) // Subtotal: 100
        useCartStore.getState().setDiscount(200, 'fixed') // Discount > Subtotal
      })

      const state = useCartStore.getState()
      // Discount is applied, taxable amount becomes negative
      // But VAT is calculated on negative, then total
      expect(state.discountAmount).toBe(200)
      // Taxable: 100 - 200 = -100
      // Total: -100 + 0 (no VAT) = -100
      expect(state.totalAmount).toBe(-100)
    })

    it('should prevent negative item total from item discount', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 1) // Item total: 100
      })

      const itemId = useCartStore.getState().items[0].id

      act(() => {
        // Apply discount greater than item value
        useCartStore.getState().updateItemDiscount(itemId, 200, 'fixed')
      })

      // Item total should be clamped to 0
      expect(useCartStore.getState().items[0].total).toBe(0)
    })

    it('should handle 100% percentage discount', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })

      act(() => {
        useCartStore.getState().addItem(product, stock, 5) // Subtotal: 500
        useCartStore.getState().setDiscount(100, 'percentage') // 100% discount
      })

      const state = useCartStore.getState()
      expect(state.discountAmount).toBe(500)
      expect(state.totalAmount).toBe(0)
    })

    it('should handle very high VAT rate', () => {
      const product = createMockProduct()
      const stock = createMockStock({ productSalePrice: 100 })
      const vat = createMockVat({ rate: 50 }) // 50% VAT

      act(() => {
        useCartStore.getState().addItem(product, stock, 2) // Subtotal: 200
        useCartStore.getState().setVat(vat)
      })

      const state = useCartStore.getState()
      expect(state.vatAmount).toBe(100) // 50% of 200
      expect(state.totalAmount).toBe(300)
    })
  })
})
