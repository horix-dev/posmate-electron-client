# Backend Development Log

## Offline-First POS Backend Implementation

This document tracks all backend changes made to support the offline-first POS client synchronization.

**Related Documentation:** See `OFFLINE_FIRST_BACKEND_API.md` for complete API reference.

---

## Change Log

### December 2, 2025 - Phase 0: Backend Preparation ✅

**Objective:** Prepare Laravel backend for offline-first client synchronization

**Duration:** ~4 hours

---

## 1. Database Schema Changes

### 1.1 Sync Support Columns Migration
**File:** `database/migrations/2025_12_02_000001_add_sync_support_columns.php`

Added to existing tables:

| Table | New Columns |
|-------|-------------|
| `products` | `version` (int), `deleted_at` (timestamp) |
| `parties` | `version` (int), `deleted_at` (timestamp) |
| `categories` | `version` (int), `deleted_at` (timestamp) |
| `brands` | `version` (int), `deleted_at` (timestamp) |
| `units` | `version` (int), `deleted_at` (timestamp) |
| `vats` | `version` (int), `deleted_at` (timestamp) |
| `payment_types` | `version` (int), `deleted_at` (timestamp) |
| `warehouses` | `version` (int), `deleted_at` (timestamp) |
| `purchases` | `version` (int), `deleted_at` (timestamp) |
| `due_collects` | `version` (int), `deleted_at` (timestamp), `client_reference` (string) |
| `sales` | `version` (int), `deleted_at` (timestamp), `client_reference` (string), `offline_invoice_no` (string), `device_id` (string) |

### 1.2 Sync Infrastructure Tables Migration
**File:** `database/migrations/2025_12_02_000002_create_sync_infrastructure_tables.php`

Created new tables:

#### `idempotency_keys`
Prevents duplicate request processing during sync.

| Column | Type | Description |
|--------|------|-------------|
| `key` | string(64) PK | Unique idempotency key |
| `business_id` | FK | Business reference |
| `user_id` | FK | User reference |
| `endpoint` | string | API endpoint called |
| `method` | string(10) | HTTP method |
| `request_hash` | longtext | Hash of request payload |
| `response_body` | longtext | Cached response |
| `status_code` | smallint | HTTP status code |
| `created_at` | timestamp | Creation time |
| `expires_at` | timestamp | Expiration time |

#### `sync_devices`
Tracks registered client devices.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment ID |
| `device_id` | string(64) UNIQUE | Client device identifier |
| `business_id` | FK | Business reference |
| `user_id` | FK | User reference |
| `device_name` | string | Human-readable name |
| `os` | string | Operating system |
| `app_version` | string | Client app version |
| `last_sync_at` | timestamp | Last successful sync |
| `registered_at` | timestamp | Registration time |
| `is_active` | boolean | Active status |

#### `sync_logs`
Audit trail for sync operations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment ID |
| `business_id` | FK | Business reference |
| `user_id` | FK | User reference |
| `device_id` | string | Device identifier |
| `sync_type` | string | full/incremental/batch |
| `direction` | string | push/pull |
| `entity_type` | string | Entity being synced |
| `operation` | string | create/update/delete |
| `entity_id` | bigint | Entity ID |
| `idempotency_key` | string | Related idempotency key |
| `status` | string | started/completed/failed/conflict |
| `records_processed` | int | Success count |
| `records_failed` | int | Failure count |
| `error_message` | text | Error details |
| `metadata` | json | Additional data |
| `started_at` | timestamp | Start time |
| `completed_at` | timestamp | Completion time |

#### `offline_audit_logs`
Compliance audit for offline actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment ID |
| `business_id` | FK | Business reference |
| `user_id` | FK | User reference |
| `device_id` | string | Device identifier |
| `action` | string | Action performed |
| `entity_type` | string | Entity type |
| `entity_id` | bigint | Local entity ID |
| `server_entity_id` | bigint | Server entity ID |
| `offline_timestamp` | timestamp | When action occurred offline |
| `server_timestamp` | timestamp | When synced to server |
| `ip_address` | string | Client IP |
| `payload` | json | Request data |
| `diff` | json | Changes made |

#### `stock_discrepancy_logs`
Inventory reconciliation tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment ID |
| `business_id` | FK | Business reference |
| `product_id` | FK | Product reference |
| `stock_id` | bigint | Stock record ID |
| `sale_id` | bigint | Related sale ID |
| `device_id` | string | Device identifier |
| `expected_quantity` | decimal(15,4) | Expected stock |
| `available_quantity` | decimal(15,4) | Actual stock |
| `discrepancy` | decimal(15,4) | Difference |
| `resolution_type` | string | How resolved |
| `notes` | text | Resolution notes |
| `resolved` | boolean | Resolution status |
| `resolved_at` | timestamp | Resolution time |
| `resolved_by` | FK | User who resolved |

---

## 2. New Models

### 2.1 IdempotencyKey
**File:** `app/Models/IdempotencyKey.php`

**Purpose:** Store processed idempotency keys to prevent duplicate operations.

**Key Methods:**
- `isExpired()` - Check if key has expired
- `scopeExpired()` - Query expired keys
- `scopeValid()` - Query valid (non-expired) keys

### 2.2 SyncDevice
**File:** `app/Models/SyncDevice.php`

**Purpose:** Track registered client devices for sync operations.

**Key Methods:**
- `touchLastSync()` - Update last sync timestamp
- `isStale(hours)` - Check if device hasn't synced recently
- `scopeActive()` - Query active devices
- `scopeStale(hours)` - Query stale devices

### 2.3 SyncLog
**File:** `app/Models/SyncLog.php`

**Purpose:** Log all sync operations for auditing and debugging.

**Constants:**
- `TYPE_FULL`, `TYPE_INCREMENTAL`, `TYPE_BATCH`
- `DIRECTION_PUSH`, `DIRECTION_PULL`
- `STATUS_STARTED`, `STATUS_COMPLETED`, `STATUS_FAILED`, `STATUS_CONFLICT`

**Key Methods:**
- `markCompleted(processed, failed)` - Mark sync as complete
- `markFailed(errorMessage)` - Mark sync as failed
- `getDurationAttribute()` - Calculate sync duration

### 2.4 OfflineAuditLog
**File:** `app/Models/OfflineAuditLog.php`

**Purpose:** Audit trail for offline actions (compliance).

**Key Methods:**
- `scopeForEntity(entityType)` - Filter by entity
- `scopeForDevice(deviceId)` - Filter by device
- `scopeBetween(start, end)` - Filter by date range

### 2.5 StockDiscrepancyLog
**File:** `app/Models/StockDiscrepancyLog.php`

**Purpose:** Track inventory discrepancies from offline sales.

**Constants:**
- `RESOLUTION_AUTO_ADJUSTED`
- `RESOLUTION_MANUAL`
- `RESOLUTION_BACKORDER`

**Key Methods:**
- `resolve(type, notes, userId)` - Mark as resolved
- `isCritical(threshold)` - Check if discrepancy is severe
- `scopeUnresolved()` - Query unresolved discrepancies

---

## 3. Traits

### 3.1 Syncable Trait
**File:** `app/Traits/Syncable.php`

**Purpose:** Add sync support to Eloquent models.

**Features:**
- Includes `SoftDeletes`
- Auto-increments `version` on update
- Sets initial `version` to 1 on create
- Adds `version` to fillable

**Scopes:**
- `scopeCreatedSince($since)` - Records created after timestamp
- `scopeUpdatedSince($since)` - Records updated (not created) after timestamp
- `scopeDeletedSince($since)` - Records soft-deleted after timestamp
- `scopeChangedSince($since)` - All changes after timestamp

**Methods:**
- `hasConflict(clientVersion)` - Check for version conflict
- `toSyncArray()` - Format for sync response

**Applied to Models:**
- Product
- Party
- Category
- Brand
- Unit
- Vat
- PaymentType
- Sale
- DueCollect

### 3.2 ApiVersionSupport Trait
**File:** `app/Traits/ApiVersionSupport.php`

**Purpose:** Add version checking to API controllers.

**Methods:**
- `checkVersion(model, request)` - Check for conflicts, throw exception if found
- `addVersionToResponse(data, version)` - Add version to response
- `formatForResponse(model, additional)` - Format model with version
- `formatCollectionForResponse(collection)` - Format collection with versions

---

## 4. Middleware

### 4.1 IdempotencyMiddleware
**File:** `app/Http/Middleware/IdempotencyMiddleware.php`

**Purpose:** Prevent duplicate operations during sync.

**How it works:**
1. Check for `X-Idempotency-Key` header
2. If key exists in cache, return cached response
3. If not, process request and cache response
4. Cache expires after 24 hours

**Headers:**
- `X-Idempotency-Key` - Client-provided unique key (required for POST/PUT/PATCH)
- `X-Idempotency-Replayed: true` - Response header when returning cached response

**Registration:**
```php
// Kernel.php middlewareAliases
'idempotency' => \App\Http\Middleware\IdempotencyMiddleware::class,
```

### 4.2 ServerTimestampMiddleware
**File:** `app/Http/Middleware/ServerTimestampMiddleware.php`

**Purpose:** Add server timestamp to all API responses.

**Adds:**
- `X-Server-Timestamp` header (ISO8601 format)
- `_server_timestamp` field in JSON response body

**Registration:**
```php
// Kernel.php api middleware group
\App\Http\Middleware\ServerTimestampMiddleware::class,
```

---

## 5. Controllers

### 5.1 SyncController
**File:** `app/Http/Controllers/Api/SyncController.php`

**Endpoints:**

#### GET `/api/v1/sync/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-02T10:00:00Z",
  "version": "1.0.0"
}
```

#### POST `/api/v1/sync/register`
Register a client device.

**Request:**
```json
{
  "device_id": "D-ABC123",
  "device_name": "Cashier PC 1",
  "os": "Windows 11",
  "app_version": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully.",
  "data": {
    "device_id": "D-ABC123",
    "registered_at": "2025-12-02T10:00:00Z"
  }
}
```

#### GET `/api/v1/sync/full`
Full data sync for initial setup.

**Query Params:**
- `entities` (optional) - Comma-separated list of entities

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [...],
    "categories": [...],
    "parties": [...],
    "settings": {...}
  },
  "sync_token": "base64...",
  "server_timestamp": "2025-12-02T10:00:00Z"
}
```

#### GET `/api/v1/sync/changes`
Incremental sync - get changes since last sync.

**Query Params:**
- `since` (required) - ISO8601 timestamp of last sync
- `entities` (optional) - Comma-separated list of entities
- `page_size` (optional) - Max records per entity (default: 500)

**Response:**
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
  "sync_token": "base64...",
  "server_timestamp": "2025-12-02T10:00:00Z",
  "has_more": false,
  "total_records": 25
}
```

#### POST `/api/v1/sync/batch`
Process batch of offline operations.

**Headers:**
- `X-Idempotency-Key` (optional but recommended for the batch)
- `X-Device-ID` (optional)

**Request:**
```json
{
  "operations": [
    {
      "idempotency_key": "uuid-1",
      "entity": "sale",
      "action": "create",
      "data": {...},
      "offline_timestamp": "2025-12-02T09:00:00Z"
    }
  ],
  "client_timestamp": "2025-12-02T10:00:00Z",
  "device_id": "D-ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "idempotency_key": "uuid-1",
      "status": "created",
      "server_id": 123,
      "invoice_number": "INV-001234",
      "version": 1
    }
  ],
  "server_timestamp": "2025-12-02T10:00:00Z",
  "summary": {
    "total": 1,
    "success_count": 1,
    "error_count": 0
  }
}
```

---

## 6. Console Commands

### 6.1 sync:cleanup
**File:** `app/Console/Commands/CleanupSyncData.php`

**Purpose:** Clean up expired sync-related data.

**Usage:**
```bash
php artisan sync:cleanup --days=30 --stale-devices=90
```

**Options:**
- `--days` - Number of days to retain sync logs (default: 30)
- `--stale-devices` - Days before marking devices inactive (default: 90)

**Actions:**
1. Delete expired idempotency keys
2. Delete old sync logs
3. Mark stale devices as inactive

### 6.2 sync:check-stale
**File:** `app/Console/Commands/CheckStaleSyncDevices.php`

**Purpose:** Check for devices that haven't synced recently.

**Usage:**
```bash
php artisan sync:check-stale --hours=24 --alert
```

**Options:**
- `--hours` - Hours threshold for stale devices (default: 24)
- `--alert` - Send alerts for stale devices

---

## 7. Exceptions

### 7.1 VersionConflictException
**File:** `app/Exceptions/VersionConflictException.php`

**Purpose:** Handle version conflicts during sync.

**HTTP Status:** 409 Conflict

**Response:**
```json
{
  "success": false,
  "error": "version_conflict",
  "message": "Version conflict for Product #123...",
  "conflict": {
    "entity_type": "App\\Models\\Product",
    "entity_id": 123,
    "client_version": 1,
    "server_version": 2,
    "server_data": {...}
  },
  "resolution_options": {
    "force_update": "Include X-Force-Update: true header",
    "merge": "Fetch latest and merge client-side",
    "discard": "Use server version"
  }
}
```

---

## 8. Route Changes

**File:** `routes/api.php`

Added sync routes under `/api/v1/sync/*`:

```php
Route::prefix('sync')->group(function () {
    Route::get('health', [SyncController::class, 'health']);
    Route::post('register', [SyncController::class, 'registerDevice']);
    Route::get('full', [SyncController::class, 'fullSync']);
    Route::get('changes', [SyncController::class, 'changes']);
    Route::post('batch', [SyncController::class, 'batch'])->middleware('idempotency');
});
```

---

## 9. Model Modifications

### Updated Fillable Arrays

Added `version` to fillable in all syncable models:
- Product
- Party
- Category
- Brand
- Unit
- Vat
- PaymentType
- Sale (also: `client_reference`, `offline_invoice_no`, `device_id`)
- DueCollect (also: `client_reference`)

### Added Syncable Trait

All above models now use:
```php
use App\Traits\Syncable;

class Model extends BaseModel
{
    use HasFactory, Syncable;
    // ...
}
```

---

## 10. Kernel Modifications

**File:** `app/Http/Kernel.php`

### API Middleware Group
Added `ServerTimestampMiddleware`:
```php
'api' => [
    \Illuminate\Routing\Middleware\ThrottleRequests::class . ':api',
    \Illuminate\Routing\Middleware\SubstituteBindings::class,
    \App\Http\Middleware\DemoMode::class,
    \App\Http\Middleware\ServerTimestampMiddleware::class, // NEW
],
```

### Middleware Aliases
Added `idempotency`:
```php
protected $middlewareAliases = [
    // ... existing ...
    'idempotency' => \App\Http\Middleware\IdempotencyMiddleware::class, // NEW
];
```

---

## Testing the Implementation

### Verify Routes
```bash
php artisan route:list --path=sync
```

### Verify Migrations
```bash
php artisan migrate:status
```

### Test Health Endpoint
```bash
curl -X GET http://localhost/api/v1/sync/health \
  -H "Authorization: Bearer {token}"
```

### Test Device Registration
```bash
curl -X POST http://localhost/api/v1/sync/register \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"device_id": "test-device-001", "device_name": "Test PC"}'
```

---

## Next Steps

### Phase 1: Electron + React Scaffold
- [ ] Initialize Electron + Vite + React project
- [ ] Configure electron-builder for Windows
- [ ] Set up SQLite with better-sqlite3
- [ ] Create database schema matching Laravel
- [ ] Implement IPC bridge (preload.js)
- [ ] Set up Redux Toolkit store
- [ ] Create API service with axios
- [ ] Implement online/offline detection
- [ ] Create basic app shell

---

## File Summary

### New Files Created
| File | Type | Description |
|------|------|-------------|
| `database/migrations/2025_12_02_000001_add_sync_support_columns.php` | Migration | Add version/soft deletes to entities |
| `database/migrations/2025_12_02_000002_create_sync_infrastructure_tables.php` | Migration | Create sync infrastructure tables |
| `app/Models/IdempotencyKey.php` | Model | Idempotency key storage |
| `app/Models/SyncDevice.php` | Model | Device registration |
| `app/Models/SyncLog.php` | Model | Sync operation logs |
| `app/Models/OfflineAuditLog.php` | Model | Offline audit trail |
| `app/Models/StockDiscrepancyLog.php` | Model | Stock discrepancy tracking |
| `app/Traits/Syncable.php` | Trait | Sync support for models |
| `app/Traits/ApiVersionSupport.php` | Trait | Version support for controllers |
| `app/Http/Middleware/IdempotencyMiddleware.php` | Middleware | Duplicate request prevention |
| `app/Http/Middleware/ServerTimestampMiddleware.php` | Middleware | Add server timestamp |
| `app/Http/Controllers/Api/SyncController.php` | Controller | Sync API endpoints |
| `app/Console/Commands/CleanupSyncData.php` | Command | Cleanup expired data |
| `app/Console/Commands/CheckStaleSyncDevices.php` | Command | Check stale devices |
| `app/Exceptions/VersionConflictException.php` | Exception | Version conflict handling |

### Files Modified
| File | Changes |
|------|---------|
| `app/Http/Kernel.php` | Added middleware registration |
| `routes/api.php` | Added sync routes |
| `app/Models/Product.php` | Added Syncable trait, version fillable |
| `app/Models/Party.php` | Added Syncable trait, version fillable |
| `app/Models/Category.php` | Added Syncable trait, version fillable |
| `app/Models/Brand.php` | Added Syncable trait, version fillable |
| `app/Models/Unit.php` | Added Syncable trait, version fillable |
| `app/Models/Vat.php` | Added Syncable trait, version fillable |
| `app/Models/PaymentType.php` | Added Syncable trait, version fillable |
| `app/Models/Sale.php` | Added Syncable trait, sync fields fillable |
| `app/Models/DueCollect.php` | Added Syncable trait, sync fields fillable |

---

*Last Updated: December 2, 2025*
