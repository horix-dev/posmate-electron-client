# Product Search - Quick Reference

## 🚀 Quick Start

### POS Barcode Scanner
```typescript
import { usePOSBarcodeScanner } from '@/hooks'

const { scanBarcode, inputRef } = usePOSBarcodeScanner({
  onItemScanned: (item) => addToCart(item)
})

<input ref={inputRef} onKeyDown={(e) => 
  e.key === 'Enter' && scanBarcode(e.currentTarget.value)
} />
```

### Autocomplete Dropdown
```typescript
import { useProductAutocomplete } from '@/hooks'

const { query, setQuery, results } = useProductAutocomplete({ limit: 10 })

<input value={query} onChange={(e) => setQuery(e.target.value)} />
{results.map(item => <div key={item.id}>{item.name}</div>)}
```

### Full Search
```typescript
import { useProductSearch } from '@/hooks'

const { results, search } = useProductSearch()

search({ q: 'shirt', type: 'all' })
// results.products, results.variants, results.batches
```

## 🎯 Use Cases

| Use Case | Hook | Type Filter |
|----------|------|-------------|
| POS Scanning | `usePOSBarcodeScanner` | N/A (uses quickBarcode) |
| Autocomplete | `useProductAutocomplete` | `all` (default) |
| Inventory | `useProductSearch` | `all` |
| Batch Tracking | `useProductSearch` | `type: 'batch'` |
| Variant Lookup | `useProductSearch` | `type: 'variant'` |

## 📦 Item Types

```typescript
if (item.type === 'product') {
  // item.name, item.code, item.barcode
  // item.sale_price, item.total_stock
}
else if (item.type === 'variant') {
  // item.product_name, item.sku, item.variant_name
  // item.price, item.total_stock, item.attributes
}
else if (item.type === 'batch') {
  // item.product_name, item.batch_no
  // item.quantity, item.expire_date, item.is_expired
}
```

## 🔧 Common Patterns

### Cart Integration
```typescript
const { scanBarcode } = usePOSBarcodeScanner({
  onItemScanned: (item) => {
    cartStore.addItem({
      ...item,
      quantity: 1,
      variant_id: item.type === 'variant' ? item.id : undefined,
      batch_id: item.type === 'batch' ? item.id : undefined
    })
  }
})
```

### Type-Specific Search
```typescript
// Only variants
search({ q: 'TSH-M', type: 'variant' })

// Only batches
search({ q: 'BATCH-001', type: 'batch' })

// Limit results
search({ q: 'nike', limit: 5 })
```

### Error Handling
```typescript
useBarcodeScanner({
  onSuccess: (result) => console.log('Found:', result),
  onNotFound: (barcode) => toast.error(`Not found: ${barcode}`),
  onError: (error) => toast.error(error.message)
})
```

## 🎨 Features

### POS Scanner
- ✅ Audio beeps (success/error)
- ✅ Auto-focus input
- ✅ Scan history (last 10)
- ✅ Toast notifications

### All Hooks
- ✅ Automatic debouncing
- ✅ Offline support
- ✅ Result caching
- ✅ Loading states
- ✅ Type safety

## 📚 Documentation

- Full Guide: [docs/PRODUCT_SEARCH_GUIDE.md](PRODUCT_SEARCH_GUIDE.md)
- Examples: [src/components/examples/ProductSearchExamples.tsx](../src/components/examples/ProductSearchExamples.tsx)
- Backend: [backend_docs/UNIFIED_PRODUCT_SEARCH_IMPLEMENTATION.md](../backend_docs/UNIFIED_PRODUCT_SEARCH_IMPLEMENTATION.md)
