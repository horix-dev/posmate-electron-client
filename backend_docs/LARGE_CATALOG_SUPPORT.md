# Large Product Catalog Support

**Date**: January 16, 2026  
**Issue**: Frontend was only loading first 1,000 products with `limit=1000`, causing users with larger catalogs (2000+) unable to lookup/purchase products beyond the limit.  
**Solution**: Increased default limit to 10,000 and made it configurable.

---

## Problem

### Before
```typescript
// products.service.ts - Old code
getAll: async (): Promise<ProductsListResponse> => {
  const { data } = await api.get<ProductsListResponse>(API_ENDPOINTS.PRODUCTS.LIST, {
    params: { limit: 1000 },  // ← HARDCODED, inflexible
  })
  return data
}
```

**Impact:**
- Only first 1,000 products loaded
- POS unable to search/sell products beyond #1000
- Products page incomplete
- Bad UX for large businesses

---

## Solution Implemented

### 1. Made getAll() Configurable
```typescript
// products.service.ts - New code
getAll: async (limit: number = 10000): Promise<ProductsListResponse> => {
  const { data } = await api.get<ProductsListResponse>(API_ENDPOINTS.PRODUCTS.LIST, {
    params: { limit },
  })
  return data
}
```

**Features:**
- ✅ Default limit: 10,000 (accommodates most businesses)
- ✅ Configurable per call: `getAll(15000)`
- ✅ Backward compatible (old code still works)

### 2. Updated All Usage Sites

| File | Change | Supports |
|------|--------|----------|
| `src/pages/pos/hooks/usePOSData.ts` | `getAll(10000)` | 10,000 products |
| `src/pages/products/hooks/useProducts.ts` | `getAll(10000)` | 10,000 products |

### 3. Added Documentation

```typescript
/**
 * Get all products with stock info
 * Supports large catalogs by using high limit
 * Uses 10,000 as default to accommodate most businesses
 * For very large catalogs (>10k products), consider implementing pagination
 */
```

---

## Supported Catalog Sizes

| Catalog Size | Current Support | Notes |
|--------------|-----------------|-------|
| < 1,000 | ✅ Full | No issues |
| 1,000 - 10,000 | ✅ Full | Supported by new default |
| 10,000 - 50,000 | ⚠️ Partial | Manual code change: `getAll(50000)` |
| 50,000+ | ❌ Not recommended | See recommendations below |

---

## For Large Catalogs (10,000+)

### Option 1: Increase Limit (Quick Fix)

For catalogs up to 50,000 products:

```typescript
// src/pages/pos/hooks/usePOSData.ts
productsService.getAll(50000)  // Increase from 10,000 to 50,000
```

**Pros:**
- Quick 1-line change
- No backend changes needed

**Cons:**
- Higher memory usage
- Slower API response time (~5-10 seconds)
- Not scalable beyond 50,000

### Option 2: Implement Pagination (Recommended)

For catalogs > 50,000 products, implement server-side pagination:

```typescript
// Pseudocode - not implemented yet
async function loadProductsPaginated() {
  let page = 1
  let allProducts = []
  
  while (true) {
    const { data } = await productsService.getList({ 
      limit: 1000, 
      page 
    })
    allProducts.push(...data)
    if (data.length < 1000) break
    page++
  }
  
  return allProducts
}
```

**Pros:**
- Scalable to unlimited catalog size
- Faster initial load (only first page)
- Lower memory usage

**Cons:**
- Requires backend pagination support
- More complex frontend code
- ~2-3 hours implementation time

### Option 3: Search-First Architecture (Best for Very Large Catalogs)

For catalogs > 100,000 products, don't load all products:

```typescript
// Load only recently used, favorites, or search results
// Full load only on explicit user search
const [products, setProducts] = useState<Product[]>([])

const search = useCallback(async (query: string) => {
  const results = await productsService.search(query)
  setProducts(results.data)
}, [])
```

**Pros:**
- Handles unlimited catalog size
- Fast search (backend indexed)
- Best UX for large catalogs

**Cons:**
- Requires search implementation
- Users must search instead of browse
- ~4-6 hours implementation time

---

## Backend Considerations

### Current Backend Support

Check backend `ProductController@index` for limits:

```php
// Laravel API - check if there's a max_limit
$maxLimit = config('api.max_limit', 10000);
$limit = min($request->input('limit', 1000), $maxLimit);
```

**Questions for Backend Team:**
1. What's the maximum `limit` parameter the API accepts?
2. Does pagination support `?page=X&per_page=Y`?
3. Is there a `/products/search` endpoint for large catalogs?
4. What's the typical response time for `?limit=10000`?

### Database Performance

For large product catalogs, ensure:

```php
// Ensure indexes exist
Schema::table('products', function (Blueprint $table) {
    $table->index(['business_id', 'status']);
    $table->index(['business_id', 'updated_at']);
});
```

---

## Testing

### Test with Large Catalog

```bash
# 1. Navigate to POS page
# 2. Check Network tab - should see products request complete
# 3. Verify products beyond #1000 are accessible:
#    - Open category filter
#    - Search for product by name (e.g., product #5000)
#    - Should find it

# 4. Monitor performance:
#    - Initial load time: < 5 seconds
#    - Memory usage: watch DevTools Memory tab
```

### Load Testing

If business has >10,000 products:

```bash
# 1. Increase limit in code:
# productsService.getAll(15000)

# 2. Test in dev environment with production-like data
# 3. Monitor:
#    - API response time
#    - Frontend memory usage
#    - UI responsiveness

# 4. If performance issues:
#    - Implement pagination (Option 2)
#    - Switch to search-first (Option 3)
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/api/services/products.service.ts` | Made `getAll()` configurable, default 10,000 |
| `src/pages/pos/hooks/usePOSData.ts` | Changed `getAll()` to `getAll(10000)` |
| `src/pages/products/hooks/useProducts.ts` | Changed `getAll()` to `getAll(10000)` |

---

## Summary

### ✅ What's Fixed
- Users can now access products up to 10,000
- Configurable limit for larger catalogs
- No breaking changes to existing code

### ⚠️ Future Considerations
- Businesses > 10,000 products should implement Option 2 (pagination)
- Businesses > 50,000 products should implement Option 3 (search-first)
- Document maximum recommended limit based on backend performance testing

### 📋 Next Steps
1. ✅ Implement current solution (10,000 limit)
2. ⏳ Monitor performance with real customer data
3. ⏳ Implement pagination if needed
4. ⏳ Add search-based product discovery

---

## Related Documentation

- [PRODUCT_STOCK_FRESHNESS_PLAN.md](./PRODUCT_STOCK_FRESHNESS_PLAN.md) - Polling/sync strategy
- [CACHE_AND_SYNC_STRATEGY.md](./CACHE_AND_SYNC_STRATEGY.md) - Caching architecture
