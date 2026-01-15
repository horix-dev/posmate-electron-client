# Payment Types API Documentation

## Overview

The Payment Types API manages payment methods available for transactions in your POS system. Each payment type can be marked as a credit-based payment (like "Due") to enable credit sales tracking.

**Base URL:** `/api/v1/payment-types`  
**Authentication:** Required (Bearer token)  
**Rate Limiting:** Standard API limits apply

---

## Key Features

- ✅ **Credit Payment Type Flag** - Mark payment types as credit-based (e.g., "Due")
- ✅ **Multi-Tenant Isolation** - Each business has its own payment types
- ✅ **Flexible Pagination** - 4 pagination modes for different use cases
- ✅ **Filtering & Search** - Filter by status or search by name
- ✅ **Status Management** - Toggle payment type active/inactive
- ✅ **Bulk Operations** - Delete multiple payment types at once
- ✅ **Version Control** - Sync-aware versioning for offline-first support

---

## Default Payment Types

When a business is created, these payment types are automatically seeded:

| Name | is_credit | Purpose |
|------|-----------|---------|
| Cash | false | Cash payments |
| Card | false | Credit/debit card payments |
| Cheque | false | Cheque payments |
| Mobile Pay | false | Mobile payment (PhonePe, GPay, etc.) |
| Due | true | Credit/due payments |

---

## Endpoints

### 1. List Payment Types

**GET** `/api/v1/payment-types`

List all payment types with flexible pagination support.

**Authentication:** Required  
**Rate Limit:** Standard

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Limit mode (max 1000) - for dropdowns |
| `page` | integer | Offset pagination page number (max 100/page) |
| `per_page` | integer | Items per page (max 100) |
| `cursor` | integer | Cursor pagination starting position |
| `search` | string | Search by payment type name |
| `status` | boolean | Filter by active/inactive status |

#### Pagination Modes

**Mode 1: Default** (no parameters)
```bash
GET /api/v1/payment-types
```
Returns all payment types up to 1000 items.

**Mode 2: Limit** (for dropdowns)
```bash
GET /api/v1/payment-types?limit=50
```
Returns first 50 payment types as flat array.

**Mode 3: Offset** (for tables)
```bash
GET /api/v1/payment-types?page=1&per_page=20
```
Returns paginated results with metadata.

**Mode 4: Cursor** (for sync)
```bash
GET /api/v1/payment-types?cursor=0&per_page=500
```
Returns cursor-based pagination for efficient sync.

#### Response (Success - HTTP 200)

**Default/Limit Mode:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "name": "Cash",
      "is_credit": false,
      "status": 1,
      "version": 1,
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    },
    {
      "id": 5,
      "name": "Due",
      "is_credit": true,
      "status": 1,
      "version": 1,
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**Offset Mode:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "pagination": {
    "total": 50,
    "per_page": 20,
    "current_page": 1,
    "last_page": 3,
    "from": 1,
    "to": 20
  }
}
```

**Cursor Mode:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "pagination": {
    "next_cursor": 500,
    "has_more": true,
    "per_page": 500
  }
}
```

#### Examples

```bash
# Default mode - all payment types
curl -X GET http://localhost:8700/api/v1/payment-types \
  -H "Authorization: Bearer YOUR_TOKEN"

# Limit mode - for dropdowns
curl -X GET "http://localhost:8700/api/v1/payment-types?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Offset pagination - for tables
curl -X GET "http://localhost:8700/api/v1/payment-types?page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Cursor pagination - for sync
curl -X GET "http://localhost:8700/api/v1/payment-types?cursor=0&per_page=500" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by status
curl -X GET "http://localhost:8700/api/v1/payment-types?status=1&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search by name
curl -X GET "http://localhost:8700/api/v1/payment-types?search=due&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Filter Payment Types

**GET** `/api/v1/payment-types/filter`

Search and filter payment types.

**Authentication:** Required  
**Rate Limit:** Standard  
**Note:** Same functionality as List endpoint, provided for UI consistency.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by payment type name |
| `status` | boolean | Filter by active/inactive |
| `page` | integer | Page number |
| `per_page` | integer | Items per page |

#### Examples

```bash
# Search for credit payment types
curl -X GET "http://localhost:8700/api/v1/payment-types/filter?search=due" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get active payment types only
curl -X GET "http://localhost:8700/api/v1/payment-types/filter?status=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Create Payment Type

**POST** `/api/v1/payment-types`

Create a new payment type.

**Authentication:** Required  
**Rate Limit:** Standard  
**Content-Type:** application/json

#### Request Body

```json
{
  "name": "string (required, max 255, unique per business)",
  "status": "boolean (optional, default: true)",
  "is_credit": "boolean (optional, default: false)"
}
```

#### Validation Rules

| Field | Rules |
|-------|-------|
| `name` | required, string, max:255, unique per business |
| `status` | nullable, boolean |
| `is_credit` | nullable, boolean |

#### Response (Success - HTTP 201)

```json
{
  "message": "Data saved successfully.",
  "data": {
    "id": 10,
    "business_id": 1,
    "name": "Bank Transfer",
    "is_credit": false,
    "status": 1,
    "version": 1,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

#### Response (Validation Error - HTTP 422)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": ["The name field is required."],
    "name": ["The name has already been taken."]
  }
}
```

#### Examples

```bash
# Create basic payment type
curl -X POST http://localhost:8700/api/v1/payment-types \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bank Transfer",
    "status": true
  }'

# Create credit-based payment type
curl -X POST http://localhost:8700/api/v1/payment-types \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Store Credit",
    "is_credit": true,
    "status": true
  }'
```

---

### 4. Update Payment Type

**PUT** `/api/v1/payment-types/{id}`

Update an existing payment type.

**Authentication:** Required  
**Rate Limit:** Standard  
**Content-Type:** application/json

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Payment type ID |

#### Request Body

```json
{
  "name": "string (optional, max 255, unique per business)",
  "status": "boolean (optional)",
  "is_credit": "boolean (optional)"
}
```

#### Response (Success - HTTP 200)

```json
{
  "message": "Data saved successfully.",
  "data": {
    "id": 10,
    "business_id": 1,
    "name": "Wire Transfer",
    "is_credit": false,
    "status": 1,
    "version": 2,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T11:00:00Z"
  }
}
```

#### Response (Not Found - HTTP 404)

```json
{
  "message": "Payment type not found"
}
```

#### Examples

```bash
# Update payment type name
curl -X PUT http://localhost:8700/api/v1/payment-types/10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "International Wire Transfer"
  }'

# Update to credit-based
curl -X PUT http://localhost:8700/api/v1/payment-types/10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_credit": true
  }'
```

---

### 5. Update Payment Type Status

**PATCH** `/api/v1/payment-types/{id}/status`

Toggle a payment type's active/inactive status.

**Authentication:** Required  
**Rate Limit:** Standard  
**Content-Type:** application/json

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Payment type ID |

#### Request Body

```json
{
  "status": "boolean (required)"
}
```

#### Response (Success - HTTP 200)

```json
{
  "message": "Status updated successfully.",
  "data": {
    "id": 10,
    "name": "Bank Transfer",
    "status": 0,
    "version": 3,
    "updated_at": "2025-01-15T11:30:00Z"
  }
}
```

#### Examples

```bash
# Deactivate payment type
curl -X PATCH http://localhost:8700/api/v1/payment-types/10/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": false
  }'

# Activate payment type
curl -X PATCH http://localhost:8700/api/v1/payment-types/10/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": true
  }'
```

---

### 6. Delete Payment Type

**DELETE** `/api/v1/payment-types/{id}`

Delete a single payment type.

**Authentication:** Required  
**Rate Limit:** Standard

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Payment type ID |

#### Response (Success - HTTP 200)

```json
{
  "message": "Data deleted successfully."
}
```

#### Response (Not Found - HTTP 404)

```json
{
  "message": "Payment type not found"
}
```

#### Examples

```bash
curl -X DELETE http://localhost:8700/api/v1/payment-types/10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Delete Multiple Payment Types

**POST** `/api/v1/payment-types/delete-all`

Delete multiple payment types at once.

**Authentication:** Required  
**Rate Limit:** Standard  
**Content-Type:** application/json

#### Request Body

```json
{
  "ids": [1, 2, 3]
}
```

#### Validation Rules

| Field | Rules |
|-------|-------|
| `ids` | required, array, min:1 |
| `ids.*` | integer |

#### Response (Success - HTTP 200)

```json
{
  "message": "Selected items deleted successfully."
}
```

#### Response (Validation Error - HTTP 422)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "ids": ["The ids field is required."]
  }
}
```

#### Examples

```bash
curl -X POST http://localhost:8700/api/v1/payment-types/delete-all \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [10, 11, 12]
  }'
```

---

## Response Format

### Standard Success Response

```json
{
  "message": "Human-readable message",
  "data": {} or []
}
```

### Standard Error Response

```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": ["Error details"]
  }
}
```

### Cache Headers (Single Entity Endpoints)

Responses include cache headers for efficient client-side caching:

```
ETag: "v{version}"
Last-Modified: RFC 7231 date
Cache-Control: public, max-age=3600
```

---

## Credit Payment Types

### What is a Credit Payment Type?

A credit payment type is marked with `is_credit: true` and represents payment methods that involve credit/due transactions.

**Example:** The "Due" payment type allows customers to pay later instead of immediately.

### Business Logic

**Validation Rules:**
- ✅ Credit payment types can only be used for sales with a `party_id` (known customer)
- ❌ Walk-in customers (no `party_id`) cannot use credit payment types
- ⚠️ Returns HTTP 400 with error: "You cannot sell on credit to a walk-in customer"

**Example:** When creating a sale
```bash
POST /api/v1/sales

# ✅ Valid - Known customer with credit payment
{
  "party_id": 5,
  "payment_type_id": 5,  # "Due" payment type (is_credit: true)
  "totalAmount": 100.00,
  "paidAmount": 0,
  "dueAmount": 100.00
}

# ❌ Invalid - Walk-in customer with credit payment
{
  "party_id": null,  # Walk-in customer
  "payment_type_id": 5,  # "Due" payment type (is_credit: true)
  "totalAmount": 100.00,
  "paidAmount": 0,
  "dueAmount": 100.00
}
# Returns: HTTP 400 "You cannot sell on credit to a walk-in customer"
```

---

## Using Payment Types in Sales

### Get Payment Types (for UI dropdown)

```bash
# Efficient for dropdowns - includes is_credit flag
curl -X GET "http://localhost:8700/api/v1/payment-types?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Cash",
      "is_credit": false
    },
    {
      "id": 5,
      "name": "Due",
      "is_credit": true
    }
  ]
}
```

### Filter Credit Payment Types (Client-side)

```javascript
// Frontend code example
const paymentTypes = await fetch('/api/v1/payment-types?limit=100');
const nonCreditTypes = data.filter(pt => !pt.is_credit);  // Only non-credit
const creditTypes = data.filter(pt => pt.is_credit);       // Only credit
```

### Use in Sale Creation

```bash
curl -X POST http://localhost:8700/api/v1/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": 1,
    "payment_type_id": 1,  # Cash payment (not credit)
    "totalAmount": 1500.00,
    "paidAmount": 1500.00,
    "dueAmount": 0,
    "isPaid": true,
    "products": "[...]"
  }'
```

---

## Offline-First Sync

Payment types are included in the offline-first sync system:

**Sync Endpoints:**
- `GET /api/v1/sync/full` - Download all payment types initially
- `GET /api/v1/sync/changes?since=ISO8601` - Get changes since last sync
- `POST /api/v1/sync/batch` - Upload payment type changes

**Versioning:**
- Each payment type has a `version` field
- Version auto-increments on update
- Used to detect conflicts in offline-first scenarios

---

## Rate Limiting

Standard API rate limits apply:
- 60 requests per minute for authenticated endpoints
- 429 Too Many Requests if exceeded

---

## Common Use Cases

### 1. POS Cash Register Setup
Get active payment types for checkout screen:
```bash
GET /api/v1/payment-types?status=1&limit=50
```

### 2. Due Collection
Get credit payment types to show on due collection screen:
```javascript
// Frontend code
const creditTypes = await fetch('/api/v1/payment-types')
  .then(r => r.json())
  .then(data => data.data.filter(pt => pt.is_credit));
```

### 3. Reports & Analytics
Get all payment types (including inactive) for comprehensive reports:
```bash
GET /api/v1/payment-types?limit=1000
```

### 4. Settings Management
Update payment type details:
```bash
PUT /api/v1/payment-types/5
{
  "name": "Store Credit",
  "is_credit": true
}
```

---

## Troubleshooting

### Issue: "You cannot sell on credit to a walk-in customer"

**Cause:** Attempted to create a sale using a credit payment type without specifying a customer.

**Solution:** Either:
1. Select a known customer (set `party_id`)
2. Use a non-credit payment type (check `is_credit: false`)

### Issue: Payment type not found in dropdown

**Possible causes:**
- Status is set to inactive (`status: 0`)
- Payment type was soft-deleted
- Wrong pagination mode being used

**Solution:**
```bash
# Include inactive payment types
GET /api/v1/payment-types?status=0&status=1
```

---

## Related Endpoints

- [Sales API](/api/v1/sales) - Use payment_type_id in sale creation
- [Due Collection API](/api/v1/dues) - Use payment_type_id for payments
- [Expenses API](/api/v1/expenses) - Use payment_type_id for expense recording
- [Incomes API](/api/v1/incomes) - Use payment_type_id for income tracking

---

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique payment type identifier |
| `name` | string | Payment type name (e.g., "Cash", "Due") |
| `is_credit` | boolean | Whether this is a credit-based payment type |
| `status` | integer | 1 = active, 0 = inactive |
| `version` | integer | Sync version for offline-first |
| `business_id` | integer | Associated business |
| `created_at` | timestamp | Creation time (ISO8601) |
| `updated_at` | timestamp | Last update time (ISO8601) |
| `deleted_at` | timestamp | Soft delete time (null if active) |

---

**Last Updated:** January 15, 2025  
**API Version:** 1.0.0  
**Status:** ✅ Active
