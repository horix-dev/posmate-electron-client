# Product & Stock Data Freshness Implementation Plan

**Date**: January 16, 2026  
**Status**: 📋 Planning  
**Priority**: High  
**Audience**: Frontend & Backend Teams

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Current Implementation](#current-implementation)
4. [Staleness Scenarios](#staleness-scenarios)
5. [Solution Architecture](#solution-architecture)
6. [Implementation Phases](#implementation-phases)
7. [Backend Requirements](#backend-requirements)
8. [Frontend Implementation](#frontend-implementation)
9. [Testing Strategy](#testing-strategy)
10. [Timeline & Resources](#timeline--resources)

---

## Executive Summary

### The Problem
Product and stock data becomes stale in multi-user scenarios because the frontend has **no mechanism to detect backend changes** made by other users, admin operations, or external systems.

### Impact
- **POS Operations**: Cashiers may sell products with outdated prices or stock levels
- **Inventory Management**: Stock adjustments by one user invisible to others
- **Multi-User Conflicts**: Concurrent edits result in data inconsistencies
- **Customer Experience**: Wrong prices displayed, overselling occurs

### Proposed Solution
Implement a **3-phase approach**:
1. **Phase 1**: Frontend polling for critical pages (POS, Stock)
2. **Phase 2**: Backend incremental sync endpoint (`/sync?since=`)
3. **Phase 3**: Real-time updates via WebSocket/SSE (future)

---

## Problem Statement

### How Data Becomes Stale

```
Timeline:
─────────────────────────────────────────────────────────────────►

User A (POS Terminal 1):
  │
  ├─ 10:00 AM ─► Loads products (cached for 30 min)
  │
  ├─ 10:15 AM ─► Still showing cached data ◄── STALE!
  │
  └─ 10:30 AM ─► Cache expires, refetches

User B (Admin Panel):
  │
  └─ 10:05 AM ─► Changes product price $10 → $12
                 (User A doesn't see this until 10:30!)
```

### Root Causes

| Cause | Description | Current Status |
|-------|-------------|----------------|
| **No change detection** | Frontend can't know when backend data changes | ❌ Not implemented |
| **Long cache TTL** | 30-minute staleTime for all data | ⚠️ Intentional for performance |
| **No polling** | Critical pages don't periodically refresh | ❌ Not implemented |
| **No push mechanism** | Backend can't notify frontend of changes | ❌ Not implemented |
| **Offline-first architecture** | Prioritizes cached data over fresh data | ✅ By design |

---

## Current Implementation

### What's Working ✅

| Feature | Location | Description |
|---------|----------|-------------|
| **React Query Caching** | `App.tsx` | Global 30-min staleTime, 60-min gcTime |
| **Manual Invalidation** | Various hooks | Cache cleared after local mutations |
| **Offline Fallback** | `usePOSData.ts` | SQLite/IndexedDB cache for offline use |
| **Network Recovery** | `App.tsx` | Refetch on reconnect enabled |
| **Sync Queue** | `useSyncQueue.ts` | 2-second polling for queue status |

### What's Missing ❌

| Feature | Impact | Priority |
|---------|--------|----------|
| **Product polling** | POS shows stale prices/stock | 🔴 Critical |
| **Stock polling** | Inventory discrepancies | 🔴 Critical |
| **Incremental sync** | Downloads full dataset every time | 🟡 High |
| **ETag validation** | No bandwidth optimization | 🟡 High |
| **Real-time updates** | No instant propagation | 🟢 Medium |

---

## Staleness Scenarios

### Scenario 1: Price Change by Admin
```
Admin changes price: $10 → $12
├─ POS Terminal 1: Shows $10 (cached) ← WRONG
├─ POS Terminal 2: Shows $10 (cached) ← WRONG
└─ New customer charged: $10 (should be $12) ← REVENUE LOSS
```

### Scenario 2: Stock Depletion
```
Product stock: 5 units
├─ POS Terminal 1: Sells 3 units → Stock now: 2
├─ POS Terminal 2: Still shows 5 (cached) ← STALE
└─ Terminal 2 tries to sell 4 → Backend rejects ← BAD UX
```

### Scenario 3: Product Disabled
```
Admin disables product (out of season)
├─ POS Terminal 1: Still shows product ← STALE
├─ Customer orders disabled product
└─ Sale fails at checkout ← BAD UX
```

### Scenario 4: New Product Added
```
Admin adds new product
├─ POS Terminal 1: Doesn't see new product ← STALE
├─ Customer asks for new product
└─ Cashier can't find it ← CONFUSION
```

### Scenario 5: Variant Stock Update
```
Purchase adds stock to variant (Size: L, Color: Blue)
├─ ProductDetailsDialog: Shows old stock (300 vs 390)
├─ User makes business decisions on wrong data
└─ Inventory reports incorrect ← DATA INTEGRITY
```

---

## Solution Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Phase 1    │  │   Phase 2    │  │   Phase 3    │          │
│  │   Polling    │  │  Incr. Sync  │  │  WebSocket   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         ▼                 ▼                  ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React Query Cache Layer                     │   │
│  │         (staleTime, gcTime, invalidation)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Local Storage (SQLite/IndexedDB)              │   │
│  │              (Offline-first cache)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Laravel)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Existing    │  │  NEW: /sync  │  │  NEW: Events │          │
│  │  REST APIs   │  │   Endpoint   │  │   (Phase 3)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ETag Headers (Pending)                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Frontend Polling (No Backend Changes)

**Timeline**: 1-2 days  
**Effort**: Low  
**Impact**: High  
**Backend Required**: ❌ No

Add periodic polling to critical pages to ensure data freshness.

#### 1.1 POS Page Products Polling

**File**: `src/pages/pos/hooks/usePOSData.ts`

```typescript
// Add to fetchData useEffect or create dedicated polling effect
useEffect(() => {
  // Don't poll if offline
  if (!navigator.onLine) return

  // Poll every 30 seconds for fresh product data
  const interval = setInterval(() => {
    fetchData(false) // false = don't show loading spinner
  }, 30 * 1000)

  return () => clearInterval(interval)
}, [fetchData])
```

#### 1.2 Stock Page Polling

**File**: `src/pages/stocks/hooks/useStocks.ts`

```typescript
// Add refetchInterval to React Query options
useQuery({
  queryKey: ['stocks', filters],
  queryFn: () => stocksService.getAll(filters),
  staleTime: 30 * 1000,        // 30 seconds
  refetchInterval: 30 * 1000,  // Poll every 30 seconds
  refetchIntervalInBackground: false, // Stop when tab not focused
})
```

#### 1.3 Products Page Polling (Optional)

**File**: `src/pages/products/hooks/useProducts.ts`

```typescript
// Add optional polling for products list
useQuery({
  queryKey: ['products', filters],
  queryFn: () => productsService.getAll(filters),
  staleTime: 5 * 60 * 1000,    // 5 minutes
  refetchInterval: 60 * 1000,  // Poll every 60 seconds (less critical)
})
```

#### 1.4 Window Focus Refetch

**File**: `src/App.tsx`

```typescript
// Change refetchOnWindowFocus for specific queries
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: 'always', // ← Change from false
      refetchOnReconnect: true,
    },
  },
})
```

---

### Phase 2: Incremental Sync (Backend Required)

**Timeline**: 1 week  
**Effort**: Medium  
**Impact**: Very High  
**Backend Required**: ✅ Yes

#### 2.1 Backend: `/sync` Endpoint

**New Endpoint**: `GET /api/sync`

```http
GET /api/sync?since=2026-01-16T10:00:00Z&entities=products,stocks,categories

Response 200 OK:
{
  "timestamp": "2026-01-16T10:30:00Z",
  "data": {
    "products": {
      "added": [{ id: 101, ... }],
      "updated": [{ id: 45, productName: "New Name", ... }],
      "deleted": [12, 15, 22],
      "count": { "added": 1, "updated": 1, "deleted": 3 }
    },
    "stocks": {
      "added": [],
      "updated": [{ id: 45, productStock: 150, ... }],
      "deleted": [],
      "count": { "added": 0, "updated": 1, "deleted": 0 }
    },
    "categories": {
      "added": [],
      "updated": [],
      "deleted": [],
      "count": { "added": 0, "updated": 0, "deleted": 0 }
    }
  },
  "hasChanges": true
}
```

#### 2.2 Backend Implementation Requirements

```php
// SyncController.php
public function sync(Request $request)
{
    $since = $request->input('since'); // ISO 8601 timestamp
    $entities = explode(',', $request->input('entities', 'products,stocks'));
    
    $businessId = auth()->user()->business_id;
    $result = ['timestamp' => now()->toISOString(), 'data' => [], 'hasChanges' => false];
    
    foreach ($entities as $entity) {
        $result['data'][$entity] = $this->getSyncData($entity, $since, $businessId);
        if (!empty($result['data'][$entity]['added']) || 
            !empty($result['data'][$entity]['updated']) || 
            !empty($result['data'][$entity]['deleted'])) {
            $result['hasChanges'] = true;
        }
    }
    
    return response()->json($result);
}

private function getSyncData(string $entity, ?string $since, int $businessId): array
{
    $model = $this->getModelForEntity($entity);
    $query = $model::where('business_id', $businessId);
    
    if ($since) {
        // Get records modified after $since
        $updated = $query->clone()
            ->where('updated_at', '>', $since)
            ->whereNull('deleted_at')
            ->get();
            
        // Get records deleted after $since (requires soft deletes)
        $deleted = $query->clone()
            ->onlyTrashed()
            ->where('deleted_at', '>', $since)
            ->pluck('id');
            
        // Get records created after $since
        $added = $query->clone()
            ->where('created_at', '>', $since)
            ->whereNull('deleted_at')
            ->get();
            
        return [
            'added' => $added->diff($updated)->values(),
            'updated' => $updated,
            'deleted' => $deleted,
            'count' => [
                'added' => $added->diff($updated)->count(),
                'updated' => $updated->count(),
                'deleted' => $deleted->count(),
            ]
        ];
    }
    
    // Full sync (no timestamp)
    return [
        'added' => $query->whereNull('deleted_at')->get(),
        'updated' => [],
        'deleted' => [],
        'count' => ['added' => $query->count(), 'updated' => 0, 'deleted' => 0]
    ];
}
```

#### 2.3 Backend: Soft Deletes Requirement

Ensure all syncable models use soft deletes:

```php
// app/Models/Product.php
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;
    
    protected $dates = ['deleted_at'];
}
```

**Migration** (if not exists):
```php
Schema::table('products', function (Blueprint $table) {
    $table->softDeletes(); // Adds deleted_at column
});
```

#### 2.4 Frontend: Sync Service

**New File**: `src/api/services/sync.service.ts`

```typescript
interface SyncResponse {
  timestamp: string
  data: {
    products?: SyncEntityData<Product>
    stocks?: SyncEntityData<Stock>
    categories?: SyncEntityData<Category>
  }
  hasChanges: boolean
}

interface SyncEntityData<T> {
  added: T[]
  updated: T[]
  deleted: number[]
  count: { added: number; updated: number; deleted: number }
}

export const syncService = {
  async sync(params?: { since?: string; entities?: string[] }): Promise<SyncResponse> {
    const response = await apiClient.get('/sync', {
      params: {
        since: params?.since,
        entities: params?.entities?.join(',') || 'products,stocks,categories',
      },
    })
    return response.data
  },
}
```

#### 2.5 Frontend: Apply Sync Changes

**New File**: `src/hooks/useIncrementalSync.ts`

```typescript
export function useIncrementalSync() {
  const lastSyncRef = useRef<string | null>(
    localStorage.getItem('lastDataSync')
  )

  const performSync = useCallback(async () => {
    try {
      const response = await syncService.sync({
        since: lastSyncRef.current || undefined,
        entities: ['products', 'stocks', 'categories'],
      })

      if (response.hasChanges) {
        // Apply changes to local storage
        if (response.data.products) {
          await applyProductChanges(response.data.products)
        }
        if (response.data.stocks) {
          await applyStockChanges(response.data.stocks)
        }
        if (response.data.categories) {
          await applyCategoryChanges(response.data.categories)
        }

        // Invalidate React Query caches
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['stocks'] })
        queryClient.invalidateQueries({ queryKey: ['categories'] })
      }

      // Save timestamp for next sync
      lastSyncRef.current = response.timestamp
      localStorage.setItem('lastDataSync', response.timestamp)
    } catch (error) {
      console.error('[Sync] Failed:', error)
    }
  }, [])

  return { performSync }
}
```

---

### Phase 3: Real-Time Updates (Future)

**Timeline**: 2-4 weeks  
**Effort**: High  
**Impact**: Very High  
**Backend Required**: ✅ Yes (significant)

#### 3.1 Backend: Laravel Broadcasting Setup

```php
// config/broadcasting.php
'connections' => [
    'pusher' => [
        'driver' => 'pusher',
        'key' => env('PUSHER_APP_KEY'),
        'secret' => env('PUSHER_APP_SECRET'),
        'app_id' => env('PUSHER_APP_ID'),
        'options' => [
            'cluster' => env('PUSHER_APP_CLUSTER'),
            'useTLS' => true,
        ],
    ],
    // OR use Laravel Websockets (self-hosted)
    'websockets' => [
        'driver' => 'pusher',
        'key' => env('LARAVEL_WEBSOCKETS_KEY', 'app-key'),
        'secret' => env('LARAVEL_WEBSOCKETS_SECRET', 'app-secret'),
        'app_id' => env('LARAVEL_WEBSOCKETS_APP_ID', 'app-id'),
        'options' => [
            'cluster' => 'mt1',
            'host' => '127.0.0.1',
            'port' => 6001,
            'scheme' => 'http',
        ],
    ],
],
```

#### 3.2 Backend: Event Broadcasting

```php
// app/Events/ProductUpdated.php
class ProductUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Product $product;
    public string $action; // 'created', 'updated', 'deleted'

    public function __construct(Product $product, string $action)
    {
        $this->product = $product;
        $this->action = $action;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('business.' . $this->product->business_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'product' => $this->product->toArray(),
            'timestamp' => now()->toISOString(),
        ];
    }
}
```

#### 3.3 Backend: Trigger Events

```php
// app/Observers/ProductObserver.php
class ProductObserver
{
    public function created(Product $product): void
    {
        event(new ProductUpdated($product, 'created'));
    }

    public function updated(Product $product): void
    {
        event(new ProductUpdated($product, 'updated'));
    }

    public function deleted(Product $product): void
    {
        event(new ProductUpdated($product, 'deleted'));
    }
}

// app/Providers/EventServiceProvider.php
Product::observe(ProductObserver::class);
```

#### 3.4 Frontend: WebSocket Listener

```typescript
// src/hooks/useRealtimeSync.ts
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

export function useRealtimeSync() {
  const { businessId } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!businessId) return

    const echo = new Echo({
      broadcaster: 'pusher',
      key: import.meta.env.VITE_PUSHER_KEY,
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      forceTLS: true,
    })

    echo.private(`business.${businessId}`)
      .listen('ProductUpdated', (event: ProductUpdatedEvent) => {
        console.log('[Realtime] Product update:', event)
        
        // Invalidate affected queries
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['pos-products'] })
        
        // Optional: Update cache directly for instant UI
        if (event.action === 'updated') {
          queryClient.setQueryData(['products'], (old: Product[]) => 
            old?.map(p => p.id === event.product.id ? event.product : p)
          )
        }
      })

    return () => {
      echo.leave(`business.${businessId}`)
    }
  }, [businessId, queryClient])
}
```

---

## Backend Requirements Summary

### Required for Phase 1
**None** - Frontend-only changes

### Required for Phase 2

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Soft Deletes** | Add `deleted_at` to syncable models | 🔴 Required |
| **`/sync` Endpoint** | Incremental sync API | 🔴 Required |
| **Query Optimization** | Index on `updated_at`, `deleted_at` | 🟡 Recommended |

**Models to Update:**
- `Product` - soft deletes
- `Stock` - soft deletes  
- `Category` - soft deletes
- `Brand` - soft deletes
- `Unit` - soft deletes

**Database Migrations:**
```php
// Add to all syncable tables
$table->softDeletes();
$table->index(['business_id', 'updated_at']);
$table->index(['business_id', 'deleted_at']);
```

### Required for Phase 3

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Laravel Broadcasting** | Configure Pusher or Laravel Websockets | 🔴 Required |
| **Model Observers** | Dispatch events on CRUD | 🔴 Required |
| **Private Channels** | Per-business channels | 🔴 Required |
| **Authentication** | Sanctum broadcast auth | 🟡 Recommended |

---

## Frontend Implementation

### File Changes Summary

#### Phase 1 Files
| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/pos/hooks/usePOSData.ts` | Modify | Add polling interval |
| `src/pages/stocks/hooks/useStocks.ts` | Modify | Add refetchInterval |
| `src/App.tsx` | Modify | Enable refetchOnWindowFocus |

#### Phase 2 Files
| File | Change Type | Description |
|------|-------------|-------------|
| `src/api/services/sync.service.ts` | Create | Sync API service |
| `src/hooks/useIncrementalSync.ts` | Create | Sync hook |
| `src/stores/sync.store.ts` | Modify | Add lastSyncTimestamp |

#### Phase 3 Files
| File | Change Type | Description |
|------|-------------|-------------|
| `src/hooks/useRealtimeSync.ts` | Create | WebSocket listener |
| `src/App.tsx` | Modify | Initialize realtime |
| `.env` | Modify | Add Pusher credentials |

---

## Testing Strategy

### Phase 1 Testing

| Test Case | Steps | Expected |
|-----------|-------|----------|
| **POS Polling** | 1. Open POS, 2. Wait 30s | Network shows refetch |
| **Multi-Tab** | 1. Open 2 tabs, 2. Edit in tab 1 | Tab 2 updates within 30s |
| **Tab Focus** | 1. Open POS, 2. Switch tabs, 3. Return | Data refreshes |
| **Offline** | 1. Go offline, 2. Wait 30s | No polling errors |

### Phase 2 Testing

| Test Case | Steps | Expected |
|-----------|-------|----------|
| **Initial Sync** | 1. Clear cache, 2. Load page | Full sync, timestamp saved |
| **Incremental Sync** | 1. Edit product, 2. Sync | Only changed product returned |
| **Delete Sync** | 1. Delete product, 2. Sync | Deleted ID in response |
| **Large Dataset** | 1. 10,000 products, 2. Change 1 | Only 1 product in response |

### Phase 3 Testing

| Test Case | Steps | Expected |
|-----------|-------|----------|
| **Instant Update** | 1. Open 2 browsers, 2. Edit in B1 | B2 updates instantly |
| **Reconnection** | 1. Disconnect WS, 2. Reconnect | No missed events |
| **Multi-Business** | 1. Login as different business | Only own events received |

---

## Timeline & Resources

### Phase 1: 1-2 Days (Frontend Only)

| Day | Task | Owner |
|-----|------|-------|
| 1 | Add polling to `usePOSData.ts` | Frontend |
| 1 | Add polling to `useStocks.ts` | Frontend |
| 1 | Enable `refetchOnWindowFocus` | Frontend |
| 2 | Test multi-user scenarios | QA |
| 2 | Monitor API load increase | DevOps |

### Phase 2: 1 Week (Backend + Frontend)

| Day | Task | Owner |
|-----|------|-------|
| 1-2 | Add soft deletes to models | Backend |
| 2-3 | Implement `/sync` endpoint | Backend |
| 3-4 | Create `sync.service.ts` | Frontend |
| 4-5 | Create `useIncrementalSync.ts` | Frontend |
| 5 | Integration testing | QA |

### Phase 3: 2-4 Weeks (Major Feature)

| Week | Task | Owner |
|------|------|-------|
| 1 | Setup Laravel Broadcasting | Backend |
| 1 | Create model observers | Backend |
| 2 | Frontend WebSocket integration | Frontend |
| 2-3 | Testing & debugging | All |
| 3-4 | Production deployment | DevOps |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **API Overload (Phase 1)** | Medium | High | Rate limiting, conditional polling |
| **Data Conflicts** | Low | Medium | Last-write-wins with timestamps |
| **WebSocket Disconnect** | Medium | Medium | Auto-reconnect, fallback to polling |
| **Migration Complexity** | Low | High | Staged rollout, feature flags |

---

## Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| **Data Staleness Window** | 30 minutes | <30 seconds | Time between change and visibility |
| **Multi-User Sync Issues** | Unknown | <1% | Support ticket tracking |
| **API Call Increase** | Baseline | <50% | API monitoring |
| **User Complaints** | Unknown | 0 | Feedback tracking |

---

## References

- [CACHE_AND_SYNC_STRATEGY.md](./CACHE_AND_SYNC_STRATEGY.md) - Original cache documentation
- [ETAG_IMPLEMENTATION_REQUEST.md](./ETAG_IMPLEMENTATION_REQUEST.md) - ETag implementation (pending)
- [OFFLINE_FIRST_BACKEND_API.md](./OFFLINE_FIRST_BACKEND_API.md) - Offline architecture
- [React Query Docs](https://tanstack.com/query/latest) - Caching library
- [Laravel Broadcasting](https://laravel.com/docs/broadcasting) - Real-time events
