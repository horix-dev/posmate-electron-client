# Backend Sync Enhancement Plan

**Date**: January 3, 2026  
**Purpose**: Address frontend cache invalidation requirements  
**Status**: ✅ Phase 1-2 Complete (Backend Deployed), 🔄 Phase 3 In Progress (Frontend ETag Ready), 📋 Phase 4 Planned  
**Priority**: High  
**Last Updated**: January 3, 2026 - Frontend Units page converted to React Query with ETag support ready  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Gap Analysis](#gap-analysis)
4. [Implementation Plan](#implementation-plan)
5. [Technical Specifications](#technical-specifications)
6. [Migration & Rollout](#migration--rollout)
7. [Testing Strategy](#testing-strategy)

---

## Executive Summary

### Context

The frontend team has documented cache invalidation gaps in `frontend/CACHE_AND_SYNC_STRATEGY.md`. This document outlines the backend enhancements needed to support efficient caching and data synchronization.

### What We Have ✅

| Feature | Status | Location |
|---------|--------|----------|
| `Syncable` trait | ✅ Implemented | `app/Traits/Syncable.php` |
| `version` column (OCC) | ✅ Implemented | All syncable models |
| Soft deletes (`deleted_at`) | ✅ Implemented | All syncable models |
| `GET /sync/full` | ✅ Implemented | Full data download |
| `GET /sync/changes` | ✅ Implemented | Incremental sync |
| `POST /sync/batch` | ✅ Implemented | Batch upload with idempotency |
| Device registration | ✅ Implemented | `POST /sync/register` |
| Sync logging | ✅ Implemented | `sync_logs` table |
| `ServerTimestampMiddleware` | ✅ Implemented | All API responses |

### What's Missing ❌

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| Total count in sync response | HIGH | 2 hours | Validation |
| Database indexes for sync | HIGH | 2 hours | Performance |
| ETag/Last-Modified headers | MEDIUM | 1 day | Caching |
| Conditional request handling (304) | MEDIUM | 1 day | Bandwidth |
| Rate limit documentation | LOW | 1 hour | Documentation |
| Real-time push (WebSocket/SSE) | LOW | 1-2 weeks | UX |

---

## Current State Analysis

### Syncable Models

The following models use the `Syncable` trait:

```php
// Currently in $entityModels (SyncController.php:56-68)
private array $entityModels = [
    'products' => Product::class,
    'categories' => Category::class,
    'brands' => Brand::class,
    'units' => Unit::class,
    'parties' => Party::class,
    'vats' => Vat::class,
    'payment_types' => PaymentType::class,
    'warehouses' => Warehouse::class,
    'attributes' => Attribute::class,
    'attribute_values' => AttributeValue::class,
    'variants' => ProductVariant::class,
];
```

### Current Sync Response Structure

**GET /sync/changes** returns:
```json
{
  "success": true,
  "data": {
    "products": {
      "created": [...],
      "updated": [...],
      "deleted": [1, 2, 3]
    }
  },
  "server_timestamp": "2026-01-03T10:00:00Z",
  "has_more": false,
  "total_records": 25
}
```

**What's Missing:** Per-entity `total` count for frontend validation.

### Sync Trait Capabilities

```php
// Syncable.php - Already implemented
scopeCreatedSince($since)   // Records created after timestamp
scopeUpdatedSince($since)   // Records updated (not created) after timestamp  
scopeDeletedSince($since)   // Soft-deleted records
scopeChangedSince($since)   // All changes (created, updated, deleted)
hasConflict($clientVersion) // Version conflict detection
toSyncArray()              // Sync-friendly array format
```

---

## Gap Analysis

### Gap 1: Missing Total Count per Entity

**Problem:** Frontend cannot validate data integrity without knowing total record count.

**Current Response:**
```json
{
  "products": {
    "created": [...],
    "updated": [...],
    "deleted": [5, 12]
  }
}
```

**Required Response:**
```json
{
  "products": {
    "created": [...],
    "updated": [...],
    "deleted": [5, 12],
    "total": 245  // ← MISSING
  }
}
```

**Impact:** Frontend can detect data corruption/missing records.

---

### Gap 2: Missing Database Indexes

**Problem:** Sync queries on `updated_at`, `deleted_at`, `created_at` may be slow on large tables.

**Current State:** No specific composite indexes for sync queries.

**Required Indexes:**
```sql
-- For each syncable table
CREATE INDEX idx_{table}_sync ON {table} (business_id, updated_at);
CREATE INDEX idx_{table}_deleted ON {table} (business_id, deleted_at);
CREATE INDEX idx_{table}_created ON {table} (business_id, created_at);
```

---

### Gap 3: Missing Cache Validation Headers

**Problem:** Frontend cannot use HTTP caching effectively.

**Current State:** No ETag or Last-Modified headers on GET endpoints.

**Required:**
```http
GET /api/v1/products/123
→ Response Headers:
   ETag: "v5"
   Last-Modified: Fri, 03 Jan 2026 10:30:00 GMT
```

**Frontend Request:**
```http
GET /api/v1/products/123
If-None-Match: "v5"
→ 304 Not Modified (if unchanged)
```

---

### Gap 4: Missing Conditional Request Handling

**Problem:** Full response sent even when data hasn't changed.

**Required:**
- Handle `If-None-Match` header
- Handle `If-Modified-Since` header
- Return `304 Not Modified` when appropriate

---

### Gap 5: Rate Limit Documentation

**Problem:** Frontend team doesn't know API rate limits.

**Required:** Document current limits in API documentation:
- Default throttle: `60 requests/minute` (Laravel default)
- Sync endpoints: Configure appropriate limits
- Batch endpoint: Consider higher limits

---

## Implementation Plan

### Phase 1: Quick Wins (Day 1-2) ✅ COMPLETED

#### Task 1.1: Add Total Count to Sync Response ✅ DEPLOYED

**File:** `app/Http/Controllers/Api/SyncController.php`

**Status:** ✅ Implemented and deployed

**Change:** Modified `getEntityChanges()` method (line 412-440)

```php
private function getEntityChanges(string $entity, int $businessId, Carbon $since, int $limit): array
{
    $model = $this->entityModels[$entity];
    $query = $model::where('business_id', $businessId);
    $query = $this->addEagerLoading($query, $entity);

    return [
        'created' => (clone $query)
            ->where('created_at', '>=', $since)
            ->whereNull('deleted_at')
            ->limit($limit)
            ->get()
            ->map(fn($item) => $this->formatEntityForSync($item))
            ->toArray(),

        'updated' => (clone $query)
            ->where('updated_at', '>=', $since)
            ->where('created_at', '<', $since)
            ->whereNull('deleted_at')
            ->limit($limit)
            ->get()
            ->map(fn($item) => $this->formatEntityForSync($item))
            ->toArray(),

        'deleted' => (clone $query)
            ->onlyTrashed()
            ->where('deleted_at', '>=', $since)
            ->limit($limit)
            ->pluck('id')
            ->toArray(),
            
        // ✅ ADD THIS
        'total' => $model::where('business_id', $businessId)
            ->whereNull('deleted_at')
            ->count(),
    ];
}
``` | **Status:** ✅ DEPLOYED

---

#### Task 1.2: Create Sync Index Migration ✅ DEPLOYED

**File:** `database/migrations/2026_01_03_000001_add_sync_indexes_to_syncable_tables.php`

**Status:** ✅ Migration created and applied

**File:** `database/migrations/2026_01_03_000001_add_sync_indexes_to_syncable_tables.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $syncableTables = [
        'products',
        'parties',
        'categories',
        'brands',
        'units',
        'vats',
        'payment_types',
        'warehouses',
        'sales',
        'purchases',
        'due_collects',
    ];

    public function up(): void
    {
        foreach ($this->syncableTables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $table) use ($tableName) {
                    // Composite index for sync queries
                    $table->index(['business_id', 'updated_at'], "{$tableName}_sync_idx");
                    $table->index(['business_id', 'deleted_at'], "{$tableName}_deleted_idx");
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->syncableTables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $table) use ($tableName) {
                    $table->dropIndex("{$tableName}_sync_idx");
                    $table->dropIndex("{$tableName}_deleted_idx");
                });
            }
        }
    } | **Status:** ✅ DEPLOYED

---

### Phase 2: Cache Headers (Day 3-5) ✅ COMPLETED

#### Task 2.1: Create ETag Middleware ✅ DEPLOYED

**File:** `app/Http/Middleware/EntityCacheHeaders.php`

**Status:** ✅ Implemented and registered

#### Task 2.1: Create ETag Middleware

**File:** `app/Http/Middleware/EntityCacheHeaders.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EntityCacheHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        
        // Only for GET requests
        if ($request->method() !== 'GET') {
            return $response;
        }
        
        // Only for JSON responses
        if (!$response instanceof \Illuminate\Http\JsonResponse) {
            return $response;
        }
        
        $data = $response->getData(true);
        
        // If response has single entity with version
        if (isset($data['data']['version'])) {
            $version = $data['data']['version'];
            $updatedAt = $data['data']['updated_at'] ?? null;
            
            // Set ETag from version
            $etag = "\"v{$version}\"";
            $response->header('ETag', $etag);
            
            // Set Last-Modified if available
            if ($updatedAt) {
                $response->header('Last-Modified', 
                    \Carbon\Carbon::parse($updatedAt)->toRfc7231String()
                );
            }
            
            // Check If-None-Match
            if ($request->header('If-None-Match') === $etag) {
                return response('', 304);
            }
            
            // Check If-Modified-Since
            if ($request->hasHeader('If-Modified-Since') && $updatedAt) {
                $ifModifiedSince = \Carbon\Carbon::parse($request->header('If-Modified-Since'));
                $lastModified = \Carbon\Carbon::parse($updatedAt);
                
                if ($lastModified <= $ifModifiedSince) {
                    return response('', 304);
                }
            }
        }
        
        return $response;
    } | **Status:** ✅ DEPLOYED

---

#### Task 2.2: Register Middleware ✅ DEPLOYED

**File:** `app/Http/Kernel.php`

**Status:** ✅ Middleware registered in kernel

#### Task 2.2: Register Middleware

**File:** `app/Http/Kernel.php`

```php
protected $middlewareAliases = [
    // ... existing
    'cache.entity' => \App\Http\Middleware\EntityCacheHeaders::class,
];
```

---

#### Task 2.3: Apply to Routes

**File:** `routes/api.php`

```php
// Apply to single-entity GET routes
Route::middleware(['auth:sanctum', 'cache.entity'])->group(function () {
    Route::get('products/{id}', [ProductController::class, 'show']);
    Route::get('categories/{id}', [CategoryController::class, 'show']);
    Route::get('parties/{id}', [PartyController::class, 'show']);
    // ... etc
});
```

**Effort:** 1 hour ⬜ TODO

**File:** `docs/API_DOCUMENTATION.md`

**Status:** Pending - Backend to document

### Phase 3: Documentation (Day 6)

#### Task 3.1: Document Rate Limits

**File:** `docs/API_DOCUMENTATION.md`

Add new section:

```markdown
## API Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 60 requests | per minute |
| Sync endpoints | 30 requests | per minute |
| Batch sync | 10 requests | per minute |
| Authentication | 5 requests | per minute |

### Rate Limit Headers

All API responses include:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### Handling 429 Too Many Requests

```json
{
  "message": "Too  | **Status:** ⬜ TODO

---

#### Task 3.2: Update API Quick Reference ⬜ TODO

**File:** `docs/API_QUICK_REFERENCE.md`

**Status:** Pending - Backend to document

**Effort:** 1 hour

---

#### Task 3.2: Update API Quick Reference

**File:** `docs/API_QUICK_REFERENCE.md`

Add cache header documentation:

```markdown
## Cache Headers

### Request Headers (Optional)
| Header | Purpose | Example |
|--------|---------|---------|
| `If-None-Match` | Check if resource changed | `If-None-Match: "v5"` |
| `If-Modified-Since` | Check by timestamp | `If-Modified-Since: Fri, 03 Jan 2026 10:30:00 GMT` |

### Response Headers
| Header | Purpose | Example |
|--------|---------|---------|
| `ETag` | Resource version | `ETag: "v5"` |
| `Last-Modified` | La | **Status:** ⬜ TODO

---

### Phase 4: Future - Real-Time Push (Week 2-3) 📋 PLANNEDches, API returns:
- HTTP Status: `304 Not Modified`
- Empty body
- Use cached data
```

**Effort:** 30 minutes

---

### Phase 4: Future - Real-Time Push (Week 2-3)

**This is optional and can be deferred based on product needs.**

#### Option A: Server-Sent Events (SSE) - Simpler

**Pros:**
- One-way (server → client)
- Auto-reconnect
- Works over HTTP/2
- Simpler than WebSocket

**Implementation:**
```php
// New endpoint
Route::get('sync/stream', [SyncController::class, 'stream']);

// SyncController.php
public function stream(): StreamedResponse
{
    return response()->stream(function () {
        while (true) {
            // Check for changes
            $changes = $this->getRecentChanges();
            
            if ($changes) {
                echo "event: change\n";
                echo "data: " . json_encode($changes) . "\n\n";
                ob_flush();
                flush();
            }
            
            sleep(5); // Poll every 5 seconds
        }
    }, 200, [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
    ]);
}
```

#### Option B: WebSocket via Laravel Reverb

**Pros:**
- Bidirectional
- Lower latency
- Better for high-frequency updates

**Implementation:**
- Laravel Reverb (Laravel 11+) or Pusher
- Broadcast events on model changes
- Frontend listens via Laravel Echo

---

## Technical Specifications

### Sync Response Schema (Updated)

```typescript
interface SyncChangesResponse {
  success: boolean;
  data: {
    [entity: string]: {
      created: EntityRecord[];
      updated: EntityRecord[];
      deleted: number[];      // IDs of deleted records
      total: number;          // ✅ NEW: Total active records
    };
  };
  sync_token: string;         // Base64 encoded sync state
  server_timestamp: string;   // ISO8601
  has_more: boolean;          // More records available
  total_records: number;      // Total records in this response
}
```

### Entity Record Schema

```typescript
interface EntityRecord {
  id: number;
  version: number;            // For conflict detection
  created_at: string;
  updated_at: string;
  deleted_at?: string;        // If soft-deleted
  [key: string]: any;         // Entity-specific fields
}
```

### Cache Header Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GET /api/v1/products/123                      │
│                    If-None-Match: "v5"                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Fetch Product #123   │
                │  Current version: 5   │
                └───────────┬───────────┘
                            │
                            ▼
                    Version match?
                     /          \
                   YES           NO
                   │             │
                   ▼             ▼
            ┌───────────┐  ┌────────────────┐
            │ 304 Not   │  │ 200 OK         │
            │ Modified  │  │ ETag: "v5"     │
            │ (empty)   │  │ Body: {...}    │
            └───────────┘  └────────────────┘
```

---

## Migration & Rollout

### Pre-Deployment Checklist

- [ ] Run database index migration
- [ ] Test sync endpoint performance with indexes
- [ ] Register EntityCacheHeaders middleware
- [ ] Update API documentation
- [ ] Communicate changes to frontend team

### Rollout Steps

1. **Day 1:** Deploy database indexes (zero downtime)
2. **Day 2:** Deploy total count in sync response
3. **Day 3:** Deploy ETag middleware (backward compatible)
4. **Day 4:** Update documentation
5. **Day 5:** Frontend team implements caching

### Rollback Plan

All changes are backward compatible:
- New fields (`total`) are additive
- Cache headers are optional (ignored if not used)
- Database indexes don't change behavior

---

## Testing Strategy

### Unit Tests

```php
// tests/Unit/Middleware/EntityCacheHeadersTest.php
class EntityCacheHeadersTest extends TestCase
{
    public function test_adds_etag_header_to_versioned_response(): void
    {
        // Arrange
        $product = Product::factory()->create(['version' => 5]);
        
        // Act
        $response = $this->getJson("/api/v1/products/{$product->id}");
        
        // Assert
        $response->assertHeader('ETag', '"v5"');
    }
    
    public function test_returns_304_when_etag_matches(): void
    {
        // Arrange
        $product = Product::factory()->create(['version' => 5]);
        
        // Act
        $response = $this->getJson(
            "/api/v1/products/{$product->id}",
            ['If-None-Match' => '"v5"']
        );
        
        // Assert
        $response->assertStatus(304);
        $response->assertNoContent();
    }
    
    public function test_returns_200_when_etag_different(): void
    {
        // Arrange
        $product = Product::factory()->create(['version' => 5]);
        
        // Act
        $response = $this->getJson(
            "/api/v1/products/{$product->id}",
            ['If-None-Match' => '"v3"']
        );
        
        // Assert
        $response->assertStatus(200);
        $response->assertJsonPath('data.version', 5);
    }
}
```

### Performance Tests

```bash
# Benchmark sync endpoint with indexes
php artisan tinker --execute="
    \$start = microtime(true);
    Product::where('business_id', 1)->where('updated_at', '>=', now()->subDay())->count();
    echo 'Time: ' . (microtime(true) - \$start) . 's';
"

# Expected: < 50ms for 10k products
```

### Integration Tests

```php
// tests/Feature/Api/SyncChangesTest.php
public function test_sync_changes_includes_total_count(): void
{
    // Arrange
    Product::factory()->count(100)->create([
        'business_id' => $this->user->business_id
    ]);
    
    // Act
    $response = $this->getJson('/api/v1/sync/changes?since=2025-01-01T00:00:00Z');
    
    // Assert
    $response->assertJsonPath('data.products.total', 100);
}
```

---

## Answers to Frontend Team Questions

### Q1: Can all models have `updated_at` timestamp?

**Answer:** ✅ YES - All Laravel models use `timestamps()` by default, which includes both `created_at` and `updated_at`. All syncable models have these columns.

### Q2: How are deletions handled in DB?

**Answer:** ✅ Soft deletes with `deleted_at` column. The `Syncable` trait includes Laravel's `SoftDeletes` trait. All syncable models support:
- `$model->delete()` → Sets `deleted_at`, record remains in DB
- `Model::withTrashed()` → Include soft-deleted records
- `Model::onlyTrashed()` → Only soft-deleted records
- `scopeDeletedSince($since)` → Records deleted after timestamp

### Q3: Is WebSocket/SSE infrastructure available?

**Answer:** ⚠️ Not currently implemented. Options:
- **Laravel Reverb** (Laravel 11+) - Native WebSocket
- **Server-Sent Events** - Simpler, one-way
- **Polling** - Already supported via incremental sync

Recommendation: Start with frontend polling (Phase 3 of their plan), defer real-time push until needed.

### Q4: API rate limiting?

**Answer:** Current defaults:
- General API: 60 requests/minute (Laravel default)
- Can configure per-route via `throttle:60,1` middleware

Will document in API documentation.

### Q5: Data validation approach?

**Answer:** Recommended approach:
- **ETag** based on `version` column (integer, auto-increments)
- **Last-Modified** based on `updated_at` timestamp
- Version number is simpler and more reliable than content hashingEPLOYED |
| 2 | Create sync indexes migration | HIGH | 1 hour | Backend | ✅ DEPLOYED |
| 3 | Create EntityCacheHeaders middleware | MEDIUM | 2 hours | Backend | ✅ DEPLOYED |
| 4 | Apply middleware to routes | MEDIUM | 1 hour | Backend | ✅ DEPLOYED |
| 5 | Document rate limits | LOW | 1 hour | Backend | ⬜ TODO |
| 6 | Write tests | MEDIUM | 2 hours | Backend | ✅ COMPLETE |
| 7 | Frontend: Configure React Query cacheTime | HIGH | 2 hours | Frontend | ⬜ TODO |
| 8 | Frontend: Implement incremental sync | HIGH | 4 hours | Frontend | ⬜ TODO |
| 9 | Frontend: Add polling to critical pages | MEDIUM | 3 hours | Frontend | ⬜ TODO
### Action Items (Prioritized)backend enhancements (API deployed)
- **Week 1 (Jan 3-5):** 🔄 IN PROGRESS - Phase 3 - Documentation & API details
- **Week 2 (Jan 8-12):** 🔄 PENDING - Frontend caching implementation (3-4 days)
- **Future (TBD):** 📋 PLANNED - Phase 4 - Real-time push (WebSocket/SSE
|---|------|----------|--------|-------|--------|
| 1 | Add `total` to sync response | HIGH | 30 min | Backend | ✅ DONE |
✅ **RESOLVED** - Backend API enhancements deployed

**Next Steps (Frontend):**
1. Verify backend changes are working (test `/sync/changes` endpoint)
2. Implement React Query `staleTime` configuration
3. Add incremental sync to data fetching hooks
4. Add polling to critical pages (POS, Stock Adjustment)
5. Test cache hit rates in DevTools Network tab

**Coordination:**
- Frontend team to validate API changes before full rollout
- Monitor sync endpoint performance with production data
- Coordinate with frontend release schedul | 2 hours | Backend | ✅ DONE |
| 4 | Apply middleware to routes | MEDIUM | 1 hour | Backend | ✅ DONE |
## Frontend Implementation Checklist

Now that backend is ready, frontend team should:

- [ ] Test `/sync/changes` endpoint with `since` parameter
- [ ] Verify `total` count is returned for each entity
- [ ] Test ETag headers with `If-None-Match` requests
- [ ] Verify 304 Not Modified responses
- [ ] Configure React Query with global `staleTime` settings
- [ ] Update `useProducts`, `useSuppliers`, `useCustomers` hooks
- [ ] Add incremental sync to data loading
- [ ] Test cache hit rates (DevTools Network tab)
- [ ] Verify API call reduction (target: 70%+)
- [ ] Load test with large datasets

---

**Last Updated:** January 3, 2026 (Backend Phase 1-2 Complete)  
**Author:** Backend Team  
**Status:** ✅ Backend Ready - Awaiting Frontend Implementation  
**Review Status:** 🔄 Coordinating with Frontend Team
### Timeline

- **Week 1 (Jan 3-7):** ✅ COMPLETED - Phase 1 & 2 - Core enhancements
- **Week 2 (Jan 8-10):** 🔄 PENDING - Phase 3 - Documentation & testing
- **Future (TBD):** 📋 PLANNED - Phase 4 - Real-time push (if needed)

### Dependencies

- Frontend team to implement React Query caching after backend changes
- Coordinate deployment timing with frontend release

---

## Related Documents

- [BACKEND_DEVELOPMENT_LOG.md](./BACKEND_DEVELOPMENT_LOG.md) - Implementation history
- [OFFLINE_FIRST_BACKEND_API.md](./OFFLINE_FIRST_BACKEND_API.md) - API reference
- [frontend/CACHE_AND_SYNC_STRATEGY.md](../frontend/CACHE_AND_SYNC_STRATEGY.md) - Frontend requirements
- [ARCHITECTURE_AND_PATTERNS.md](./ARCHITECTURE_AND_PATTERNS.md) - Design patterns

---

**Last Updated:** January 3, 2026  
**Author:** Backend Team  
**Review Status:** 📋 Draft - Pending Review
