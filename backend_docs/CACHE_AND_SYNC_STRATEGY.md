# Cache & Sync Strategy: Frontend-Backend Alignment

**Date**: January 2, 2026  
**Purpose**: Establish cache invalidation strategy and data sync mechanisms  
**Audience**: Frontend & Backend Development Teams

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Problem Statement](#problem-statement)
3. [Cache Invalidation Gap](#cache-invalidation-gap)
4. [Recommended Solutions](#recommended-solutions)
5. [Implementation Timeline](#implementation-timeline)

---

## Current Architecture

### Frontend Cache Layers

The frontend implements **3 layers of caching**:

| Layer | Storage | Purpose | TTL | Use Case |
|-------|---------|---------|-----|----------|
| **React Query** | Memory (RAM) | Server state caching | `staleTime: 0` (default) | Query deduplication |
| **localStorage** | Browser Storage | Small, static data | 24 hours | Brands, units, variants |
| **IndexedDB/SQLite** | Persistent Storage | Large datasets + offline | Manual sync | Products, categories, sales (offline-first) |

### Current Data Flow

```
┌─────────────────────────────────────────┐
│  Page Load (Products, Sales, etc.)      │
└──────────────┬──────────────────────────┘
               │
               ▼
       Is User Online?
         /          \
       NO            YES
       │             │
       ▼             ▼
   Load from    Fetch from API
   IndexedDB    (always fresh)
       │             │
       └─────┬───────┘
             ▼
       Display Data
```

### Configuration Details

**React Query Setup** ([src/App.tsx](../src/App.tsx)):
```typescript
const queryClient = new QueryClient()  // ← Default settings: staleTime = 0
```

**Default Behavior**: All data is marked as "stale" immediately → always refetches from API on every page visit.

**Cache Keys Example** ([src/lib/cache/index.ts](../src/lib/cache/index.ts)):
```typescript
export const CacheKeys = {
  PRODUCTS_BRANDS: 'cache:products:brands',
  PRODUCTS_UNITS: 'cache:products:units',
  PRODUCT_VARIANTS: (productId: number) => `cache:products:${productId}:variants`,
  // ... etc
}
```

---

## Problem Statement

### Current Issues

#### 1. **Every Page Visit Triggers Full API Calls**

**Observed Behavior**: When navigating to Products, Sales, or any page:
- ✅ Fetches `GET /products`
- ✅ Fetches `GET /categories`
- ✅ Fetches `GET /brands`
- ✅ Fetches `GET /units`
- All happen **in parallel** even if data was just loaded seconds ago

**Root Cause**: React Query `staleTime: 0` = no caching between page visits

**Impact**:
- Unnecessary API load
- Slower UX (loading spinners)
- Poor offline-first experience
- Wasted bandwidth

---

#### 2. **No Backend-Triggered Cache Invalidation**

**Current State**: Frontend has **NO way to know if backend data changed**.

**Scenarios Where This Fails**:
- Admin edits category in backend → Frontend still shows old category in dropdown
- Backend adds new unit → Frontend's unit cache is stale
- Another user creates a product → Current user doesn't see it until page refresh
- Stock adjustment in backend → Inventory page doesn't update

**Why It Matters**: 
- Multi-user system with concurrent edits
- Category/unit/brand changes should propagate immediately
- Especially critical for real-time operations (POS, Stock Adjustment)

---

### Cache Invalidation Mechanisms: Current State

| Trigger | What Gets Invalidated | How |
|---------|----------------------|-----|
| User mutation (create/edit) | Affected query key | `queryClient.invalidateQueries()` |
| Page refresh | Everything | Full reload |
| localStorage TTL expires | Specific cache key | After 24 hours |
| Manual app action | Manual clearing | `removeCache()` |
| **Backend changes** | **❌ NOTHING** | **No mechanism** |

---

## Cache Invalidation Gap

### What's Missing

The frontend app uses **optimistic updates** - it assumes mutations succeed and updates local state. But there's no way to stay synchronized with backend changes made by:
- Other users (concurrent edits)
- Backend cron jobs
- Admin operations
- External systems

### Industry Standard Solutions (All Missing)

| Solution | Status | Purpose |
|----------|--------|---------|
| **ETag / Last-Modified Headers** | ❌ Not used | Cache validation without full refetch |
| **Change Timestamps** | ⚠️ Partial | `updated_at` exists but not leveraged |
| **Polling for Changes** | ❌ Not implemented | Periodic sync for critical data |
| **Push Notifications (WebSocket/SSE)** | ❌ Not implemented | Real-time invalidation |
| **Incremental Sync Endpoint** | ⚠️ Partially documented | `GET /sync?since=timestamp` |
| **Cache Versioning** | ✅ Implemented | Allows manual invalidation via version bump |

---

## Recommended Solutions

### Phase 1: Quick Win - Improve React Query Configuration

**Timeline**: 1-2 days | **Effort**: Low | **Impact**: High

**Goal**: Use local cache between page visits, reduce API calls

**Implementation**:

```typescript
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Static reference data (units, brands, categories)
      staleTime: 30 * 60 * 1000,      // 30 minutes
      gcTime: 60 * 60 * 1000,         // 60 minutes (formerly cacheTime)
      
      // Refetch when user focuses window
      refetchOnWindowFocus: true,
      
      // Refetch when network reconnects
      refetchOnReconnect: true,
    },
  },
})
```

**Per-Query Overrides**:

```typescript
// Reference data - low change frequency
useQuery({
  queryKey: ['categories'],
  staleTime: 30 * 60 * 1000,  // 30 min
})

// Dynamic data - medium change frequency  
useQuery({
  queryKey: ['products'],
  staleTime: 5 * 60 * 1000,   // 5 min
})

// Real-time data - high change frequency
useQuery({
  queryKey: ['sales'],
  staleTime: 30 * 1000,       // 30 sec
})
```

**Result**:
- Instant UI response (cache-first)
- Eventual consistency (background refetch)
- Reduced API calls by 70-80%

---

### Phase 2: Implement Incremental Sync Endpoint

**Timeline**: 3-5 days | **Effort**: Medium | **Impact**: Very High

**Goal**: Only download changed data, not full dataset every time

**Backend Implementation Needed**:

#### Endpoint: `GET /sync`

```http
GET /sync?since=2026-01-01T10:00:00Z&entities=products,categories,brands

200 OK
{
  "timestamp": "2026-01-02T10:30:00Z",  // Server time (use for next sync)
  "data": {
    "products": {
      "added": [...],      // New products since timestamp
      "updated": [...],    // Updated products since timestamp
      "deleted": [5, 12],  // Deleted product IDs
      "total": 245         // Total count for validation
    },
    "categories": {
      "added": [],
      "updated": [{ id: 3, name: "New Name", updated_at: "..." }],
      "deleted": [],
      "total": 18
    }
  }
}
```

**Requirements**:
- ✅ All API models have `updated_at` timestamp (already exists in schema)
- ❌ Backend needs to query records where `updated_at >= ?since` parameter
- ❌ Backend needs to track deletions (soft deletes or separate tombstone table)

**Frontend Usage**:

```typescript
// First load (full sync)
const resp = await syncService.sync()

// Subsequent loads (incremental sync)
const lastSync = localStorage.getItem('lastDataSync')
const resp = await syncService.sync({ since: lastSync })

// Store for next time
localStorage.setItem('lastDataSync', resp.timestamp)
```

**Benefits**:
- Download only changed records (95%+ reduction in data transfer)
- Conflicts automatically handled (timestamps define truth)
- Works perfectly with offline-first architecture

---

### Phase 3: Real-Time Invalidation via Polling

**Timeline**: 2-3 days | **Effort**: Low | **Impact**: High

**Goal**: Keep cache fresh for critical data without full refetch

**Implementation**:

```typescript
// For frequently-updated data
useQuery({
  queryKey: ['products'],
  queryFn: productsService.getAll,
  
  // Poll every 30 seconds
  refetchInterval: 30 * 1000,
  
  // Stop polling if window isn't focused
  refetchIntervalInBackground: false,
})
```

**When to Use**:
- POS page (inventory changes frequently)
- Sales/Purchases pages (concurrent users)
- Stock level displays

**When NOT to Use**:
- Settings pages (static data)
- Reports (historical data)
- Long list pages (performance impact)

**Cost**: 1-2 API calls per 30 sec per user. With 10 users = 20-40 calls/min for critical data.

---

### Phase 4: Push Notifications (Future Enhancement)

**Timeline**: 1-2 weeks | **Effort**: High | **Impact**: Very High

**Goal**: Real-time invalidation for critical changes

**Architecture**:

```
Backend                         Frontend
   │                              │
   ├─ User edits category ────────┤
   │                              │
   └─ Publish: "category:5:updated"
                                  │
                       WebSocket/SSE Listener
                                  │
                          queryClient.invalidateQueries({
                            queryKey: ['categories', 5]
                          })
                                  │
                          Refetch category in background
```

**Benefits**:
- Sub-second propagation of changes
- Minimal API overhead
- Works across all open browser tabs
- Essential for multi-user operations (POS, Stock Adjustment)

**Alternative**: Use Server-Sent Events (SSE) instead of WebSocket (simpler, one-way)

---

## Implementation Timeline

### Week 1: Phase 1 & 2
- [ ] Configure React Query `staleTime` globally
- [ ] Create per-query overrides for different data types
- [ ] Design `/sync` endpoint schema
- [ ] Implement backend `/sync` endpoint

### Week 2: Phase 2 & 3
- [ ] Implement frontend sync service using `/sync` endpoint
- [ ] Add incremental sync to data loading hooks
- [ ] Test with large product catalogs
- [ ] Add polling to critical pages (POS, Stock Adjustment)

### Week 3: Phase 4 (Optional/Future)
- [ ] Design real-time event system
- [ ] Implement WebSocket/SSE server
- [ ] Add real-time listeners to frontend
- [ ] Test concurrent user scenarios

---

## Data Freshness Matrix

**Recommended staleTime by data type**:

| Data Type | Frequency | staleTime | Reason |
|-----------|-----------|-----------|--------|
| Categories | Low | 30 min | Rarely changed |
| Brands | Low | 30 min | Rarely changed |
| Units | Very Low | 60 min | Almost never changed |
| Products | Medium | 5 min | Stock, prices change |
| Product Stock | High | 30 sec | Real-time operations |
| Sales/Purchases | High | 1 min | Concurrent users |
| Reports | Low | 5 min | Historical, batched |

---

## Validation & Rollout

### Testing Checklist
- [ ] Verify cache hits with DevTools Network tab
- [ ] Test offline fallback with DevTools offline mode
- [ ] Test multi-user concurrent edits
- [ ] Measure API call reduction (target: 70%+)
- [ ] Load test with incremental sync (large datasets)

### Monitoring
- [ ] Track API call frequency by endpoint
- [ ] Monitor sync service error rate
- [ ] Alert on data inconsistencies
- [ ] Track cache hit rates

---

## References

### Frontend Files
- [src/App.tsx](../src/App.tsx) - React Query setup
- [src/lib/cache/index.ts](../src/lib/cache/index.ts) - Cache utilities
- [src/stores/sync.store.ts](../src/stores/sync.store.ts) - Sync state management
- [backend_docs/OFFLINE_FIRST_BACKEND_API.md](./OFFLINE_FIRST_BACKEND_API.md) - Existing sync docs

### Backend Resources
- React Query docs: https://tanstack.com/query/latest/docs/react/guides/caching
- Incremental sync pattern: https://www.apollographql.com/docs/react/data/subscriptions
- ETag RFC: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag

---

## Questions for Backend Team

1. **Can all models have `updated_at` timestamp**?
   - Needed for: Incremental sync, Change detection, Conflict resolution

2. **How are deletions handled in DB**?
   - Soft delete (with `deleted_at` flag)?
   - Hard delete (need tombstone table)?
   - This affects sync endpoint design

3. **Is WebSocket/SSE infrastructure available**?
   - For future real-time invalidation?
   - Or should we stick with polling?

4. **API rate limiting?**
   - What's the limit on `/sync` calls?
   - What's the limit on individual resource endpoints?
   - Helps us optimize query batching

5. **Data validation approach**?
   - Should we use ETags for cache validation?
   - Or rely on timestamps + version numbers?

---

**Next Steps**: 
- [ ] Share this doc with backend team
- [ ] Discuss Phase 1 implementation (quick win)
- [ ] Plan Phase 2 (sync endpoint) in next sprint
- [ ] Schedule architecture review meeting
