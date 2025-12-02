# Offline Support Architecture

> Complete documentation of how offline support works in Horix POS Pro

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Storage Layer](#storage-layer)
4. [Sync Queue System](#sync-queue-system)
5. [Data Flow](#data-flow)
6. [Key Components](#key-components)
7. [Backend Sync API Integration](#backend-sync-api-integration)
8. [Conflict Resolution](#conflict-resolution)
9. [File Reference](#file-reference)

---

## Overview

Horix POS Pro implements a **fully offline-first architecture** that allows the application to function without internet connectivity. All critical operations (sales, inventory lookups) work seamlessly offline with automatic synchronization when connectivity is restored.

### Key Features

- ✅ **Offline Sales Creation** - Create sales without internet
- ✅ **Local Data Cache** - Products, categories, parties cached locally
- ✅ **Automatic Sync** - Background synchronization when online
- ✅ **Idempotency Keys** - Prevents duplicate operations on retry
- ✅ **Batch Sync** - Multiple operations uploaded in single request
- ✅ **Conflict Detection** - Version-based optimistic locking
- ✅ **Incremental Sync** - Downloads only changed data

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HORIX POS PRO                                  │
│                         Offline-First Architecture                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               UI LAYER                                       │
│                                                                              │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐              │
│  │   POS Page     │   │  Sales Page    │   │  Products Page │              │
│  │  POSPage.tsx   │   │ SalesPage.tsx  │   │ProductsPage.tsx│              │
│  └───────┬────────┘   └───────┬────────┘   └───────┬────────┘              │
│          │                    │                    │                        │
│          └────────────────────┼────────────────────┘                        │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     useOnlineStatus Hook                             │   │
│  │              src/hooks/useOnlineStatus.ts                            │   │
│  │  • Tracks navigator.onLine + custom health checks                    │   │
│  │  • Triggers onOnline/onOffline callbacks                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    offlineSalesService                               │   │
│  │           src/api/services/offlineSales.service.ts                   │   │
│  │                                                                       │   │
│  │  • Wraps salesService with offline capability                        │   │
│  │  • If online: Try API first, fallback to local                       │   │
│  │  • If offline: Save locally + queue for sync                         │   │
│  │  • Generates offline invoice numbers (OFF-{DEVICE}-{TS})             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Offline Handler                                  │   │
│  │               src/api/offlineHandler.ts                              │   │
│  │                                                                       │   │
│  │  • Axios interceptor for all API requests                            │   │
│  │  • Detects offline + queues mutations automatically                  │   │
│  │  • Handles network errors → queues for retry                         │   │
│  │  • Generates idempotencyKey + offlineTimestamp                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STATE MANAGEMENT                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Sync Store                                    │   │
│  │                src/stores/sync.store.ts                              │   │
│  │                                                                       │   │
│  │  State:                                                               │   │
│  │  • isOnline: boolean          - Current connection status            │   │
│  │  • syncStatus: SyncStatus     - 'idle'|'syncing'|'error'|'offline'   │   │
│  │  • pendingSyncCount: number   - Items waiting to sync                │   │
│  │  • syncProgress: SyncProgress - Upload/download progress             │   │
│  │                                                                       │   │
│  │  Actions:                                                             │   │
│  │  • startQueueSync() → EnhancedSyncService.fullSync()                 │   │
│  │  • startDataSync()  → Download master data                           │   │
│  │  • updatePendingSyncCount()                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYNC SERVICES                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   Enhanced Sync Service                              │   │
│  │          src/lib/db/services/enhancedSync.service.ts                 │   │
│  │                                                                       │   │
│  │  • fullSync() - Upload pending + download changes                    │   │
│  │  • Batch processing (50 items per request)                           │   │
│  │  • Handles conflicts (409 responses)                                 │   │
│  │  • Progress notifications to UI                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Sync API Service                                 │   │
│  │            src/api/services/sync.service.ts                          │   │
│  │                                                                       │   │
│  │  Endpoints:                                                           │   │
│  │  • POST /sync/register   - Register device                           │   │
│  │  • GET  /sync/health     - Health check                              │   │
│  │  • GET  /sync/full       - Full initial sync                         │   │
│  │  • GET  /sync/changes    - Incremental sync (since timestamp)        │   │
│  │  • POST /sync/batch      - Upload batch operations                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   Storage Abstraction                                │   │
│  │                 src/lib/storage/index.ts                             │   │
│  │                                                                       │   │
│  │  Automatically selects:                                               │   │
│  │  • SQLite (better-sqlite3) in Electron - Best performance            │   │
│  │  • IndexedDB (Dexie.js) in browser - Fallback                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│              ┌────────────────┴────────────────┐                            │
│              ▼                                 ▼                            │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                │
│  │     SQLite Adapter      │    │   IndexedDB Adapter     │                │
│  │ src/lib/storage/adapters│    │ src/lib/storage/adapters│                │
│  │   /sqlite.adapter.ts    │    │  /indexeddb.adapter.ts  │                │
│  │                         │    │                         │                │
│  │  SQLite Service         │    │  Dexie.js Database      │                │
│  │  electron/sqlite.service│    │  src/lib/db/schema.ts   │                │
│  │  .ts                    │    │                         │                │
│  └─────────────────────────┘    └─────────────────────────┘                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Repositories                                  │   │
│  │              src/lib/db/repositories/index.ts                        │   │
│  │                                                                       │   │
│  │  • productRepository   - Local product cache                         │   │
│  │  • categoryRepository  - Local category cache                        │   │
│  │  • partyRepository     - Local customer/supplier cache               │   │
│  │  • saleRepository      - Local sales (offline + synced)              │   │
│  │  • syncQueueRepository - Pending sync operations                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API (Laravel)                                │
│                                                                              │
│  POST /sync/batch                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Request:                                                            │   │
│  │  {                                                                    │   │
│  │    "operations": [                                                    │   │
│  │      {                                                                │   │
│  │        "idempotency_key": "sale_create_1701234567890_abc123",        │   │
│  │        "entity": "sale",                                              │   │
│  │        "action": "create",                                            │   │
│  │        "data": { local_id, offline_invoice_no, ... },                │   │
│  │        "offline_timestamp": "2025-12-03T10:00:00Z"                   │   │
│  │      }                                                                │   │
│  │    ],                                                                 │   │
│  │    "device_id": "DEVICE-ABC123",                                      │   │
│  │    "client_timestamp": "2025-12-03T10:00:00Z"                        │   │
│  │  }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Response:                                                           │   │
│  │  {                                                                    │   │
│  │    "success": true,                                                   │   │
│  │    "results": [                                                       │   │
│  │      {                                                                │   │
│  │        "idempotency_key": "sale_create_1701234567890_abc123",        │   │
│  │        "status": "created",                                           │   │
│  │        "server_id": 1234,                                             │   │
│  │        "invoice_number": "INV-001234"                                │   │
│  │      }                                                                │   │
│  │    ],                                                                 │   │
│  │    "server_timestamp": "2025-12-03T10:00:01Z"                        │   │
│  │  }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Storage Layer

### Dual Storage Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                    Storage Selection                          │
│                                                               │
│   Is Electron?  ───────┬──────────────────────────────────►  │
│                        │ Yes                                  │
│                        ▼                                      │
│                 ┌──────────────┐                              │
│                 │   SQLite     │  Best performance            │
│                 │better-sqlite3│  Native SQL queries          │
│                 │              │  File: posmate.db            │
│                 └──────────────┘                              │
│                        │ No (Browser)                         │
│                        ▼                                      │
│                 ┌──────────────┐                              │
│                 │  IndexedDB   │  Browser fallback            │
│                 │   Dexie.js   │  Async transactions          │
│                 │              │  IndexedDB API               │
│                 └──────────────┘                              │
└──────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/storage/index.ts` | Storage factory - selects SQLite or IndexedDB |
| `src/lib/storage/interface.ts` | Repository interfaces |
| `src/lib/storage/adapters/sqlite.adapter.ts` | SQLite implementation |
| `src/lib/storage/adapters/indexeddb.adapter.ts` | IndexedDB implementation |
| `electron/sqlite.service.ts` | SQLite native service (Electron main process) |
| `src/lib/db/schema.ts` | Dexie.js database schema |

---

## Sync Queue System

The sync queue stores all operations created while offline, waiting to be uploaded to the server.

### Sync Queue Item Structure

```typescript
// File: src/lib/db/schema.ts

interface SyncQueueItem {
  id?: number
  
  // Idempotency - prevents duplicate operations
  idempotencyKey: string  // Format: {entity}_{operation}_{timestamp}_{random}
  
  // Operation details
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'sale' | 'purchase' | 'expense' | 'party' | ...
  entityId: string | number
  
  // Version for optimistic locking
  expectedVersion?: number
  
  // Request payload
  data: unknown
  endpoint: string
  method: 'POST' | 'PUT' | 'DELETE'
  
  // Retry logic
  attempts: number        // Current retry count
  maxAttempts: number     // Max retries (default: 5)
  lastAttemptAt?: string
  
  // Timestamps
  createdAt: string
  offlineTimestamp: string  // When created offline
  
  // Status
  status: 'pending' | 'processing' | 'failed' | 'completed' | 'conflict'
  error?: string
  
  // Conflict data
  conflictData?: unknown  // Server data when 409 conflict
  
  // Result
  serverId?: number       // Server ID after sync
}
```

### Sync Queue Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SYNC QUEUE LIFECYCLE                                │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────┐
    │  User Action  │  (Create Sale, Update Customer, etc.)
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐      ┌─────────────────────────────────────────────────┐
    │   Is Online?  │──No─►│  1. Generate idempotencyKey                     │
    └───────┬───────┘      │  2. Save to local storage (SQLite/IndexedDB)    │
            │              │  3. Add to sync queue with status='pending'      │
            │ Yes          │  4. Update UI (show offline indicator)           │
            ▼              └─────────────────────────────────────────────────┘
    ┌───────────────┐                              │
    │   API Call    │                              │
    └───────┬───────┘                              │
            │                                      │
            ▼                                      │
    ┌───────────────┐                              │
    │   Success?    │──No──►───────────────────────┘
    └───────┬───────┘       (Network error → queue)
            │ Yes
            ▼
    ┌───────────────┐
    │  Update Local │
    │    Storage    │
    └───────────────┘


    ┌─────────────────────────────────────────────────────────────────────────┐
    │                     SYNC QUEUE PROCESSING                                │
    │                   (When back online)                                     │
    └─────────────────────────────────────────────────────────────────────────┘

    ┌───────────────┐
    │  App Online   │ (navigator.online event OR user triggers sync)
    └───────┬───────┘
            │
            ▼
    ┌───────────────────────┐
    │  Get pending items    │  syncQueueRepository.getPending()
    │  from sync queue      │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │  Group into batches   │  Max 50 items per batch
    │  (BATCH_SIZE = 50)    │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │  POST /sync/batch     │  Send batch to backend
    │  with all operations  │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │  Process each result  │
    │                       │
    │  ✓ created → mark     │
    │    completed, save    │
    │    server_id          │
    │                       │
    │  ✗ error → mark       │
    │    failed, increment  │
    │    attempts           │
    │                       │
    │  ⚠ conflict → mark    │
    │    conflict, save     │
    │    server data        │
    └───────────────────────┘
```

---

## Data Flow

### Creating an Offline Sale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OFFLINE SALE CREATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Complete Sale" on POS Page
            │
            ▼
┌───────────────────────────────────────┐
│     offlineSalesService.create()      │   src/api/services/offlineSales.service.ts
│                                       │
│  1. Check isOnline from syncStore     │
│  2. If online: Try API first          │
│     - Success → return API response   │
│     - Fail → fall through             │
└───────────────────┬───────────────────┘
                    │ (offline or API failed)
                    ▼
┌───────────────────────────────────────┐
│  Generate Offline Invoice Number      │
│                                       │
│  Format: OFF-{DEVICE_ID}-{TIMESTAMP}  │
│  Example: OFF-ABC123-1701627890       │
│                                       │
│  syncApiService.generateOfflineInvoiceNo()
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Generate Idempotency Key             │
│                                       │
│  Format: sale_create_{TS}_{RANDOM}    │
│  Example: sale_create_1701627890_x7k2m│
│                                       │
│  syncApiService.generateIdempotencyKey()
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Save to Local Storage                │
│                                       │
│  saleRepository.createOffline({       │
│    invoiceNumber: 'OFF-ABC123-...',   │
│    isOffline: true,                   │
│    isSynced: false,                   │
│    ...saleData                        │
│  })                                   │
│                                       │
│  Returns: localId                     │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Add to Sync Queue                    │
│                                       │
│  syncQueueRepository.enqueue({        │
│    idempotencyKey: '...',             │
│    operation: 'CREATE',               │
│    entity: 'sale',                    │
│    entityId: localId,                 │
│    data: {                            │
│      local_id: localId,               │
│      offline_invoice_no: '...',       │
│      products: [...],                 │
│      ...                              │
│    },                                 │
│    status: 'pending',                 │
│    offlineTimestamp: '2025-12-03...'  │
│  })                                   │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Update UI                            │
│                                       │
│  • Show "Sale saved offline" toast    │
│  • Update pending sync count badge    │
│  • Print receipt with offline invoice │
└───────────────────────────────────────┘
```

### Syncing When Back Online

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYNC PROCESS FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

App detects online (navigator.online event)
            │
            ▼
┌───────────────────────────────────────┐
│      syncStore.startQueueSync()       │   src/stores/sync.store.ts
│                                       │
│  Sets syncStatus = 'syncing'          │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│   enhancedSyncService.fullSync()      │   src/lib/db/services/enhancedSync.service.ts
│                                       │
│  Phase 1: Upload pending operations   │
│  Phase 2: Download server changes     │
└───────────────────┬───────────────────┘
                    │
        ┌───────────┴───────────┐
        │     PHASE 1: UPLOAD   │
        └───────────┬───────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Get pending items from queue         │
│                                       │
│  const items = await syncQueueRepo    │
│    .getPending()                      │
│                                       │
│  Group into batches of 50             │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  For each batch:                      │
│                                       │
│  POST /sync/batch                     │
│  {                                    │
│    operations: [...],                 │
│    device_id: 'ABC123',               │
│    client_timestamp: '...'            │
│  }                                    │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Process results:                     │
│                                       │
│  for (result of response.results) {   │
│    if (result.status === 'created') { │
│      // Update local sale with        │
│      // server_id and real invoice    │
│      await saleRepo.markAsSynced(     │
│        result.local_id,               │
│        result.server_id               │
│      )                                │
│      await syncQueueRepo              │
│        .markAsCompleted(queueId)      │
│    }                                  │
│    if (result.status === 'conflict') {│
│      // Store conflict for resolution │
│    }                                  │
│  }                                    │
└───────────────────┬───────────────────┘
                    │
        ┌───────────┴───────────┐
        │    PHASE 2: DOWNLOAD  │
        └───────────┬───────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  GET /sync/changes?since={lastSync}   │
│                                       │
│  Downloads only items changed since   │
│  last sync timestamp                  │
│                                       │
│  Response: {                          │
│    products: { created, updated,      │
│                deleted },             │
│    categories: { ... },               │
│    parties: { ... }                   │
│  }                                    │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Apply changes to local storage:      │
│                                       │
│  • Insert new products                │
│  • Update changed products            │
│  • Delete removed products            │
│  • Update lastSyncTime                │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Complete                             │
│                                       │
│  syncStore.setSyncStatus('idle')      │
│  syncStore.updateLastSyncTime()       │
│  Show "Sync complete" toast           │
└───────────────────────────────────────┘
```

---

## Key Components

### 1. Online Status Detection

**File:** `src/hooks/useOnlineStatus.ts`

```typescript
const { isOnline, isOffline, checkConnection } = useOnlineStatus({
  onOnline: () => {
    // Trigger sync
    syncStore.startQueueSync()
  },
  onOffline: () => {
    toast.warning('You are offline')
  },
})
```

### 2. Offline Handler (Axios Interceptor)

**File:** `src/api/offlineHandler.ts`

Automatically intercepts API requests and:
- Queues mutations when offline
- Queues failed requests on network errors
- Generates idempotency keys

### 3. Sync Store (Zustand)

**File:** `src/stores/sync.store.ts`

Central state for sync status:

```typescript
interface SyncState {
  isOnline: boolean
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline'
  pendingSyncCount: number
  syncProgress: SyncProgress | null
  
  // Actions
  startQueueSync(): Promise<void>
  startDataSync(): Promise<void>
  updatePendingSyncCount(): Promise<void>
}
```

### 4. Enhanced Sync Service

**File:** `src/lib/db/services/enhancedSync.service.ts`

Handles the actual sync process:
- Batch uploads (50 ops per request)
- Incremental downloads
- Conflict detection
- Progress reporting

### 5. Sync API Service

**File:** `src/api/services/sync.service.ts`

API client for backend sync endpoints:
- `registerDevice()` - Register device with backend
- `healthCheck()` - Check backend availability
- `fullSync()` - Initial sync (all data)
- `getChanges(since)` - Incremental sync
- `batchSync(operations)` - Upload batch

---

## Backend Sync API Integration

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/sync/register` | Register device |
| GET | `/sync/health` | Health check |
| GET | `/sync/full` | Full initial sync |
| GET | `/sync/changes?since=` | Incremental sync |
| POST | `/sync/batch` | Batch upload |

### Request Headers

```
X-Device-ID: ABC123-DEF456-...
X-Idempotency-Key: sale_create_1701627890_x7k2m
Content-Type: application/json
Authorization: Bearer {token}
```

### Batch Sync Request

```json
{
  "operations": [
    {
      "idempotency_key": "sale_create_1701627890_x7k2m",
      "entity": "sale",
      "action": "create",
      "data": {
        "local_id": 1,
        "offline_invoice_no": "OFF-ABC123-1701627890",
        "party_id": 5,
        "totalAmount": 1500,
        "products": [
          { "stock_id": 10, "quantities": 2, "price": 750 }
        ]
      },
      "offline_timestamp": "2025-12-03T10:00:00Z"
    }
  ],
  "device_id": "ABC123-DEF456",
  "client_timestamp": "2025-12-03T10:05:00Z"
}
```

### Batch Sync Response

```json
{
  "success": true,
  "results": [
    {
      "idempotency_key": "sale_create_1701627890_x7k2m",
      "status": "created",
      "server_id": 1234,
      "local_id": 1,
      "invoice_number": "INV-001234",
      "version": 1,
      "created_at": "2025-12-03T10:05:01Z"
    }
  ],
  "server_timestamp": "2025-12-03T10:05:01Z"
}
```

---

## Conflict Resolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONFLICT HANDLING                                    │
└─────────────────────────────────────────────────────────────────────────────┘

When backend returns status: 'conflict' (HTTP 409)
            │
            ▼
┌───────────────────────────────────────┐
│  Response contains:                   │
│  {                                    │
│    "status": "conflict",              │
│    "conflict_data": {                 │
│      // Current server data           │
│      "version": 3,                    │
│      "name": "Server Value"           │
│    }                                  │
│  }                                    │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Store conflict in queue item:        │
│                                       │
│  syncQueueRepository.update(id, {     │
│    status: 'conflict',                │
│    conflictData: response.conflict_data│
│  })                                   │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  Resolution options:                  │
│                                       │
│  enhancedSyncService.resolveConflict( │
│    id,                                │
│    'client_wins' | 'server_wins' |    │
│    'discard'                          │
│  )                                    │
│                                       │
│  • client_wins: Retry with force flag │
│  • server_wins: Apply server data     │
│  • discard: Delete from queue         │
└───────────────────────────────────────┘
```

---

## File Reference

### Core Files

| File | Description |
|------|-------------|
| `src/stores/sync.store.ts` | Zustand store for sync state management |
| `src/hooks/useOnlineStatus.ts` | Hook for online/offline detection |
| `src/api/offlineHandler.ts` | Axios interceptor for offline handling |
| `src/api/services/sync.service.ts` | API client for /sync/* endpoints |
| `src/api/services/offlineSales.service.ts` | Offline-aware sales service |

### Database Layer

| File | Description |
|------|-------------|
| `src/lib/storage/index.ts` | Storage factory (SQLite or IndexedDB) |
| `src/lib/storage/interface.ts` | Repository interfaces |
| `src/lib/storage/adapters/sqlite.adapter.ts` | SQLite adapter |
| `src/lib/storage/adapters/indexeddb.adapter.ts` | IndexedDB adapter |
| `src/lib/db/schema.ts` | Dexie.js schema definitions |
| `electron/sqlite.service.ts` | SQLite service (Electron main process) |

### Sync Services

| File | Description |
|------|-------------|
| `src/lib/db/services/enhancedSync.service.ts` | Batch sync processor |
| `src/lib/db/services/dataSync.service.ts` | Master data sync |
| `src/lib/db/services/sync.service.ts` | Legacy sync service |

### Repositories

| File | Description |
|------|-------------|
| `src/lib/db/repositories/syncQueue.repository.ts` | Sync queue operations |
| `src/lib/db/repositories/sale.repository.ts` | Sale data access |
| `src/lib/db/repositories/product.repository.ts` | Product data access |

### Types

| File | Description |
|------|-------------|
| `src/lib/db/types/enhancedSync.types.ts` | Sync-related type definitions |

---

## Summary

The offline support system in Horix POS Pro provides:

1. **Seamless Offline Experience** - Users can create sales without noticing they're offline
2. **Automatic Sync** - When back online, all operations sync automatically
3. **Data Integrity** - Idempotency keys prevent duplicates on retry
4. **Conflict Handling** - Version-based optimistic locking detects conflicts
5. **Efficient Sync** - Batch uploads and incremental downloads minimize bandwidth
6. **Dual Storage** - SQLite for Electron, IndexedDB for browser fallback
7. **Progress Feedback** - UI shows sync status and pending count

---

*Last Updated: December 3, 2025*
