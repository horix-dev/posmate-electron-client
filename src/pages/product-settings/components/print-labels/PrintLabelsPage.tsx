import { useEffect, useState, useCallback } from 'react'
import { Loader2, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import bwipjs from 'bwip-js'
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
import { type BarcodeBatchItem } from '@/api/services/barcodes.service'
import { type LabelPayload } from '@/api/services/print-labels.service'
import { productsService } from '@/api/services/products.service'
import { useCurrency } from '@/hooks/useCurrency'
import { useBusinessStore } from '@/stores'

import { LabelConfiguration } from './LabelConfiguration'
import { SelectedProductsTable } from './SelectedProductsTable'
import { BarcodePreview } from './BarcodePreview'

// Type for Electron print API response
type PrintResult = {
  success: boolean
  error?: string
}

// Replace SearchProductResult with a local option type (minimal fields we render)
type ProductOption = {
  optionValue: string
  id: number // parent product id
  productName: string
  productCode: string
  barcode?: string
  productSalePrice?: number
  productDealerPrice?: number
  productStock?: number
  isVariant?: boolean
  variantId?: number
}

interface SelectedProduct extends BarcodeBatchItem {
  product_name: string
  product_code: string
  barcode?: string
  unit_price?: number
  stock?: number
}

type BwipJs = {
  toSVG: (options: {
    bcid: string
    text: string
    scale?: number
    height?: number
    includetext?: boolean
    textxalign?: string
    backgroundcolor?: string
  }) => string
}

const bwip: BwipJs = bwipjs as unknown as BwipJs

export function PrintLabelsPage() {
  const { format: formatCurrency } = useCurrency()
  const business = useBusinessStore((state) => state.business)

  type BarcodeTypeOpt = { value: string; label: string }
  type PaperSettingOpt = { value: string; label: string; name: string; dimensions?: string }
  const [settings, setSettings] = useState<{
    barcode_types: BarcodeTypeOpt[]
    paper_settings: PaperSettingOpt[]
  } | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Selected products
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])

  // Product dropdown options
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [productOptionsLoading, setProductOptionsLoading] = useState(false)
  const [selectedOptionValue, setSelectedOptionValue] = useState<string>('')
  const [productSearch, setProductSearch] = useState('')
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)

  // Label configuration
  const [showBusinessName, setShowBusinessName] = useState(true)
  const [businessNameSize, setBusinessNameSize] = useState(7)

  const [showProductName, setShowProductName] = useState(true)
  const [productNameSize, setProductNameSize] = useState(7)

  const [showProductPrice, setShowProductPrice] = useState(true)
  const [productPriceSize, setProductPriceSize] = useState(7)

  const [showProductCode, setShowProductCode] = useState(true)
  const [productCodeSize, setProductCodeSize] = useState(7)

  const [showPackDate, setShowPackDate] = useState(true)
  const [packDateSize, setPackDateSize] = useState(7)

  // Barcode settings
  const [barcodeType, setBarcodeType] = useState('')
  const [barcodeSetting, setBarcodeSetting] = useState('')
  const [vatType, setVatType] = useState<'inclusive' | 'exclusive'>('inclusive')

  // Preview
  const [previewBarcodes, setPreviewBarcodes] = useState<LabelPayload[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Default settings
  useEffect(() => {
    const defaultBarcodeTypes = [
      { value: 'code128', label: 'Code 128' },
      { value: 'code39', label: 'Code 39' },
      { value: 'ean13', label: 'EAN-13' },
      { value: 'ean8', label: 'EAN-8' },
      { value: 'upca', label: 'UPC-A' },
      { value: 'itf14', label: 'ITF-14' },
      { value: 'interleaved2of5', label: 'Interleaved 2 of 5' },
      { value: 'code93', label: 'Code 93' },
      { value: 'qrcode', label: 'QR Code' },
      { value: 'datamatrix', label: 'Data Matrix' },
      { value: 'pdf417', label: 'PDF417' },
      { value: 'azteccode', label: 'Aztec Code' },
    ]
    const defaultPaperSettings = [
      {
        value: '2',
        label: 'Labels Roll-Label Size 2"x1", 50mmx25mm, Gap:3.1mm',
        name: 'Labels Roll-Label Size 2"x1", 50mmx25mm, Gap:3.1mm',
      },
      {
        value: '1',
        label: 'Labels Roll-Label Size 1.5"x1", 38mmx25mm, Gap:3.1mm',
        name: 'Labels Roll-Label Size 1.5"x1", 38mmx25mm, Gap:3.1mm',
      },
      {
        value: '3',
        label: '28 Labels Per Sheet, Sheet Size: 8.27" X 11.69", Label size: 2" X 1.25"',
        name: '28 Labels Per Sheet, Sheet Size: 8.27" X 11.69", Label size: 2" X 1.25"',
      },
    ]
    const cfg = { barcode_types: defaultBarcodeTypes, paper_settings: defaultPaperSettings }
    setSettings(cfg)
    setBarcodeType('code128')
    setBarcodeSetting('2')
    setLoadingSettings(false)
  }, [])

  // Helper to normalize product list response
  const normalizeItems = (products: unknown[]): ProductOption[] => {
    const options: ProductOption[] = []

    products.forEach((p: unknown) => {
      const product = p as Record<string, unknown>
      // Extract sale price: try root level, then stocks array
      let salePrice: number | undefined =
        ((product.productSalePrice ?? product.price) as number | undefined) ?? undefined
      if (
        !salePrice &&
        product.stocks &&
        Array.isArray(product.stocks) &&
        product.stocks.length > 0
      ) {
        const stock0 = product.stocks[0] as Record<string, unknown>
        salePrice = ((stock0.productSalePrice ?? stock0.price) as number | undefined) ?? undefined
      }

      // Extract dealer price: try root level, then stocks array
      let dealerPrice: number | undefined =
        ((product.productDealerPrice ?? product.dealer_price) as number | undefined) ?? undefined
      if (
        !dealerPrice &&
        product.stocks &&
        Array.isArray(product.stocks) &&
        product.stocks.length > 0
      ) {
        const stock0 = product.stocks[0] as Record<string, unknown>
        dealerPrice =
          ((stock0.productDealerPrice ?? stock0.dealer_price) as number | undefined) ?? undefined
      }

      // Extract stock: try multiple fields
      let stock: number | undefined =
        ((product.productStock ?? product.stocks_sum_product_stock) as number | undefined) ??
        undefined
      if (!stock && product.stocks && Array.isArray(product.stocks) && product.stocks.length > 0) {
        stock = product.stocks.reduce((sum: number, s: unknown) => {
          const stockItem = s as Record<string, unknown>
          return sum + ((stockItem.productStock as number) ?? 0)
        }, 0)
      }

      // Extract barcode directly from API response (barcode field added to backend)
      const baseBarcode: string = String(
        product.barcode ?? product.productCode ?? product.code ?? ''
      ).trim()

      const baseOption: ProductOption = {
        optionValue: `product-${product.id}`,
        id: Number(product.id),
        productName: String(product.productName ?? product.name ?? ''),
        productCode: String(product.productCode ?? product.code ?? ''),
        barcode: baseBarcode || undefined,
        productSalePrice: salePrice !== undefined ? Number(salePrice) : undefined,
        productDealerPrice: dealerPrice !== undefined ? Number(dealerPrice) : undefined,
        productStock: stock !== undefined ? Number(stock) : undefined,
      }

      options.push(baseOption)

      if (Array.isArray(product.variants)) {
        product.variants.forEach((v: unknown) => {
          const variant = v as Record<string, unknown>
          // Build variant name from attribute_values (matches ProductDetailsDialog logic)
          let variantName = ''
          if (variant.attribute_values && Array.isArray(variant.attribute_values)) {
            variantName = (variant.attribute_values as Array<Record<string, unknown>>)
              .map((av) => av.value)
              .join(' / ')
          }
          // Fallback to variant_name from API if available
          if (!variantName) {
            variantName = String(variant.variant_name ?? '')
          }
          // Fallback to attributes_map if neither above is available
          if (
            !variantName &&
            variant.attributes_map &&
            typeof variant.attributes_map === 'object'
          ) {
            const attrMap = variant.attributes_map as Record<string, string>
            variantName = Object.values(attrMap).join(' / ')
          }

          const variantBarcode = String(variant.barcode ?? variant.sku ?? '').trim()
          const variantOption: ProductOption = {
            optionValue: `variant-${product.id}-${variant.id}`,
            id: Number(product.id),
            variantId: Number(variant.id),
            isVariant: true,
            productName:
              `${String(product.productName ?? product.name ?? '')} : ${variantName}`.trim(),
            productCode:
              String(variant.sku ?? variant.barcode ?? '').trim() || baseOption.productCode,
            barcode: variantBarcode || baseBarcode || undefined,
            productSalePrice:
              variant.price !== undefined
                ? Number(variant.price)
                : salePrice !== undefined
                  ? Number(salePrice)
                  : undefined,
            productDealerPrice: dealerPrice !== undefined ? Number(dealerPrice) : undefined,
            productStock:
              variant.total_stock !== undefined
                ? Number(variant.total_stock)
                : stock !== undefined
                  ? Number(stock)
                  : undefined,
          }

          options.push(variantOption)
        })
      }
    })

    return options
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
  const handleAddProduct = useCallback(
    (product: SelectedProduct) => {
      const exists = selectedProducts.some((p) => p.product_id === product.product_id)
      if (!exists) {
        setSelectedProducts((prev) => [...prev, product])
        toast.success(`${product.product_name} added`)
      } else {
        toast.error('Product already selected')
      }
    },
    [selectedProducts]
  )

  // Remove product
  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts((prev) => prev.filter((p) => p.product_id !== productId))
  }

  // Update product quantity
  const handleUpdateQuantity = (productId: number, quantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.product_id === productId ? { ...p, quantity } : p))
    )
  }

  // Update product packing date
  const handleUpdatePackingDate = (productId: number, date: string | null) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.product_id === productId ? { ...p, packing_date: date } : p))
    )
  }

  // Generate preview (client-side, no API call)
  const handlePreview = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    setPreviewLoading(true)
    try {
      // Generate barcodes client-side
      const barcodes: LabelPayload[] = []

      for (const product of selectedProducts) {
        const qty = Number(product.quantity || 1)

        // Duplicate labels based on quantity
        for (let i = 0; i < qty; i++) {
          // Generate placeholder barcode SVG (simple code128-like representation)
          const barcodeValue = String(product.barcode || product.product_code)
          const barcodeSvg = generateBarcodeSVG(barcodeValue, barcodeType)

          const label: LabelPayload = {
            barcode_svg: barcodeSvg,
            packing_date: product.packing_date || null,
            product_name: product.product_name,
            business_name: business?.companyName || 'Business Name',
            product_code: product.product_code,
            product_price: product.unit_price || 0,
            product_stock: product.stock || 0,
            show_product_name: showProductName,
            product_name_size: productNameSize,
            show_business_name: showBusinessName,
            business_name_size: businessNameSize,
            show_product_price: showProductPrice,
            product_price_size: productPriceSize,
            show_product_code: showProductCode,
            product_code_size: productCodeSize,
            show_pack_date: showPackDate,
            pack_date_size: packDateSize,
          }

          barcodes.push(label)
        }
      }

      setPreviewBarcodes(barcodes)
      setShowPreview(true)
      toast.success(`Preview generated: ${barcodes.length} labels`)
    } catch (err) {
      toast.error('Failed to generate preview')
      console.error('Preview error:', err)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Generate barcode SVG
  // Generate barcode SVG
  function generateBarcodeSVG(value: string, type: string): string {
    try {
      const bcid = type || 'code128'
      let text = value

      // Pre-processing for strict numeric barcode types
      if (['ean13', 'ean8', 'upca', 'upce', 'itf14', 'interleaved2of5'].includes(bcid)) {
        // Remove non-numeric characters
        text = text.replace(/[^0-9]/g, '')

        // Ensure at least 1 digit remains, else fallback will trigger naturally or below
        if (!text) throw new Error('Numeric barcode requires numeric value')

        // Specific Padding/Length Logic
        if (bcid === 'ean13') {
          // EAN-13: 12 digits (calc check) or 13 digits
          if (text.length < 12) text = text.padStart(12, '0')
          else if (text.length > 13) text = text.slice(0, 13)
        } else if (bcid === 'ean8') {
          // EAN-8: 7 digits (calc check) or 8 digits
          if (text.length < 7) text = text.padStart(7, '0')
          else if (text.length > 8) text = text.slice(0, 8)
        } else if (bcid === 'upca') {
          // UPC-A: 11 digits (calc check) or 12 digits
          if (text.length < 11) text = text.padStart(11, '0')
          else if (text.length > 12) text = text.slice(0, 12)
        } else if (bcid === 'itf14') {
          // ITF-14: 13 digits (calc check) or 14 digits
          if (text.length < 13) text = text.padStart(13, '0')
          else if (text.length > 14) text = text.slice(0, 14)
        } else if (bcid === 'interleaved2of5') {
          // I2of5: Must be even number of digits
          if (text.length % 2 !== 0) text = '0' + text
        }
      }

      // Codabar specific handling (needs start/stop chars A-D)
      if (bcid === 'codabar') {
        text = text.toUpperCase()
        const validStartStop = ['A', 'B', 'C', 'D']
        const hasStart = validStartStop.includes(text[0])
        const hasStop = validStartStop.includes(text[text.length - 1])

        if (!hasStart) text = 'A' + text
        if (!hasStop) text = text + 'A'
      }

      const svg = bwip.toSVG({
        bcid,
        text: text,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
        backgroundcolor: 'ffffff',
      })

      return svg
    } catch (err) {
      console.warn(`Barcode generation failed for ${type} with value ${value}:`, err)
      return generateFallbackBarcode(value)
    }
  }

  function generateFallbackBarcode(value: string): string {
    // Basic rectangle fallback
    const barcodeWidth = 100
    const barcodeHeight = 50
    return `<svg width="${barcodeWidth}" height="${barcodeHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${barcodeWidth}" height="${barcodeHeight}" fill="white"/>
      <rect x="10" y="5" width="80" height="40" fill="#ccc"/>
      <text x="50" y="30" font-family="Arial" font-size="10" text-anchor="middle" fill="black">${value}</text>
    </svg>`
  }

  // Generate print HTML with only barcodes
  const generatePrintHTML = (): string => {
    const barcodes: LabelPayload[] = []

    for (const product of selectedProducts) {
      const qty = Number(product.quantity || 1)

      for (let i = 0; i < qty; i++) {
        const barcodeValue = String(product.barcode || product.product_code)
        const barcodeSvg = generateBarcodeSVG(barcodeValue, barcodeType)

        const label: LabelPayload = {
          barcode_svg: barcodeSvg,
          packing_date: product.packing_date || null,
          product_name: product.product_name,
          business_name: business?.companyName || 'KC',
          product_code: product.product_code,
          product_price: product.unit_price || 0,
          product_stock: product.stock || 0,
          show_product_name: showProductName,
          product_name_size: productNameSize,
          show_business_name: showBusinessName,
          business_name_size: businessNameSize,
          show_product_price: showProductPrice,
          product_price_size: productPriceSize,
          show_product_code: showProductCode,
          product_code_size: productCodeSize,
          show_pack_date: showPackDate,
          pack_date_size: packDateSize,
        }
        barcodes.push(label)
      }
    }

    const paperSettings: Record<
      string,
      { width: string; height: string; labelHeight: string; gap: string; cols: number }
    > = {
      '1': { width: '38mm', height: '25mm', labelHeight: '25mm', gap: '10mm', cols: 4 },
      '2': { width: '50mm', height: '25mm', labelHeight: '25mm', gap: '10mm', cols: 3 },
      '3': { width: '50.8mm', height: '31.75mm', labelHeight: '31.75mm', gap: '10mm', cols: 4 },
    }
    const dims = paperSettings[barcodeSetting] || paperSettings['1']

    const convertPtToPixels = (pt: number): number => (pt * 96) / 72

    const labelHTML = barcodes
      .map((barcode) => {
        const svgSrc = barcode.barcode_svg.startsWith('<svg')
          ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(barcode.barcode_svg)))}`
          : `data:image/png;base64,${barcode.barcode_svg}`
        return `
      <div class="label" style="width: ${dims.width}; height: ${dims.height};">
        ${barcode.show_business_name && barcode.business_name ? `<div class="business-name" style="font-size: ${convertPtToPixels(barcode.business_name_size)}px;">${barcode.business_name}</div>` : ''}
        ${barcode.show_product_name && barcode.product_name ? `<div class="product-name" style="font-size: ${convertPtToPixels(barcode.product_name_size)}px;">${barcode.product_name}</div>` : ''}
        ${barcode.show_product_price && typeof barcode.product_price === 'number' ? `<div class="price" style="font-size: ${convertPtToPixels(barcode.product_price_size)}px;">Price: ${formatCurrency(barcode.product_price)}</div>` : ''}
        <div class="barcode"><img src="${svgSrc}" alt="barcode"/></div>
      </div>
    `
      })
      .join('')

    const isSheet = barcodeSetting === '3'

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Print Labels</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 0; 
              margin: 0; 
              background-color: white;
            }
            
            /* Page Setup - page height = label (25mm) + gap (10mm) = 35mm total */
            @page {
              ${isSheet ? 'size: A4; margin: 0.25in;' : `size: 50mm 35mm landscape; margin: 0; padding: 0;`}
            }

            .container { 
              width: 100%;
              ${
                isSheet
                  ? `display: grid; grid-template-columns: repeat(${dims.cols}, 1fr); gap: 0.125in;`
                  : 'display: block;'
              }
            }

            .label { 
              width: ${dims.width}; 
              height: ${dims.labelHeight}; 
              border: 1px dotted #ccc; 
              display: flex; 
              flex-direction: column; 
              justify-content: space-between; 
              align-items: center; 
              padding: 1px 1px 1px 1px; 
              text-align: center; 
              overflow: hidden; 
              background: white;
              position: relative;
              ${!isSheet ? `page-break-after: always; break-after: page;` : `margin-bottom: 0.125in;`}
            }
            
            /* Hide border for print */
            @media print {
              body { margin: 0; padding: 0; }
              .label { border: none; }
              /* Prevent extra page at end */
              .label:last-child { 
                page-break-after: auto; 
                break-after: auto; 
              }
              .container {
                /* Ensure grid works on print */
                 ${isSheet ? `display: grid; grid-template-columns: repeat(${dims.cols}, 1fr); gap: 0.125in;` : ''}
              }
            }

            /* Content Styles */
            .business-name { font-weight: bold; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
            .product-name { width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
            .price { font-weight: bold; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
            
            .barcode { 
              flex: 1; 
              width: 100%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 0; 
              margin: 2px 0; 
            }
            .barcode img { 
              max-height: 100%; 
              max-width: 100%; 
              object-fit: contain; 
            }
            
            .product-code { width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
            .pack-date { width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #666; font-size: 8px !important; }
          </style>
        </head>
        <body>
          <div class="container">${labelHTML}</div>
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() { window.print(); }, 500);
            });
          </script>
        </body>
      </html>
    `
  }

  // Generate and print (client-side, opens new window)
  const handleGenerateAndPrint = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    setPreviewLoading(true)
    try {
      // Get current paper settings
      const paperSettings: Record<
        string,
        { width: string; height: string; labelHeight: string; gap: string; cols: number }
      > = {
        '1': { width: '38mm', height: '25mm', labelHeight: '25mm', gap: '10mm', cols: 4 },
        '2': { width: '50mm', height: '25mm', labelHeight: '25mm', gap: '10mm', cols: 3 },
        '3': { width: '50.8mm', height: '31.75mm', labelHeight: '31.75mm', gap: '10mm', cols: 4 },
      }
      const dims = paperSettings[barcodeSetting] || paperSettings['1']

      const printHTML = generatePrintHTML()

      // Convert mm to microns for page size (1mm = 1000 microns)
      // Page height = label height + gap between stickers
      const widthMm = parseInt(dims.width)
      const gapMm = 10 // 10mm gap between stickers
      const heightMm = parseInt(dims.labelHeight) + gapMm
      const pageWidth = Math.round(widthMm * 1000) // 50mm = 50,000 microns
      const pageHeight = Math.round(heightMm * 1000) // 28mm = 28,000 microns

      // If running inside Electron, prefer the native silent-print path
      // exposed via the preload as `electronAPI.print.receiptHTMLWithPageSize`.
      // Fallback to opening a new window for browser environments.
      try {
        const electronWindow = window as unknown as {
          electronAPI?: {
            print?: {
              receiptHTMLWithPageSize?: (
                html: string,
                pageSize: { width: number; height: number }
              ) => Promise<PrintResult>
              receiptHTML?: (html: string) => Promise<PrintResult>
            }
          }
        }

        if (
          typeof window !== 'undefined' &&
          electronWindow.electronAPI?.print?.receiptHTMLWithPageSize
        ) {
          const result = await electronWindow.electronAPI.print.receiptHTMLWithPageSize(printHTML, {
            width: pageWidth,
            height: pageHeight,
          })
          if (result && result.success) {
            toast.success('Sent to printer')
          } else {
            toast.error('Printer error: ' + (result?.error || ''))
          }
        } else if (
          typeof window !== 'undefined' &&
          electronWindow.electronAPI?.print?.receiptHTML
        ) {
          const result = await electronWindow.electronAPI.print.receiptHTML(printHTML)
          if (result && result.success) {
            toast.success('Sent to printer')
          } else {
            toast.error('Printer error')
          }
        } else {
          const printWindow = window.open('', '_blank', 'width=800,height=600')
          if (printWindow) {
            printWindow.document.write(printHTML)
            printWindow.document.close()
            printWindow.onload = () => {
              setTimeout(() => {
                printWindow.print()
              }, 500)
            }
            toast.success('Print window opened')
          } else {
            toast.error('Failed to open print window')
          }
        }
      } catch (err) {
        console.error('Print invocation failed:', err)
        toast.error('Failed to invoke print')
      }
    } catch (err) {
      toast.error('Failed to generate labels')
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
      <div className="flex h-96 items-center justify-center">
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

      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="space-y-8 p-0">
          {/* Section 1: Product Selection */}
          <div className="space-y-6 rounded-lg border bg-background p-6">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Select Product</h3>
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto]">
                <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      <span className="flex items-center gap-2 truncate text-left">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">
                          {selectedOptionValue
                            ? productOptions.find((p) => p.optionValue === selectedOptionValue)
                                ?.productName
                            : productOptionsLoading
                              ? 'Loading products...'
                              : 'Search or choose a product'}
                        </span>
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(480px,90vw)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
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
                                        key={p.optionValue}
                                        value={p.optionValue}
                                        onSelect={async () => {
                                          setSelectedOptionValue(p.optionValue)
                                          setProductPopoverOpen(false)

                                          // For variants, we already have the needed values; no extra fetch required.
                                          if (p.isVariant && p.variantId) {
                                            handleAddProduct({
                                              product_id: p.variantId,
                                              product_name: p.productName,
                                              product_code: p.productCode,
                                              barcode: p.barcode,
                                              unit_price: p.productSalePrice ?? 0,
                                              stock: p.productStock ?? 0,
                                              quantity: 1,
                                              batch_id: null,
                                              packing_date: null,
                                            })
                                            setSelectedOptionValue('')
                                            setProductSearch('')
                                            return
                                          }

                                          try {
                                            const detailResp = await productsService.getById(p.id)
                                            const d = ((detailResp &&
                                              (detailResp as unknown as Record<string, unknown>)
                                                .data) ??
                                              {}) as Record<string, unknown>

                                            // Extract stock properly from nested structure
                                            let stock: number | undefined =
                                              ((d.productStock ??
                                                d.stocks_sum_product_stock ??
                                                d.stock) as number | undefined) ?? undefined
                                            if (
                                              !stock &&
                                              d.stocks &&
                                              Array.isArray(d.stocks) &&
                                              d.stocks.length > 0
                                            ) {
                                              stock = d.stocks.reduce(
                                                (sum: number, s: unknown) =>
                                                  sum +
                                                  (((s as Record<string, unknown>)
                                                    .productStock as number) ?? 0),
                                                0
                                              )
                                            }

                                            // Extract sale price: try root level, then stocks array
                                            let salePrice: number | undefined =
                                              ((d.productSalePrice ?? d.price) as
                                                | number
                                                | undefined) ?? undefined
                                            if (
                                              !salePrice &&
                                              d.stocks &&
                                              Array.isArray(d.stocks) &&
                                              d.stocks.length > 0
                                            ) {
                                              const stock0 = d.stocks[0] as Record<string, unknown>
                                              salePrice =
                                                ((stock0.productSalePrice ?? stock0.price) as
                                                  | number
                                                  | undefined) ?? undefined
                                            }

                                            const barcodeValue = String(
                                              d.barcode ??
                                                p.barcode ??
                                                d.productCode ??
                                                d.code ??
                                                ''
                                            )

                                            handleAddProduct({
                                              product_id: p.id,
                                              product_name: String(d.productName ?? d.name ?? ''),
                                              product_code: String(d.productCode ?? d.code ?? ''),
                                              barcode: barcodeValue,
                                              unit_price: salePrice ? Number(salePrice) : 0,
                                              stock: stock ? Number(stock) : 0,
                                              quantity: 1,
                                              batch_id: null,
                                              packing_date: null,
                                            })
                                            setSelectedOptionValue('')
                                            setProductSearch('')
                                          } catch (err) {
                                            console.error('Failed to fetch product details:', err)
                                            toast.error('Failed to load product details')
                                          }
                                        }}
                                      >
                                        <div className="flex w-full flex-col text-left">
                                          <span className="font-medium">{p.productName}</span>
                                          <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
                                            <span>Barcode: {p.barcode || '-'}</span>
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
                    <span className="inline-flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading
                    </span>
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
          <div className="rounded-lg border bg-background p-6">
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
                  previewLoading || selectedProducts.length === 0 || !barcodeType || !barcodeSetting
                }
                className="h-10 min-w-[200px] bg-blue-800 text-base text-white hover:bg-blue-900"
              >
                {previewLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview
              </Button>
            </div>
          </div>

          {/* Section 3: Preview Section */}
          {showPreview && (
            <div className="rounded-lg border bg-background p-6 duration-500 animate-in fade-in-50">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Barcode Preview</h3>
                  <p className="text-sm text-muted-foreground">
                    Review {previewBarcodes.length} barcodes before printing
                  </p>
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
