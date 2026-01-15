/**
 * Product Search Examples
 *
 * Example components demonstrating the 5 use cases for unified product search:
 * 1. POS Barcode Scanning
 * 2. Product Search Dropdown
 * 3. Inventory Management Search
 * 4. Batch Tracking
 * 5. Variant Lookup
 */

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProductSearch, usePOSBarcodeScanner, useProductAutocomplete } from '@/hooks'
import type { SearchResultItem } from '@/types/product-search.types'
import { Loader2, Search, Barcode, Package, Box, Tags } from 'lucide-react'

// ============================================
// Use Case 1: POS Barcode Scanning
// ============================================

export function POSBarcodeScanner() {
  const { scanBarcode, isScanning, lastScannedItem, inputRef } = usePOSBarcodeScanner({
    onItemScanned: (item) => {
      console.log('Add to cart:', item)
      // Here you would add the item to cart using your cart store
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Barcode className="h-5 w-5" />
          POS Barcode Scanner
        </CardTitle>
        <CardDescription>Scan product barcodes to add items to cart</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Scan or type barcode..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  scanBarcode(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
              disabled={isScanning}
            />
            {isScanning && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}
          </div>

          {lastScannedItem && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                {lastScannedItem.image && (
                  <img
                    src={lastScannedItem.image}
                    alt={lastScannedItem.name}
                    className="h-16 w-16 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium">{lastScannedItem.name}</h4>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant={lastScannedItem.type === 'variant' ? 'secondary' : 'outline'}>
                      {lastScannedItem.type}
                    </Badge>
                    {lastScannedItem.variant_name && <span>{lastScannedItem.variant_name}</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="font-semibold">Price: ${lastScannedItem.price}</span>
                    <span>Stock: {lastScannedItem.stock}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Use Case 2: Product Search Dropdown
// ============================================

export function ProductSearchDropdown() {
  const { query, setQuery, results, isLoading, onSelect } = useProductAutocomplete({
    limit: 10,
    onSelect: (item) => {
      console.log('Selected:', item)
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Product Search Dropdown
        </CardTitle>
        <CardDescription>Search products by name, code, SKU, or barcode</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {isLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}
          </div>

          {results.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-background p-2">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => onSelect(item)}
                  className="w-full rounded-md p-2 text-left hover:bg-muted"
                >
                  <SearchResultCard item={item} compact />
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Use Case 3: Inventory Management Search
// ============================================

export function InventoryManagementSearch() {
  const { results, isLoading, search, allResults } = useProductSearch()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = () => {
    if (searchQuery.length >= 2) {
      search({ q: searchQuery, type: 'all' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Management
        </CardTitle>
        <CardDescription>Find products by any identifier</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search by name, code, SKU, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>

          {allResults.length > 0 && (
            <div className="space-y-4">
              {results.products.length > 0 && (
                <ResultSection title="Products" count={results.products.length}>
                  {results.products.map((item) => (
                    <SearchResultCard key={item.id} item={item} />
                  ))}
                </ResultSection>
              )}

              {results.variants.length > 0 && (
                <ResultSection title="Variants" count={results.variants.length}>
                  {results.variants.map((item) => (
                    <SearchResultCard key={item.id} item={item} />
                  ))}
                </ResultSection>
              )}

              {results.batches.length > 0 && (
                <ResultSection title="Batches" count={results.batches.length}>
                  {results.batches.map((item) => (
                    <SearchResultCard key={item.id} item={item} />
                  ))}
                </ResultSection>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Use Case 4: Batch Tracking
// ============================================

export function BatchTrackingSearch() {
  const { results, isLoading, search } = useProductSearch()
  const [batchQuery, setBatchQuery] = useState('')

  const handleSearch = () => {
    if (batchQuery.length >= 2) {
      search({ q: batchQuery, type: 'batch' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Box className="h-5 w-5" />
          Batch Tracking
        </CardTitle>
        <CardDescription>Search batches by batch number</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter batch number..."
              value={batchQuery}
              onChange={(e) => setBatchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>

          {results.batches.length > 0 && (
            <div className="space-y-2">
              {results.batches.map((batch) => (
                <div key={batch.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{batch.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Batch: {batch.batch_no || 'N/A'}
                      </p>
                      {batch.variant_name && (
                        <p className="text-sm text-muted-foreground">
                          Variant: {batch.variant_name}
                        </p>
                      )}
                    </div>
                    <Badge variant={batch.is_expired ? 'destructive' : 'default'}>
                      {batch.is_expired ? 'Expired' : `${batch.days_until_expiry} days left`}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span>Qty: {batch.quantity}</span>
                    <span>Price: ${batch.sale_price}</span>
                    {batch.expire_date && <span>Expires: {batch.expire_date}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Use Case 5: Variant Lookup
// ============================================

export function VariantLookupSearch() {
  const { results, isLoading, search } = useProductSearch()
  const [skuQuery, setSkuQuery] = useState('')

  const handleSearch = () => {
    if (skuQuery.length >= 2) {
      search({ q: skuQuery, type: 'variant' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-5 w-5" />
          Variant Lookup
        </CardTitle>
        <CardDescription>Search variants by SKU</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter SKU or variant name..."
              value={skuQuery}
              onChange={(e) => setSkuQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>

          {results.variants.length > 0 && (
            <div className="space-y-2">
              {results.variants.map((variant) => (
                <div key={variant.id} className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    {(variant.image || variant.product_image) && (
                      <img
                        src={variant.image || variant.product_image}
                        alt={variant.variant_name || variant.product_name}
                        className="h-16 w-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{variant.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {variant.variant_name || 'Default variant'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {variant.attributes?.map((attr) => (
                          <Badge key={attr.attribute_id} variant="secondary" className="text-xs">
                            {attr.attribute_name}: {attr.value}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="font-semibold">SKU: {variant.sku}</span>
                        <span>Price: ${variant.price}</span>
                        <span>Stock: {variant.total_stock}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Helper Components
// ============================================

function ResultSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        {title} ({count})
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SearchResultCard({
  item,
  compact = false,
}: {
  item: SearchResultItem
  compact?: boolean
}) {
  const getItemName = () => {
    if (item.type === 'product') return item.name
    if (item.type === 'variant') return item.product_name
    return item.product_name
  }

  const getItemDetails = () => {
    if (item.type === 'product') return item.code || 'No code'
    if (item.type === 'variant') return `SKU: ${item.sku}`
    return `Batch: ${item.batch_no || 'N/A'}`
  }

  const getItemPrice = () => {
    if (item.type === 'product') return item.sale_price
    if (item.type === 'variant') return item.price
    return item.sale_price
  }

  const getItemStock = () => {
    if (item.type === 'product') return item.total_stock
    if (item.type === 'variant') return item.total_stock
    return item.quantity
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="shrink-0">
          {item.type}
        </Badge>
        <span className="flex-1 truncate">{getItemName()}</span>
        <span className="text-sm text-muted-foreground">${getItemPrice()}</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        {('image' in item || 'product_image' in item) && (
          <img
            src={'image' in item ? item.image : (item as { product_image?: string }).product_image}
            alt={getItemName()}
            className="h-16 w-16 rounded object-cover"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h4 className="font-medium">{getItemName()}</h4>
            <Badge variant="outline">{item.type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{getItemDetails()}</p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="font-semibold">Price: ${getItemPrice()}</span>
            <span>Stock: {getItemStock()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
