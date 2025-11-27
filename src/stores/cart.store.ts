import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Product, Stock, Party, PaymentType, Vat } from '@/types/api.types'
import { heldCartRepository } from '@/lib/db/repositories'
import type { HeldCart as DBHeldCart } from '@/lib/db/schema'

export interface CartItem {
  id: string // Unique ID for cart item (stock_id + timestamp)
  product: Product
  stock: Stock
  quantity: number
  unitPrice: number
  discount: number
  discountType: 'fixed' | 'percentage'
  total: number
}

export interface HeldCart {
  id: string
  items: CartItem[]
  customer: Party | null
  paymentType: PaymentType | null
  vat: Vat | null
  discount: number
  discountType: 'fixed' | 'percentage'
  paidAmount: number
  note: string
  invoiceNumber: string | null
  timestamp: number
}

interface CartState {
  // State
  items: CartItem[]
  customer: Party | null
  paymentType: PaymentType | null
  vat: Vat | null
  discount: number
  discountType: 'fixed' | 'percentage'
  paidAmount: number
  note: string
  invoiceNumber: string | null
  holdId: string | null // For holding/parking sales

  // Computed (These will be calculated in selectors)
  subtotal: number
  discountAmount: number
  vatAmount: number
  totalAmount: number
  dueAmount: number
  changeAmount: number

  // Actions
  addItem: (product: Product, stock: Stock, quantity?: number) => void
  updateItemQuantity: (itemId: string, quantity: number) => void
  updateItemPrice: (itemId: string, price: number) => void
  updateItemDiscount: (itemId: string, discount: number, type: 'fixed' | 'percentage') => void
  removeItem: (itemId: string) => void
  clearCart: () => void
  setCustomer: (customer: Party | null) => void
  setPaymentType: (paymentType: PaymentType | null) => void
  setVat: (vat: Vat | null) => void
  setDiscount: (discount: number, type: 'fixed' | 'percentage') => void
  setPaidAmount: (amount: number) => void
  setNote: (note: string) => void
  setInvoiceNumber: (invoiceNumber: string | null) => void
  holdCart: () => string | null // Returns holdId
  recallCart: (holdId: string) => void
  deleteHeldCart: (holdId: string) => Promise<void>
  getHeldCarts: () => Promise<DBHeldCart[]>
  calculateTotals: () => void
}

// Helper to calculate item total
const calculateItemTotal = (item: Omit<CartItem, 'total'>): number => {
  const subtotal = item.quantity * item.unitPrice
  const discount =
    item.discountType === 'percentage' ? subtotal * (item.discount / 100) : item.discount
  return Math.max(0, subtotal - discount)
}

// Held carts storage key
const HELD_CARTS_KEY = 'held-carts'

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial State
      items: [],
      customer: null,
      paymentType: null,
      vat: null,
      discount: 0,
      discountType: 'fixed' as const,
      paidAmount: 0,
      note: '',
      invoiceNumber: null,
      holdId: null,

      // Computed values (recalculated on changes)
      subtotal: 0,
      discountAmount: 0,
      vatAmount: 0,
      totalAmount: 0,
      dueAmount: 0,
      changeAmount: 0,

      // Actions
      addItem: (product: Product, stock: Stock, quantity = 1) => {
        const state = get()

        // Check if item with same stock already exists
        const existingItem = state.items.find((item) => item.stock.id === stock.id)

        if (existingItem) {
          // Update quantity of existing item
          set({
            items: state.items.map((item) =>
              item.id === existingItem.id
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    total: calculateItemTotal({
                      ...item,
                      quantity: item.quantity + quantity,
                    }),
                  }
                : item
            ),
          })
        } else {
          // Add new item
          const newItem: CartItem = {
            id: `${stock.id}-${Date.now()}`,
            product,
            stock,
            quantity,
            unitPrice: stock.productSalePrice,
            discount: 0,
            discountType: 'fixed',
            total: quantity * stock.productSalePrice,
          }

          set({ items: [...state.items, newItem] })
        }

        get().calculateTotals()
      },

      updateItemQuantity: (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(itemId)
          return
        }

        set({
          items: get().items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity,
                  total: calculateItemTotal({ ...item, quantity }),
                }
              : item
          ),
        })

        get().calculateTotals()
      },

      updateItemPrice: (itemId: string, price: number) => {
        set({
          items: get().items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  unitPrice: price,
                  total: calculateItemTotal({ ...item, unitPrice: price }),
                }
              : item
          ),
        })

        get().calculateTotals()
      },

      updateItemDiscount: (itemId: string, discount: number, type: 'fixed' | 'percentage') => {
        set({
          items: get().items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  discount,
                  discountType: type,
                  total: calculateItemTotal({ ...item, discount, discountType: type }),
                }
              : item
          ),
        })

        get().calculateTotals()
      },

      removeItem: (itemId: string) => {
        set({ items: get().items.filter((item) => item.id !== itemId) })
        get().calculateTotals()
      },

      clearCart: () => {
        set({
          items: [],
          customer: null,
          paymentType: null,
          vat: null,
          discount: 0,
          discountType: 'fixed',
          paidAmount: 0,
          note: '',
          invoiceNumber: null,
          holdId: null,
          subtotal: 0,
          discountAmount: 0,
          vatAmount: 0,
          totalAmount: 0,
          dueAmount: 0,
          changeAmount: 0,
        })
      },

      setCustomer: (customer) => set({ customer }),
      setPaymentType: (paymentType) => set({ paymentType }),

      setVat: (vat) => {
        set({ vat })
        get().calculateTotals()
      },

      setDiscount: (discount, type) => {
        set({ discount, discountType: type })
        get().calculateTotals()
      },

      setPaidAmount: (amount) => {
        set({ paidAmount: amount })
        get().calculateTotals()
      },

      setNote: (note) => set({ note }),
      setInvoiceNumber: (invoiceNumber) => set({ invoiceNumber }),

      holdCart: () => {
        const state = get()

        if (state.items.length === 0) return null

        const holdId = `hold-${Date.now()}`
        const cartData = {
          id: holdId,
          items: state.items,
          customer: state.customer,
          paymentType: state.paymentType,
          vat: state.vat,
          discount: state.discount,
          discountType: state.discountType,
          paidAmount: state.paidAmount,
          note: state.note,
          invoiceNumber: state.invoiceNumber,
          timestamp: Date.now(),
        }

        // Store held cart in IndexedDB
        const dbCart: DBHeldCart = {
          cartId: holdId,
          items: state.items.map((item) => ({
            productId: item.product.id,
            productName: item.product.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
          customerId: state.customer?.id,
          customerName: state.customer?.name,
          paymentTypeId: state.paymentType?.id,
          paymentTypeName: state.paymentType?.name,
          subtotal: state.subtotal,
          tax: state.vatAmount,
          total: state.totalAmount,
          createdAt: new Date().toISOString(),
          note: state.note || undefined,
        }

        heldCartRepository.create(dbCart).catch((error) => {
          console.error('Failed to save held cart to IndexedDB:', error)
        })

        // Also store in localStorage for backward compatibility
        const heldCarts = JSON.parse(localStorage.getItem(HELD_CARTS_KEY) || '[]')
        heldCarts.push(cartData)
        localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(heldCarts))

        // Clear current cart
        get().clearCart()

        return holdId
      },

      recallCart: (holdId: string) => {
        // Try localStorage first for backward compatibility
        const heldCarts = JSON.parse(localStorage.getItem(HELD_CARTS_KEY) || '[]')
        const cart = heldCarts.find((c: { id: string }) => c.id === holdId)

        if (cart) {
          set({
            items: cart.items,
            customer: cart.customer,
            paymentType: cart.paymentType,
            vat: cart.vat,
            discount: cart.discount,
            discountType: cart.discountType,
            paidAmount: cart.paidAmount,
            note: cart.note,
            invoiceNumber: cart.invoiceNumber,
            holdId,
          })

          // Remove from localStorage
          const updatedHeldCarts = heldCarts.filter((c: { id: string }) => c.id !== holdId)
          localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(updatedHeldCarts))

          // Remove from IndexedDB
          heldCartRepository.deleteByCartId(holdId).catch((error) => {
            console.error('Failed to delete held cart from IndexedDB:', error)
          })

          get().calculateTotals()
        }
      },

      deleteHeldCart: async (holdId: string) => {
        // Remove from localStorage
        const heldCarts = JSON.parse(localStorage.getItem(HELD_CARTS_KEY) || '[]')
        const updatedHeldCarts = heldCarts.filter((c: { id: string }) => c.id !== holdId)
        localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(updatedHeldCarts))

        // Remove from IndexedDB
        await heldCartRepository.deleteByCartId(holdId)
      },

      getHeldCarts: async () => {
        return await heldCartRepository.getAllSorted()
      },

      calculateTotals: () => {
        const state = get()

        // Calculate subtotal from items
        const subtotal = state.items.reduce((sum, item) => sum + item.total, 0)

        // Calculate discount amount
        const discountAmount =
          state.discountType === 'percentage'
            ? subtotal * (state.discount / 100)
            : state.discount

        // Calculate VAT amount
        const taxableAmount = subtotal - discountAmount
        const vatAmount = state.vat ? taxableAmount * (state.vat.rate / 100) : 0

        // Calculate total
        const totalAmount = taxableAmount + vatAmount

        // Calculate due/change
        const dueAmount = Math.max(0, totalAmount - state.paidAmount)
        const changeAmount = Math.max(0, state.paidAmount - totalAmount)

        set({
          subtotal,
          discountAmount,
          vatAmount,
          totalAmount,
          dueAmount,
          changeAmount,
        })
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        customer: state.customer,
        paymentType: state.paymentType,
        vat: state.vat,
        discount: state.discount,
        discountType: state.discountType,
        paidAmount: state.paidAmount,
        note: state.note,
        invoiceNumber: state.invoiceNumber,
        holdId: state.holdId,
      }),
      onRehydrateStorage: () => (state) => {
        // Recalculate totals after rehydration
        state?.calculateTotals()
      },
    }
  )
)

// Selector to get held carts
export const getHeldCarts = () => {
  return JSON.parse(localStorage.getItem(HELD_CARTS_KEY) || '[]')
}

// Selector to delete a held cart
export const deleteHeldCart = (holdId: string) => {
  const heldCarts = JSON.parse(localStorage.getItem(HELD_CARTS_KEY) || '[]')
  const updatedHeldCarts = heldCarts.filter((c: { id: string }) => c.id !== holdId)
  localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(updatedHeldCarts))
}

export default useCartStore
