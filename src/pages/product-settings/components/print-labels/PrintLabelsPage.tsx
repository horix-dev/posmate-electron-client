import { useEffect, useState, useCallback } from 'react'
import { Loader2, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { barcodesService, type BarcodeSettings, type BarcodeBatchItem, type BarcodePreviewConfig, type BarcodeItem } from '@/api/services/barcodes.service'
import { productsService } from '@/api/services/products.service' // <-- add

import { LabelConfiguration } from './LabelConfiguration'
import { SelectedProductsTable } from './SelectedProductsTable'
import { BarcodePreview } from './BarcodePreview'

// Replace SearchProductResult with a local option type (minimal fields we render)
type ProductOption = {
  id: number
  productName: string
  productCode: string
  productSalePrice?: number
  productDealerPrice?: number
  productStock?: number
}

interface SelectedProduct extends BarcodeBatchItem {
  product_name: string
  product_code: string
  unit_price?: number
  stock?: number
}

export function PrintLabelsPage() {
  const [settings, setSettings] = useState<BarcodeSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Selected products
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])

  // Product dropdown options
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]) // <-- type updated
  const [productOptionsLoading, setProductOptionsLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [productSearch, setProductSearch] = useState('')
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)

  // Label configuration
  const [showBusinessName, setShowBusinessName] = useState(true)
  const [businessName] = useState('')
  const [businessNameSize, setBusinessNameSize] = useState(15)

  const [showProductName, setShowProductName] = useState(true)
  const [productNameSize, setProductNameSize] = useState(15)

  const [showProductPrice, setShowProductPrice] = useState(true)
  const [productPriceSize, setProductPriceSize] = useState(14)

  const [showProductCode, setShowProductCode] = useState(true)
  const [productCodeSize, setProductCodeSize] = useState(14)

  const [showPackDate, setShowPackDate] = useState(true)
  const [packDateSize, setPackDateSize] = useState(12)

  // Barcode settings
  const [barcodeType, setBarcodeType] = useState('')
  const [barcodeSetting, setBarcodeSetting] = useState('')
  const [vatType, setVatType] = useState<'inclusive' | 'exclusive'>('inclusive')

  // Preview
  const [previewBarcodes, setPreviewBarcodes] = useState<BarcodeItem[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const resp = await barcodesService.getSettings()
        setSettings(resp.data)
        if (resp.data.barcode_types?.length > 0) setBarcodeType(resp.data.barcode_types[0].value)
        if (resp.data.paper_settings?.length > 0) setBarcodeSetting(String(resp.data.paper_settings[0].value))
      } catch (err) {
        toast.error('Failed to load barcode settings')
        console.error('Settings error:', err)
      } finally {
        setLoadingSettings(false)
      }
    }
    fetchSettings()
  }, [])

  // Helper to normalize product list response
  const normalizeItems = (products: any[]): ProductOption[] => {
    return products.map((p) => {
      // Try to get price from root or first stock
      const salePrice = p.productSalePrice ?? p.price ?? (p.stocks?.[0]?.productSalePrice) ?? null
      const dealerPrice = p.productDealerPrice ?? p.dealer_price ?? (p.stocks?.[0]?.productDealerPrice) ?? null
      const stock = p.productStock ?? p.stocks_sum_product_stock ?? p.stock ?? (p.stocks?.[0]?.productStock) ?? 0

      return {
        id: Number(p.id),
        productName: String(p.productName ?? p.name ?? ''),
        productCode: String(p.productCode ?? p.code ?? ''),
        productSalePrice: salePrice,
        productDealerPrice: dealerPrice,
        productStock: stock,
      }
    })
  }

  // Load initial product options for dropdown (server)
  useEffect(() => {
    const loadProducts = async () => {
      setProductOptionsLoading(true)
      try {
        // Use productsService.getAll() which calls /products
        const resp = await productsService.getAll()
        const items = normalizeItems(resp.data || [])
        setProductOptions(items)
      } catch (err) {
        console.error('Failed to load products list:', err)
        setProductOptions([])
        toast.error('Failed to load products list')
      } finally {
        setProductOptionsLoading(false)
      }
    }
    loadProducts()
  }, [])

  // Add product callback
  const handleAddProduct = useCallback((product: SelectedProduct) => {
    const exists = selectedProducts.some(p => p.product_id === product.product_id)
    if (!exists) {
      setSelectedProducts(prev => [...prev, product])
      toast.success(`${product.product_name} added`)
    } else {
      toast.error('Product already selected')
    }
  }, [selectedProducts])

  // Remove product
  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.product_id !== productId))
  }

  // Update product quantity
  const handleUpdateQuantity = (productId: number, quantity: number) => {
    setSelectedProducts(prev =>
      prev.map(p => (p.product_id === productId ? { ...p, quantity } : p))
    )
  }

  // Update product packing date
  const handleUpdatePackingDate = (productId: number, date: string | null) => {
    setSelectedProducts(prev =>
      prev.map(p => (p.product_id === productId ? { ...p, packing_date: date } : p))
    )
  }

  // Generate preview
  const handlePreview = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    setPreviewLoading(true)
    try {
      const config: BarcodePreviewConfig = {
        items: selectedProducts.map(p => ({
          product_id: p.product_id,
          quantity: p.quantity,
          batch_id: p.batch_id || null,
          packing_date: p.packing_date || null,
        })),
        barcode_type: barcodeType,
        barcode_setting: barcodeSetting,
        show_business_name: showBusinessName,
        business_name: businessName,
        business_name_size: businessNameSize,
        show_product_name: showProductName,
        product_name_size: productNameSize,
        show_product_price: showProductPrice,
        product_price_size: productPriceSize,
        show_product_code: showProductCode,
        product_code_size: productCodeSize,
        show_pack_date: showPackDate,
        pack_date_size: packDateSize,
        vat_type: vatType,
      }

      const resp = await barcodesService.generatePreview(config)
      setPreviewBarcodes(resp.data)
      setShowPreview(true)
      toast.success('Preview generated')
    } catch (err) {
      toast.error('Failed to generate preview')
      console.error('Preview error:', err)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Generate and print
  const handleGenerateAndPrint = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    setPreviewLoading(true)
    try {
      const config: BarcodePreviewConfig = {
        items: selectedProducts.map(p => ({
          product_id: p.product_id,
          quantity: p.quantity,
          batch_id: p.batch_id || null,
          packing_date: p.packing_date || null,
        })),
        barcode_type: barcodeType,
        barcode_setting: barcodeSetting,
        show_business_name: showBusinessName,
        business_name: businessName,
        business_name_size: businessNameSize,
        show_product_name: showProductName,
        product_name_size: productNameSize,
        show_product_price: showProductPrice,
        product_price_size: productPriceSize,
        show_product_code: showProductCode,
        product_code_size: productCodeSize,
        show_pack_date: showPackDate,
        pack_date_size: packDateSize,
        vat_type: vatType,
      }

      await barcodesService.generate(config)
      toast.success('Barcodes generated. Opening print dialog...')
      window.print()
    } catch (err) {
      toast.error('Failed to generate barcodes')
      console.error('Generate error:', err)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Clear selection
  const handleClearSelection = () => {
    setSelectedProducts([])
    setShowPreview(false)
    setPreviewBarcodes([])
  }

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Print Labels</h2>
          <p className="text-sm text-muted-foreground">Generate barcodes for selected products</p>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0 space-y-8">
          {/* Section 1: Product Selection */}
          <div className="bg-background rounded-lg border p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Select Product</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] items-center">
                <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      <span className="flex items-center gap-2 text-left truncate">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">
                          {selectedProductId
                            ? productOptions.find((p) => String(p.id) === selectedProductId)?.productName
                            : productOptionsLoading
                              ? 'Loading products...'
                              : 'Search or choose a product'}
                        </span>
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(480px,90vw)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <div className="flex items-center px-3 pt-3 pb-2 gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <CommandInput
                          placeholder="Search products by name or code..."
                          value={productSearch}
                          onValueChange={setProductSearch}
                          className="h-9"
                        />
                      </div>
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        {productOptionsLoading && (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        )}
                        {!productOptionsLoading && (
                          <>
                            {productOptions.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                No products loaded. Try clicking Refresh.
                              </div>
                            ) : (
                              <CommandGroup>
                                {productOptions
                                  .filter((p) => {
                                    const q = productSearch.toLowerCase().trim()
                                    if (!q) return true
                                    return (
                                      p.productName.toLowerCase().includes(q) ||
                                      p.productCode.toLowerCase().includes(q)
                                    )
                                  })
                                  .map((p) => {
                                    const displayPrice = p.productSalePrice ?? p.productDealerPrice
                                    return (
                                      <CommandItem
                                        key={p.id}
                                        value={String(p.id)}
                                        onSelect={async () => {
                                          setSelectedProductId(String(p.id))
                                          setProductPopoverOpen(false)
                                          try {
                                            const detailResp = await productsService.getById(p.id)
                                            const d = (detailResp && (detailResp as any).data) ?? {}
                                            handleAddProduct({
                                              product_id: p.id,
                                              product_name: String(d.productName ?? d.name ?? ''),
                                              product_code: String(d.productCode ?? d.code ?? ''),
                                              unit_price: d.productSalePrice ?? d.price ?? d.dealer_price ?? undefined,
                                              stock: d.productStock ?? d.stocks_sum_product_stock ?? d.stock ?? 0,
                                              quantity: 1,
                                              batch_id: null,
                                              packing_date: null,
                                            })
                                            setSelectedProductId('')
                                            setProductSearch('')
                                          } catch (err) {
                                            console.error('Failed to fetch product details:', err)
                                            toast.error('Failed to load product details')
                                          }
                                        }}
                                      >
                                        <div className="flex flex-col text-left w-full">
                                          <span className="font-medium">{p.productName}</span>
                                          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                                            <span>Code: {p.productCode}</span>
                                            <span>Price: {displayPrice ?? '-'}</span>
                                            <span>Stock: {p.productStock ?? 0}</span>
                                          </div>
                                        </div>
                                      </CommandItem>
                                    )
                                  })}
                                {productOptions.filter((p) => {
                                  const q = productSearch.toLowerCase().trim()
                                  if (!q) return true
                                  return (
                                    p.productName.toLowerCase().includes(q) ||
                                    p.productCode.toLowerCase().includes(q)
                                  )
                                }).length === 0 && (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                      No matching products found.
                                    </div>
                                  )}
                              </CommandGroup>
                            )}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  onClick={async () => {
                    setProductOptionsLoading(true)
                    try {
                      const resp = await productsService.getAll()
                      const items = normalizeItems(resp.data || [])
                      setProductOptions(items)
                      toast.success('Product list updated')
                    } catch (err) {
                      console.error('Failed to refresh products list:', err)
                      toast.error('Failed to refresh products')
                    } finally {
                      setProductOptionsLoading(false)
                    }
                  }}
                >
                  {productOptionsLoading ? (
                    <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading</span>
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <SelectedProductsTable
                products={selectedProducts}
                onRemove={handleRemoveProduct}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdatePackingDate={handleUpdatePackingDate}
              />
            )}
          </div>

          {/* Section 2: Label Configuration & Settings */}
          <div className="bg-background rounded-lg border p-6">
            <LabelConfiguration
              showBusinessName={showBusinessName}
              onShowBusinessNameChange={setShowBusinessName}
              businessNameSize={businessNameSize}
              onBusinessNameSizeChange={setBusinessNameSize}
              showProductName={showProductName}
              onShowProductNameChange={setShowProductName}
              productNameSize={productNameSize}
              onProductNameSizeChange={setProductNameSize}
              showProductPrice={showProductPrice}
              onShowProductPriceChange={setShowProductPrice}
              productPriceSize={productPriceSize}
              onProductPriceSizeChange={setProductPriceSize}
              showProductCode={showProductCode}
              onShowProductCodeChange={setShowProductCode}
              productCodeSize={productCodeSize}
              onProductCodeSizeChange={setProductCodeSize}
              showPackDate={showPackDate}
              onShowPackDateChange={setShowPackDate}
              packDateSize={packDateSize}
              onPackDateSizeChange={setPackDateSize}
              vatType={vatType}
              onVatTypeChange={setVatType}
              barcodeTypes={settings?.barcode_types || []}
              selectedBarcodeType={barcodeType}
              onBarcodeTypeChange={setBarcodeType}
              paperSettings={settings?.paper_settings || []}
              selectedPaperSetting={barcodeSetting}
              onPaperSettingChange={setBarcodeSetting}
            />

            <div className="flex justify-center pt-8">
              <Button
                onClick={handlePreview}
                disabled={
                  previewLoading ||
                  selectedProducts.length === 0 ||
                  !barcodeType ||
                  !barcodeSetting
                }
                className="bg-blue-800 hover:bg-blue-900 text-white min-w-[200px] h-10 text-base"
              >
                {previewLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview
              </Button>
            </div>
          </div>

          {/* Section 3: Preview Section */}
          {showPreview && (
            <div className="bg-background rounded-lg border p-6 animate-in fade-in-50 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Barcode Preview</h3>
                  <p className="text-sm text-muted-foreground">Review {previewBarcodes.length} barcodes before printing</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateAndPrint}
                    disabled={
                      previewLoading ||
                      selectedProducts.length === 0 ||
                      !barcodeType ||
                      !barcodeSetting
                    }
                  >
                    Print Labels
                  </Button>
                  <Button
                    onClick={handleClearSelection}
                    variant="ghost"
                    disabled={selectedProducts.length === 0}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
              <BarcodePreview barcodes={previewBarcodes} paperSetting={barcodeSetting} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PrintLabelsPage
