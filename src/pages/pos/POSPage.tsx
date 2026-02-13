import { useState, useCallback, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { Keyboard, Loader2 } from 'lucide-react'
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
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { storage } from '@/lib/storage'
import { useQueryClient } from '@tanstack/react-query'
import { clearAllCache } from '@/lib/cache/clearCache'
import type { Product, Stock, PaymentType, Party as Customer } from '@/types/api.types'
import type { ProductVariant } from '@/types/variant.types'
import type { LocalProduct } from '@/lib/db/schema'

// Components
import {
  ProductGrid,
  CartSidebar,
  PaymentDialog,
  HeldCartsDialog,
  CustomerSelectDialog,
  ShortcutsHelpDialog,
  VariantSelectionDialog,
  BatchSelectionDialog,
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

interface BatchDialogState {
  product: Product
  stocks: Stock[]
  variant?: ProductVariant | null
  defaultStockId?: number | null
  mode: 'add' | 'update'
  cartItemId?: string
}

// ============================================
// Main Component
// ============================================

export function POSPage() {
  // ----------------------------------------
  // Store & Data
  // ----------------------------------------
  const queryClient = useQueryClient()
  const autoPrintReceipt = useUIStore((state) => state.autoPrintReceipt)
  const smartTenderEnabled = useUIStore((state) => state.smartTenderEnabled)
  const business = useBusinessStore((state) => state.business)
  const fetchBusiness = useBusinessStore((state) => state.fetchBusiness)
  const { isOnline } = useOnlineStatus()

  // Cart store
  const {
    items: cartItems,
    customer,
    paymentType,
    vat,
    discount,
    discountType,
    subtotal,
    discountAmount,
    vatAmount,
    totalAmount,
    invoiceNumber,
    addItem,
    updateItemQuantity,
    updateItemDiscount,
    updateItemStock,
    removeItem,
    clearCart,
    setCustomer,
    setPaymentType,
    setDiscount,
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
  const [batchDialogState, setBatchDialogState] = useState<BatchDialogState | null>(null)
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)
  const [showSmartTender, setShowSmartTender] = useState(false)
  const [lastAddedItemId, setLastAddedItemId] = useState<string | null>(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(true)

  // ----------------------------------------
  // Data Fetching
  // ----------------------------------------
  const { products, categories, paymentTypes, isLoading, filteredProducts } = usePOSData(filters)

  // Clear cache on mount to ensure fresh data (only when online)
  useEffect(() => {
    const clearCacheOnMount = async () => {
      // Skip cache clearing if offline - use cached data instead
      if (!navigator.onLine) {
        console.log('[POS] Offline mode detected - using cached data')
        setIsClearingCache(false)
        return
      }

      try {
        console.log('[POS] Online - clearing cache on mount...')
        await clearAllCache(queryClient, {
          reactQuery: true,
          localStorage: true,
          persistentStorage: true,
          images: false, // Keep images cached for performance
          syncState: false, // Keep sync state
        })
        console.log('[POS] Cache cleared successfully')
        // usePOSData hook will automatically fetch fresh data since cache is empty
      } catch (error) {
        console.warn('[POS] Failed to clear cache:', error)
        toast.error('Failed to clear cache. Please refresh the page.')
      } finally {
        setIsClearingCache(false)
      }
    }

    clearCacheOnMount()
  }, [queryClient])

  // Fetch business data on mount
  useEffect(() => {
    if (!business) {
      fetchBusiness()
    }
  }, [business, fetchBusiness])

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
  const getCartQuantity = useCallback(
    (productId: number, variantId?: number | null) => {
      return cartItems.reduce((total, item) => {
        if (variantId != null) {
          return item.variantId === variantId ? total + item.quantity : total
        }
        // Simple products: match by product id when no variant
        if (!item.variantId && item.product.id === productId) {
          return total + item.quantity
        }
        return total
      }, 0)
    },
    [cartItems]
  )

  const isBatchTrackedProduct = useCallback((product: Product) => {
    if (product.product_type === 'variant') return true
    if (product.is_batch_tracked) return true
    return Boolean(product.stocks?.some((stock) => Boolean(stock.batch_no)))
  }, [])

  const getBatchStocks = useCallback((product: Product, variant?: ProductVariant | null) => {
    const stocks = product.stocks ?? []
    if (variant) {
      return stocks.filter((stock) => Number(stock.variant_id) === Number(variant.id))
    }
    return stocks
  }, [])

  const executeAddToCart = useCallback(
    (product: Product, stock: Stock, variant?: ProductVariant | null) => {
      if (isAddingToCart) {
        toast.warning('Please wait before adding another item')
        return false
      }

      // Skip stock validation for combo products - let the cart handle component validation
      if (!product.is_combo_product) {
        const availableQty = stock.productStock ?? 0
        const currentQty = getCartQuantity(product.id, variant?.id ?? null)

        if (availableQty <= 0 || currentQty >= availableQty) {
          const itemName = variant ? `${product.productName} (${variant.sku})` : product.productName
          toast.error(
            `Stock limit reached for ${itemName}. Available: ${availableQty}. In cart: ${currentQty}.`
          )
          return false
        }
      }

      setIsAddingToCart(true)
      setTimeout(() => setIsAddingToCart(false), 2000)

      addItem(product, stock, 1, variant)

      setTimeout(() => {
        const cartNow = useCartStore.getState().items
        let addedItem

        if (variant) {
          addedItem = cartNow.find((item) => item.variantId === variant.id)
        } else {
          addedItem = cartNow.find((item) => !item.variantId && item.stock.id === stock.id)
        }

        if (addedItem) {
          setLastAddedItemId(addedItem.id)
        }
      }, 0)

      const name = variant ? `${product.productName} (${variant.sku})` : product.productName
      toast.success(`Added ${name} to cart`)
      return true
    },
    [addItem, getCartQuantity, isAddingToCart]
  )

  const handleAddToCart = useCallback(
    (
      product: Product,
      stock: Stock | null,
      variant?: ProductVariant | null,
      options?: { skipBatchPrompt?: boolean }
    ) => {
      const batchTracked = isBatchTrackedProduct(product)
      const relevantStocks = getBatchStocks(product, variant ?? null)

      if (batchTracked && !options?.skipBatchPrompt) {
        if (relevantStocks.length === 0) {
          toast.error('No batch records available for this product')
          return false
        }

        if (relevantStocks.length > 1) {
          setBatchDialogState({
            product,
            stocks: relevantStocks,
            variant: variant ?? null,
            defaultStockId: stock?.id ?? null,
            mode: 'add',
          })
          setIsBatchDialogOpen(true)
          return false
        }

        if (!stock) {
          stock = relevantStocks[0]
        }
      }

      if (!stock) {
        toast.error('No stock information available')
        return false
      }

      return executeAddToCart(product, stock, variant ?? null)
    },
    [executeAddToCart, getBatchStocks, isBatchTrackedProduct]
  )

  const closeBatchDialog = useCallback(() => {
    setIsBatchDialogOpen(false)
    setBatchDialogState(null)
  }, [])

  const handleBatchChange = useCallback(
    (itemId: string, stockId: number) => {
      const item = cartItems.find((cartItem) => cartItem.id === itemId)
      if (!item) {
        toast.error('Cart item not found')
        return
      }

      const productStocks = item.product.stocks ?? []
      const relevantStocks = item.variantId
        ? productStocks.filter((stock) => Number(stock.variant_id) === Number(item.variantId))
        : productStocks
      const nextStock = relevantStocks.find((stock) => stock.id === stockId)

      if (!nextStock) {
        toast.error('Selected batch is unavailable')
        return
      }

      if ((nextStock.productStock ?? 0) <= 0) {
        toast.error('Selected batch is out of stock')
        return
      }

      updateItemStock(itemId, nextStock)
      toast.success('Batch updated')
    },
    [cartItems, updateItemStock]
  )

  const handleOpenCartBatchDialog = useCallback(
    (itemId: string) => {
      const cartItem = cartItems.find((item) => item.id === itemId)
      if (!cartItem) {
        toast.error('Cart item not found')
        return
      }

      const variant = cartItem.variant ?? null
      const stocks = getBatchStocks(cartItem.product, variant)
      if (!stocks || stocks.length === 0) {
        toast.error('No batch records available for this item')
        return
      }

      setBatchDialogState({
        product: cartItem.product,
        stocks,
        variant,
        defaultStockId: cartItem.stock.id,
        mode: 'update',
        cartItemId: cartItem.id,
      })
      setIsBatchDialogOpen(true)
    },
    [cartItems, getBatchStocks]
  )

  const handleBatchSelected = useCallback(
    (selectedStock: Stock) => {
      if (!batchDialogState) return

      if (batchDialogState.mode === 'add') {
        handleAddToCart(batchDialogState.product, selectedStock, batchDialogState.variant ?? null, {
          skipBatchPrompt: true,
        })
      } else if (batchDialogState.mode === 'update' && batchDialogState.cartItemId) {
        handleBatchChange(batchDialogState.cartItemId, selectedStock.id)
      }

      closeBatchDialog()
    },
    [batchDialogState, closeBatchDialog, handleAddToCart, handleBatchChange]
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
  // Discount Handlers
  // ----------------------------------------
  const handleDiscountChange = useCallback(
    (value: number, type: 'fixed' | 'percentage') => {
      setDiscount(value, type)
    },
    [setDiscount]
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
    async (amountPaid: number, printReceiptEnabled: boolean) => {
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
          // Individual product discount fields
          discount_type: item.discount > 0 ? item.discountType : undefined,
          discount_value: item.discount > 0 ? item.discount : undefined,
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
        console.log('[POS] autoPrintReceipt setting:', autoPrintReceipt)
        if (autoPrintReceipt || printReceiptEnabled) {
          console.log('[POS] Auto-print enabled, generating receipt...')
          console.log('[POS] Business data:', business ? business.companyName : 'NOT LOADED')
          console.log('[POS] Sale data:', result.data.invoiceNumber)

          try {
            const printSuccess = await printReceipt({
              sale: result.data,
              business,
              customer,
            })

            if (!printSuccess) {
              console.warn('[POS] Print may have failed or shown dialog')
              toast.warning('Receipt print may have failed - check printer')
            } else {
              console.log('[POS] Receipt printed to printer')
              toast.success('Receipt sent to printer')
            }
          } catch (error) {
            console.error('[POS] Receipt print error:', error)
            toast.error('Failed to print receipt')
          }
        } else {
          console.log('[POS] Auto-print is disabled in settings') ////////////
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
      // Check if we're in cooldown period
      if (isAddingToCart) {
        toast.warning('Please wait before scanning another item')
        return
      }

      const normalizedBarcode = barcode.toLowerCase()

      // Step 1: Check local storage FIRST (instant)
      try {
        const localProduct = await storage.products.getByBarcode(barcode)

        if (localProduct) {
          // Convert LocalProduct to Product format
          const product: Product = {
            id: localProduct.id,
            productName: localProduct.productName,
            productCode: localProduct.productCode,
            barcode: localProduct.barcode,
            product_type: localProduct.product_type,
            productPicture: localProduct.productPicture,
            vat_id: localProduct.vat_id,
            vat_type: localProduct.vat_type,
            category_id: localProduct.category_id,
            has_variants: localProduct.has_variants,
            stocks: localProduct.stocks || [],
            variants: localProduct.variants || [],
          } as Product

          // Get stock
          const stock = product.stocks?.[0]
          if (!stock) {
            toast.error('No stock available')
            return
          }

          const added = handleAddToCart(product, stock)
          if (!added) {
            return
          }

          // Step 2: If online, verify with API in background
          if (isOnline) {
            setTimeout(async () => {
              try {
                const apiResponse = await productsService.getByBarcode(barcode)

                if (!apiResponse.data) {
                  toast.error('Product no longer available', {
                    description: 'Please remove this item from your cart',
                  })
                  return
                }

                const { stock: apiStock } = apiResponse.data

                // Verify stock availability
                if (apiStock.productStock <= 0) {
                  toast.error('Product out of stock', {
                    description: 'Please remove this item from your cart',
                  })
                  return
                }

                // Check for price changes (notify but don't remove)
                if (apiStock.productSalePrice !== stock.productSalePrice) {
                  toast.info('Price updated', {
                    description: `Price changed from ${stock.productSalePrice} to ${apiStock.productSalePrice}`,
                  })
                }

                // Silently update cart with fresh data from API
                // The cart will use the local data but verification passed
              } catch (error) {
                // API verification failed - keep the item but log the error
                console.warn('[POS] Background verification failed:', error)
              }
            }, 100) // Small delay to not block UI
          }
          return
        }
      } catch (error) {
        console.error('[POS] Local storage lookup failed:', error)
        // Continue to API lookup
      }

      // Step 3: Not in local cache - try in-memory products array
      const product = products.find((p) => p.productCode?.toLowerCase() === normalizedBarcode)

      if (product && product.product_type === 'simple' && product.stocks?.[0]) {
        handleAddToCart(product, product.stocks[0])
        return
      }

      // Search in local variant barcodes
      for (const p of products) {
        if (p.product_type === 'variable' && p.variants) {
          const matchedVariant = p.variants.find(
            (v) => v.barcode?.toLowerCase() === normalizedBarcode
          )
          if (matchedVariant) {
            const variantId = Number(matchedVariant.id)
            const variantStock = p.stocks?.find((s) => Number(s.variant_id) === variantId)
            if (variantStock) {
              handleAddToCart(p, variantStock, matchedVariant)
              return
            }
          }
        }
      }

      // Step 4: Not found locally - fetch from API (only if online)
      if (!isOnline) {
        toast.error(`Product not found: ${barcode}`, {
          description: 'Currently offline - product not in local cache',
        })
        return
      }

      // Fetch from API and add optimistically
      productsService
        .getByBarcode(barcode)
        .then(async (response) => {
          if (response.data) {
            const { found_in, product, stock, variant } = response.data

            // Cache product to local storage for next scan
            try {
              const localProduct: LocalProduct = {
                id: product.id,
                productName: product.productName,
                productCode: product.productCode,
                barcode: product.barcode || product.productCode,
                product_type: product.product_type,
                productPicture: product.productPicture,
                vat_id: product.vat_id,
                vat_type: product.vat_type,
                category_id: product.category_id,
                has_variants: product.has_variants || false,
                stocks: product.stocks || [stock],
                variants: product.variants || [],
                stock,
                lastSyncedAt: new Date().toISOString(),
              }
              await storage.products.bulkUpsert([localProduct])
            } catch (error) {
              console.warn('[POS] Failed to cache product:', error)
            }

            if (found_in === 'variant' && variant) {
              handleAddToCart(product, stock, variant)
              toast.success(`Added variant: ${variant.variant_name || variant.sku}`)
            } else if (found_in === 'product' || found_in === 'batch') {
              handleAddToCart(product, stock)
              toast.success('Added to cart')
            }
          } else {
            toast.error(`Product not found: ${barcode}`)
          }
        })
        .catch(() => {
          toast.error(`Product not found: ${barcode}`)
        })

      // Don't await - let it resolve in background
    },
    [products, handleAddToCart, isOnline, isAddingToCart]
  )

  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: !dialogs.payment })

  // ----------------------------------------
  // Quantity Adjustment Handlers
  // ----------------------------------------
  const handleIncrementLastItem = useCallback(() => {
    if (!lastAddedItemId) {
      toast.warning('No item to increment')
      return
    }
    const item = cartItems.find((i) => i.id === lastAddedItemId)
    if (item) {
      handleUpdateQuantity(lastAddedItemId, item.quantity + 1)
    }
  }, [lastAddedItemId, cartItems, handleUpdateQuantity])

  const handleDecrementLastItem = useCallback(() => {
    if (!lastAddedItemId) {
      toast.warning('No item to decrement')
      return
    }
    const item = cartItems.find((i) => i.id === lastAddedItemId)
    if (item && item.quantity > 1) {
      handleUpdateQuantity(lastAddedItemId, item.quantity - 1)
    } else if (item && item.quantity === 1) {
      handleRemoveItem(lastAddedItemId)
    }
  }, [lastAddedItemId, cartItems, handleUpdateQuantity, handleRemoveItem])

  // ----------------------------------------
  // Keyboard Shortcuts
  // ----------------------------------------
  const shortcuts: KeyboardShortcut[] = useMemo(
    () => [
      {
        key: POS_SHORTCUT_KEYS.PAY,
        action: handleOpenPayment,
        description: 'Open payment',
        preventDefault: true,
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
      {
        key: POS_SHORTCUT_KEYS.INCREMENT_QTY,
        action: handleIncrementLastItem,
        description: 'Increment quantity',
        preventDefault: true,
      },
      {
        key: POS_SHORTCUT_KEYS.DECREMENT_QTY,
        action: handleDecrementLastItem,
        description: 'Decrement quantity',
        preventDefault: true,
      },
    ],
    [
      handleOpenPayment,
      handleHoldCart,
      handleOpenHeldCarts,
      handleOpenCustomerDialog,
      handleClearCart,
      closeAllDialogs,
      handleIncrementLastItem,
      handleDecrementLastItem,
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
      cartItems.map((item) => {
        const productStocks = item.product.stocks ?? []
        const relevantStocks = item.variantId
          ? productStocks.filter((stock) => Number(stock.variant_id) === Number(item.variantId))
          : productStocks
        const batchOptions = relevantStocks.map((stock) => ({
          id: stock.id,
          batchNo: stock.batch_no ?? null,
          expireDate: stock.expire_date ?? null,
          productStock: stock.productStock ?? 0,
          productSalePrice: stock.productSalePrice ?? item.unitPrice,
          disabled: (stock.productStock ?? 0) <= 0,
        }))

        return {
          productId: item.product.id,
          productName: item.product.productName,
          // Use variant SKU if available, otherwise product code
          productCode: item.variant?.sku || item.product.productCode || `SKU-${item.product.id}`,
          productImage: item.variant?.image || item.product.productPicture,
          quantity: item.quantity,
          salePrice: item.unitPrice,
          costPrice: item.stock.productPurchasePrice ?? item.product.productPurchasePrice ?? null,
          // Limit quantity to selected stock
          maxStock: item.stock.productStock ?? item.variant?.total_stock ?? item.quantity,
          id: item.id,
          // Variant information for display
          variantId: item.variantId ?? null,
          variantName: item.variantName ?? null,
          variantSku: item.variant?.sku ?? null,
          // Batch information for display
          batchNo: item.stock.batch_no ?? null,
          expiryDate: item.stock.expire_date ?? null,
          batchOptions,
          selectedBatchId: item.stock.id,
          // Discount fields
          discount: item.discount,
          discountType: item.discountType,
        }
      }),
    [cartItems]
  )

  // ----------------------------------------
  // Render
  // ----------------------------------------

  // Show full-screen loader during cache clearing or initial product load
  if (isClearingCache || isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">
            {isClearingCache ? 'Preparing POS...' : 'Loading products...'}
          </p>
        </div>
      </div>
    )
  }

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
              discountValue={discount}
              discountType={discountType}
              vatPercentage={vatPercentage}
              heldCartsCount={heldCarts.length}
              invoiceNumber={invoiceNumber || 'Loading...'}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateItemDiscount={(itemId, discount, type) => {
                updateItemDiscount(itemId, discount, type)
              }}
              onRemoveItem={handleRemoveItem}
              onChangeBatch={handleBatchChange}
              onOpenBatchSelector={handleOpenCartBatchDialog}
              onClearCart={handleClearCart}
              onHoldCart={handleHoldCart}
              onOpenHeldCarts={handleOpenHeldCarts}
              onSelectCustomer={handleOpenCustomerDialog}
              onDiscountChange={handleDiscountChange}
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
        autoPrintReceipt={autoPrintReceipt}
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

      <BatchSelectionDialog
        open={isBatchDialogOpen && Boolean(batchDialogState)}
        onClose={closeBatchDialog}
        product={batchDialogState?.product ?? null}
        stocks={batchDialogState?.stocks ?? []}
        variant={batchDialogState?.variant ?? null}
        defaultStockId={batchDialogState?.defaultStockId}
        onSelect={handleBatchSelected}
      />
    </div>
  )
}

export default POSPage
