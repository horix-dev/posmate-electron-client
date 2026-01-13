import { useState, useCallback, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCartStore, getHeldCarts, deleteHeldCart } from '@/stores/cart.store'
import type { HeldCart } from '@/stores/cart.store'
import { useUIStore } from '@/stores/ui.store'
import { salesService } from '@/api/services/sales.service'
import { offlineSalesService } from '@/api/services/offlineSales.service'
import { partiesService } from '@/api/services/parties.service'
import { productsService } from '@/api/services/products.service'
import { getApiErrorMessage } from '@/api/axios'
import { printReceipt } from '@/lib/receipt-generator'
import { useBusinessStore } from '@/stores/business.store'
import type { Product, Stock, PaymentType, Party as Customer } from '@/types/api.types'
import type { ProductVariant } from '@/types/variant.types'

// Components
import {
  ProductGrid,
  CartSidebar,
  PaymentDialog,
  HeldCartsDialog,
  CustomerSelectDialog,
  ShortcutsHelpDialog,
  VariantSelectionDialog,
  SmartTender,
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
  const autoPrintReceipt = useUIStore((state) => state.autoPrintReceipt)
  const smartTenderEnabled = useUIStore((state) => state.smartTenderEnabled)
  const business = useBusinessStore((state) => state.business)

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
  const [variantDialogProduct, setVariantDialogProduct] = useState<Product | null>(null)
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false)
  const [showSmartTender, setShowSmartTender] = useState(false)

  // ----------------------------------------
  // Data Fetching
  // ----------------------------------------
  const { products, categories, paymentTypes, isLoading, filteredProducts } = usePOSData(filters)

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
    (product: Product, stock: Stock | null, variant?: ProductVariant | null) => {
      // For variants, use variant stock if available
      const effectiveStock = variant?.stocks?.[0] || stock
      if (!effectiveStock) {
        toast.error('No stock information available')
        return
      }
      addItem(product, effectiveStock, 1, variant)
      const name = variant ? `${product.productName} (${variant.sku})` : product.productName
      toast.success(`Added ${name} to cart`)
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
      const item = cartItems.find((i) => i.id === itemId)
      if (!item) return

      // Store removed item for undo
      const removedItem = { ...item }

      // Remove from cart
      removeItem(itemId)

      // Show undo toast
      const name = item.variant?.sku
        ? `${item.product.productName} (${item.variant.sku})`
        : item.product.productName

      toast.info(`${name} removed`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            addItem(
              removedItem.product,
              removedItem.stock,
              removedItem.quantity,
              removedItem.variant
            )
            toast.success('Item restored')
          },
        },
      })
    },
    [cartItems, removeItem, addItem]
  )

  const handleClearCart = useCallback(() => {
    if (cartItems.length > 0) {
      clearCart()
      toast.info('Cart cleared')
    }
  }, [cartItems.length, clearCart])

  // ----------------------------------------
  // Variant Selection
  // ----------------------------------------
  const handleOpenVariantSelection = useCallback((product: Product) => {
    // Check if product has variants (either from API or counted from stocks)
    const hasVariants =
      (product.variants && product.variants.length > 0) ||
      (product.stocks && product.stocks.some((s) => s.variant_id))

    if (!hasVariants) {
      toast.error('No variants available for this product')
      return
    }

    setVariantDialogProduct(product)
    setIsVariantDialogOpen(true)
  }, [])

  const handleVariantSelected = useCallback(
    (product: Product, stock: Stock, variant: ProductVariant) => {
      handleAddToCart(product, stock, variant)
      setIsVariantDialogOpen(false)
      setVariantDialogProduct(null)
    },
    [handleAddToCart]
  )

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
    if (smartTenderEnabled) {
      // Show SmartTender first for quick cash transactions
      setShowSmartTender(true)
      return
    }
    openDialog('payment')
  }, [cartItems.length, openDialog, smartTenderEnabled])

  const handleSmartTenderSelect = useCallback(() => {
    // Auto-select cash payment type if available
    const cashPaymentType = paymentTypes?.find((pt) => pt.name.toLowerCase() === 'cash')
    if (cashPaymentType) {
      setPaymentType(cashPaymentType)
    }
    // Hide SmartTender and open payment dialog with the selected amount
    // TODO: Pass amount to payment dialog for pre-filling
    setShowSmartTender(false)
    openDialog('payment')
  }, [paymentTypes, setPaymentType, openDialog])

  const handleCancelSmartTender = useCallback(() => {
    setShowSmartTender(false)
  }, [])

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
        // Prepare products array for the API (includes variant info for variable products)
        const productsForApi = cartItems.map((item) => ({
          stock_id: item.stock.id,
          product_name: item.product.productName,
          quantities: item.quantity,
          price: item.unitPrice,
          lossProfit: 0, // Calculate if needed
          // Variant information for variable products
          variant_id: item.variantId ?? undefined,
          variant_name: item.variantName ?? undefined,
        }))

        // Prepare sale data matching CreateSaleRequest
        const saleData = {
          products: productsForApi, // Send as array, not string
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

        // Print receipt if auto-print is enabled (works offline)
        if (autoPrintReceipt) {
          console.log('[POS] Auto-print enabled, generating receipt...')

          try {
            const printSuccess = await printReceipt({
              sale: result.data,
              business,
              customer,
            })

            // Only show error if print truly failed
            // In dev mode, print dialog may show but still succeed
            if (!printSuccess) {
              console.warn('[POS] Print may have failed or shown dialog')
              // Don't show error toast - user may have printed via dialog
            } else {
              console.log('[POS] Receipt printed to printer')
            }
          } catch (error) {
            console.error('[POS] Receipt print error:', error)
            // Silently log error but don't show toast
          }
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
        const errorMessage = getApiErrorMessage(error)
        toast.error(errorMessage)
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
      autoPrintReceipt,
      business,
      clearCart,
      closeDialog,
      setInvoiceNumber,
    ]
  )

  // ----------------------------------------
  // Barcode Scanner
  // ----------------------------------------
  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      const normalizedBarcode = barcode.toLowerCase()

      // First, try to find by product code in local cache (simple products)
      const product = products.find((p) => p.productCode?.toLowerCase() === normalizedBarcode)

      // If found as simple product, add to cart
      if (product && product.product_type === 'simple' && product.stocks?.[0]) {
        handleAddToCart(product, product.stocks[0])
        return
      }

      // Search in local variant barcodes (for variable products in cache)
      for (const p of products) {
        if (p.product_type === 'variable' && p.variants) {
          const matchedVariant = p.variants.find(
            (v) => v.barcode?.toLowerCase() === normalizedBarcode
          )
          if (matchedVariant && matchedVariant.stocks?.[0]) {
            // Found variant by barcode - add to cart with variant selected
            handleAddToCart(p, matchedVariant.stocks[0], matchedVariant)
            return
          }
        }
      }

      // If not found locally, try API barcode lookup (searches products, variants, batches)
      try {
        const response = await productsService.getByBarcode(barcode)

        if (response.data) {
          const { found_in, product: foundProduct, variant, stock } = response.data

          if (found_in === 'variant' && variant && stock) {
            // Found as variant - add with variant info
            handleAddToCart(foundProduct, stock, variant)
            toast.success(`Added variant: ${variant.variant_name || variant.sku}`)
            return
          } else if (found_in === 'product' && stock) {
            // Found as simple product
            handleAddToCart(foundProduct, stock)
            return
          } else if (found_in === 'batch' && stock) {
            // Found as batch number
            handleAddToCart(foundProduct, stock)
            return
          }
        }

        // Not found anywhere
        toast.error(`Product not found: ${barcode}`)
      } catch {
        // API failed (likely offline) - show not found for barcodes not in local cache
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
    console.log('[POS] Category changed to:', categoryId)
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
        // Use variant SKU if available, otherwise product code
        productCode: item.variant?.sku || item.product.productCode || `SKU-${item.product.id}`,
        productImage: item.variant?.image || item.product.productPicture,
        quantity: item.quantity,
        salePrice: item.unitPrice,
        // Use variant stock if available
        maxStock: item.variant?.total_stock ?? item.stock.productStock,
        id: item.id,
        // Variant information for display
        variantId: item.variantId ?? null,
        variantName: item.variantName ?? null,
        variantSku: item.variant?.sku ?? null,
        // Batch information for display
        batchNo: item.stock.batch_no ?? null,
        expiryDate: item.stock.expire_date ?? null,
      })),
    [cartItems]
  )

  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <div className="h-full bg-muted/30">
      {/* Two-column layout: Cart 60% | Products 40% */}
      <div className="grid h-full grid-cols-5">
        {/* Cart Panel (60%) */}
        <aside className="col-span-3 min-h-0 border-r bg-background">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <CartSidebar
              items={adaptedCartItems}
              customer={customer}
              paymentType={paymentType}
              totals={cartTotals}
              vatPercentage={vatPercentage}
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
          </div>
        </aside>

        {/* Products Section (40%) */}
        <section className="col-span-2 min-w-0 overflow-hidden border bg-background p-4 shadow-sm">
          {showSmartTender ? (
            <SmartTender
              totalAmount={totalAmount}
              onAmountSelect={handleSmartTenderSelect}
              onCancel={handleCancelSmartTender}
            />
          ) : (
            <ProductGrid
              products={filteredProducts}
              categories={categories}
              selectedCategoryId={filters.categoryId}
              searchQuery={filters.search}
              isLoading={isLoading}
              viewMode={viewMode}
              onCategoryChange={handleCategoryChange}
              onSearchChange={handleSearchChange}
              onAddToCart={handleAddToCart}
              onSelectVariant={handleOpenVariantSelection}
              onViewModeChange={setViewMode}
            />
          )}
        </section>
      </div>

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
        paymentTypes={paymentTypes}
        selectedPaymentType={paymentType}
        customer={customer}
        isProcessing={isProcessing}
        onPaymentTypeChange={handlePaymentTypeChange}
        onProcessPayment={handleProcessPayment}
      />

      <HeldCartsDialog
        open={dialogs.heldCarts}
        onClose={() => closeDialog('heldCarts')}
        heldCarts={heldCarts}
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

      <ShortcutsHelpDialog open={dialogs.shortcuts} onClose={() => closeDialog('shortcuts')} />

      {variantDialogProduct && (
        <VariantSelectionDialog
          open={isVariantDialogOpen}
          onOpenChange={(open) => {
            setIsVariantDialogOpen(open)
            if (!open) setVariantDialogProduct(null)
          }}
          product={variantDialogProduct}
          onSelectVariant={handleVariantSelected}
        />
      )}
    </div>
  )
}

export default POSPage
