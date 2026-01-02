# ETag Implementation Request for Backend

**Date**: January 3, 2026  
**Requested By**: Frontend Team  
**Priority**: Medium  
**Status**: 📋 Pending Backend Implementation  

---

## Executive Summary

The frontend has implemented full ETag support in [axios.ts](../src/api/axios.ts) with automatic `If-None-Match` header handling and 304 response caching. We need the backend to add ETag headers to API responses to activate this optimization.

**Expected Impact:**
- 80% bandwidth reduction for unchanged data
- 10x faster response times (50ms vs 500ms)
- Reduced server CPU load

---

## What Frontend Has Done ✅

### 1. ETag Cache Infrastructure
```typescript
// axios.ts - Request interceptor
if (config.method === 'GET' && config.url) {
  const cacheKey = `${config.baseURL}${config.url}`
  const cachedETag = etagCache.get(cacheKey)
  if (cachedETag) {
    config.headers['If-None-Match'] = cachedETag  // ✅ Sends ETag
  }
}
```

### 2. 304 Response Handling
```typescript
// axios.ts - Response interceptor
if (response.status === 304 && response.config.url) {
  const cacheKey = `${response.config.baseURL}${response.config.url}`
  const cachedData = responseCache.get(cacheKey)
  if (cachedData) {
    return { ...response, data: cachedData, status: 200 }  // ✅ Returns cached data
  }
}
```

### 3. React Query Integration
- Units page converted to use `useUnits()` hook with React Query
- Automatic 30-minute caching configured globally
- ETag support will further reduce bandwidth after cache expiration

### 4. Testing Ready
Frontend can verify ETag implementation works immediately after backend deployment.

---

## What Backend Needs to Do 🛠️

### Option A: Apply Existing Middleware (Recommended)

You already have `EntityCacheHeaders` middleware (from Phase 1-2 completion). Just add it to routes:

```php
// routes/api.php - Units example
Route::middleware(['auth:sanctum', 'cache.headers'])
    ->prefix('units')
    ->group(function () {
        Route::get('/', [UnitController::class, 'index']);
        // ... other routes
    });
```

### Option B: Manual ETag Generation (If middleware doesn't exist)

Add ETag headers in controllers:

```php
// Example: UnitController@index
public function index(Request $request)
{
    $units = Unit::where('business_id', auth()->user()->business_id)
        ->paginate($request->per_page ?? 10);

    // Generate ETag from data + pagination
    $etag = md5(json_encode([
        'data' => $units->items(),
        'total' => $units->total(),
        'page' => $units->currentPage(),
    ]));

    // Check If-None-Match header
    if ($request->header('If-None-Match') === $etag) {
        return response()->json(null, 304);  // Not Modified
    }

    // Return data with ETag header
    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $units,
    ])->header('ETag', $etag);
}
```

---

## Endpoints Needing ETag Support

### High Priority (Frequently Accessed)
| Endpoint | Usage | Impact |
|----------|-------|--------|
| `GET /api/v1/units` | Units settings page | HIGH - Example implemented in frontend |
| `GET /api/v1/products/list` | Products page, POS | HIGH - Large payloads |
| `GET /api/v1/parties/list` | Customers/suppliers | HIGH - Large payloads |
| `GET /api/v1/categories/list` | Category selector | MEDIUM |
| `GET /api/v1/brands/list` | Brand selector | MEDIUM |
| `GET /api/v1/payment-types/list` | Payment selector | LOW |
| `GET /api/v1/vats/list` | VAT selector | LOW |

### Medium Priority
| Endpoint | Usage | Impact |
|----------|-------|--------|
| `GET /api/v1/sales` | Sales reports | MEDIUM - Large data |
| `GET /api/v1/purchases` | Purchase reports | MEDIUM |
| `GET /api/v1/expenses` | Expense reports | LOW |

### Low Priority (Real-time Data)
Do NOT add ETags to these (data changes frequently):
- `GET /api/v1/dashboard/stats` - Always fetch fresh
- `POST /api/v1/sales` - Mutations

---

## ETag Implementation Patterns

### Pattern 1: Simple Data List
```php
public function index()
{
    $data = Model::all();
    $etag = md5(json_encode($data));
    
    if (request()->header('If-None-Match') === $etag) {
        return response()->json(null, 304);
    }
    
    return response()->json(['data' => $data])->header('ETag', $etag);
}
```

### Pattern 2: Paginated Data
```php
public function index(Request $request)
{
    $paginated = Model::paginate($request->per_page ?? 10);
    
    // Include pagination metadata in ETag
    $etag = md5(json_encode([
        'data' => $paginated->items(),
        'page' => $paginated->currentPage(),
        'total' => $paginated->total(),
    ]));
    
    if ($request->header('If-None-Match') === $etag) {
        return response()->json(null, 304);
    }
    
    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $paginated,
    ])->header('ETag', $etag);
}
```

### Pattern 3: Database-Based ETag (Most Efficient)
```php
public function index()
{
    $maxUpdatedAt = Model::max('updated_at');
    $count = Model::count();
    
    // ETag based on latest timestamp + count
    $etag = md5("{$maxUpdatedAt}-{$count}");
    
    if (request()->header('If-None-Match') === $etag) {
        return response()->json(null, 304);
    }
    
    $data = Model::all();
    return response()->json(['data' => $data])->header('ETag', $etag);
}
```

**Recommended**: Pattern 3 - Avoids serializing full data for ETag calculation

---

## Testing Verification

### Step 1: Backend Implementation
1. Add ETag header to `/api/v1/units` endpoint
2. Test with Postman:
   ```
   GET /api/v1/units
   Response: 200 OK
   Headers: ETag: "abc123"
   ```

### Step 2: Test 304 Response
```
GET /api/v1/units
If-None-Match: "abc123"
Response: 304 Not Modified (empty body)
```

### Step 3: Frontend Verification
1. Open app → Navigate to Units page
2. Open DevTools Network tab
3. Navigate away and return to Units page
4. **Verify**: Request has `If-None-Match` header
5. **Verify**: Response is `304` or `200` (if data changed)
6. **Verify**: Console shows: `[Cache] HIT - Using cached data`

---

## Current Status

**Frontend Status**: ✅ Complete
- [x] ETag cache infrastructure in axios.ts
- [x] If-None-Match header sent automatically
- [x] 304 response handling implemented
- [x] React Query caching configured (30 min staleTime)
- [x] Units page converted to useUnits() hook
- [x] Console logging for debugging

**Backend Status**: 📋 Pending
- [ ] Add ETag headers to `/api/v1/units` endpoint (example implementation)
- [ ] Add ETag support to high-priority endpoints (products, parties)
- [ ] Test with Postman (200 → 304 flow)
- [ ] Deploy and verify with frontend

---

## Alternative: Last-Modified Headers

If ETag generation is complex, you can use `Last-Modified` headers instead:

```php
public function index()
{
    $lastModified = Model::max('updated_at');
    
    // Check If-Modified-Since
    if ($ifModifiedSince = request()->header('If-Modified-Since')) {
        if (strtotime($lastModified) <= strtotime($ifModifiedSince)) {
            return response()->json(null, 304);
        }
    }
    
    $data = Model::all();
    return response()->json(['data' => $data])
        ->header('Last-Modified', gmdate('D, d M Y H:i:s', strtotime($lastModified)) . ' GMT');
}
```

Frontend already supports `Last-Modified` headers (axios will handle automatically).

---

## Questions or Concerns?

**Q: Will ETags cause issues with paginated data?**  
A: No - each page has its own ETag (query params included in cache key). `/units?page=1` and `/units?page=2` have separate ETags.

**Q: What if data changes but ETag doesn't?**  
A: Include `updated_at` timestamps or version numbers in ETag calculation to ensure uniqueness.

**Q: Do we need ETags for all endpoints?**  
A: No - prioritize high-traffic, large-payload endpoints (products, parties, units). Skip real-time data endpoints.

**Q: How do we invalidate ETags?**  
A: ETags auto-invalidate when data changes (new `updated_at` timestamp changes the ETag hash). No manual invalidation needed.

---

## Next Steps

1. **Backend Team**: Choose Pattern 3 (Database-Based ETag) for implementation
2. **Start with Units endpoint** (`GET /api/v1/units`) as proof of concept
3. **Test with Postman** to verify 304 responses work
4. **Notify frontend** when deployed - we'll verify in DevTools
5. **Expand to products/parties** endpoints once verified

**Estimated Effort**: 1-2 hours for units endpoint, 4-6 hours for all high-priority endpoints

---

## References

- Frontend ETag Implementation: `src/api/axios.ts` lines 58-173
- Frontend Units Hook: `src/pages/product-settings/hooks/useUnits.ts`
- Cache Strategy Doc: `backend_docs/CACHE_AND_SYNC_STRATEGY.md`
- Backend Enhancement Plan: `backend_docs/BACKEND_SYNC_ENHANCEMENT_PLAN.md`
