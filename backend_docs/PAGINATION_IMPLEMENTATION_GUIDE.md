# Backend Pagination Implementation Guide

## Document Info
- **Version:** 1.0
- **Created:** December 17, 2025
- **Status:** Implementation Required
- **Priority:** 🔴 P0 - Critical for Production

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [The Problem](#the-problem)
3. [Industry Standard Solution](#industry-standard-solution)
4. [Implementation Steps](#implementation-steps)
5. [Code Examples](#code-examples)
6. [Testing Guide](#testing-guide)
7. [API Documentation](#api-documentation)
8. [Migration Checklist](#migration-checklist)

---

## Executive Summary

### Current Issue
The Categories API was changed to return paginated data by default, breaking the frontend POS system which expects a flat array. This affects:
- ❌ POS screen (can't load categories for filtering)
- ❌ Offline sync (will crash with large datasets)
- ❌ Management tables (inconsistent pagination)

### Required Changes
Implement **query parameter-based pagination** on the `/categories` endpoint (and all similar endpoints) to support three use cases:
1. **Dropdown/Filters** (`?limit=100`) - Flat array with limit
2. **Management Tables** (`?page=1&per_page=10`) - Offset pagination
3. **Offline Sync** (`?cursor=123&per_page=100`) - Cursor pagination

### Industry Standard
This approach is used by:
- ✅ Stripe API
- ✅ GitHub API
- ✅ Shopify API
- ✅ Twitter API
- ✅ Facebook Graph API

---

## The Problem

### Breaking Change That Occurred

**Before (Working):**
```json
// GET /api/v1/categories
{
  "message": "Data fetched successfully.",
  "data": [
    {"id": 1, "categoryName": "Electronics", ...},
    {"id": 2, "categoryName": "Fashion", ...}
  ],
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

**After (Broken):**
```json
// GET /api/v1/categories
{
  "message": "Data fetched successfully.",
  "data": {
    "current_page": 1,
    "data": [
      {"id": 1, "categoryName": "Electronics", ...},
      {"id": 2, "categoryName": "Fashion", ...}
    ],
    "total": 19,
    "per_page": 10,
    ...
  },
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

### Impact
- Frontend expected `response.data` to be `Category[]`
- Now it's `response.data.data` (nested)
- POS screen crashes: `categories.find is not a function`
- Management tables broken
- Offline sync will crash with large datasets (10,000+ records loaded at once)

---

## Industry Standard Solution

### Query Parameter-Based Pagination

**Single endpoint, multiple behaviors controlled by query parameters:**

```php
GET /api/v1/categories                        // All (limit 1000)
GET /api/v1/categories?limit=100              // First 100 (flat array)
GET /api/v1/categories?page=1&per_page=10     // Offset pagination
GET /api/v1/categories?cursor=123&per_page=100 // Cursor pagination
GET /api/v1/categories?status=1&limit=50      // Filtered + limited
```

### Why This is Correct

| Approach | RESTful | Maintainable | Scalable | Used By |
|----------|---------|--------------|----------|---------|
| **Query Parameters** ✅ | ✅ Yes | ✅ Yes | ✅ Yes | Stripe, GitHub, Shopify |
| Multiple Endpoints ❌ | ❌ No | ❌ No | ❌ No | None |

---

## Implementation Steps

### Phase 1: Categories Controller (Priority: P0)

File: `app/Http/Controllers/Api/V1/CategoryController.php`

#### Current Code (Broken)
```php
public function index(Request $request)
{
    $perPage = $request->input('per_page', 10);
    
    $categories = Category::query()
        ->where('business_id', auth()->user()->business_id)
        ->orderBy('categoryName')
        ->paginate($perPage); // ❌ Always paginated

    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $categories,
        '_server_timestamp' => now()->toIso8601String(),
    ]);
}
```

#### New Code (Correct)
```php
public function index(Request $request)
{
    $query = Category::query()
        ->where('business_id', auth()->user()->business_id)
        ->select('id', 'categoryName', 'icon', 'status', 'version', 'updated_at', 'created_at', 'deleted_at', 'business_id')
        ->orderBy('categoryName');

    // ============================================
    // Apply Filters
    // ============================================
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }

    if ($request->has('search')) {
        $query->where('categoryName', 'like', '%' . $request->search . '%');
    }

    // ============================================
    // Determine Pagination Type
    // ============================================
    
    // Mode 1: LIMIT (for dropdowns/filters)
    // Usage: ?limit=100
    if ($request->has('limit')) {
        $limit = min((int) $request->input('limit', 1000), 1000); // Max 1000
        $categories = $query->limit($limit)->get();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $categories, // ✅ Flat array
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // Mode 2: CURSOR PAGINATION (for sync operations)
    // Usage: ?cursor=123&per_page=100
    if ($request->has('cursor')) {
        $perPage = min((int) $request->input('per_page', 100), 1000); // Max 1000
        $cursor = (int) $request->input('cursor');
        
        $categories = $query
            ->where('id', '>', $cursor)
            ->orderBy('id', 'asc') // Required for cursor
            ->limit($perPage)
            ->get();
        
        $nextCursor = $categories->isNotEmpty() ? $categories->last()->id : null;
        $hasMore = $nextCursor && Category::where('business_id', auth()->user()->business_id)
            ->where('id', '>', $nextCursor)
            ->exists();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $categories, // ✅ Flat array
            'pagination' => [
                'next_cursor' => $hasMore ? $nextCursor : null,
                'has_more' => $hasMore,
                'count' => $categories->count(),
                'per_page' => $perPage,
            ],
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // Mode 3: OFFSET PAGINATION (for management tables)
    // Usage: ?page=1&per_page=10
    if ($request->has('page') || $request->has('per_page')) {
        $perPage = min((int) $request->input('per_page', 10), 100); // Max 100
        $categories = $query->paginate($perPage);
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $categories, // ✅ Laravel pagination object
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // Mode 4: DEFAULT (no pagination parameters)
    // Returns all with safety limit
    $categories = $query->limit(1000)->get();
    
    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $categories, // ✅ Flat array
        '_server_timestamp' => now()->toIso8601String(),
    ]);
}
```

---

## Code Examples

### Phase 2: Apply Same Pattern to Other Controllers

#### 1. Products Controller

File: `app/Http/Controllers/Api/V1/ProductController.php`

```php
public function index(Request $request)
{
    $query = Product::with(['category', 'brand', 'unit'])
        ->where('business_id', auth()->user()->business_id)
        ->select('id', 'productName', 'productCode', 'productStock', 'productPurchasePrice', 'productSalePrice', 'category_id', 'brand_id', 'unit_id', 'productImage', 'status', 'version', 'updated_at', 'created_at', 'deleted_at')
        ->orderBy('productName');

    // Apply filters
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }

    if ($request->has('category_id')) {
        $query->where('category_id', $request->category_id);
    }

    if ($request->has('search')) {
        $query->where(function ($q) use ($request) {
            $q->where('productName', 'like', '%' . $request->search . '%')
              ->orWhere('productCode', 'like', '%' . $request->search . '%');
        });
    }

    // LIMIT mode (dropdowns)
    if ($request->has('limit')) {
        $limit = min((int) $request->input('limit', 1000), 1000);
        $products = $query->limit($limit)->get();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $products,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // CURSOR mode (sync)
    if ($request->has('cursor')) {
        $perPage = min((int) $request->input('per_page', 100), 1000);
        $cursor = (int) $request->input('cursor');
        
        $products = $query
            ->where('id', '>', $cursor)
            ->orderBy('id', 'asc')
            ->limit($perPage)
            ->get();
        
        $nextCursor = $products->isNotEmpty() ? $products->last()->id : null;
        $hasMore = $nextCursor && Product::where('business_id', auth()->user()->business_id)
            ->where('id', '>', $nextCursor)
            ->exists();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $products,
            'pagination' => [
                'next_cursor' => $hasMore ? $nextCursor : null,
                'has_more' => $hasMore,
                'count' => $products->count(),
                'per_page' => $perPage,
            ],
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // OFFSET mode (management tables)
    if ($request->has('page') || $request->has('per_page')) {
        $perPage = min((int) $request->input('per_page', 10), 100);
        $products = $query->paginate($perPage);
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $products,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // DEFAULT (with safety limit)
    $products = $query->limit(1000)->get();
    
    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $products,
        '_server_timestamp' => now()->toIso8601String(),
    ]);
}
```

#### 2. Brands Controller

File: `app/Http/Controllers/Api/V1/BrandController.php`

```php
public function index(Request $request)
{
    $query = Brand::query()
        ->where('business_id', auth()->user()->business_id)
        ->select('id', 'brandName', 'status', 'version', 'updated_at', 'created_at', 'deleted_at')
        ->orderBy('brandName');

    // Apply filters
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }

    if ($request->has('search')) {
        $query->where('brandName', 'like', '%' . $request->search . '%');
    }

    // LIMIT mode
    if ($request->has('limit')) {
        $limit = min((int) $request->input('limit', 1000), 1000);
        $brands = $query->limit($limit)->get();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $brands,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // CURSOR mode
    if ($request->has('cursor')) {
        $perPage = min((int) $request->input('per_page', 100), 1000);
        $cursor = (int) $request->input('cursor');
        
        $brands = $query
            ->where('id', '>', $cursor)
            ->orderBy('id', 'asc')
            ->limit($perPage)
            ->get();
        
        $nextCursor = $brands->isNotEmpty() ? $brands->last()->id : null;
        $hasMore = $nextCursor && Brand::where('business_id', auth()->user()->business_id)
            ->where('id', '>', $nextCursor)
            ->exists();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $brands,
            'pagination' => [
                'next_cursor' => $hasMore ? $nextCursor : null,
                'has_more' => $hasMore,
                'count' => $brands->count(),
                'per_page' => $perPage,
            ],
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // OFFSET mode
    if ($request->has('page') || $request->has('per_page')) {
        $perPage = min((int) $request->input('per_page', 10), 100);
        $brands = $query->paginate($perPage);
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $brands,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // DEFAULT
    $brands = $query->limit(1000)->get();
    
    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $brands,
        '_server_timestamp' => now()->toIso8601String(),
    ]);
}
```

#### 3. Units Controller

File: `app/Http/Controllers/Api/V1/UnitController.php`

```php
public function index(Request $request)
{
    $query = Unit::query()
        ->where('business_id', auth()->user()->business_id)
        ->select('id', 'unitName', 'status', 'version', 'updated_at', 'created_at', 'deleted_at')
        ->orderBy('unitName');

    // Apply filters
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }

    if ($request->has('search')) {
        $query->where('unitName', 'like', '%' . $request->search . '%');
    }

    // LIMIT mode
    if ($request->has('limit')) {
        $limit = min((int) $request->input('limit', 1000), 1000);
        $units = $query->limit($limit)->get();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $units,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // CURSOR mode
    if ($request->has('cursor')) {
        $perPage = min((int) $request->input('per_page', 100), 1000);
        $cursor = (int) $request->input('cursor');
        
        $units = $query
            ->where('id', '>', $cursor)
            ->orderBy('id', 'asc')
            ->limit($perPage)
            ->get();
        
        $nextCursor = $units->isNotEmpty() ? $units->last()->id : null;
        $hasMore = $nextCursor && Unit::where('business_id', auth()->user()->business_id)
            ->where('id', '>', $nextCursor)
            ->exists();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $units,
            'pagination' => [
                'next_cursor' => $hasMore ? $nextCursor : null,
                'has_more' => $hasMore,
                'count' => $units->count(),
                'per_page' => $perPage,
            ],
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // OFFSET mode
    if ($request->has('page') || $request->has('per_page')) {
        $perPage = min((int) $request->input('per_page', 10), 100);
        $units = $query->paginate($perPage);
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $units,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // DEFAULT
    $units = $query->limit(1000)->get();
    
    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $units,
        '_server_timestamp' => now()->toIso8601String(),
    ]);
}
```

#### 4. Parties (Customers/Suppliers) Controller

File: `app/Http/Controllers/Api/V1/PartyController.php`

```php
public function index(Request $request)
{
    $query = Party::query()
        ->where('business_id', auth()->user()->business_id)
        ->select('id', 'partyName', 'partyType', 'phoneNumber', 'email', 'address', 'openingBalance', 'status', 'version', 'updated_at', 'created_at', 'deleted_at')
        ->orderBy('partyName');

    // Apply filters
    if ($request->has('partyType')) {
        $query->where('partyType', $request->partyType);
    }

    if ($request->has('status')) {
        $query->where('status', $request->status);
    }

    if ($request->has('search')) {
        $query->where(function ($q) use ($request) {
            $q->where('partyName', 'like', '%' . $request->search . '%')
              ->orWhere('phoneNumber', 'like', '%' . $request->search . '%')
              ->orWhere('email', 'like', '%' . $request->search . '%');
        });
    }

    // LIMIT mode
    if ($request->has('limit')) {
        $limit = min((int) $request->input('limit', 1000), 1000);
        $parties = $query->limit($limit)->get();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $parties,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // CURSOR mode
    if ($request->has('cursor')) {
        $perPage = min((int) $request->input('per_page', 100), 1000);
        $cursor = (int) $request->input('cursor');
        
        $parties = $query
            ->where('id', '>', $cursor)
            ->orderBy('id', 'asc')
            ->limit($perPage)
            ->get();
        
        $nextCursor = $parties->isNotEmpty() ? $parties->last()->id : null;
        $hasMore = $nextCursor && Party::where('business_id', auth()->user()->business_id)
            ->where('id', '>', $nextCursor)
            ->exists();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $parties,
            'pagination' => [
                'next_cursor' => $hasMore ? $nextCursor : null,
                'has_more' => $hasMore,
                'count' => $parties->count(),
                'per_page' => $perPage,
            ],
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // OFFSET mode
    if ($request->has('page') || $request->has('per_page')) {
        $perPage = min((int) $request->input('per_page', 10), 100);
        $parties = $query->paginate($perPage);
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $parties,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // DEFAULT
    $parties = $query->limit(1000)->get();
    
    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $parties,
        '_server_timestamp' => now()->toIso8601String(),
    ]);
}
```

#### 5. Payment Types & VATs (Small Datasets - No Cursor Needed)

File: `app/Http/Controllers/Api/V1/PaymentTypeController.php`

```php
public function index(Request $request)
{
    $query = PaymentType::query()
        ->where('business_id', auth()->user()->business_id)
        ->select('id', 'typeName', 'status', 'version', 'updated_at', 'created_at', 'deleted_at')
        ->orderBy('typeName');

    // Apply filters
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }

    // LIMIT mode (typically not needed, but supported)
    if ($request->has('limit')) {
        $limit = min((int) $request->input('limit', 100), 100);
        $paymentTypes = $query->limit($limit)->get();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $paymentTypes,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // OFFSET mode (for management)
    if ($request->has('page') || $request->has('per_page')) {
        $perPage = min((int) $request->input('per_page', 10), 100);
        $paymentTypes = $query->paginate($perPage);
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $paymentTypes,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // DEFAULT (all payment types - typically < 50 records)
    $paymentTypes = $query->get();
    
    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $paymentTypes,
        '_server_timestamp' => now()->toIso8601String(),
    ]);
}
```

File: `app/Http/Controllers/Api/V1/VatController.php`

```php
public function index(Request $request)
{
    $query = Vat::query()
        ->where('business_id', auth()->user()->business_id)
        ->select('id', 'vatName', 'vatRate', 'status', 'version', 'updated_at', 'created_at', 'deleted_at')
        ->orderBy('vatName');

    // Apply filters
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }

    // LIMIT mode
    if ($request->has('limit')) {
        $limit = min((int) $request->input('limit', 100), 100);
        $vats = $query->limit($limit)->get();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $vats,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // OFFSET mode
    if ($request->has('page') || $request->has('per_page')) {
        $perPage = min((int) $request->input('per_page', 10), 100);
        $vats = $query->paginate($perPage);
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $vats,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
    
    // DEFAULT (all VATs - typically < 20 records)
    $vats = $query->get();
    
    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $vats,
        '_server_timestamp' => now()->toIso8601String(),
    ]);
}
```

---

## Testing Guide

### Test Plan

#### 1. Manual Testing with Postman/cURL

##### Test Categories Endpoint

```bash
# Test 1: Default (no parameters) - should return flat array
curl -X GET "http://localhost:8700/api/v1/categories" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Expected Response:
# {
#   "message": "Data fetched successfully.",
#   "data": [ {...}, {...} ],  // ✅ Flat array
#   "_server_timestamp": "2025-12-17T10:00:00+00:00"
# }

# Test 2: Limit mode (for POS dropdown)
curl -X GET "http://localhost:8700/api/v1/categories?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Expected: Flat array with max 100 items

# Test 3: Offset pagination (for management table)
curl -X GET "http://localhost:8700/api/v1/categories?page=1&per_page=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Expected Response:
# {
#   "message": "Data fetched successfully.",
#   "data": {
#     "current_page": 1,
#     "data": [ {...}, {...} ],  // ✅ Paginated
#     "total": 50,
#     "per_page": 10,
#     ...
#   },
#   "_server_timestamp": "2025-12-17T10:00:00+00:00"
# }

# Test 4: Cursor pagination (for sync)
curl -X GET "http://localhost:8700/api/v1/categories?cursor=0&per_page=100" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Expected Response:
# {
#   "message": "Data fetched successfully.",
#   "data": [ {...}, {...} ],  // ✅ Flat array
#   "pagination": {
#     "next_cursor": 100,
#     "has_more": true,
#     "count": 100,
#     "per_page": 100
#   },
#   "_server_timestamp": "2025-12-17T10:00:00+00:00"
# }

# Test 5: Filters with limit
curl -X GET "http://localhost:8700/api/v1/categories?status=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Expected: Flat array with max 50 active categories

# Test 6: Search with pagination
curl -X GET "http://localhost:8700/api/v1/categories?search=elec&page=1&per_page=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Expected: Paginated results filtered by search term
```

##### Test Complete Cursor Pagination Flow (Sync)

```bash
# Step 1: Get first batch
curl -X GET "http://localhost:8700/api/v1/categories?cursor=0&per_page=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Response will include next_cursor (e.g., 5)

# Step 2: Get next batch using cursor from step 1
curl -X GET "http://localhost:8700/api/v1/categories?cursor=5&per_page=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"

# Response will include next_cursor (e.g., 10)

# Step 3: Continue until has_more = false
curl -X GET "http://localhost:8700/api/v1/categories?cursor=10&per_page=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

#### 2. Test All Endpoints

| Endpoint | Test Case | Expected Response Type |
|----------|-----------|----------------------|
| `/categories` | No params | Flat array (limit 1000) |
| `/categories?limit=100` | Limit | Flat array (max 100) |
| `/categories?page=1&per_page=10` | Offset | Paginated object |
| `/categories?cursor=0&per_page=100` | Cursor | Flat array + pagination meta |
| `/products` | No params | Flat array (limit 1000) |
| `/products?limit=100` | Limit | Flat array (max 100) |
| `/products?cursor=0&per_page=100` | Cursor | Flat array + pagination meta |
| `/brands` | No params | Flat array (limit 1000) |
| `/brands?limit=100` | Limit | Flat array (max 100) |
| `/units` | No params | Flat array (limit 1000) |
| `/parties` | No params | Flat array (limit 1000) |
| `/parties?partyType=customer&limit=50` | Filtered limit | Flat array (max 50) |
| `/payment-types` | No params | Flat array (all) |
| `/vats` | No params | Flat array (all) |

#### 3. Automated Testing (PHPUnit)

Create test file: `tests/Feature/Api/CategoryPaginationTest.php`

```php
<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CategoryPaginationTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test user
        $this->user = User::factory()->create();
        
        // Create test categories
        Category::factory()->count(50)->create([
            'business_id' => $this->user->business_id,
        ]);
    }

    /** @test */
    public function it_returns_flat_array_with_no_parameters()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/categories');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'data' => [
                    '*' => ['id', 'categoryName', 'status']
                ],
                '_server_timestamp'
            ]);

        // Verify data is flat array, not paginated
        $this->assertIsArray($response->json('data'));
        $this->assertArrayNotHasKey('current_page', $response->json('data'));
    }

    /** @test */
    public function it_returns_limited_results_with_limit_parameter()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/categories?limit=10');

        $response->assertStatus(200);
        $this->assertCount(10, $response->json('data'));
    }

    /** @test */
    public function it_returns_paginated_results_with_page_parameter()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/categories?page=1&per_page=10');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'current_page',
                    'data',
                    'total',
                    'per_page',
                    'last_page'
                ],
                '_server_timestamp'
            ]);

        $this->assertEquals(1, $response->json('data.current_page'));
        $this->assertEquals(10, $response->json('data.per_page'));
    }

    /** @test */
    public function it_returns_cursor_paginated_results_with_cursor_parameter()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/categories?cursor=0&per_page=10');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'data',
                'pagination' => [
                    'next_cursor',
                    'has_more',
                    'count',
                    'per_page'
                ],
                '_server_timestamp'
            ]);

        $this->assertIsArray($response->json('data'));
        $this->assertCount(10, $response->json('data'));
        $this->assertTrue($response->json('pagination.has_more'));
    }

    /** @test */
    public function it_respects_maximum_limit_of_1000()
    {
        Category::factory()->count(1500)->create([
            'business_id' => $this->user->business_id,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/categories?limit=2000');

        $response->assertStatus(200);
        $this->assertLessThanOrEqual(1000, count($response->json('data')));
    }

    /** @test */
    public function cursor_pagination_continues_correctly()
    {
        // Get first batch
        $response1 = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/categories?cursor=0&per_page=10');

        $nextCursor = $response1->json('pagination.next_cursor');
        $this->assertNotNull($nextCursor);

        // Get second batch
        $response2 = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/categories?cursor={$nextCursor}&per_page=10");

        $response2->assertStatus(200);
        
        // Verify no duplicates
        $ids1 = collect($response1->json('data'))->pluck('id')->toArray();
        $ids2 = collect($response2->json('data'))->pluck('id')->toArray();
        
        $this->assertEmpty(array_intersect($ids1, $ids2));
    }
}
```

Run tests:
```bash
php artisan test --filter CategoryPaginationTest
```

---

## API Documentation

### Endpoint: GET /api/v1/categories

**Base URL:** `http://your-domain.com/api/v1/categories`

#### Authentication
Required: Yes (Bearer Token)

#### Query Parameters

| Parameter | Type | Required | Default | Max | Description |
|-----------|------|----------|---------|-----|-------------|
| `limit` | integer | No | 1000 | 1000 | Limit results (flat array) |
| `page` | integer | No | 1 | - | Page number (offset pagination) |
| `per_page` | integer | No | 10 | 100 (1000 for cursor) | Items per page |
| `cursor` | integer | No | 0 | - | Last ID from previous batch |
| `status` | boolean | No | - | - | Filter by status (1=active, 0=inactive) |
| `search` | string | No | - | - | Search by category name |

#### Response Formats

##### Mode 1: Default / Limit (Flat Array)

**Request:**
```
GET /api/v1/categories
GET /api/v1/categories?limit=100
GET /api/v1/categories?status=1&limit=50
```

**Response (200 OK):**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "categoryName": "Electronics",
      "icon": "categories/icon.jpg",
      "status": 1,
      "version": 1,
      "updated_at": "2025-12-17T10:00:00.000000Z",
      "created_at": "2025-12-17T10:00:00.000000Z",
      "deleted_at": null
    },
    {
      "id": 2,
      "categoryName": "Fashion",
      "icon": "categories/icon2.jpg",
      "status": 1,
      "version": 1,
      "updated_at": "2025-12-17T10:00:00.000000Z",
      "created_at": "2025-12-17T10:00:00.000000Z",
      "deleted_at": null
    }
  ],
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

##### Mode 2: Offset Pagination

**Request:**
```
GET /api/v1/categories?page=1&per_page=10
GET /api/v1/categories?page=2&per_page=10&status=1
```

**Response (200 OK):**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "categoryName": "Electronics",
        "icon": "categories/icon.jpg",
        "status": 1,
        "version": 1,
        "updated_at": "2025-12-17T10:00:00.000000Z",
        "created_at": "2025-12-17T10:00:00.000000Z",
        "deleted_at": null
      }
    ],
    "first_page_url": "http://localhost:8700/api/v1/categories?page=1",
    "from": 1,
    "last_page": 5,
    "last_page_url": "http://localhost:8700/api/v1/categories?page=5",
    "links": [],
    "next_page_url": "http://localhost:8700/api/v1/categories?page=2",
    "path": "http://localhost:8700/api/v1/categories",
    "per_page": 10,
    "prev_page_url": null,
    "to": 10,
    "total": 50
  },
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

##### Mode 3: Cursor Pagination

**Request:**
```
GET /api/v1/categories?cursor=0&per_page=100
GET /api/v1/categories?cursor=100&per_page=100
```

**Response (200 OK):**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "categoryName": "Electronics",
      "icon": "categories/icon.jpg",
      "status": 1,
      "version": 1,
      "updated_at": "2025-12-17T10:00:00.000000Z",
      "created_at": "2025-12-17T10:00:00.000000Z",
      "deleted_at": null
    }
  ],
  "pagination": {
    "next_cursor": 100,
    "has_more": true,
    "count": 100,
    "per_page": 100
  },
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

#### Error Responses

**401 Unauthorized:**
```json
{
  "message": "Unauthenticated."
}
```

**422 Validation Error:**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "limit": ["The limit must not be greater than 1000."]
  }
}
```

---

## Migration Checklist

### Backend Tasks (Laravel Developer)

- [ ] **Phase 1: Categories Controller (P0 - Critical)**
  - [ ] Update `CategoryController@index` with query parameter logic
  - [ ] Test all three modes (limit, offset, cursor)
  - [ ] Verify flat array response for default/limit
  - [ ] Verify paginated response for page parameter
  - [ ] Verify cursor pagination with next_cursor

- [ ] **Phase 2: Products Controller (P0 - Critical)**
  - [ ] Update `ProductController@index` with same pattern
  - [ ] Include relationships (category, brand, unit)
  - [ ] Test with large dataset (1000+ products)
  - [ ] Verify cursor pagination works correctly

- [ ] **Phase 3: Other Controllers (P1 - High)**
  - [ ] Update `BrandController@index`
  - [ ] Update `UnitController@index`
  - [ ] Update `PartyController@index`
  - [ ] Update `PaymentTypeController@index`
  - [ ] Update `VatController@index`

- [ ] **Phase 4: Testing**
  - [ ] Write PHPUnit tests for all controllers
  - [ ] Manual testing with Postman/cURL
  - [ ] Load testing with large datasets
  - [ ] Test cursor pagination flow (multiple batches)

- [ ] **Phase 5: Documentation**
  - [ ] Update API documentation
  - [ ] Update Postman collection
  - [ ] Document breaking changes
  - [ ] Update API version if needed

### Deployment Checklist

- [ ] **Pre-Deployment**
  - [ ] All tests passing
  - [ ] Code review completed
  - [ ] API documentation updated
  - [ ] Frontend team notified of changes

- [ ] **Deployment**
  - [ ] Deploy to staging environment
  - [ ] Test all endpoints in staging
  - [ ] Deploy to production
  - [ ] Monitor error logs

- [ ] **Post-Deployment**
  - [ ] Verify POS screen works correctly
  - [ ] Verify management tables load properly
  - [ ] Test offline sync functionality
  - [ ] Monitor performance metrics

---

## Performance Considerations

### Memory Usage

| Mode | Memory | Use Case | Safe Limit |
|------|--------|----------|-----------|
| Default | High | Small datasets | 1,000 records |
| Limit | Medium | Dropdowns | 1,000 records |
| Offset Pagination | Low | Management UI | 100 per page |
| Cursor Pagination | Very Low | Sync/Export | 1,000 per batch |

### Database Optimization

#### Add Indexes (If Not Present)

```sql
-- Categories
ALTER TABLE categories ADD INDEX idx_business_status (business_id, status);
ALTER TABLE categories ADD INDEX idx_business_name (business_id, categoryName);

-- Products
ALTER TABLE products ADD INDEX idx_business_status (business_id, status);
ALTER TABLE products ADD INDEX idx_business_category (business_id, category_id);
ALTER TABLE products ADD INDEX idx_cursor (id, business_id);

-- Brands
ALTER TABLE brands ADD INDEX idx_business_status (business_id, status);

-- Units
ALTER TABLE units ADD INDEX idx_business_status (business_id, status);

-- Parties
ALTER TABLE parties ADD INDEX idx_business_type (business_id, partyType);
ALTER TABLE parties ADD INDEX idx_business_status (business_id, status);
```

### Query Optimization

```php
// ✅ Good - Select only needed columns
$query->select('id', 'categoryName', 'icon', 'status', 'version', 'updated_at');

// ❌ Bad - Select all columns
$query->select('*');

// ✅ Good - Use cursor with indexed column
$query->where('id', '>', $cursor)->orderBy('id', 'asc');

// ❌ Bad - Use cursor with non-indexed column
$query->where('created_at', '>', $cursor)->orderBy('created_at', 'asc');
```

---

## Rollback Plan

If issues occur after deployment:

### Option 1: Quick Fix (Revert to Old Behavior)

```php
// Temporarily force flat array for all requests
public function index(Request $request)
{
    $categories = Category::query()
        ->where('business_id', auth()->user()->business_id)
        ->orderBy('categoryName')
        ->limit(1000)
        ->get();

    return response()->json([
        'message' => 'Data fetched successfully.',
        'data' => $categories,
        '_server_timestamp' => now()->toIso8601String(),
    ]);
}
```

### Option 2: Full Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy previous version
php artisan deploy:production
```

---

## Support & Questions

### Contact
- **Frontend Team:** [Your team contact]
- **Backend Lead:** [Backend lead contact]
- **Technical Documentation:** [Link to API docs]

### Common Issues

**Issue:** Frontend still receiving paginated data
- **Solution:** Clear API cache, verify query parameters

**Issue:** Cursor pagination returns duplicates
- **Solution:** Ensure `id` column is indexed and ordered ascending

**Issue:** Performance degradation
- **Solution:** Check database indexes, reduce default limit

---

## Appendix A: Complete Controller Template

```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\YourModel;
use Illuminate\Http\Request;

class YourModelController extends Controller
{
    public function index(Request $request)
    {
        // Build base query
        $query = YourModel::query()
            ->where('business_id', auth()->user()->business_id)
            ->select('id', 'field1', 'field2', 'status', 'version', 'updated_at', 'created_at', 'deleted_at')
            ->orderBy('field1');

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $query->where('field1', 'like', '%' . $request->search . '%');
        }

        // LIMIT mode (for dropdowns)
        if ($request->has('limit')) {
            $limit = min((int) $request->input('limit', 1000), 1000);
            $results = $query->limit($limit)->get();
            
            return response()->json([
                'message' => 'Data fetched successfully.',
                'data' => $results,
                '_server_timestamp' => now()->toIso8601String(),
            ]);
        }
        
        // CURSOR mode (for sync)
        if ($request->has('cursor')) {
            $perPage = min((int) $request->input('per_page', 100), 1000);
            $cursor = (int) $request->input('cursor');
            
            $results = $query
                ->where('id', '>', $cursor)
                ->orderBy('id', 'asc')
                ->limit($perPage)
                ->get();
            
            $nextCursor = $results->isNotEmpty() ? $results->last()->id : null;
            $hasMore = $nextCursor && YourModel::where('business_id', auth()->user()->business_id)
                ->where('id', '>', $nextCursor)
                ->exists();
            
            return response()->json([
                'message' => 'Data fetched successfully.',
                'data' => $results,
                'pagination' => [
                    'next_cursor' => $hasMore ? $nextCursor : null,
                    'has_more' => $hasMore,
                    'count' => $results->count(),
                    'per_page' => $perPage,
                ],
                '_server_timestamp' => now()->toIso8601String(),
            ]);
        }
        
        // OFFSET mode (for management)
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = min((int) $request->input('per_page', 10), 100);
            $results = $query->paginate($perPage);
            
            return response()->json([
                'message' => 'Data fetched successfully.',
                'data' => $results,
                '_server_timestamp' => now()->toIso8601String(),
            ]);
        }
        
        // DEFAULT mode
        $results = $query->limit(1000)->get();
        
        return response()->json([
            'message' => 'Data fetched successfully.',
            'data' => $results,
            '_server_timestamp' => now()->toIso8601String(),
        ]);
    }
}
```

---

## Appendix B: Frontend Integration Examples

### Example 1: POS Dropdown (Use Limit)

```typescript
// Frontend service call
const categoriesRes = await categoriesService.getList({ limit: 100, status: true })
setCategories(categoriesRes.data) // ✅ Flat array
```

### Example 2: Management Table (Use Offset Pagination)

```typescript
// Frontend service call
const response = await categoriesService.getPaginated({
  page: currentPage,
  per_page: 10,
  search: searchQuery,
})

setCategories(response.data.data) // ✅ Array from paginated response
setTotalPages(response.data.last_page)
```

### Example 3: Offline Sync (Use Cursor)

```typescript
// Frontend sync service
let cursor: number | null = 0
let hasMore = true

while (hasMore) {
  const response = await categoriesService.getCursor({
    cursor,
    per_page: 100,
  })
  
  // Save to IndexedDB
  await storage.categories.bulkUpsert(response.data)
  
  cursor = response.pagination.next_cursor
  hasMore = response.pagination.has_more
}
```

---

**END OF DOCUMENT**
