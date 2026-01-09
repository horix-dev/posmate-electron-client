# Batch Selection Implementation Requirements

**Created:** January 3, 2026  
**Status:** Required for Production  
**Priority:** High  
**Owner:** Backend Team  

---

## 1. Problem Statement

When a product has **multiple batches (stocks) with different prices**, the current frontend implementation:
- Shows only the **first batch** on product cards
- Adds the **first batch** to cart when scanning barcode or clicking product
- Cannot properly handle batch selection for FIFO/FEFO/LIFO strategies

This creates inventory and business logic problems:
- Wrong batch might be sold (older/expiring batch bypassed)
- Cashier cannot see other available batches with different prices
- No support for configurable batch selection strategies

---

## 2. Solution Overview

Implement **automatic batch selection** in the backend API based on the product's configured **batch selection strategy**. This ensures:
- Correct batch is always selected per business rules
- Frontend can trust the API to pick the right batch
- Support for FIFO/FEFO/LIFO strategies
- Manual override when needed

---

## 3. Database Schema Changes

### 3.1 Add Batch Selection Strategy to Products Table

```sql
ALTER TABLE products ADD COLUMN batch_selection_strategy VARCHAR(50) 
DEFAULT 'fefo' 
CHECK (batch_selection_strategy IN ('fefo', 'fifo', 'lifo', 'manual'));

-- Create index for filtering products by strategy
CREATE INDEX idx_products_batch_strategy ON products(batch_selection_strategy);
```

**Field Details:**
- `fefo` (default) - First Expire, First Out - Select batches expiring soonest
- `fifo` - First In, First Out - Select oldest batches by mfg_date
- `lifo` - Last In, First Out - Select newest batches by mfg_date
- `manual` - No automatic selection (cashier chooses)

### 3.2 Migration

Create a migration file to add this column with default value `'fefo'`.

---

## 4. API Endpoints

### 4.1 Get Product Batches (Existing - Enhance)

**Endpoint:** `GET /api/v1/products/{productId}/batches`

**Enhancements:**
- Include `is_selected` flag for the batch that would be auto-selected
- Include pricing information in response
- Order by selection strategy

**Response:**
```json
{
  "success": true,
  "product_id": 123,
  "batch_selection_strategy": "fefo",
  "batches": [
    {
      "id": 1,
      "stock_id": 45,
      "batch_no": "BATCH-2024-001",
      "batch_number": "BATCH-2024-001",
      "variant_id": 12,
      "warehouse_id": 1,
      "available_quantity": 100,
      "mfg_date": "2024-01-15",
      "expire_date": "2025-01-15",
      "is_expired": false,
      "days_until_expiry": 365,
      "is_selected": true,
      "selection_reason": "Expires first (FEFO strategy)",
      "pricing": {
        "cost_price": 50.00,
        "sale_price": 100.00,
        "dealer_price": 90.00,
        "wholesale_price": 85.00
      },
      "warehouse": {
        "id": 1,
        "name": "Main Warehouse"
      }
    },
    {
      "id": 2,
      "stock_id": 46,
      "batch_no": "BATCH-2024-002",
      "available_quantity": 50,
      "mfg_date": "2024-02-15",
      "expire_date": "2026-02-15",
      "is_expired": false,
      "days_until_expiry": 765,
      "is_selected": false,
      "pricing": {
        "cost_price": 52.00,
        "sale_price": 105.00,
        "dealer_price": 95.00,
        "wholesale_price": 90.00
      }
    }
  ]
}
```

### 4.2 Auto-Select Batches (Existing - Must Use Stock Data)

**Endpoint:** `POST /api/v1/products/{productId}/select-batches`

**Purpose:** Returns which batches to use for a given quantity based on the product's selection strategy.

**Request:**
```json
{
  "quantity": 150,
  "variant_id": 12,
  "warehouse_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "product_id": 123,
  "strategy": "fefo",
  "requested_quantity": 150,
  "total_available": 250,
  "selected_batches": [
    {
      "stock_id": 45,
      "batch_no": "BATCH-2024-001",
      "quantity_allocated": 100,
      "available_quantity": 100,
      "mfg_date": "2024-01-15",
      "expire_date": "2025-01-15",
      "days_until_expiry": 365,
      "pricing": {
        "cost_price": 50.00,
        "sale_price": 100.00
      }
    },
    {
      "stock_id": 46,
      "batch_no": "BATCH-2024-002",
      "quantity_allocated": 50,
      "available_quantity": 150,
      "mfg_date": "2024-02-15",
      "expire_date": "2026-02-15",
      "days_until_expiry": 765,
      "pricing": {
        "cost_price": 52.00,
        "sale_price": 105.00
      }
    }
  ],
  "all_available_batches": [
    {
      "stock_id": 47,
      "batch_no": "BATCH-2024-003",
      "available_quantity": 100
    }
  ]
}
```

**Behavior by Strategy:**

#### FEFO (First Expire, First Out)
```
1. Sort batches by expire_date (ASC) - soonest first
2. Allocate quantity from batches until requested_quantity is met
3. Skip expired batches
```

#### FIFO (First In, First Out)
```
1. Sort batches by mfg_date (ASC) - oldest first
2. Allocate quantity from batches until requested_quantity is met
```

#### LIFO (Last In, First Out)
```
1. Sort batches by mfg_date (DESC) - newest first
2. Allocate quantity from batches until requested_quantity is met
```

#### MANUAL
```
1. Return all available batches without selection
2. Frontend must show selection dialog
3. Cashier chooses batch manually
```

### 4.3 Create Sale with Specific Batches

**Endpoint:** `POST /api/v1/sales`

**Must Support:** Including specific `stock_id` per product in request.

**Request:**
```json
{
  "products": [
    {
      "stock_id": 45,
      "batch_no": "BATCH-2024-001",
      "quantities": 70,
      "price": 100.00
    },
    {
      "stock_id": 46,
      "batch_no": "BATCH-2024-002",
      "quantities": 50,
      "price": 105.00
    }
  ],
  "customer_id": 5,
  "payment_type": "cash",
  "discount": 0,
  "vat_id": 1,
  "note": "Batch selection: FEFO"
}
```

**Important:** 
- `stock_id` specifies which batch/stock entry to use
- `batch_no` is for reference/verification
- Price must match the stock's configured price
- Deduct from correct batch's inventory

---

## 5. Implementation Checklist

### Phase 1: Database & Model Layer
- [ ] Add `batch_selection_strategy` column to products table
- [ ] Create/run migration
- [ ] Update Product model with new field
- [ ] Set default to `'fefo'`

### Phase 2: Batch Selection Logic
- [ ] Create `BatchSelectionStrategy` service/class
- [ ] Implement FEFO sort logic
- [ ] Implement FIFO sort logic
- [ ] Implement LIFO sort logic
- [ ] Handle expired batches (skip them)
- [ ] Add quantity allocation algorithm

### Phase 3: API Endpoints
- [ ] Enhance `GET /api/v1/products/{id}/batches` 
  - [ ] Include `is_selected` flag
  - [ ] Include pricing per batch
  - [ ] Order by strategy
  - [ ] Add selection_reason explanation
  
- [ ] Ensure `POST /api/v1/products/{id}/select-batches` works correctly
  - [ ] Returns selected batches in order
  - [ ] Returns remaining available batches
  - [ ] Respects product's batch_selection_strategy
  - [ ] Handles insufficient quantity scenario

- [ ] Verify `POST /api/v1/sales` accepts `stock_id`
  - [ ] Deducts from correct batch
  - [ ] Records batch_no in sale record
  - [ ] Handles multiple batches in single sale

### Phase 4: Testing
- [ ] Unit tests for batch selection logic
- [ ] Integration tests for each strategy (FEFO, FIFO, LIFO)
- [ ] Test with expired batches
- [ ] Test with insufficient quantity
- [ ] Test with variants + batches

### Phase 5: Admin Interface
- [ ] Add product batch_selection_strategy field to product edit form
- [ ] Allow configuring strategy per product
- [ ] Show strategy in product details

---

## 6. Integration with Frontend

### Frontend Flow (After Implementation)

```typescript
// POS: When scanning barcode or clicking product with multiple batches

// If product has strategy (not 'manual'):
1. Call GET /products/{id}/batches
2. Show first batch marked as is_selected: true
3. Add that batch to cart
4. Display batch info (number, price, expiry) in cart

// If product has strategy 'manual':
1. Call GET /products/{id}/batches
2. Show batch selection modal to cashier
3. Cashier picks batch
4. Add selected batch to cart

// When creating sale:
1. For each cart item: include stock_id
2. POST /sales with stock_id per product
3. Backend handles batch deduction
```

---

## 7. Edge Cases to Handle

### Case 1: Insufficient Quantity
**Scenario:** Customer wants 200 units, only 150 available total

**Behavior:**
```json
{
  "success": true,
  "requested_quantity": 200,
  "total_available": 150,
  "warning": "Requested quantity exceeds available stock",
  "selected_batches": [
    {"stock_id": 45, "quantity_allocated": 100},
    {"stock_id": 46, "quantity_allocated": 50}
  ],
  "total_allocated": 150
}
```

**Frontend:** Shows warning but allows sale with available quantity.

### Case 2: All Batches Expired
**Scenario:** Product has batches but all are expired

**Behavior:**
```json
{
  "success": false,
  "error": "All available batches for this product have expired",
  "available_batches": []
}
```

**Frontend:** Shows error, prevents sale.

### Case 3: Multiple Variants with Batches
**Scenario:** Variable product with variants, each variant has multiple batches

**Behavior:**
```
1. When selecting variant, fetch batches for that variant
2. Apply batch selection strategy to variant's batches only
3. Response includes variant_id in batch info
```

### Case 4: Zero Stock
**Scenario:** Product has no available stock

**Behavior:**
```json
{
  "success": true,
  "available_batches": [],
  "total_available": 0
}
```

**Frontend:** Shows "Out of Stock" state.

---

## 8. Example Scenarios

### Scenario A: Pharmacy with Expiring Medicines
```
Product: Aspirin Tablets
Strategy: FEFO

Batches:
- BATCH-001: 50 units, Expires 2025-06-01, Price $5.00
- BATCH-002: 100 units, Expires 2025-12-01, Price $5.00
- BATCH-003: 75 units, Expires 2026-06-01, Price $5.00

Customer buys 120 units:
Selected: BATCH-001 (50) + BATCH-002 (70)
Reason: "FEFO strategy - batch expiring first"
```

### Scenario B: Grocery Store with Price Variation
```
Product: Milk 1L
Strategy: FIFO

Batches:
- BATCH-001: 30 units, Mfg 2024-12-20, Price $2.50 (older, discount)
- BATCH-002: 50 units, Mfg 2024-12-25, Price $2.80 (newer)

Customer buys 40 units:
Selected: BATCH-001 (30) + BATCH-002 (10)
Reason: "FIFO strategy - oldest batch first"
```

### Scenario C: Fashion Store with Manual Selection
```
Product: Winter Jacket (Red, Size M)
Strategy: MANUAL

Batches:
- BATCH-WINTER-001: 20 units, Price $89.99
- BATCH-WINTER-002: 15 units, Price $79.99 (on sale)

UI: Shows selection dialog with both options
Cashier: Chooses BATCH-WINTER-002 (customer gets discount)
```

---

## 9. Success Criteria

- ✅ Backend supports all 4 batch selection strategies
- ✅ Auto-selection works correctly for FEFO/FIFO/LIFO
- ✅ API returns `is_selected` flag in batch lists
- ✅ Pricing is included per batch in API responses
- ✅ Sales can be created with specific `stock_id`
- ✅ Inventory deduction uses correct batch
- ✅ Works with variants (variable products)
- ✅ Handles expired batches correctly
- ✅ Handles insufficient quantity scenarios
- ✅ Admin can configure strategy per product

---

## 10. References

- **Frontend Integration:** `src/pages/pos/components/ProductCard.tsx`
- **Cart Management:** `src/stores/cart.store.ts`
- **API Service:** `src/api/services/stockAdjustment.service.ts`
- **Type Definitions:** `src/types/api.types.ts`

---

## 11. Questions for Backend Team

1. What's the current stock/batch data model? Are batches stored as separate stock entries?
2. Does the sales API currently accept `stock_id`? If not, what needs to change?
3. What format is mfg_date/expire_date stored in the database?
4. Should batch_selection_strategy be configurable via admin panel or hardcoded per product?
5. Do you need a migration script for existing products? (Suggest default to FEFO)

---

**Frontend Team Contact:** Ready to integrate once these endpoints are available  
**Test Status:** Will create test cases once spec is confirmed

---

## Appendix: ETag Request Examples

The frontend already supports ETag caching for GET requests. Here are actual examples of requests that will send `If-None-Match` headers once the backend implements ETag support:

### 1. Units Page - GET /api/v1/units ✅ **Recommended for ETag**
**Triggered by:** Product Settings → Units page load  
**Component:** `src/pages/product-settings/components/units/UnitsTable.tsx`  
**Hook:** `useUnits()` from `src/pages/product-settings/hooks/useUnits.ts`  
**Why ETag Works:** Small collection (~10-50 records), rarely changes

**First Request (No Cache):**
```http
GET /api/v1/units?page=1&per_page=10
Authorization: Bearer {token}
Accept: application/json
```

**Expected Backend Response:**
```http
HTTP/1.1 200 OK
ETag: "units-abc123"
Content-Type: application/json

{
  "message": "Data fetched successfully.",
  "data": {
    "data": [...],
    "total": 25,
    "current_page": 1,
    "last_page": 3
  }
}
```

**ETag Calculation (Backend):**
```php
$latestUpdate = Unit::where('business_id', $bid)->max('updated_at');
$etag = md5($latestUpdate . $page . $perPage);
```

**Subsequent Request (After 30min cache expires):**
```http
GET /api/v1/units?page=1&per_page=10
Authorization: Bearer {token}
Accept: application/json
If-None-Match: "units-abc123"
```

**Expected Backend Response (If Data Unchanged):**
```http
HTTP/1.1 304 Not Modified
ETag: "units-abc123" ⚠️ **ETag Optional (Large Collection)**
**Triggered by:** Products page load/refresh  
**Component:** `src/pages/products/ProductsPage.tsx`  
**Hook:** `useProducts()` from `src/pages/products/hooks/useProducts.ts`  
**Why ETag Challenging:** Large collection (100s-1000s of records), frequently changes

**Recommendation:** Skip ETag for products list (use React Query's 30min cache instead).

**Alternative:** Add ETag only if you implement collection-level versioning table.

**Request:**
```http
GET /api/v1/products?page=1&per_page=20&search=&category_id=&brand_id=
Authorization: Bearer {token}
Accept: application/json
```

**Backend Response (No ETag):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": 1,
      "productName": "Aspirin",
      "productStock": 100,
      ...
    }
  ],
  "total": 150,
  "current_page": 1
}
```

**Frontend Behavior:** Uses React Query's stale-while-revalidate cache (30min TTL).None-Match: "products-v456"
```

**Expected Response (Unchanged):**
```http
HTTP/1.1 304 Not Modified
ETag: "products-v456"
```

---

### 3. Categories API - GET /api/v1/categories
**Triggered by:** 
- POS page load (category filter)
- Product Settings → Categories page
- Product create/edit form

**Service:** `src/api/services/categories.service.ts`
 ✅ **Recommended for ETag**
**Triggered by:** 
- POS page load (category filter)
- Product Settings → Categories page
- Product create/edit form

**Service:** `src/api/services/categories.service.ts`  
**Why ETag Works:** Small collection (~20-100 categories), stable data

**First Request:**
```http
GET /api/v1/categories?limit=100
Authorization: Bearer {token}
Accept: application/json
```

**Expected Backend Response:**
```http
HTTP/1.1 200 OK
ETag: "cat-abc789"
Content-Type: application/json

{
  "message": "Categories fetched successfully",
  "data": [
    {
      "id": 1,
      "categoryName": "Medicines",
      "icon": "pill.png",
      ...
    }
  ]
}
```

**ETag Calculation:**
```php
$latestUpdate = Category::where('business_id', $bid)->max('updated_at');
$etag = md5($latestUpdate . $limit);
```

**Subsequent Request:**
```http
GET /api/v1/categories?limit=100?limit=500 ⚠️ **Skip ETag**
**Triggered by:** POS page load  
**Component:** `src/pages/pos/POSPage.tsx`  
**Hook:** `usePOSProducts()` from `src/pages/pos/hooks/usePOSProducts.ts`  
**Why Skip:** Very large payload (500-1000 products), real-time inventory changes

**Recommendation:** No ETag. Use React Query cache + IndexedDB offline cache.

**Request:**
```http
GET /api/v1/products?limit=500
Authorization: Bearer {token}
Accept: application/json
```

**Backend Response (No ETag):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [...500 products...],
  "message": "Products fetched successfully"
}
```

**Frontend Cachi/Customers - GET /api/v1/parties ✅ **Recommended for ETag**
**Triggered by:** Suppliers page, Customers page  
**Component:** `src/pages/suppliers/SuppliersPage.tsx`  
**Hook:** `useSuppliers()` from `src/pages/suppliers/hooks/useSuppliers.ts`  
**Why ETag Works:** Medium collection (~50-200 records), relatively stable

**First Request:**
```http
GET /api/v1/parties?party_type=supplier
Authorization: Bearer {token}
Accept: application/json
```

**Expected Backend Response:**
```http
HTTP/1.1 200 OK
ETag: "suppliers-abc"
Content-Type: application/json

{
  "message": "Suppliers fetched successfully",
  "data": [...]
}
```

**ETag Calculation:**
```php
$latestUpdate = Party::where('business_id', $bid)
    ->where('party_type', 'supplier')
    ->max('updated_at');
$etag = md5($latestUpdate . 'supplier');
```

**Subsequent Request:**
```http
GET /api/v1/parties?party_type=supplier
Authorization: Bearer {token}
If-None-Match: "suppliers-abc"
```

**Expected Response (If Unchanged):**
```http
HTTP/1.1 304 Not Modified
ETag: "suppliers-abc
Content-Type: application/json

{
  "message": "Suppliers fetched successfully",
  "data": [...]
}
```

**Subsequent Request:**
```http
GET /api/v1/parties?party_type=supplier
Authorization: Bearer {token}
If-None-Match: "suppliers-xyz"
```

---

### ETag Generation Strategy (Backend Recommendation)

#### For Single Entities (e.g., GET /products/123)
```php
// Use version column or updated_at timestamp
$etag = "v{$product->version}";
// OR
$etag = md5($product->updated_at);
```

#### For Collections (e.g., GET /products, GET /units)

**Challenge:** Collections have multiple records with different versions.

**Solution Options:**

**Option 1: Hash of Latest Updated Timestamp (Recommended - Fast)**
```php
// Get the latest updated_at from the query
$latestUpdate = Product::where('business_id', $businessId)
    ->max('updated_at');

$etag = md5($latestUpdate . $page . $perPage . $filters);
```

**Option 2: Hash of All Record IDs + Versions (Moderate - More Accurate)**
```php
// Query just IDs and versions (lightweight)
$records = Product::where('business_id', $businessId)
    ->select('id', 'version', 'updated_at')
    ->get();

$signature = $records->pluck('id')
    ->zip($records->pluck('version'))
    ->flatten()
    ->implode(',');

$etag = md5($signature . $page . $perPage);
```

**Option 3: Collection-Level Version Counter (Best - Requires Schema)**
```php
// Add table: collection_versions (table_name, business_id, version)
// Increment on any INSERT/UPDATE/DELETE via observer

$collectionVersion = DB::table('collection_versions')
    ->where('table_name', 'products')
    ->where('business_id', $businessId)
    ->value('version');

$etag = "products-v{$collectionVersion}-p{$page}";
```

**Option 4: Skip ETags for Large Collections (Pragmatic)**
```php
// Only add ETags for small, stable collections
$routes = [
    '/units',      // Small, rarely changes
    '/categories', // Small, rarely changes
    '/brands',     // Small, rarely changes
    // Skip: /products (large, frequently changes)
    // Skip: /sales (large, constantly changing)
];
```

**Recommended Approach:**

1. **Units, Categories, Brands, VATs** → Use Option 1 (max updated_at)
2. **Products** → Use Option 4 (skip ETags, too large and dynamic)
3. **Single Product** → Use version column
4. **Sales, Purchases** → Skip ETags (real-time data)

```php
// Example: UnitsController@index
public function index(Request $request)
{
    $query = Unit::where('business_id', auth()->user()->business_id);
    
    // Get latest update time for ETag
    $latestUpdate = (clone $query)->max('updated_at');
    Priority Ranking for ETag Implementation

| Endpoint | Priority | Reason | Est. Bandwidth Savings |
|----------|----------|--------|------------------------|
| `/units` | 🔴 **High** | Small, stable, frequently accessed | 70-90% |
| `/categories` | 🔴 **High** | Small, stable, used in POS | 70-90% |
| `/brands` | 🟡 Medium | Small, stable | 60-80% |
| `/vats` | 🟡 Medium | Very small, rarely changes | 50-70% |
| `/parties?type=supplier` | 🟡 Medium | Medium size, semi-stable | 40-60% |
| `/parties?type=customer` | 🟢 Low | Large, changes often | 20-40% |
| `/products` (paginated) | ⚪ Skip | Large, dynamic, complex | Not worth it |
| `/products?limit=500` (POS) | ⚪ Skip | Very large, real-time | Not worth it |
| `/sales` | ⚪ Skip | Real-time transactional data | Not worth it |

**Recommendation:** Implement ETag for **High** priority endpoints first. Skip **Low** and below.

---

### $filters = json_encode($request->only(['search', 'status']));
    $etag = md5($latestUpdate . $request->page . $request->per_page . $filters);
    
    // Check If-None-Match
    if ($request->header('If-None-Match') === $etag) {
        return response('', 304)->header('ETag', $etag);
    }
    
    // Fetch data
    $units = $query->paginate($request->per_page ?? 10);
    
    return response()->json([
        'message' => 'Units fetched successfully',
        'data' => $units,
    ])->header('ETag', $etag);
}
```

**Important Notes:**
1. ETag must be **wrapped in quotes** per RFC: `ETag: "abc123"`
2. ETag should change **every time** data changes
3. ETag should be **same** if data hasn't changed
4. Backend must handle `If-None-Match` header and return `304` when ETag matches
5. **Include pagination params** in ETag (page 1 ≠ page 2)
6. **Include filters** in ETag (search="abc" ≠ search="xyz")

---

### Frontend Implementation Details

**Location:** `src/api/axios.ts`

**ETag Cache Storage:**
```typescript
const etagCache = new Map<string, string>()  // URL → ETag
const responseCache = new Map<string, any>() // URL → Response Data
```

**Request Interceptor (Lines 95-114):**
- Checks if `etagCache` has ETag for the URL
- Adds `If-None-Match` header automatically

**Response Interceptor (Lines 130-160):**
- Handles `304 Not Modified` responses
- Returns cached data without re-downloading
- Stores new ETags from `ETag` header
- Caches response data for future 304 responses

**Cache Invalidation:**
- POST/PUT/DELETE requests to an endpoint clear its ETag cache
- Browser refresh clears all in-memory caches
- 30-minute stale time from React Query

---

### Testing ETags (After Backend Implementation)

**Test Checklist:**
1. ✅ Open Network tab in browser DevTools
2. ✅ Navigate to Units page
3. ✅ Verify first request has no `If-None-Match` header
4. ✅ Verify response has `ETag` header
5. ✅ Wait 30 minutes (or clear React Query cache)
6. ✅ Refresh page
7. ✅ Verify second request includes `If-None-Match: "{etag}"`
8. ✅ Verify response is `304 Not Modified` with no body
9. ✅ Verify page still displays data (from cache)

**Expected Bandwidth Savings:**
- First load: 50KB response body
- Subsequent loads: ~200 bytes (304 response only)
- **80-99% reduction** in bandwidth
