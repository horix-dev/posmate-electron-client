# Offline-First POS - Backend API Documentation

## Document Info
- **Version:** 2.0
- **Created:** December 2, 2025
- **Last Updated:** December 2, 2025
- **Status:** Phase 0 Complete ✅
- **Focus:** Backend Laravel API for Offline-First POS Client

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Entity Versioning | ✅ Complete | All syncable models have `version` column |
| Soft Deletes | ✅ Complete | All syncable models support soft deletes |
| Idempotency Middleware | ✅ Complete | Prevents duplicate sync operations |
| Server Timestamp | ✅ Complete | All API responses include timestamp |
| Sync Endpoints | ✅ Complete | Full, incremental, and batch sync |
| Conflict Detection | ✅ Complete | 409 responses for version conflicts |
| Audit Logging | ✅ Complete | Offline audit trail |
| Stock Discrepancy | ✅ Complete | Inventory reconciliation support |

---

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Sync Strategy](#sync-strategy)
3. [Database Schema](#database-schema)
4. [Middleware](#middleware)
5. [Models & Traits](#models--traits)
6. [Error Handling](#error-handling)
7. [Console Commands](#console-commands)

---

## API Endpoints

### Base URL
```
/api/v1/sync/*
```

### Authentication
All sync endpoints require `Authorization: Bearer {token}` header.

---

### 1. Health Check
```http
GET /api/v1/sync/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-02T10:00:00Z",
  "version": "1.0.0",
  "_server_timestamp": "2025-12-02T10:00:00Z"
}
```

---

### 2. Device Registration
```http
POST /api/v1/sync/register
```

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

---

### 3. Full Sync (Initial Download)
```http
GET /api/v1/sync/full?entities=products,categories,parties
```

**Query Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `entities` | No | Comma-separated list (default: all) |

**Available Entities:**
- `products`
- `categories`
- `brands`
- `units`
- `parties`
- `vats`
- `payment_types`
- `warehouses`

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "productName": "Sample Product",
        "productCode": "PRD001",
        "productSalePrice": 100.00,
        "version": 1,
        ...
      }
    ],
    "categories": [...],
    "settings": {
      "currency": "USD",
      "currency_position": "left",
      "vat_enabled": true,
      "invoice_prefix": "INV",
      "company_name": "My Business"
    }
  },
  "sync_token": "eyJsYXN0X3N5bmMiOiIyMDI1LTEyLTAyVDEwOjAwOjAwWiJ9",
  "server_timestamp": "2025-12-02T10:00:00Z"
}
```

---

### 4. Incremental Sync (Get Changes)
```http
GET /api/v1/sync/changes?since=2025-12-01T00:00:00Z&entities=products,parties
```

**Query Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `since` | Yes | ISO8601 timestamp of last sync |
| `entities` | No | Comma-separated list (default: all) |
| `page_size` | No | Max records per entity (default: 500, max: 1000) |

**Response:**
```json
{
  "success": true,
  "data": {
    "products": {
      "created": [
        { "id": 10, "productName": "New Product", "version": 1, ... }
      ],
      "updated": [
        { "id": 5, "productName": "Updated Product", "version": 3, ... }
      ],
      "deleted": [2, 7, 8]
    },
    "parties": {
      "created": [],
      "updated": [],
      "deleted": []
    }
  },
  "sync_token": "eyJsYXN0X3N5bmMiOiIyMDI1LTEyLTAyVDEwOjAwOjAwWiJ9",
  "server_timestamp": "2025-12-02T10:00:00Z",
  "has_more": false,
  "total_records": 3
}
```

---

### 5. Batch Sync (Upload Offline Operations)
```http
POST /api/v1/sync/batch
```

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Device-ID` | Recommended | Device identifier |
| `X-Idempotency-Key` | Recommended | Unique key for entire batch |

**Request:**
```json
{
  "operations": [
    {
      "idempotency_key": "550e8400-e29b-41d4-a716-446655440001",
      "entity": "sale",
      "action": "create",
      "data": {
        "local_id": 1,
        "offline_invoice_no": "OFF-D001-1733123456789",
        "party_id": 5,
        "totalAmount": 150.00,
        "paidAmount": 150.00,
        "dueAmount": 0,
        "isPaid": true,
        "discountAmount": 10.00,
        "vat_amount": 5.00,
        "payment_type_id": 1,
        "saleDate": "2025-12-02T09:30:00Z",
        "products": [
          {
            "stock_id": 10,
            "quantities": 2,
            "price": 80.00,
            "lossProfit": 20.00
          }
        ]
      },
      "offline_timestamp": "2025-12-02T09:30:00Z"
    },
    {
      "idempotency_key": "550e8400-e29b-41d4-a716-446655440002",
      "entity": "party",
      "action": "create",
      "data": {
        "local_id": 100,
        "name": "John Doe",
        "phone": "+1234567890",
        "type": "Retailer"
      },
      "offline_timestamp": "2025-12-02T09:25:00Z"
    }
  ],
  "client_timestamp": "2025-12-02T10:00:00Z",
  "device_id": "D-ABC123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "results": [
    {
      "idempotency_key": "550e8400-e29b-41d4-a716-446655440001",
      "status": "created",
      "server_id": 1234,
      "local_id": 1,
      "invoice_number": "INV-001234",
      "version": 1,
      "created_at": "2025-12-02T10:00:01Z"
    },
    {
      "idempotency_key": "550e8400-e29b-41d4-a716-446655440002",
      "status": "created",
      "server_id": 567,
      "local_id": 100,
      "version": 1
    }
  ],
  "server_timestamp": "2025-12-02T10:00:01Z",
  "summary": {
    "total": 2,
    "success_count": 2,
    "error_count": 0
  }
}
```

**Response (Partial Success - HTTP 207):**
```json
{
  "success": false,
  "results": [
    {
      "idempotency_key": "550e8400-e29b-41d4-a716-446655440001",
      "status": "created",
      "server_id": 1234,
      "version": 1
    },
    {
      "idempotency_key": "550e8400-e29b-41d4-a716-446655440002",
      "status": "error",
      "error": "Stock not found: 999",
      "error_code": "STOCK_NOT_FOUND"
    }
  ],
  "summary": {
    "total": 2,
    "success_count": 1,
    "error_count": 1
  }
}
```

---

### Supported Batch Operations

#### Sale Creation
```json
{
  "entity": "sale",
  "action": "create",
  "data": {
    "local_id": 1,
    "offline_invoice_no": "OFF-D001-1733123456789",
    "party_id": 5,
    "totalAmount": 150.00,
    "paidAmount": 100.00,
    "dueAmount": 50.00,
    "isPaid": false,
    "discountAmount": 0,
    "vat_amount": 15.00,
    "vat_percent": 10,
    "payment_type_id": 1,
    "saleDate": "2025-12-02T09:30:00Z",
    "meta": {
      "note": "Customer requested delivery",
      "customer_phone": "+1234567890"
    },
    "products": [
      {
        "stock_id": 10,
        "quantities": 2,
        "price": 82.50,
        "lossProfit": 20.00
      }
    ],
    "new_party": {
      "name": "Walk-in Customer",
      "phone": "+9876543210",
      "type": "Retailer"
    }
  }
}
```

#### Party Creation
```json
{
  "entity": "party",
  "action": "create",
  "data": {
    "local_id": 100,
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "address": "123 Main St",
    "type": "Retailer"
  }
}
```

#### Party Update
```json
{
  "entity": "party",
  "action": "update",
  "data": {
    "id": 5,
    "version": 2,
    "name": "John Smith",
    "phone": "+1234567890"
  }
}
```

#### Due Collection
```json
{
  "entity": "due_collection",
  "action": "create",
  "data": {
    "local_id": 50,
    "party_id": 5,
    "sale_id": 1234,
    "amount": 50.00,
    "payment_type_id": 1,
    "note": "Partial payment"
  }
}
```

---

## Sync Strategy

### Sync Priority Order

**Download (Pull):**
1. `settings` - Business configuration
2. `categories` - Product dependencies
3. `brands` - Product dependencies
4. `units` - Product dependencies
5. `vats` - Tax configuration
6. `payment_types` - Payment methods
7. `warehouses` - Inventory locations
8. `products` - Main catalog
9. `parties` - Customers/suppliers

**Upload (Push):**
1. `parties` - New customers created during sale
2. `sales` - Main offline data
3. `due_collections` - Payment collections

### Conflict Resolution

| Entity | Strategy | Notes |
|--------|----------|-------|
| Products | Server wins | Admin controls catalog |
| Categories | Server wins | Admin controls structure |
| Parties | Merge (flag for review) | May create duplicates |
| Sales | Client wins | Offline sale is truth |
| Stock | Recalculate after sync | Track discrepancies |
| Settings | Server wins | Admin controls config |

### Sync Frequency Recommendations

| Trigger | Action |
|---------|--------|
| App start | Full sync if >1 hour since last |
| Every 5 min (online) | Incremental sync |
| Network reconnect | Immediate sync |
| Sale completed | Queue + attempt immediately |
| Manual trigger | Full sync |

---

## Database Schema

### New Tables

#### `idempotency_keys`
```sql
CREATE TABLE idempotency_keys (
    `key` VARCHAR(64) PRIMARY KEY,
    business_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    request_hash LONGTEXT,
    response_body LONGTEXT,
    status_code SMALLINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX (expires_at),
    INDEX (business_id, created_at)
);
```

#### `sync_devices`
```sql
CREATE TABLE sync_devices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64) UNIQUE,
    business_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    device_name VARCHAR(191),
    os VARCHAR(191),
    app_version VARCHAR(191),
    last_sync_at TIMESTAMP NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX (business_id, is_active),
    INDEX (last_sync_at)
);
```

#### `sync_logs`
```sql
CREATE TABLE sync_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    device_id VARCHAR(64),
    sync_type VARCHAR(20),  -- full, incremental, batch
    direction VARCHAR(10),  -- push, pull
    entity_type VARCHAR(50),
    operation VARCHAR(20),  -- create, update, delete
    entity_id BIGINT UNSIGNED,
    idempotency_key VARCHAR(64),
    status VARCHAR(20),     -- started, completed, failed, conflict
    records_processed INT UNSIGNED DEFAULT 0,
    records_failed INT UNSIGNED DEFAULT 0,
    error_message TEXT,
    metadata JSON,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX (business_id, created_at),
    INDEX (device_id, created_at),
    INDEX (idempotency_key)
);
```

#### `offline_audit_logs`
```sql
CREATE TABLE offline_audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    device_id VARCHAR(64),
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id BIGINT UNSIGNED,
    server_entity_id BIGINT UNSIGNED,
    offline_timestamp TIMESTAMP,
    server_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    payload JSON,
    diff JSON,
    INDEX (business_id, created_at),
    INDEX (entity_type, entity_id),
    INDEX (device_id)
);
```

#### `stock_discrepancy_logs`
```sql
CREATE TABLE stock_discrepancy_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED,
    product_id BIGINT UNSIGNED,
    stock_id BIGINT UNSIGNED,
    sale_id BIGINT UNSIGNED,
    device_id VARCHAR(64),
    expected_quantity DECIMAL(15,4),
    available_quantity DECIMAL(15,4),
    discrepancy DECIMAL(15,4),
    resolution_type VARCHAR(20),  -- auto_adjusted, manual, backorder
    notes TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolved_by BIGINT UNSIGNED,
    INDEX (business_id, resolved),
    INDEX (product_id, created_at)
);
```

### Modified Tables

Added to existing tables:

| Table | New Columns |
|-------|-------------|
| `products` | `version`, `deleted_at` |
| `parties` | `version`, `deleted_at` |
| `categories` | `version`, `deleted_at` |
| `brands` | `version`, `deleted_at` |
| `units` | `version`, `deleted_at` |
| `vats` | `version`, `deleted_at` |
| `payment_types` | `version`, `deleted_at` |
| `warehouses` | `version`, `deleted_at` |
| `sales` | `version`, `deleted_at`, `client_reference`, `offline_invoice_no`, `device_id` |
| `purchases` | `version`, `deleted_at` |
| `due_collects` | `version`, `deleted_at`, `client_reference` |

---

## Middleware

### IdempotencyMiddleware

**File:** `app/Http/Middleware/IdempotencyMiddleware.php`

**Purpose:** Prevent duplicate operations during sync.

**Headers:**
- `X-Idempotency-Key` - Required for POST/PUT/PATCH requests
- `X-Idempotency-Replayed: true` - Added when returning cached response

**Behavior:**
1. Check for `X-Idempotency-Key` header
2. If key exists in cache → return cached response
3. If not → process request and cache response for 24 hours

**Registration:**
```php
// Kernel.php
'idempotency' => \App\Http\Middleware\IdempotencyMiddleware::class,
```

### ServerTimestampMiddleware

**File:** `app/Http/Middleware/ServerTimestampMiddleware.php`

**Purpose:** Add server timestamp to all API responses.

**Adds:**
- Header: `X-Server-Timestamp: 2025-12-02T10:00:00Z`
- JSON field: `_server_timestamp: "2025-12-02T10:00:00Z"`

**Registration:**
```php
// Kernel.php - API middleware group
'api' => [
    // ... other middleware
    \App\Http\Middleware\ServerTimestampMiddleware::class,
],
```

---

## Models & Traits

### Syncable Trait

**File:** `app/Traits/Syncable.php`

**Applied to:** Product, Party, Category, Brand, Unit, Vat, PaymentType, Sale, DueCollect

**Features:**
- Includes `SoftDeletes`
- Auto-increments `version` on update
- Sets `version = 1` on create

**Scopes:**
```php
// Records created since timestamp
$products = Product::createdSince($since)->get();

// Records updated (not created) since timestamp
$products = Product::updatedSince($since)->get();

// Records deleted since timestamp
$products = Product::deletedSince($since)->get();

// All changes since timestamp
$products = Product::changedSince($since)->get();
```

**Methods:**
```php
// Check for version conflict
if ($product->hasConflict($clientVersion)) {
    throw new VersionConflictException(...);
}

// Format for sync response
$data = $product->toSyncArray();
```

### ApiVersionSupport Trait

**File:** `app/Traits/ApiVersionSupport.php`

**Purpose:** Add version checking to controllers.

**Usage:**
```php
class ProductController extends Controller
{
    use ApiVersionSupport;

    public function update(Request $request, Product $product)
    {
        // Throws VersionConflictException if conflict detected
        $this->checkVersion($product, $request);
        
        // ... update logic
    }
}
```

---

## Error Handling

### Version Conflict (HTTP 409)

**Thrown when:** Client sends outdated version

**Response:**
```json
{
  "success": false,
  "error": "version_conflict",
  "message": "Version conflict for Product #123. Client version: 1, Server version: 2",
  "conflict": {
    "entity_type": "App\\Models\\Product",
    "entity_id": 123,
    "client_version": 1,
    "server_version": 2,
    "server_data": {
      "id": 123,
      "productName": "Updated Name",
      "version": 2
    }
  },
  "resolution_options": {
    "force_update": "Include X-Force-Update: true header to overwrite",
    "merge": "Fetch latest server data and merge client-side",
    "discard": "Discard client changes and use server version"
  }
}
```

### Batch Errors

Individual operation errors don't fail the entire batch:

```json
{
  "results": [
    {
      "idempotency_key": "key-1",
      "status": "created",
      "server_id": 123
    },
    {
      "idempotency_key": "key-2",
      "status": "error",
      "error": "Stock not found: 999",
      "error_code": "STOCK_NOT_FOUND"
    }
  ],
  "summary": {
    "success_count": 1,
    "error_count": 1
  }
}
```

### Stock Discrepancy

When offline sale syncs but stock is insufficient:

```json
{
  "idempotency_key": "key-1",
  "status": "created",
  "server_id": 123,
  "warnings": [
    {
      "type": "stock_discrepancy",
      "product_id": 45,
      "expected": 5,
      "available": 2,
      "discrepancy": 3,
      "action": "allowed_negative"
    }
  ]
}
```

---

## Console Commands

### Cleanup Sync Data
```bash
php artisan sync:cleanup --days=30 --stale-devices=90
```

**Options:**
- `--days` - Retain sync logs for N days (default: 30)
- `--stale-devices` - Mark devices inactive after N days (default: 90)

**Schedule (recommended):**
```php
// app/Console/Kernel.php
$schedule->command('sync:cleanup')->daily();
```

### Check Stale Devices
```bash
php artisan sync:check-stale --hours=24 --alert
```

**Options:**
- `--hours` - Threshold for stale detection (default: 24)
- `--alert` - Send alerts/notifications

**Schedule (recommended):**
```php
// app/Console/Kernel.php
$schedule->command('sync:check-stale --hours=24')->hourly();
```

---

## Client Integration Guide

### Required Headers

| Header | When | Description |
|--------|------|-------------|
| `Authorization` | Always | Bearer token |
| `Content-Type` | POST/PUT | `application/json` |
| `X-Device-ID` | Recommended | Device identifier |
| `X-Idempotency-Key` | POST/PUT | UUID for deduplication |
| `X-Entity-Version` | Updates | Current entity version |
| `X-Force-Update` | Optional | `true` to skip version check |

### Offline Invoice Number Format
```
OFF-{DEVICE_ID}-{TIMESTAMP}
Example: OFF-D001-1733123456789
```

### Idempotency Key Format
```
UUID v4
Example: 550e8400-e29b-41d4-a716-446655440000
```

### Sync Token
Base64 encoded JSON containing last sync timestamp. Store locally and send with next incremental sync.

---

## File Reference

### New Files
| Path | Description |
|------|-------------|
| `app/Http/Controllers/Api/SyncController.php` | Sync endpoints |
| `app/Http/Middleware/IdempotencyMiddleware.php` | Duplicate prevention |
| `app/Http/Middleware/ServerTimestampMiddleware.php` | Timestamp header |
| `app/Traits/Syncable.php` | Model sync support |
| `app/Traits/ApiVersionSupport.php` | Controller version support |
| `app/Models/IdempotencyKey.php` | Key storage model |
| `app/Models/SyncDevice.php` | Device model |
| `app/Models/SyncLog.php` | Log model |
| `app/Models/OfflineAuditLog.php` | Audit model |
| `app/Models/StockDiscrepancyLog.php` | Discrepancy model |
| `app/Exceptions/VersionConflictException.php` | Conflict exception |
| `app/Console/Commands/CleanupSyncData.php` | Cleanup command |
| `app/Console/Commands/CheckStaleSyncDevices.php` | Stale check command |
| `database/migrations/2025_12_02_000001_*.php` | Sync columns |
| `database/migrations/2025_12_02_000002_*.php` | Sync tables |

### Modified Files
| Path | Changes |
|------|---------|
| `app/Http/Kernel.php` | Middleware registration |
| `routes/api.php` | Sync routes |
| `app/Models/Product.php` | Added Syncable trait |
| `app/Models/Party.php` | Added Syncable trait |
| `app/Models/Category.php` | Added Syncable trait |
| `app/Models/Brand.php` | Added Syncable trait |
| `app/Models/Unit.php` | Added Syncable trait |
| `app/Models/Vat.php` | Added Syncable trait |
| `app/Models/PaymentType.php` | Added Syncable trait |
| `app/Models/Sale.php` | Added Syncable trait |
| `app/Models/DueCollect.php` | Added Syncable trait |

---

*Last Updated: December 2, 2025*
