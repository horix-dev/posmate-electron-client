# Backend API Requirements for Offline-First POS

## Overview
This document outlines the backend API changes needed to fully support the offline-first POS client with reliable data integrity and performance.

---

## 🔴 Critical Requirements

### 1. Idempotency Keys

**Purpose:** Prevent duplicate records when client retries after network failure.

**Implementation:**
- Store idempotency keys in Redis or database with 24-hour TTL
- On POST/PUT requests, check for existing key before processing
- If key exists, return the original result (don't create duplicate)

**Request Header:**
```
X-Idempotency-Key: sale_create_1733123456_abc123
```

**Expected Behavior:**
| Scenario | Response |
|----------|----------|
| First request | 201 Created with new resource |
| Duplicate key (same data) | 200 OK with original resource |
| Duplicate key (different data) | 422 Unprocessable - keys are single-use |

**Example Response (Duplicate):**
```json
{
  "status": "duplicate",
  "message": "Request already processed",
  "original_id": 12345,
  "created_at": "2025-12-02T10:30:00Z"
}
```

---

### 2. Entity Versioning (Optimistic Locking)

**Purpose:** Detect and handle concurrent edit conflicts.

**Schema Change:**
Add to all editable entities (products, parties, sales, etc.):
```sql
ALTER TABLE products ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN updated_at TIMESTAMP;
```

**API Response:**
```json
{
  "id": 123,
  "name": "Product A",
  "price": 100.00,
  "version": 5,
  "updated_at": "2025-12-02T10:30:00Z"
}
```

**Update Request:**
```json
PUT /products/123
{
  "price": 120.00,
  "version": 5
}
```

**Conflict Response (409):**
```json
{
  "error": "VERSION_CONFLICT",
  "message": "Resource was modified by another client",
  "your_version": 5,
  "server_version": 6,
  "server_data": {
    "id": 123,
    "price": 110.00,
    "version": 6,
    "updated_at": "2025-12-02T10:35:00Z"
  }
}
```

---

### 3. Server Timestamp Header

**Purpose:** Detect client clock drift and ensure consistent timestamps.

**Response Headers:**
```
X-Server-Time: 2025-12-02T10:30:45.123Z
X-Request-Duration: 45ms
```

**Client should:**
- Calculate clock offset
- Use server time for sync comparisons
- Log if drift exceeds 5 minutes

---

## 🟡 Performance Optimizations

### 4. Incremental Sync Endpoint

**Purpose:** Download only changed data instead of full dataset.

**Endpoint:**
```
GET /api/v1/sync/changes?since=2025-12-01T00:00:00Z&entities=products,categories,parties
```

**Response:**
```json
{
  "products": {
    "created": [
      { "id": 150, "name": "New Product", ... }
    ],
    "updated": [
      { "id": 45, "name": "Updated Product", "version": 3, ... }
    ],
    "deleted": [12, 78, 92]
  },
  "categories": {
    "created": [],
    "updated": [],
    "deleted": []
  },
  "parties": {
    "created": [...],
    "updated": [...],
    "deleted": []
  },
  "sync_token": "eyJsYXN0X3N5bmMiOiIyMDI1LTEyLTAyVDEwOjMwOjAwWiJ9",
  "server_timestamp": "2025-12-02T10:30:00Z",
  "has_more": false
}
```

**Soft Deletes Required:**
- Don't hard delete records immediately
- Add `deleted_at` column
- Include in deleted array until client confirms receipt
- Hard delete after 30 days

---

### 5. Batch Sync Endpoint

**Purpose:** Process multiple offline operations in single HTTP request.

**Endpoint:**
```
POST /api/v1/sync/batch
```

**Request:**
```json
{
  "operations": [
    {
      "idempotency_key": "sale_create_1733123456_abc",
      "entity": "sale",
      "action": "create",
      "data": {
        "products": [...],
        "total_amount": 1500.00,
        "paid_amount": 1500.00
      }
    },
    {
      "idempotency_key": "sale_create_1733123457_def",
      "entity": "sale",
      "action": "create",
      "data": {
        "products": [...],
        "total_amount": 800.00,
        "paid_amount": 500.00
      }
    }
  ],
  "client_timestamp": "2025-12-02T10:25:00Z"
}
```

**Response:**
```json
{
  "results": [
    {
      "idempotency_key": "sale_create_1733123456_abc",
      "status": "created",
      "id": 1001,
      "invoice_number": "INV-2025-1001"
    },
    {
      "idempotency_key": "sale_create_1733123457_def",
      "status": "created",
      "id": 1002,
      "invoice_number": "INV-2025-1002"
    }
  ],
  "server_timestamp": "2025-12-02T10:30:15Z",
  "success_count": 2,
  "error_count": 0,
  "conflict_count": 0
}
```

**Partial Failure Handling:**
```json
{
  "results": [
    {
      "idempotency_key": "sale_1",
      "status": "created",
      "id": 1001
    },
    {
      "idempotency_key": "sale_2",
      "status": "error",
      "error": "Insufficient stock for product ID 45"
    }
  ],
  "success_count": 1,
  "error_count": 1
}
```

---

## 🟢 Nice-to-Have Features

### 6. Data Integrity Checksums

**Response includes checksum for verification:**
```json
{
  "products": [...],
  "count": 150,
  "checksum": "sha256:a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9"
}
```

### 7. Sync Health Endpoint

```
GET /api/v1/sync/health
```

**Response:**
```json
{
  "status": "healthy",
  "last_sync_window": "2025-12-02T10:00:00Z",
  "pending_changes": 0,
  "database_lag_ms": 15
}
```

### 8. Conflict Queue for Manual Resolution

For complex conflicts that can't be auto-resolved:

```
GET /api/v1/sync/conflicts
```

**Response:**
```json
{
  "conflicts": [
    {
      "id": 1,
      "entity": "product",
      "entity_id": 45,
      "client_data": {...},
      "server_data": {...},
      "created_at": "2025-12-02T10:30:00Z"
    }
  ]
}
```

---

## Database Schema Changes

```sql
-- Add version tracking to all entities
ALTER TABLE products ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMP NULL;

ALTER TABLE parties ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE parties ADD COLUMN deleted_at TIMESTAMP NULL;

ALTER TABLE categories ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE categories ADD COLUMN deleted_at TIMESTAMP NULL;

-- Idempotency key storage (use Redis in production)
CREATE TABLE idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  response_body TEXT,
  status_code INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- Sync tracking
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR(255),
  entity_type VARCHAR(50),
  operation VARCHAR(20),
  entity_id INTEGER,
  idempotency_key VARCHAR(255),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Implementation Priority

| Priority | Feature | Impact |
|----------|---------|--------|
| 🔴 P0 | Idempotency Keys | Prevents duplicate records |
| 🔴 P0 | Server Timestamp | Data integrity |
| 🟡 P1 | Entity Versioning | Conflict detection |
| 🟡 P1 | Batch Sync | Performance |
| 🟢 P2 | Incremental Sync | Reduces bandwidth |
| 🟢 P2 | Checksums | Data validation |

---

## Testing Checklist

- [ ] Create sale offline, reconnect - no duplicates
- [ ] Update product from two clients - conflict detected
- [ ] Retry same request 5 times - same result
- [ ] Clock 1 hour ahead - sync still works
- [ ] 100 offline sales batch synced correctly
- [ ] Delete product on server, check client knows
