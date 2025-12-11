import { useState, useCallback, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCartStore, getHeldCarts, deleteHeldCart } from '@/stores/cart.store'
import type { HeldCart } from '@/stores/cart.store'
import { useBusinessStore } from '@/stores/business.store'
import { salesService } from '@/api/services/sales.service'
import { offlineSalesService } from '@/api/services/offlineSales.service'
import { partiesService } from '@/api/services/parties.service'
import type { Product, Stock, PaymentType, Party as Customer } from '@/types/api.types'

// Components
import {
  ProductGrid,
  CartSidebar,
  PaymentDialog,
  HeldCartsDialog,
  CustomerSelectDialog,
  ShortcutsHelpDialog,
} from './components'

// Hooks
import { usePOSData, type POSFilters } from './hooks/usePOSData'
import { useBarcodeScanner } from './hooks/useBarcodeScanner'
import { usePOSKeyboard, POS_SHORTCUT_KEYS, type KeyboardShortcut } from './hooks/usePOSKeyboard'

// ============================================
// Types
// ============================================

type ViewMode = 'grid' | 'list'

interface DialogState {
  payment: boolean
  heldCarts: boolean
  customer: boolean
  shortcuts: boolean
}

// ============================================
// Main Component
// ============================================

export function POSPage() {
  // ----------------------------------------
  // Store & Data
  // ----------------------------------------
  const business = useBusinessStore((state) => state.business)
  const currencySymbol = business?.business_currency?.symbol || '$'

  // Cart store
  const {
    items: cartItems,
    customer,
    paymentType,
    vat,
    subtotal,
    discountAmount,
    vatAmount,
    totalAmount,
    invoiceNumber,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    setCustomer,
    setPaymentType,
    holdCart,
    recallCart,
    setInvoiceNumber,
  } = useCartStore()

  // ----------------------------------------
  // Local State
  // ----------------------------------------
  const [filters, setFilters] = useState<POSFilters>({
    search: '',
    categoryId: null,
  })
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [dialogs, setDialogs] = useState<DialogState>({
    payment: false,
    heldCarts: false,
    customer: false,
    shortcuts: false,
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)

  // ----------------------------------------
  // Data Fetching
  // ----------------------------------------
  const { products, categories, paymentTypes, isLoading, filteredProducts } =
    usePOSData(filters)

  // Fetch invoice number on mount
  useEffect(() => {
    const fetchInvoiceNumber = async () => {
      if (!invoiceNumber) {
        try {
          const newInvoiceNumber = await salesService.getNewInvoiceNumber()
          setInvoiceNumber(newInvoiceNumber)
        } catch {
          // Generate fallback invoice number
          setInvoiceNumber(`INV-${Date.now()}`)
        }
      }
    }
    fetchInvoiceNumber()
  }, [invoiceNumber, setInvoiceNumber])

  // ----------------------------------------
  // Dialog Handlers
  // ----------------------------------------
  const openDialog = useCallback((dialog: keyof DialogState) => {
    setDialogs((prev) => ({ ...prev, [dialog]: true }))
  }, [])

  const closeDialog = useCallback((dialog: keyof DialogState) => {
    setDialogs((prev) => ({ ...prev, [dialog]: false }))
  }, [])

  const closeAllDialogs = useCallback(() => {
    setDialogs({ payment: false, heldCarts: false, customer: false, shortcuts: false })
  }, [])

  // ----------------------------------------
  // Cart Handlers
  // ----------------------------------------
  const handleAddToCart = useCallback(
    (product: Product, stock: Stock) => {
      addItem(product, stock, 1)
      toast.success(`Added ${product.productName} to cart`)
    },
    [addItem]
  )

  const handleUpdateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      updateItemQuantity(itemId, quantity)
    },
    [updateItemQuantity]
  )

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      removeItem(itemId)
      toast.info('Item removed from cart')
    },
    [removeItem]
  )

  const handleClearCart = useCallback(() => {
    if (cartItems.length > 0) {
      clearCart()
      toast.info('Cart cleared')
    }
  }, [cartItems.length, clearCart])

  // ----------------------------------------
  // Hold/Recall Handlers
  // ----------------------------------------
  const refreshHeldCarts = useCallback(() => {
    setHeldCarts(getHeldCarts())
  }, [])

  const handleHoldCart = useCallback(() => {
    if (cartItems.length === 0) {
      toast.warning('Cart is empty')
      return
    }

    const holdId = holdCart()
    if (holdId) {
      refreshHeldCarts()
      toast.success('Cart held successfully')
    }
  }, [cartItems.length, holdCart, refreshHeldCarts])

  const handleRecallCart = useCallback(
    (cartId: string) => {
      if (cartItems.length > 0) {
        // Hold current cart first
        holdCart()
      }
      recallCart(cartId)
      refreshHeldCarts()
      toast.success('Cart recalled')
    },
    [cartItems.length, holdCart, recallCart, refreshHeldCarts]
  )

  const handleDeleteHeldCart = useCallback(
    (cartId: string) => {
      deleteHeldCart(cartId)
      refreshHeldCarts()
      toast.info('Held cart deleted')
    },
    [refreshHeldCarts]
  )

  const handleOpenHeldCarts = useCallback(() => {
    refreshHeldCarts()
    openDialog('heldCarts')
  }, [refreshHeldCarts, openDialog])

  // ----------------------------------------
  // Customer Handlers
  // ----------------------------------------
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true)
    try {
      const data = await partiesService.getCustomers()
      setCustomers(data)
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setCustomersLoading(false)
    }
  }, [])

  const handleOpenCustomerDialog = useCallback(() => {
    fetchCustomers()
    openDialog('customer')
  }, [fetchCustomers, openDialog])

  const handleSelectCustomer = useCallback(
    (selectedCustomer: Customer | null) => {
      setCustomer(selectedCustomer)
      if (selectedCustomer) {
        toast.success(`Customer: ${selectedCustomer.name}`)
      }
    },
    [setCustomer]
  )

  // ----------------------------------------
  // Payment Handlers
  // ----------------------------------------
  const handleOpenPayment = useCallback(() => {
    if (cartItems.length === 0) {
      toast.warning('Cart is empty')
      return
    }
    openDialog('payment')
  }, [cartItems.length, openDialog])

  const handlePaymentTypeChange = useCallback(
    (pt: PaymentType) => {
      setPaymentType(pt)
    },
    [setPaymentType]
  )

  const handleProcessPayment = useCallback(
    async (amountPaid: number) => {
      if (!paymentType) {
        toast.error('Please select a payment method')
        return
      }

      setIsProcessing(true)

      try {
        // Prepare products array for the API
        const productsForApi = cartItems.map((item) => ({
          stock_id: item.stock.id,
          product_name: item.product.productName,
          quantities: item.quantity,
          price: item.unitPrice,
          lossProfit: 0, // Calculate if needed
        }))

        // Prepare sale data matching CreateSaleRequest
        const saleData = {
          products: JSON.stringify(productsForApi),
          invoiceNumber: invoiceNumber || undefined,
          party_id: customer?.id,
          payment_type_id: paymentType.id,
          vat_id: vat?.id,
          vat_amount: vatAmount,
          totalAmount,
          discountAmount,
          paidAmount: amountPaid,
          dueAmount: Math.max(0, totalAmount - amountPaid),
          change_amount: Math.max(0, amountPaid - totalAmount),
          isPaid: amountPaid >= totalAmount,
        }

        // Create sale (works offline)
        const result = await offlineSalesService.create(saleData)

        // Success
        if (result.isOffline) {
          toast.success('Sale saved offline - will sync when online')
        } else {
          toast.success('Sale completed successfully!')
        }
        
        clearCart()
        closeDialog('payment')

        // Get new invoice number (only when online)
        if (!result.isOffline) {
          try {
            const newInvoiceNumber = await salesService.getNewInvoiceNumber()
            setInvoiceNumber(newInvoiceNumber)
          } catch {
            setInvoiceNumber(`INV-${Date.now()}`)
          }
        } else {
          // Use temporary invoice number for offline
          setInvoiceNumber(`OFFLINE-${Date.now()}`)
        }
      } catch (error) {
        console.error('Payment processing error:', error)
        toast.error('Failed to process payment')
      } finally {
        setIsProcessing(false)
      }
    },
    [
      paymentType,
      invoiceNumber,
      customer,
      vat,
      cartItems,
      discountAmount,
      vatAmount,
      totalAmount,
      clearCart,
      closeDialog,
      setInvoiceNumber,
    ]
  )

  // ----------------------------------------
  // Barcode Scanner
  // ----------------------------------------
  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      // Find product by barcode/code
      const product = products.find(
        (p) => p.productCode?.toLowerCase() === barcode.toLowerCase()
      )

      if (product && product.stocks?.[0]) {
        handleAddToCart(product, product.stocks[0])
      } else {
        toast.error(`Product not found: ${barcode}`)
      }
    },
    [products, handleAddToCart]
  )

  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: !dialogs.payment })

  // ----------------------------------------
  // Keyboard Shortcuts
  // ----------------------------------------
  const shortcuts: KeyboardShortcut[] = useMemo(
    () => [
      {
        key: POS_SHORTCUT_KEYS.PAY,
        action: handleOpenPayment,
        description: 'Open payment',
      },
      {
        key: POS_SHORTCUT_KEYS.HOLD,
        action: handleHoldCart,
        description: 'Hold cart',
      },
      {
        key: POS_SHORTCUT_KEYS.RECALL,
        action: handleOpenHeldCarts,
        description: 'Recall cart',
      },
      {
        key: POS_SHORTCUT_KEYS.CUSTOMER,
        action: handleOpenCustomerDialog,
        description: 'Select customer',
      },
      {
        key: POS_SHORTCUT_KEYS.NEW_SALE,
        action: handleClearCart,
        description: 'New sale',
      },
      {
        key: POS_SHORTCUT_KEYS.CLEAR,
        action: closeAllDialogs,
        description: 'Close dialogs',
      },
    ],
    [
      handleOpenPayment,
      handleHoldCart,
      handleOpenHeldCarts,
      handleOpenCustomerDialog,
      handleClearCart,
      closeAllDialogs,
    ]
  )

  usePOSKeyboard({ shortcuts, enabled: true })

  // ----------------------------------------
  // Filter Handlers
  // ----------------------------------------
  const handleSearchChange = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }))
  }, [])

  const handleCategoryChange = useCallback((categoryId: number | null) => {
    setFilters((prev) => ({ ...prev, categoryId }))
  }, [])

  // ----------------------------------------
  // Computed Values
  // ----------------------------------------
  const cartTotals = useMemo(
    () => ({
      subtotal,
      vatAmount,
      discountAmount,
      total: totalAmount,
    }),
    [subtotal, vatAmount, discountAmount, totalAmount]
  )

  const vatPercentage = vat?.rate ?? 0

  // ----------------------------------------
  // Cart Items Adapter
  // The cart store uses different CartItem interface
  // ----------------------------------------
  const adaptedCartItems = useMemo(
    () =>
      cartItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.productName,
        productCode: item.product.productCode || `SKU-${item.product.id}`,
        productImage: item.product.productPicture,
        quantity: item.quantity,
        salePrice: item.unitPrice,
        maxStock: item.stock.productStock,
        id: item.id,
      })),
    [cartItems]
  )

  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      {/* Products Section */}
      <div className="flex-[4] overflow-hidden p-4">
        <ProductGrid
          products={filteredProducts}
          categories={categories}
          selectedCategoryId={filters.categoryId}
          searchQuery={filters.search}
          currencySymbol={currencySymbol}
          isLoading={isLoading}
          viewMode={viewMode}
          onCategoryChange={handleCategoryChange}
          onSearchChange={handleSearchChange}
          onAddToCart={handleAddToCart}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Cart Sidebar */}
      <aside className="flex-[3] flex h-full flex-shrink-0 flex-col border-l bg-background p-4">
        <CartSidebar
          items={adaptedCartItems}
          customer={customer}
          paymentType={paymentType}
          totals={cartTotals}
          vatPercentage={vatPercentage}
          currencySymbol={currencySymbol}
          heldCartsCount={heldCarts.length}
          invoiceNumber={invoiceNumber || 'Loading...'}
          onUpdateQuantity={(productId, quantity) => {
            const item = cartItems.find((i) => i.product.id === productId)
            if (item) handleUpdateQuantity(item.id, quantity)
          }}
          onRemoveItem={(productId) => {
            const item = cartItems.find((i) => i.product.id === productId)
            if (item) handleRemoveItem(item.id)
          }}
          onClearCart={handleClearCart}
          onHoldCart={handleHoldCart}
          onOpenHeldCarts={handleOpenHeldCarts}
          onSelectCustomer={handleOpenCustomerDialog}
          onPayment={handleOpenPayment}
        />
      </aside>

      {/* Keyboard Shortcuts Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 right-4 h-10 w-10 rounded-full shadow-lg"
              onClick={() => openDialog('shortcuts')}
            >
              <Keyboard className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Keyboard Shortcuts (F1)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Dialogs */}
      <PaymentDialog
        open={dialogs.payment}
        onClose={() => closeDialog('payment')}
        totalAmount={totalAmount}
        currencySymbol={currencySymbol}
        paymentTypes={paymentTypes}
        selectedPaymentType={paymentType}
        isProcessing={isProcessing}
        onPaymentTypeChange={handlePaymentTypeChange}
        onProcessPayment={handleProcessPayment}
      />

      <HeldCartsDialog
        open={dialogs.heldCarts}
        onClose={() => closeDialog('heldCarts')}
        heldCarts={heldCarts}
        currencySymbol={currencySymbol}
        onRecallCart={handleRecallCart}
        onDeleteCart={handleDeleteHeldCart}
      />

      <CustomerSelectDialog
        open={dialogs.customer}
        onClose={() => closeDialog('customer')}
        customers={customers}
        selectedCustomer={customer}
        isLoading={customersLoading}
        onSelect={handleSelectCustomer}
      />

      <ShortcutsHelpDialog
        open={dialogs.shortcuts}
        onClose={() => closeDialog('shortcuts')}
      />
    </div>
  )
}

export default POSPage
