# Offline-First POS Implementation Plan

## Document Info
- **Version:** 1.0
- **Created:** December 2, 2025
- **Status:** Planning Phase
- **Author:** Development Team

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Phases](#implementation-phases)
5. [Backend Changes](#backend-changes)
6. [Frontend (React + Electron) Structure](#frontend-react--electron-structure)
7. [Data Sync Strategy](#data-sync-strategy)
8. [Risk Assessment](#risk-assessment)
9. [Timeline Estimate](#timeline-estimate)
10. [Success Metrics](#success-metrics)
11. [Appendix](#appendix)

---

## Executive Summary

### Goal
Build an Electron + React desktop application that allows POS operations to continue seamlessly during network outages, with automatic synchronization when connectivity is restored.

### Key Benefits
- ✅ **Business Continuity:** Sales never stop due to internet issues
- ✅ **Performance:** Instant UI response (no network latency)
- ✅ **Reliability:** Local data backup prevents data loss
- ✅ **Silent Printing:** Native Electron print API integration

### Scope
| In Scope | Out of Scope |
|----------|--------------|
| Sales creation offline | Multi-device real-time sync |
| Product catalog caching | Cloud backup |
| Customer management | Advanced reporting offline |
| Basic inventory tracking | Image sync (use cached) |
| Due collection | Admin settings changes |
| Receipt printing | User management offline |

---

## Current State Analysis

### Existing API Coverage

| Module | API Status | Offline Priority |
|--------|------------|------------------|
| Authentication | ✅ Complete | 🔴 Critical (token caching) |
| Products | ✅ Complete | 🔴 Critical |
| Categories | ✅ Complete | 🟡 High |
| Brands | ✅ Complete | 🟡 High |
| Units | ✅ Complete | 🟡 High |
| Sales | ✅ Complete | 🔴 Critical |
| Purchases | ✅ Complete | 🟢 Medium |
| Parties (Customers) | ✅ Complete | 🔴 Critical |
| Stock | ✅ Complete | 🔴 Critical |
| Returns | ✅ Partial | 🟢 Medium |
| Dashboard | ✅ Complete | 🟢 Low (online only) |
| Settings | ⚠️ Partial | 🟡 High (read-only cache) |
| VAT/Tax | ✅ Complete | 🔴 Critical |
| Payment Types | ✅ Complete | 🔴 Critical |

### Missing Backend Features for Offline Support

| Feature | Status | Priority |
|---------|--------|----------|
| Idempotency Keys | ❌ Not Implemented | 🔴 P0 |
| Entity Versioning | ❌ Not Implemented | 🔴 P0 |
| Server Timestamp Header | ❌ Not Implemented | 🔴 P0 |
| Batch Sync Endpoint | ❌ Not Implemented | 🟡 P1 |
| Incremental Sync | ❌ Not Implemented | 🟡 P1 |
| Soft Deletes | ⚠️ Partial (some models) | 🟡 P1 |

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ELECTRON APPLICATION                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   React UI      │  │  Sync Engine    │  │  Print Service  │ │
│  │   Components    │  │                 │  │  (Native)       │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │          │
│  ┌────────▼────────────────────▼────────────────────▼────────┐ │
│  │                    IPC Bridge (preload.js)                 │ │
│  └────────────────────────────┬──────────────────────────────┘ │
│                               │                                 │
│  ┌────────────────────────────▼──────────────────────────────┐ │
│  │                    Main Process                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │ SQLite DB    │  │ HTTP Client  │  │ Native Printing  │ │ │
│  │  │ (better-sql) │  │ (axios)      │  │ (electron print) │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS (when online)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LARAVEL BACKEND                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  API Routes     │  │  Sync Service   │  │  Idempotency    │ │
│  │  /api/v1/*      │  │  (new)          │  │  Middleware     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                               │                                 │
│  ┌────────────────────────────▼──────────────────────────────┐ │
│  │                    MySQL Database                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow - Offline Sale

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  React   │────▶│  SQLite  │────▶│  Queue   │
│  Action  │     │  Store   │     │  (local) │     │  (sync)  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                      When Online                        │
                           ┌─────────────────────────────┘
                           ▼
                    ┌──────────┐     ┌──────────┐
                    │  Sync    │────▶│  Laravel │
                    │  Engine  │     │  API     │
                    └──────────┘     └──────────┘
```

---

## Implementation Phases

### Phase 0: Backend Preparation (Week 1-2)

**Objective:** Prepare Laravel backend for offline-first client

#### Tasks:

| Task | Description | Effort |
|------|-------------|--------|
| 0.1 | Add `version` column to all sync entities | 2 hours |
| 0.2 | Add `deleted_at` soft delete support | 2 hours |
| 0.3 | Create Idempotency Middleware | 4 hours |
| 0.4 | Add Server Timestamp to responses | 1 hour |
| 0.5 | Create `/sync/batch` endpoint | 8 hours |
| 0.6 | Create `/sync/changes` endpoint | 8 hours |
| 0.7 | Update existing APIs with version support | 4 hours |
| 0.8 | Add conflict detection (409 responses) | 4 hours |
| 0.9 | Write API tests for sync endpoints | 4 hours |

**Deliverables:**
- [ ] Migration files for schema changes
- [ ] `IdempotencyMiddleware.php`
- [ ] `SyncController.php`
- [ ] Updated API responses with `version` field
- [ ] Postman collection for sync endpoints

#### 0.1 Database Migrations

```php
// migrations/add_sync_support_to_products.php
Schema::table('products', function (Blueprint $table) {
    $table->integer('version')->default(1)->after('updated_at');
    $table->softDeletes();
});

// Similar for: parties, categories, brands, units, vats, payment_types
```

#### 0.3 Idempotency Middleware

```php
// app/Http/Middleware/IdempotencyMiddleware.php

class IdempotencyMiddleware
{
    public function handle($request, Closure $next)
    {
        $key = $request->header('X-Idempotency-Key');
        
        if (!$key) {
            return $next($request);
        }
        
        // Check Redis for existing key
        $cached = Cache::get("idempotency:{$key}");
        
        if ($cached) {
            return response()->json([
                'status' => 'duplicate',
                'message' => 'Request already processed',
                'data' => $cached['data']
            ], $cached['status_code']);
        }
        
        $response = $next($request);
        
        // Cache successful response
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            Cache::put("idempotency:{$key}", [
                'data' => $response->getData(),
                'status_code' => $response->getStatusCode()
            ], now()->addHours(24));
        }
        
        return $response;
    }
}
```

#### 0.5 Batch Sync Endpoint

```php
// Modules/Business/app/Http/Controllers/Api/SyncController.php

class SyncController extends Controller
{
    public function batch(Request $request)
    {
        $request->validate([
            'operations' => 'required|array|max:100',
            'client_timestamp' => 'required|date',
        ]);
        
        $results = [];
        
        foreach ($request->operations as $operation) {
            $idempotencyKey = $operation['idempotency_key'];
            
            // Check if already processed
            if (Cache::has("idempotency:{$idempotencyKey}")) {
                $cached = Cache::get("idempotency:{$idempotencyKey}");
                $results[] = array_merge(
                    ['idempotency_key' => $idempotencyKey],
                    $cached['data']
                );
                continue;
            }
            
            try {
                $result = $this->processOperation($operation);
                
                // Cache result
                Cache::put("idempotency:{$idempotencyKey}", [
                    'data' => $result,
                    'status_code' => 201
                ], now()->addHours(24));
                
                $results[] = array_merge(
                    ['idempotency_key' => $idempotencyKey],
                    $result
                );
            } catch (\Exception $e) {
                $results[] = [
                    'idempotency_key' => $idempotencyKey,
                    'status' => 'error',
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return response()->json([
            'results' => $results,
            'server_timestamp' => now()->toIso8601String(),
            'success_count' => collect($results)->where('status', 'created')->count(),
            'error_count' => collect($results)->where('status', 'error')->count(),
        ]);
    }
    
    private function processOperation($operation)
    {
        $entity = $operation['entity'];
        $action = $operation['action'];
        $data = $operation['data'];
        
        switch ($entity) {
            case 'sale':
                return $this->createSale($data);
            case 'party':
                return $this->createParty($data);
            case 'due_collection':
                return $this->collectDue($data);
            default:
                throw new \Exception("Unknown entity: {$entity}");
        }
    }
    
    private function createSale($data)
    {
        $sale = Sale::create($data + [
            'user_id' => auth()->id(),
            'business_id' => auth()->user()->business_id,
            'version' => 1,
        ]);
        
        return [
            'status' => 'created',
            'id' => $sale->id,
            'invoice_number' => $sale->invoiceNumber,
            'version' => $sale->version,
        ];
    }
}
```

#### 0.6 Incremental Sync Endpoint

```php
// GET /api/v1/sync/changes?since=2025-12-01T00:00:00Z&entities=products,parties

public function changes(Request $request)
{
    $request->validate([
        'since' => 'required|date',
        'entities' => 'nullable|string', // comma-separated
    ]);
    
    $since = Carbon::parse($request->since);
    $requestedEntities = $request->entities 
        ? explode(',', $request->entities)
        : ['products', 'categories', 'parties', 'vats', 'payment_types'];
    
    $changes = [];
    
    foreach ($requestedEntities as $entity) {
        $changes[$entity] = [
            'created' => $this->getCreatedRecords($entity, $since),
            'updated' => $this->getUpdatedRecords($entity, $since),
            'deleted' => $this->getDeletedIds($entity, $since),
        ];
    }
    
    return response()->json([
        'data' => $changes,
        'sync_token' => base64_encode(json_encode(['last_sync' => now()->toIso8601String()])),
        'server_timestamp' => now()->toIso8601String(),
        'has_more' => false,
    ]);
}

private function getCreatedRecords($entity, $since)
{
    $query = match($entity) {
        'products' => Product::where('business_id', auth()->user()->business_id),
        'parties' => Party::where('business_id', auth()->user()->business_id),
        'categories' => Category::where('business_id', auth()->user()->business_id),
        'vats' => Vat::where('business_id', auth()->user()->business_id),
        'payment_types' => PaymentType::where('business_id', auth()->user()->business_id),
    };
    
    return $query
        ->where('created_at', '>=', $since)
        ->get()
        ->toArray();
}
```

---

### Phase 1: Electron + React Scaffold (Week 2-3)

**Objective:** Set up project structure and core infrastructure

#### Project Structure:

```
horix-pos-electron/
├── electron/
│   ├── main.js              # Main process
│   ├── preload.js           # IPC bridge
│   ├── database/
│   │   ├── schema.sql       # SQLite schema
│   │   ├── migrations/      # DB migrations
│   │   └── db.js            # Database wrapper
│   ├── services/
│   │   ├── sync.js          # Sync engine
│   │   ├── print.js         # Print service
│   │   └── api.js           # HTTP client
│   └── utils/
│       └── logger.js
├── src/
│   ├── components/
│   │   ├── common/          # Shared components
│   │   ├── pos/             # POS screen
│   │   ├── products/        # Product management
│   │   ├── customers/       # Customer management
│   │   └── reports/         # Reports
│   ├── hooks/
│   │   ├── useOnlineStatus.js
│   │   ├── useSync.js
│   │   └── useDatabase.js
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.js
│   │   │   ├── cartSlice.js
│   │   │   ├── productsSlice.js
│   │   │   └── syncSlice.js
│   │   └── store.js
│   ├── services/
│   │   ├── api.js           # API service
│   │   ├── database.js      # IndexedDB/SQLite bridge
│   │   └── sync.js          # Sync logic
│   ├── utils/
│   │   ├── idempotency.js
│   │   └── conflictResolver.js
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
├── electron-builder.json
└── README.md
```

#### Tasks:

| Task | Description | Effort |
|------|-------------|--------|
| 1.1 | Initialize Electron + Vite + React project | 2 hours |
| 1.2 | Configure electron-builder for Windows | 2 hours |
| 1.3 | Set up SQLite with better-sqlite3 | 4 hours |
| 1.4 | Create database schema matching Laravel | 4 hours |
| 1.5 | Implement IPC bridge (preload.js) | 4 hours |
| 1.6 | Set up Redux Toolkit store | 2 hours |
| 1.7 | Create API service with axios | 2 hours |
| 1.8 | Implement online/offline detection | 2 hours |
| 1.9 | Create basic app shell (layout, routing) | 4 hours |

**Deliverables:**
- [ ] Working Electron app shell
- [ ] SQLite database initialized
- [ ] Redux store configured
- [ ] IPC communication working

---

### Phase 2: Authentication & Initial Sync (Week 3-4)

**Objective:** User can login and download initial data

#### Tasks:

| Task | Description | Effort |
|------|-------------|--------|
| 2.1 | Create Login screen | 4 hours |
| 2.2 | Implement token storage (secure) | 2 hours |
| 2.3 | Token refresh mechanism | 2 hours |
| 2.4 | Initial data sync on login | 8 hours |
| 2.5 | Progress indicator for sync | 2 hours |
| 2.6 | Cache products locally | 4 hours |
| 2.7 | Cache categories/brands/units | 2 hours |
| 2.8 | Cache customers | 2 hours |
| 2.9 | Cache settings (VAT, payment types) | 2 hours |
| 2.10 | Offline login (cached credentials) | 4 hours |

**Data to Sync on Login:**

```javascript
const INITIAL_SYNC_ENTITIES = [
  { entity: 'products', priority: 1, required: true },
  { entity: 'categories', priority: 1, required: true },
  { entity: 'brands', priority: 2, required: false },
  { entity: 'units', priority: 2, required: false },
  { entity: 'parties', priority: 1, required: true },  // customers
  { entity: 'vats', priority: 1, required: true },
  { entity: 'payment_types', priority: 1, required: true },
  { entity: 'warehouses', priority: 2, required: false },
  { entity: 'settings', priority: 1, required: true },
];
```

**Deliverables:**
- [ ] Login/logout working
- [ ] Full data sync on first login
- [ ] Offline login with cached token
- [ ] Sync progress UI

---

### Phase 3: POS Screen (Week 4-6)

**Objective:** Core POS functionality working offline

#### Tasks:

| Task | Description | Effort |
|------|-------------|--------|
| 3.1 | POS layout (product grid + cart) | 8 hours |
| 3.2 | Product search (local SQLite) | 4 hours |
| 3.3 | Barcode scanner integration | 4 hours |
| 3.4 | Cart management (add/remove/qty) | 4 hours |
| 3.5 | Price calculations (discounts, VAT) | 4 hours |
| 3.6 | Customer selection/quick add | 4 hours |
| 3.7 | Payment modal (cash/card/due) | 4 hours |
| 3.8 | Sale completion (save to SQLite) | 4 hours |
| 3.9 | Generate offline invoice number | 2 hours |
| 3.10 | Receipt preview | 4 hours |
| 3.11 | Silent printing (Electron native) | 4 hours |
| 3.12 | Stock deduction (local) | 2 hours |
| 3.13 | Hold/recall sale | 4 hours |

#### Invoice Number Strategy (Offline):

```javascript
// Offline invoice format: OFF-{DEVICE_ID}-{TIMESTAMP}
// Example: OFF-D001-1733123456789

// On sync, server assigns real invoice number
// Client updates local record with server number
```

**Deliverables:**
- [ ] Fully functional POS screen
- [ ] Works 100% offline
- [ ] Silent printing working
- [ ] Sales queued for sync

---

### Phase 4: Sync Engine (Week 6-7)

**Objective:** Reliable bidirectional sync with conflict resolution

#### Tasks:

| Task | Description | Effort |
|------|-------------|--------|
| 4.1 | Sync queue management | 8 hours |
| 4.2 | Idempotency key generation | 2 hours |
| 4.3 | Background sync worker | 8 hours |
| 4.4 | Retry logic with backoff | 4 hours |
| 4.5 | Conflict detection | 4 hours |
| 4.6 | Conflict resolution UI | 8 hours |
| 4.7 | Incremental sync (pull changes) | 8 hours |
| 4.8 | Sync status indicator | 2 hours |
| 4.9 | Manual sync trigger | 1 hour |
| 4.10 | Sync error handling/logging | 4 hours |

#### Sync Queue Schema:

```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,        -- 'sale', 'customer', etc.
  action TEXT NOT NULL,             -- 'create', 'update', 'delete'
  payload TEXT NOT NULL,            -- JSON data
  local_id INTEGER,                 -- Local record ID
  server_id INTEGER,                -- Server ID (after sync)
  status TEXT DEFAULT 'pending',    -- pending, syncing, synced, failed, conflict
  attempts INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  synced_at TEXT
);
```

#### Sync State Machine:

```
┌─────────┐    Queue     ┌─────────┐    API Call    ┌─────────┐
│ PENDING │─────────────▶│ SYNCING │───────────────▶│ SYNCED  │
└─────────┘              └─────────┘                └─────────┘
                              │                          
                              │ Error                    
                              ▼                          
                         ┌─────────┐    Manual     ┌──────────┐
                         │ FAILED  │──────────────▶│ CONFLICT │
                         └─────────┘   Review      └──────────┘
                              │                          │
                              │ Retry (max 5)            │ Resolve
                              ▼                          ▼
                         ┌─────────┐              ┌─────────┐
                         │ SYNCING │              │ PENDING │
                         └─────────┘              └─────────┘
```

**Deliverables:**
- [ ] Automatic background sync
- [ ] Retry with exponential backoff
- [ ] Conflict detection and resolution
- [ ] Sync status visible in UI

---

### Phase 5: Product & Customer Management (Week 7-8)

**Objective:** Basic CRUD for products and customers

#### Tasks:

| Task | Description | Effort |
|------|-------------|--------|
| 5.1 | Product list with search/filter | 4 hours |
| 5.2 | Product detail view | 2 hours |
| 5.3 | Stock level display | 2 hours |
| 5.4 | Customer list | 4 hours |
| 5.5 | Customer detail/history | 4 hours |
| 5.6 | Quick customer add | 2 hours |
| 5.7 | Customer due balance | 2 hours |
| 5.8 | Due collection (offline) | 4 hours |

**Deliverables:**
- [ ] Product browsing
- [ ] Customer management
- [ ] Due collection working offline

---

### Phase 6: Reports & Dashboard (Week 8-9)

**Objective:** Basic reporting from local data

#### Tasks:

| Task | Description | Effort |
|------|-------------|--------|
| 6.1 | Today's sales summary | 4 hours |
| 6.2 | Sales history list | 4 hours |
| 6.3 | Sale detail view | 2 hours |
| 6.4 | Reprint receipt | 2 hours |
| 6.5 | Daily summary report | 4 hours |
| 6.6 | Low stock alerts | 2 hours |
| 6.7 | Sync status dashboard | 2 hours |

**Deliverables:**
- [ ] Dashboard with today's stats
- [ ] Sales history accessible
- [ ] Basic reporting

---

### Phase 7: Polish & Testing (Week 9-10)

**Objective:** Production-ready application

#### Tasks:

| Task | Description | Effort |
|------|-------------|--------|
| 7.1 | Error boundary implementation | 2 hours |
| 7.2 | Keyboard shortcuts | 4 hours |
| 7.3 | Loading states | 2 hours |
| 7.4 | Empty states | 2 hours |
| 7.5 | Notification system | 4 hours |
| 7.6 | App settings (printer, etc.) | 4 hours |
| 7.7 | Auto-updater setup | 4 hours |
| 7.8 | Windows installer configuration | 4 hours |
| 7.9 | Integration testing | 8 hours |
| 7.10 | Offline scenario testing | 8 hours |
| 7.11 | Performance optimization | 8 hours |
| 7.12 | Documentation | 8 hours |

**Deliverables:**
- [ ] Polished UI/UX
- [ ] Keyboard-driven workflow
- [ ] Auto-update working
- [ ] Windows installer (.exe)

---

## Backend Changes

### Database Migrations Required

```php
// Migration: add_sync_columns_to_tables.php

Schema::table('products', function (Blueprint $table) {
    $table->integer('version')->default(1);
    $table->softDeletes();
});

Schema::table('parties', function (Blueprint $table) {
    $table->integer('version')->default(1);
    $table->softDeletes();
});

Schema::table('categories', function (Blueprint $table) {
    $table->integer('version')->default(1);
    $table->softDeletes();
});

Schema::table('brands', function (Blueprint $table) {
    $table->integer('version')->default(1);
    $table->softDeletes();
});

Schema::table('units', function (Blueprint $table) {
    $table->integer('version')->default(1);
    $table->softDeletes();
});

Schema::table('sales', function (Blueprint $table) {
    $table->integer('version')->default(1);
    $table->string('client_reference')->nullable()->unique();
    $table->string('offline_invoice_no')->nullable();
});

Schema::table('vats', function (Blueprint $table) {
    $table->integer('version')->default(1);
});

Schema::table('payment_types', function (Blueprint $table) {
    $table->integer('version')->default(1);
});

// Idempotency key storage (use Redis in production)
Schema::create('idempotency_keys', function (Blueprint $table) {
    $table->string('key')->primary();
    $table->longText('response_body');
    $table->integer('status_code');
    $table->timestamp('created_at')->useCurrent();
    $table->timestamp('expires_at');
    $table->index('expires_at');
});

// Sync tracking
Schema::create('sync_logs', function (Blueprint $table) {
    $table->id();
    $table->string('client_id');
    $table->string('entity_type');
    $table->string('operation');
    $table->integer('entity_id')->nullable();
    $table->string('idempotency_key')->nullable();
    $table->string('status');
    $table->timestamp('created_at')->useCurrent();
});
```

### New Middleware

```php
// app/Http/Middleware/IdempotencyMiddleware.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Cache;

class IdempotencyMiddleware
{
    public function handle($request, Closure $next)
    {
        $key = $request->header('X-Idempotency-Key');
        
        if (!$key) {
            return $next($request);
        }
        
        // Check Redis for existing key
        $cached = Cache::get("idempotency:{$key}");
        
        if ($cached) {
            return response()->json([
                'status' => 'duplicate',
                'message' => 'Request already processed',
                'data' => $cached['data']
            ], $cached['status_code']);
        }
        
        $response = $next($request);
        
        // Cache successful response
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            Cache::put("idempotency:{$key}", [
                'data' => $response->getData(),
                'status_code' => $response->getStatusCode()
            ], now()->addHours(24));
        }
        
        return $response;
    }
}
```

### New Controllers

```php
// Modules/Business/app/Http/Controllers/Api/SyncController.php

namespace Modules\Business\app\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class SyncController extends Controller
{
    /**
     * GET /api/v1/sync/changes?since=2025-12-01T00:00:00Z
     * Get all changes since last sync
     */
    public function changes(Request $request)
    {
        // Implementation here
    }
    
    /**
     * POST /api/v1/sync/batch
     * Process multiple offline operations
     */
    public function batch(Request $request)
    {
        // Implementation here
    }
    
    /**
     * GET /api/v1/sync/health
     * Check sync service health
     */
    public function health()
    {
        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
```

### Register Middleware

In `app/Http/Kernel.php`:

```php
protected $routeMiddleware = [
    // ... other middleware
    'idempotency' => \App\Http\Middleware\IdempotencyMiddleware::class,
];
```

Apply to routes in `routes/api.php`:

```php
Route::middleware(['auth:sanctum', 'idempotency'])->group(function () {
    Route::post('/sales', [AcnooSaleController::class, 'store']);
    Route::put('/sales/{id}', [AcnooSaleController::class, 'update']);
    // ... other write endpoints
});
```

---

## Frontend (React + Electron) Structure

### Technology Stack

| Category | Technology | Reason |
|----------|------------|--------|
| Framework | Electron 28+ | Desktop app, native features |
| UI Library | React 18 | Component-based, ecosystem |
| Build Tool | Vite | Fast builds |
| State | Redux Toolkit | Predictable state, middleware |
| Local DB | better-sqlite3 | Sync SQLite, fast |
| HTTP | Axios | Interceptors, retry |
| UI Components | Tailwind CSS + Headless UI | Fast development |
| Forms | React Hook Form | Performance |
| Tables | TanStack Table | Feature-rich |
| Icons | Lucide React | Consistent |

### Key React Components

```
src/components/
├── pos/
│   ├── POSScreen.jsx          # Main POS layout
│   ├── ProductGrid.jsx        # Product display grid
│   ├── ProductCard.jsx        # Single product card
│   ├── ProductSearch.jsx      # Search input with results
│   ├── Cart.jsx               # Shopping cart
│   ├── CartItem.jsx           # Single cart item
│   ├── CartSummary.jsx        # Totals, discounts
│   ├── PaymentModal.jsx       # Payment processing
│   ├── CustomerSelect.jsx     # Customer dropdown
│   ├── QuickCustomerAdd.jsx   # Add customer inline
│   └── ReceiptPreview.jsx     # Print preview
├── sync/
│   ├── SyncStatusBadge.jsx    # Online/offline indicator
│   ├── SyncProgress.jsx       # Sync progress bar
│   ├── SyncQueue.jsx          # Pending sync items
│   └── ConflictResolver.jsx   # Conflict resolution UI
├── products/
│   ├── ProductList.jsx
│   ├── ProductDetail.jsx
│   └── StockIndicator.jsx
├── customers/
│   ├── CustomerList.jsx
│   ├── CustomerDetail.jsx
│   ├── CustomerHistory.jsx
│   └── DueCollection.jsx
└── common/
    ├── Layout.jsx
    ├── Sidebar.jsx
    ├── Header.jsx
    ├── Modal.jsx
    ├── Button.jsx
    ├── Input.jsx
    ├── Table.jsx
    └── LoadingSpinner.jsx
```

### SQLite Schema (Client)

```sql
-- Core entities (synced from server)
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  server_id INTEGER,
  product_name TEXT NOT NULL,
  product_code TEXT UNIQUE,
  category_id INTEGER,
  brand_id INTEGER,
  unit_id INTEGER,
  purchase_price REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  wholesale_price REAL DEFAULT 0,
  stock_quantity REAL DEFAULT 0,
  image_path TEXT,
  version INTEGER DEFAULT 1,
  synced_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  server_id INTEGER,
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  synced_at TEXT
);

CREATE TABLE parties (
  id INTEGER PRIMARY KEY,
  server_id INTEGER,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  type TEXT DEFAULT 'customer',
  balance REAL DEFAULT 0,
  version INTEGER DEFAULT 1,
  synced_at TEXT
);

-- Local-first entities (synced to server)
CREATE TABLE sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER,
  invoice_no TEXT,
  offline_invoice_no TEXT,
  party_id INTEGER,
  subtotal REAL,
  discount REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  total_amount REAL,
  paid_amount REAL,
  due_amount REAL,
  payment_type_id INTEGER,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  version INTEGER DEFAULT 1,
  sync_status TEXT DEFAULT 'pending',
  idempotency_key TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  synced_at TEXT
);

CREATE TABLE sale_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER,
  product_id INTEGER,
  quantity REAL,
  unit_price REAL,
  discount REAL DEFAULT 0,
  total REAL,
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

-- Sync management
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,
  action TEXT NOT NULL,
  local_id INTEGER,
  payload TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT,
  last_sync_at TEXT,
  record_count INTEGER,
  sync_token TEXT
);

-- Settings cache
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  synced_at TEXT
);

-- Indexes for performance
CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_sales_invoice ON sales(invoice_no);
CREATE INDEX idx_sales_status ON sales(sync_status);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
```

---

## Data Sync Strategy

### Sync Priority Order

```javascript
const SYNC_ORDER = {
  // Download first (dependencies)
  download: [
    'settings',
    'categories',
    'brands', 
    'units',
    'vats',
    'payment_types',
    'warehouses',
    'products',
    'parties',
  ],
  
  // Upload (created offline)
  upload: [
    'parties',      // New customers created during sale
    'sales',        // Main offline data
    'due_collections',
  ]
};
```

### Conflict Resolution Rules

| Entity | Conflict Strategy |
|--------|-------------------|
| Products | Server wins (admin controls catalog) |
| Categories | Server wins |
| Parties/Customers | Merge (keep both, flag for review) |
| Sales | Client wins (offline sale is truth) |
| Stock | Recalculate after sync |
| Settings | Server wins |

### Sync Frequency

| Trigger | Action |
|---------|--------|
| App start | Full sync if >1 hour since last |
| Every 5 minutes (online) | Incremental sync |
| Network reconnect | Immediate sync |
| Sale completed | Queue for sync, attempt immediately |
| Manual trigger | Full sync |

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during sync | High | Low | Local backup, transaction logs |
| Stock discrepancy | Medium | Medium | Reconciliation on sync |
| Duplicate sales | High | Medium | Idempotency keys |
| Clock drift issues | Medium | Low | Server timestamp comparison |
| Large initial sync | Low | High | Progress UI, chunked download |
| Conflict overwhelm | Medium | Low | Auto-resolution rules |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Staff training | Medium | Familiar UI, documentation |
| Internet dependency for initial setup | Low | Clear onboarding flow |
| Data consistency concerns | Medium | Sync status visible, audit trail |

---

## Timeline Estimate

### Summary (10 Weeks)

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Backend Prep | Week 1-2 | None |
| Phase 1: Scaffold | Week 2-3 | None |
| Phase 2: Auth & Sync | Week 3-4 | Phase 0, 1 |
| Phase 3: POS Screen | Week 4-6 | Phase 2 |
| Phase 4: Sync Engine | Week 6-7 | Phase 3 |
| Phase 5: Product/Customer | Week 7-8 | Phase 4 |
| Phase 6: Reports | Week 8-9 | Phase 5 |
| Phase 7: Polish | Week 9-10 | Phase 6 |

### Gantt Chart (Simplified)

```
Week:     1    2    3    4    5    6    7    8    9    10
          ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
Backend:  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Scaffold: ░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Auth:     ░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░
POS:      ░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░░░░░░
Sync:     ░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░
CRUD:     ░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░
Reports:  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░
Polish:   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████
```

---

## Success Metrics

### Technical Metrics

| Metric | Target |
|--------|--------|
| Offline sale success rate | 100% |
| Sync success rate | >99% |
| Sync latency (single sale) | <2 seconds |
| App startup time | <3 seconds |
| POS screen response | <100ms |
| Data conflicts requiring manual resolution | <1% |

### Business Metrics

| Metric | Target |
|--------|--------|
| Sales during outages | 0% loss |
| Staff training time | <1 hour |
| Receipt print time | <1 second |
| Customer wait time | Unchanged or better |

---

## Appendix

### A. Technology Alternatives Considered

| Choice | Selected | Alternative | Reason |
|--------|----------|-------------|--------|
| Database | SQLite | IndexedDB | Sync performance, SQL familiarity |
| State | Redux Toolkit | Zustand | Middleware for sync, DevTools |
| UI | Tailwind | Material UI | Speed, smaller bundle |
| Electron | Electron | Tauri | Mature ecosystem, Windows support |

### B. References

- [Electron Documentation](https://www.electronjs.org/docs)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Offline First Patterns](https://offlinefirst.org/)

### C. Next Steps (Post-Planning)

1. **Review & Approval** - Stakeholder sign-off on plan
2. **Resource Allocation** - Assign team members
3. **Infrastructure Setup** - Dev environment configuration
4. **Phase 0 Start** - Begin backend preparation
5. **Version Control** - Initialize Electron repo
6. **Sprint Planning** - Create detailed tickets

---

*Document Version: 1.0 | Last Updated: December 2, 2025*

---

## Additional Recommendations (Added by AI Assistant)

### D. Missing Backend Considerations

#### 1. Stock Reservation During Offline Sales

**Problem:** When offline, multiple sales may consume more stock than available.

**Solution - Optimistic Deduction with Reconciliation:**

```php
// When syncing offline sales, handle stock conflicts
public function syncSale($offlineSale)
{
    DB::transaction(function () use ($offlineSale) {
        foreach ($offlineSale['products'] as $item) {
            $stock = Stock::lockForUpdate()->find($item['stock_id']);
            
            if ($stock->quantity < $item['quantity']) {
                // Log discrepancy, but still accept sale (already happened)
                StockDiscrepancyLog::create([
                    'stock_id' => $stock->id,
                    'expected' => $item['quantity'],
                    'available' => $stock->quantity,
                    'sale_id' => $offlineSale['id'],
                    'resolved' => false,
                ]);
                
                // Deduct what's available, allow negative (backorder scenario)
                $stock->decrement('quantity', $item['quantity']);
            } else {
                $stock->decrement('quantity', $item['quantity']);
            }
        }
    });
}
```

**Frontend Handling:**
```javascript
// Client should track local stock shadow
// Warn cashier when stock might be low
if (localStock - cartQty <= LOW_STOCK_THRESHOLD) {
  showWarning(`Stock may be limited. Last synced: ${lastSyncTime}`);
}
```

#### 2. Rate Limiting for Sync Endpoints

```php
// Prevent sync abuse
Route::middleware(['throttle:sync'])->group(function () {
    Route::get('/sync/changes', [SyncController::class, 'changes']);
    Route::post('/sync/batch', [SyncController::class, 'batch']);
});

// In RouteServiceProvider
RateLimiter::for('sync', function (Request $request) {
    return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
});
```

#### 3. Webhook/Realtime for Multi-Device (Future)

For future multi-device support, consider:

```php
// Broadcast sync events for other devices
event(new SaleCreatedEvent($sale)); // Laravel Echo

// Or implement polling endpoint
GET /sync/poll?since={timestamp}&device_id={id}
```

#### 4. Audit Trail for Offline Actions

```sql
CREATE TABLE offline_audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    business_id INT NOT NULL,
    user_id INT NOT NULL,
    device_id VARCHAR(50),
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id INT,
    offline_timestamp DATETIME,
    server_timestamp DATETIME,
    ip_address VARCHAR(45),
    payload JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### E. Additional Frontend Considerations

#### 1. Device Registration

```javascript
// Each Electron install should register with server
const deviceId = await generateDeviceFingerprint();

POST /api/v1/devices/register
{
    "device_id": "D-ABC123",
    "device_name": "Cashier PC 1",
    "os": "Windows 11",
    "app_version": "1.0.0"
}

// Use device_id in sync requests for tracking
X-Device-ID: D-ABC123
```

#### 2. Offline Data Limit Warning

```javascript
// Warn when too much offline data accumulates
const MAX_OFFLINE_SALES = 100;
const MAX_OFFLINE_AGE_HOURS = 24;

async function checkOfflineDataHealth() {
    const pendingCount = await syncQueue.count();
    const oldestPending = await syncQueue.getOldest();
    
    if (pendingCount > MAX_OFFLINE_SALES) {
        showCriticalWarning(`${pendingCount} sales pending sync. Please connect to internet.`);
    }
    
    if (oldestPending && hoursSince(oldestPending.createdAt) > MAX_OFFLINE_AGE_HOURS) {
        showCriticalWarning('Some offline data is over 24 hours old. Sync immediately when online.');
    }
}
```

#### 3. Graceful Degradation Matrix

| Feature | Online | Offline | Degraded Notes |
|---------|--------|---------|----------------|
| Create Sale | ✅ Full | ✅ Full | None |
| View Products | ✅ Full | ✅ Cached | Images may be stale |
| Add Customer | ✅ Full | ✅ Queue | May duplicate if exists on server |
| Edit Product | ✅ Full | ❌ Disabled | Admin function |
| Returns | ✅ Full | ⚠️ Limited | Only for local sales |
| Reports | ✅ Full | ⚠️ Local only | Historical data limited |
| Settings | ✅ Full | ❌ Read-only | Cached values |
| User Switch | ✅ Full | ⚠️ Cached users | No new user login |

#### 4. Conflict Resolution UI Flow

```
┌─────────────────────────────────────────────────────────┐
│           ⚠️ SYNC CONFLICT DETECTED                     │
│                                                          │
│  Customer "John Doe" was modified on another device     │
│                                                          │
│  ┌─────────────────────┬─────────────────────┐          │
│  │    Your Version     │   Server Version    │          │
│  ├─────────────────────┼─────────────────────┤          │
│  │ Phone: 555-1234     │ Phone: 555-9999     │  ← Diff  │
│  │ Balance: $150       │ Balance: $200       │  ← Diff  │
│  │ Address: 123 Main   │ Address: 123 Main   │          │
│  └─────────────────────┴─────────────────────┘          │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ [Keep Mine] [Keep Server] [Merge] [Skip for Now]│    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### F. Security Considerations

#### 1. Offline Token Security

```javascript
// Store auth token securely in Electron
const { safeStorage } = require('electron');

// Encrypt token at rest
const encryptedToken = safeStorage.encryptString(token);
await fs.writeFile(tokenPath, encryptedToken);

// Decrypt when needed
const decrypted = safeStorage.decryptString(encryptedToken);
```

#### 2. Local Database Encryption

```javascript
// Use SQLCipher for encrypted SQLite
const Database = require('better-sqlite3-sqlcipher');
const db = new Database('pos.db', { cipher: true });
db.pragma(`key = '${process.env.DB_ENCRYPTION_KEY}'`);
```

#### 3. Offline Token Expiry

```javascript
// Token should have offline grace period
const tokenPayload = {
    expires_at: '2025-12-10T00:00:00Z',
    offline_grace_hours: 72,  // Can work offline 72h after expiry
};

// Check if still valid for offline use
function isTokenValidOffline(token) {
    const expiry = new Date(token.expires_at);
    const graceEnd = new Date(expiry.getTime() + token.offline_grace_hours * 3600000);
    return new Date() < graceEnd;
}
```

### G. Testing Checklist Addition

```markdown
## Offline Testing Scenarios

### Network Simulation
- [ ] Disconnect ethernet during sale - sale completes
- [ ] Reconnect - auto sync triggers
- [ ] Airplane mode for 24 hours - app functions
- [ ] Slow network (throttle to 2G) - graceful handling
- [ ] Network timeout mid-sync - retries correctly

### Data Integrity
- [ ] 50 offline sales sync correctly
- [ ] No duplicate invoice numbers after sync
- [ ] Stock levels reconcile correctly
- [ ] Customer balances accurate post-sync
- [ ] Timestamps preserved correctly

### Edge Cases
- [ ] Create sale, app crash, restart - sale preserved
- [ ] Create 100 sales offline - all sync
- [ ] Conflict: same customer edited online and offline
- [ ] Clock set 1 day in future - handled gracefully
- [ ] Database file corrupted - recovery possible
- [ ] Server rejects sale (validation) - error shown clearly

### Multi-Device (if applicable)
- [ ] Device A offline, Device B online - no conflicts
- [ ] Same product sold on 2 devices offline - stock correct
- [ ] Same customer different devices - merged correctly
```

### H. Monitoring & Alerting (Production)

```php
// Backend: Alert if device hasn't synced in 24 hours
// Run via scheduled command

$staleDevices = DB::table('sync_logs')
    ->select('client_id', DB::raw('MAX(created_at) as last_sync'))
    ->groupBy('client_id')
    ->havingRaw('MAX(created_at) < ?', [now()->subHours(24)])
    ->get();

foreach ($staleDevices as $device) {
    Alert::send("Device {$device->client_id} hasn't synced in 24+ hours");
}
```

### I. Rollback Strategy

If offline implementation causes issues:

1. **Feature Flag:** Disable offline queue, force online-only mode
2. **Data Export:** Export all pending sync data as JSON for manual processing  
3. **Emergency Sync:** Admin endpoint to force-accept all pending items
4. **Fallback UI:** Show "Online Only Mode" with reduced functionality

---

*Additional Recommendations Added: December 2, 2025*
