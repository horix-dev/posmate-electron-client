# Unified Product Search - Frontend Implementation

Complete frontend integration for the unified product search API that searches across products, variants, and batches.

## Overview

This implementation provides hooks and components for 5 key use cases:

1. **POS Barcode Scanning** - Quick lookup by barcode with audio feedback
2. **Product Search Dropdown** - Autocomplete search by name/code/SKU
3. **Inventory Management** - Comprehensive search across all types
4. **Batch Tracking** - Search batches by batch number
5. **Variant Lookup** - Search variants by SKU

## Quick Start

### Installation

No additional dependencies needed - uses existing project setup.

### Basic Usage

#### 1. POS Barcode Scanning

```typescript
import { usePOSBarcodeScanner } from '@/hooks'

function POSPage() {
  const { scanBarcode, lastScannedItem, inputRef } = usePOSBarcodeScanner({
    onItemScanned: (item) => {
      // Add to cart
      addToCart(item)
    },
    playSound: true, // Audio feedback
    autoFocus: true  // Auto-focus input
  })

  return (
    <input
      ref={inputRef}
      placeholder="Scan barcode..."
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          scanBarcode(e.currentTarget.value)
          e.currentTarget.value = ''
        }
      }}
    />
  )
}
```

**Features**:
- ✅ Audio beeps (success/error)
- ✅ Auto-focus management
- ✅ Scan history (last 10 scans)
- ✅ Toast notifications
- ✅ Handles products/variants/batches

#### 2. Product Search Dropdown

```typescript
import { useProductAutocomplete } from '@/hooks'

function ProductSelect() {
  const { query, setQuery, results, isLoading, onSelect } = useProductAutocomplete({
    limit: 10,
    debounceMs: 300,
    onSelect: (item) => console.log('Selected:', item)
  })

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      {isLoading && <Loader />}
      {results.map(item => (
        <button key={item.id} onClick={() => onSelect(item)}>
          {item.type === 'product' ? item.name : item.product_name}
        </button>
      ))}
    </div>
  )
}
```

**Features**:
- ✅ Automatic debouncing
- ✅ Result limiting
- ✅ Loading states
- ✅ Selection handling

#### 3. Unified Search (All Types)

```typescript
import { useProductSearch } from '@/hooks'

function InventorySearch() {
  const { results, isLoading, search, allResults } = useProductSearch()

  return (
    <div>
      <input onChange={(e) => search({ q: e.target.value })} />
      
      {/* Categorized results */}
      <h3>Products ({results.products.length})</h3>
      {results.products.map(p => <div key={p.id}>{p.name}</div>)}
      
      <h3>Variants ({results.variants.length})</h3>
      {results.variants.map(v => <div key={v.id}>{v.sku}</div>)}
      
      <h3>Batches ({results.batches.length})</h3>
      {results.batches.map(b => <div key={b.id}>{b.batch_no}</div>)}
    </div>
  )
}
```

#### 4. Type-Specific Search

```typescript
// Search only variants
search({ q: 'TSH', type: 'variant' })

// Search only batches
search({ q: 'BATCH-001', type: 'batch' })

// Search only products
search({ q: 'nike', type: 'product' })

// Search all (default)
search({ q: 'shirt', type: 'all' })
```

#### 5. Direct Barcode Lookup

```typescript
import { useBarcodeScanner } from '@/hooks'

function QuickLookup() {
  const { scan, isScanning, lastResult } = useBarcodeScanner({
    onSuccess: (result) => {
      if (result.type === 'variant') {
        console.log('Variant found:', result.data)
      } else if (result.type === 'product') {
        console.log('Product found:', result.data)
      } else {
        console.log('Batch found:', result.data)
      }
    },
    onNotFound: (barcode) => {
      toast.error(`No product found with barcode: ${barcode}`)
    }
  })

  return <button onClick={() => scan('8901234567001')}>Scan</button>
}
```

## API Reference

### Hooks

#### `useProductSearch(options?)`

Unified search across products, variants, and batches.

**Options**:
```typescript
{
  enabled?: boolean        // Enable/disable query (default: true)
  debounceMs?: number     // Debounce delay (default: 300)
  cacheTime?: number      // Cache duration (default: 5 minutes)
}
```

**Returns**:
```typescript
{
  results: UnifiedSearchResponse  // Categorized results
  allResults: SearchResultItem[]  // Combined array
  isLoading: boolean
  error: Error | null
  search: (params: ProductSearchParams) => void
  clear: () => void
  refetch: () => void
  isOnline: boolean
}
```

#### `usePOSBarcodeScanner(options?)`

Specialized POS barcode scanning with audio and UI feedback.

**Options**:
```typescript
{
  onItemScanned?: (item: ScannedItem) => void
  onError?: (error: string) => void
  onNotFound?: (barcode: string) => void
  playSound?: boolean      // Audio feedback (default: true)
  autoFocus?: boolean      // Auto-focus input (default: true)
}
```

**Returns**:
```typescript
{
  scanBarcode: (barcode: string) => Promise<void>
  isScanning: boolean
  error: Error | null
  lastScannedItem: ScannedItem | null
  scanHistory: ScannedItem[]  // Last 10 scans
  clearHistory: () => void
  inputRef: RefObject<HTMLInputElement>
}
```

#### `useBarcodeScanner(options?)`

Quick barcode lookup without UI features.

**Options**:
```typescript
{
  onSuccess?: (result: QuickBarcodeResult) => void
  onError?: (error: Error) => void
  onNotFound?: (barcode: string) => void
}
```

**Returns**:
```typescript
{
  scan: (barcode: string) => Promise<QuickBarcodeResult | null>
  isScanning: boolean
  error: Error | null
  lastResult: QuickBarcodeResult | null
  clear: () => void
}
```

#### `useProductAutocomplete(options?)`

Autocomplete/dropdown search with state management.

**Options**:
```typescript
{
  minChars?: number        // Minimum query length (default: 2)
  debounceMs?: number     // Debounce delay (default: 300)
  limit?: number          // Max results (default: 10)
  type?: 'product' | 'variant' | 'batch' | 'all'
  onSelect?: (item: SearchResultItem) => void
}
```

**Returns**:
```typescript
{
  query: string
  setQuery: (query: string) => void
  results: SearchResultItem[]
  allResults: SearchResultItem[]
  fullResults: UnifiedSearchResponse
  selectedItem: SearchResultItem | null
  setSelectedItem: (item: SearchResultItem | null) => void
  isLoading: boolean
  error: Error | null
  isOnline: boolean
  onSelect: (item: SearchResultItem) => void
}
```

### Types

#### `SearchResultItem`

```typescript
type SearchResultItem = 
  | ProductSearchResultItem 
  | VariantSearchResultItem 
  | BatchSearchResultItem
```

#### `ProductSearchResultItem`

```typescript
{
  id: number
  type: 'product'
  name: string
  code?: string
  barcode?: string
  image?: string
  product_type: 'simple' | 'variable' | 'variant'
  category?: { id: number; name: string }
  brand?: { id: number; name: string }
  unit?: { id: number; name: string }
  sale_price?: number
  purchase_price?: number
  total_stock?: number
}
```

#### `VariantSearchResultItem`

```typescript
{
  id: number
  type: 'variant'
  sku: string
  barcode?: string
  variant_name?: string
  image?: string
  product_id: number
  product_name: string
  product_code?: string
  product_image?: string
  price: number
  cost_price?: number
  wholesale_price?: number
  dealer_price?: number
  total_stock?: number
  is_active: boolean
  attributes?: Array<{
    attribute_id: number
    attribute_name: string
    value_id: number
    value: string
  }>
}
```

#### `BatchSearchResultItem`

```typescript
{
  id: number
  type: 'batch'
  batch_no?: string
  product_id: number
  product_name: string
  product_code?: string
  product_image?: string
  variant_id?: number | null
  variant_sku?: string | null
  variant_name?: string | null
  quantity: number
  cost_price?: number
  sale_price?: number
  expire_date?: string
  is_expired?: boolean
  days_until_expiry?: number
}
```

#### `ScannedItem`

Normalized format for POS scanning:

```typescript
{
  id: number
  type: 'product' | 'variant' | 'batch'
  name: string
  code?: string
  sku?: string
  barcode?: string
  price: number
  stock: number
  image?: string
  variant_name?: string
  product_id?: number
  product_name?: string
  batch_no?: string
  expire_date?: string
  is_expired?: boolean
}
```

## Example Components

Complete UI examples available in [src/components/examples/ProductSearchExamples.tsx](../src/components/examples/ProductSearchExamples.tsx):

- `POSBarcodeScanner` - Full POS scanning interface
- `ProductSearchDropdown` - Autocomplete dropdown
- `InventoryManagementSearch` - Comprehensive search UI
- `BatchTrackingSearch` - Batch-specific search
- `VariantLookupSearch` - Variant search with attributes

## Integration Examples

### POS Page Integration

```typescript
import { usePOSBarcodeScanner } from '@/hooks'
import { useCartStore } from '@/stores/cart'

function POSPage() {
  const addToCart = useCartStore(state => state.addItem)
  
  const { scanBarcode, inputRef, lastScannedItem } = usePOSBarcodeScanner({
    onItemScanned: (item) => {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        type: item.type,
        variant_id: item.type === 'variant' ? item.id : undefined,
        batch_id: item.type === 'batch' ? item.id : undefined
      })
    }
  })

  return (
    <div className="pos-page">
      <input
        ref={inputRef}
        className="barcode-input"
        placeholder="Scan barcode or type..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            scanBarcode(e.currentTarget.value)
            e.currentTarget.value = ''
          }
        }}
      />
      {lastScannedItem && (
        <div className="last-scanned">
          Scanned: {lastScannedItem.name} - ${lastScannedItem.price}
        </div>
      )}
    </div>
  )
}
```

### Product Selection Dialog

```typescript
import { useProductAutocomplete } from '@/hooks'
import { Dialog, DialogContent } from '@/components/ui/dialog'

function ProductSelectDialog({ onSelect, open, onClose }) {
  const { query, setQuery, results, isLoading } = useProductAutocomplete({
    limit: 10,
    onSelect: (item) => {
      onSelect(item)
      onClose()
    }
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          autoFocus
        />
        <div className="results">
          {isLoading && <div>Loading...</div>}
          {results.map(item => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => onSelect(item)}
              className="result-item"
            >
              <span className="type-badge">{item.type}</span>
              <span className="name">
                {item.type === 'product' ? item.name : item.product_name}
              </span>
              <span className="price">${getPrice(item)}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## Best Practices

### 1. Use Appropriate Hook for Use Case

- **POS Scanning**: Use `usePOSBarcodeScanner` for full POS features
- **Autocomplete**: Use `useProductAutocomplete` for dropdowns
- **Search Pages**: Use `useProductSearch` for comprehensive search
- **Quick Lookup**: Use `useBarcodeScanner` for simple barcode scanning

### 2. Handle All Item Types

```typescript
function handleItemScanned(item: ScannedItem) {
  if (item.type === 'variant') {
    // Variant has product_id, sku, variant_name
    addVariantToCart(item)
  } else if (item.type === 'product') {
    // Product has code, barcode
    addProductToCart(item)
  } else if (item.type === 'batch') {
    // Batch has batch_no, expire_date
    addBatchToCart(item)
  }
}
```

### 3. Offline Handling

All hooks respect online status:

```typescript
const { isOnline, results, error } = useProductSearch()

if (!isOnline) {
  // Hooks will use cached data automatically
  return <div>Offline - showing cached results</div>
}
```

### 4. Error Handling

```typescript
const { scan, error } = useBarcodeScanner({
  onNotFound: (barcode) => {
    toast.error(`Product not found: ${barcode}`)
  },
  onError: (error) => {
    toast.error(`Scan error: ${error.message}`)
  }
})
```

## Performance

- ✅ **Debouncing**: 300ms default (configurable)
- ✅ **Caching**: 5 minutes default (configurable)
- ✅ **Query Deduplication**: React Query handles duplicate requests
- ✅ **Offline Support**: Cached results used when offline
- ✅ **Lazy Loading**: Only fetches when query length >= 2 chars

## Troubleshooting

### No Results Returned

- Ensure query length >= 2 characters
- Check if online (offline mode uses cache)
- Verify backend API is running
- Check browser console for errors

### Audio Not Working

```typescript
// Audio requires user interaction in some browsers
const { scanBarcode } = usePOSBarcodeScanner({
  playSound: true // May not work until user interacts with page
})
```

### Input Not Focused

```typescript
// Use inputRef to manually focus
const { inputRef } = usePOSBarcodeScanner({ autoFocus: true })

useEffect(() => {
  inputRef.current?.focus()
}, [])
```

## Files Structure

```
src/
├── types/
│   └── product-search.types.ts      # Type definitions
├── api/
│   ├── endpoints.ts                 # API endpoints (SEARCH, QUICK_BARCODE)
│   └── services/
│       ├── productSearch.service.ts # API service
│       └── index.ts                 # Export
├── hooks/
│   ├── useProductSearch.ts          # Search hooks
│   ├── usePOSBarcodeScanner.ts      # POS scanner hook
│   └── index.ts                     # Export
└── components/
    └── examples/
        └── ProductSearchExamples.tsx # Usage examples
```

## Related Documentation

- [Backend Implementation](../../backend_docs/UNIFIED_PRODUCT_SEARCH_IMPLEMENTATION.md)
- [API Documentation](../../backend_docs/API_QUICK_REFERENCE.md)
- [Development Log](../../DEVELOPMENT_LOG.md)

## Support

For issues or questions:
1. Check [DEVELOPMENT_LOG.md](../../DEVELOPMENT_LOG.md) for recent changes
2. Review example components in [ProductSearchExamples.tsx](../src/components/examples/ProductSearchExamples.tsx)
3. Verify backend API is running and accessible
