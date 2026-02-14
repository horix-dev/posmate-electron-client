import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { toast } from 'sonner'
import type { Product, Stock, Party, PaymentType, Vat } from '@/types/api.types'
import type { ProductVariant } from '@/types/variant.types'
import { heldCartRepository } from '@/lib/db/repositories'
import type { HeldCart as DBHeldCart } from '@/lib/db/schema'

export interface CartItem {
  /** Unique identifier for the cart item (e.g., `product.id-stock.id` or `variant-id-timestamp`) */
  id: string
  /** The product being added */
  product: Product
  /** The specific stock/variant selected */
  stock: Stock
  /** The selected variant, if applicable */
  variant: ProductVariant | null
  /** ID of the selected variant */
  variantId: number | null
  /** Display name for the variant */
  variantName: string | null
  /** Quantity of this item in the cart */
  quantity: number
  /** The price per unit */
  unitPrice: number
  /** The discount value for this item */
  discount: number
  /** The type of discount ('fixed' or 'percentage') */
  discountType: 'fixed' | 'percentage'
  /** The total price for this line item (quantity * unitPrice - discount) */
  total: number
  /** If part of a combo, this links to the parent combo product */
  comboParentId?: number
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
  addItem: (
    product: Product,
    stock: Stock,
    quantity?: number,
    variant?: ProductVariant | null
  ) => void
  updateItemQuantity: (itemId: string, quantity: number) => void
  updateItemPrice: (itemId: string, price: number) => void
  updateItemDiscount: (itemId: string, discount: number, type: 'fixed' | 'percentage') => void
  updateItemStock: (itemId: string, stock: Stock) => void
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
const calculateItemTotal = (
  item: Omit<CartItem, 'total'> & {
    unitPrice: number
    discount: number
    discountType: 'fixed' | 'percentage'
  }
): number => {
  const subtotal = item.quantity * item.unitPrice
  const discount =
    item.discountType === 'percentage'
      ? subtotal * (item.discount / 100)
      : item.discount * item.quantity // Fixed discounts are configured per unit
  return Math.max(0, subtotal - discount)
}

/**
 * Generate unique cart item ID
 * For variants: variant_id + timestamp
 * For simple products: stock_id + timestamp
 */
const generateCartItemId = (stock: Stock, variant?: ProductVariant | null): string => {
  if (variant) {
    return `variant-${variant.id}-${Date.now()}`
  }
  return `${stock.id}-${Date.now()}`
}

/**
 * Get variant display name for cart
 */
const getVariantDisplayName = (variant: ProductVariant): string => {
  if (variant.variant_name) {
    return variant.variant_name
  }
  if (variant.attributes_map) {
    return Object.values(variant.attributes_map).join(' / ')
  }
  if (variant.attribute_values?.length) {
    return variant.attribute_values.map((v) => v.value).join(' / ')
  }
  return variant.sku
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
      // ======================================================================

      addItem: (product, stock, quantity = 1, variant = null) => {
        // Handle Combo Products
        if (product.is_combo_product && product.combo_components) {
          // 1. Check stock for all components first
          const unavailableComponents = product.combo_components.filter((component) => {
            const componentStock = component.component_product.stocks?.[0]?.productStock ?? 0
            const requiredQuantity = Number(component.quantity) * quantity
            return componentStock < requiredQuantity
          })

          if (unavailableComponents.length > 0) {
            const unavailableNames = unavailableComponents
              .map((c) => c.component_product.productName)
              .join(', ')
            toast.error('Cannot add combo to cart.', {
              description: `Insufficient stock for: ${unavailableNames}.`,
            })
            return
          }

          // 2. Calculate combo price (with discount if applicable)
          const originalPrice = product.combo_components.reduce((sum, component) => {
            const componentStock = component.component_product.stocks?.[0]
            const price = componentStock?.productSalePrice || 0
            return sum + price * Number(component.quantity)
          }, 0)

          let finalPrice = originalPrice
          if (product.combo_discount_type && product.combo_discount_type !== 'none') {
            const discount =
              product.combo_discount_type === 'percentage'
                ? (originalPrice * (product.combo_discount_value || 0)) / 100
                : product.combo_discount_value || 0
            finalPrice = originalPrice - discount
          }

          // 3. Add combo as a single item to cart
          const itemId = `combo-${product.id}-${Date.now()}`
          const existingItem = get().items.find(
            (item) => item.product.id === product.id && item.comboParentId === undefined
          )

          if (existingItem) {
            set((state) => ({
              items: state.items.map((item) =>
                item.id === existingItem.id
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                      total: (item.quantity + quantity) * item.unitPrice,
                    }
                  : item
              ),
            }))
          } else {
            const newItem: CartItem = {
              id: itemId,
              product: product,
              stock: stock, // Use the combo's stock info
              variant: null,
              variantId: null,
              variantName: null,
              quantity: quantity,
              unitPrice: finalPrice,
              discount: 0,
              discountType: 'fixed',
              total: quantity * finalPrice,
              // Don't set comboParentId for the combo itself
            }
            set((state) => ({ items: [...state.items, newItem] }))
          }

          get().calculateTotals()
          toast.success(`${product.productName} added to cart.`)
          return // Stop execution for combo product
        }

        // --- Existing logic for Simple/Variable Products ---
        const existingItem = get().items.find((item) => {
          if (variant) {
            return item.variantId === variant.id
          }
          return !item.variantId && item.stock.id === stock.id
        })

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity
          const updatedItem = {
            ...existingItem,
            quantity: newQuantity,
            total: calculateItemTotal({
              ...existingItem,
              quantity: newQuantity,
            }),
          }

          set({
            items: [...get().items.filter((item) => item.id !== existingItem.id), updatedItem],
          })
        } else {
          // Determine price: variant price > stock price
          const unitPrice =
            variant?.effective_price ?? variant?.price ?? stock.productSalePrice ?? 0

          // Add new item
          const newItem: CartItem = {
            id: generateCartItemId(stock, variant),
            product,
            stock,
            quantity,
            unitPrice,
            discount: 0,
            discountType: 'fixed',
            total: quantity * unitPrice,
            // Variant fields
            variant: variant ?? null,
            variantId: variant?.id ?? null,
            variantName: variant ? getVariantDisplayName(variant) : null,
          }

          set({ items: [...get().items, newItem] })
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
                  total: quantity * item.unitPrice,
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

      updateItemStock: (itemId: string, stock: Stock) => {
        const item = get().items.find((i) => i.id === itemId)
        if (!item) return

        // If it's a simple product, we can just update the stock
        if (!item.variant) {
          const unitPrice = stock.productSalePrice ?? item.unitPrice
          set({
            items: get().items.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    stock,
                    unitPrice,
                    total: calculateItemTotal({ ...i, stock, unitPrice }),
                  }
                : i
            ),
          })
        } else {
          // For variants, the price is tied to the variant, not the top-level stock
          // We might just update the stock ID if it changes, but price logic is complex
          set({
            items: get().items.map((i) => (i.id === itemId ? { ...i, stock } : i)),
          })
        }

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
        set((state) => {
          const subtotal = state.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          )
          const discountAmount = state.items.reduce((sum, item) => {
            const itemSubtotal = item.quantity * item.unitPrice
            if (item.discountType === 'percentage') {
              return sum + itemSubtotal * (item.discount / 100)
            }
            return sum + item.discount * item.quantity
          }, 0)

          const totalAfterItemDiscounts = subtotal - discountAmount

          const globalDiscountAmount =
            state.discountType === 'percentage'
              ? totalAfterItemDiscounts * (state.discount / 100)
              : state.discount

          const totalAfterGlobalDiscount = totalAfterItemDiscounts - globalDiscountAmount

          const vatAmount = state.vat ? totalAfterGlobalDiscount * (state.vat.rate / 100) : 0

          const totalAmount = totalAfterGlobalDiscount + vatAmount
          const dueAmount = totalAmount - state.paidAmount
          const changeAmount = state.paidAmount > totalAmount ? state.paidAmount - totalAmount : 0

          return {
            ...state,
            subtotal,
            discountAmount: discountAmount + globalDiscountAmount,
            vatAmount,
            totalAmount,
            dueAmount,
            changeAmount,
          }
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
