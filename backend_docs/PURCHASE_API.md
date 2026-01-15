# Purchase API Documentation

**Version:** 1.0  
**Last Updated:** January 14, 2026  
**Base URL:** `/api/v1`  
**Authentication:** Bearer Token (Laravel Sanctum)  

---

## Table of Contents

1. [Overview](#overview)
2. [Purchase Workflow](#purchase-workflow)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Pagination Modes](#pagination-modes)
6. [Filtering & Search](#filtering--search)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Related Endpoints](#related-endpoints)

---

## Overview

The Purchase API manages supplier orders and inventory intake. It tracks all purchases from suppliers, including product quantities, pricing, dates, and payment status.

### Key Features
- ✅ **Multi-Supplier Support** - Purchase from multiple suppliers
- ✅ **Batch Tracking** - Track batches with manufacturing and expiry dates
- ✅ **Variant Support** - Handle variant product purchases separately
- ✅ **Flexible Pricing** - Store multiple price points (sale, dealer, wholesale)
- ✅ **Due Management** - Track outstanding supplier balances
- ✅ **Stock Integration** - Auto-create/update stock on purchase
- ✅ **Purchase Returns** - Track and manage purchase returns
- ✅ **Multi-tenant Safe** - Business-scoped isolation
- ✅ **4 Pagination Modes** - Support various UI needs

### Common Use Cases
- Recording purchase orders from suppliers
- Managing inventory intake
- Tracking costs and profit margins
- Monitoring supplier balances and dues
- Creating return orders for defective products

---

## Purchase Workflow

### Step-by-Step Flow

```
1. Create Purchase
   ├─ Select Supplier (party)
   ├─ Add Products with quantities
   ├─ Set Pricing (cost, sale, dealer, wholesale)
   ├─ Set Dates (manufacture, expiry)
   └─ Record Payment

2. System Actions
   ├─ Auto-creates Stock record
   ├─ Updates Stock quantities
   ├─ Records Supplier Due (if unpaid)
   ├─ Updates Balance (if payment recorded)
   └─ Generates Invoice Number

3. Later Actions
   ├─ View Purchase Details
   ├─ Filter/Search Purchases
   ├─ Record Purchase Returns
   └─ Pay Outstanding Dues
```

### Payment Handling

```
Total Amount = Sum of (quantity × cost_price) + VAT - Discount + Shipping

Paid Status:
- isPaid = true   → paidAmount = totalAmount, dueAmount = 0
- isPaid = false  → paidAmount = 0, dueAmount = totalAmount
- Partial Payment → paidAmount = X, dueAmount = totalAmount - paidAmount
```

---

## API Endpoints

### 1. List Purchases

Retrieve all purchases with flexible pagination and filtering.

```http
GET /api/v1/purchase
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Return up to N items (1-1000) - for dropdown mode |
| `page` | integer | Page number for offset pagination - for table mode |
| `per_page` | integer | Items per page (max 100) - with `page` parameter |
| `cursor` | integer | Starting ID for cursor pagination - for sync mode |
| `party_id` | integer | Filter by supplier ID |
| `returned-purchase` | boolean | Show only purchases with returns |
| `isPaid` | boolean | Filter by payment status (true/false) |
| `invoiceNumber` | string | Exact invoice number match |
| `date_from` | date | Start date (YYYY-MM-DD) |
| `date_to` | date | End date (YYYY-MM-DD) |
| `search` | string | Search invoice number or supplier name (partial match) |

**Response (Default Mode - HTTP 200):**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "invoiceNumber": "P-00001",
      "purchaseDate": "2026-01-10",
      "totalAmount": 5000.00,
      "discountAmount": 100.00,
      "discount_percent": 2.0,
      "discount_type": "percentage",
      "shipping_charge": 50.00,
      "vat_amount": 500.00,
      "vat_percent": 10.0,
      "paidAmount": 4900.00,
      "dueAmount": 0,
      "change_amount": 0,
      "isPaid": true,
      "paymentType": "cash",
      "created_at": "2026-01-10T10:00:00Z",
      "updated_at": "2026-01-10T10:00:00Z",
      "user": {
        "id": 1,
        "name": "John Doe",
        "role": "admin"
      },
      "party": {
        "id": 2,
        "name": "ABC Suppliers",
        "email": "abc@suppliers.com",
        "phone": "+1234567890",
        "type": "Supplier"
      },
      "branch": {
        "id": 1,
        "name": "Main Branch",
        "phone": "+1234567890",
        "address": "123 Main St"
      },
      "vat": {
        "id": 1,
        "name": "VAT 10%",
        "rate": 10.0
      },
      "payment_type": {
        "id": 1,
        "name": "Cash"
      },
      "details": [
        {
          "id": 1,
          "product_id": 1,
          "variant_id": null,
          "stock_id": 1,
          "quantities": 50,
          "productPurchasePrice": 100.00,
          "productSalePrice": 150.00,
          "productDealerPrice": 130.00,
          "productWholeSalePrice": 120.00,
          "profit_percent": 50,
          "subTotal": 5000.00,
          "mfg_date": "2026-01-01",
          "expire_date": "2027-01-01",
          "product": {
            "id": 1,
            "productName": "Electronics Item",
            "product_type": "simple",
            "category": {
              "id": 1,
              "categoryName": "Electronics"
            }
          },
          "variant": null,
          "stock": {
            "id": 1,
            "batch_no": "BATCH001",
            "expire_date": "2027-01-01",
            "mfg_date": "2026-01-01"
          }
        }
      ],
      "purchaseReturns": []
    }
  ]
}
```

**Response (Offset Pagination Mode - HTTP 200):**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "pagination": {
    "total": 1250,
    "per_page": 20,
    "current_page": 1,
    "last_page": 63,
    "from": 1,
    "to": 20
  }
}
```

**Response (Cursor Pagination Mode - HTTP 200):**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "cursor": 501,
  "has_more": true
}
```

**HTTP Status Codes:**
- `200 OK` - Purchases retrieved successfully
- `401 Unauthorized` - Invalid or missing token

---

### 2. Get Single Purchase

Retrieve detailed information for a specific purchase.

```http
GET /api/v1/purchase/{id}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Purchase ID |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": {
    "id": 1,
    "invoiceNumber": "P-00001",
    "purchaseDate": "2026-01-10",
    "totalAmount": 5000.00,
    "discountAmount": 100.00,
    "discount_percent": 2.0,
    "discount_type": "percentage",
    "shipping_charge": 50.00,
    "vat_amount": 500.00,
    "vat_percent": 10.0,
    "paidAmount": 4900.00,
    "dueAmount": 0,
    "change_amount": 0,
    "isPaid": true,
    "paymentType": "cash",
    "created_at": "2026-01-10T10:00:00Z",
    "updated_at": "2026-01-10T10:00:00Z",
    "user": {
      "id": 1,
      "name": "John Doe",
      "role": "admin"
    },
    "party": {
      "id": 2,
      "name": "ABC Suppliers",
      "email": "abc@suppliers.com",
      "phone": "+1234567890",
      "type": "Supplier"
    },
    "branch": {
      "id": 1,
      "name": "Main Branch"
    },
    "details": [
      {
        "id": 1,
        "product_id": 1,
        "variant_id": null,
        "quantities": 50,
        "productPurchasePrice": 100.00,
        "productSalePrice": 150.00,
        "mfg_date": "2026-01-01",
        "expire_date": "2027-01-01",
        "product": {
          "id": 1,
          "productName": "Electronics Item",
          "productCode": "ELEC001"
        }
      }
    ]
  },
  "_server_timestamp": "2026-01-14T10:45:30Z"
}
```

**Error Responses:**
- `404 Not Found` - Purchase does not exist
- `401 Unauthorized` - Missing authentication

---

### 3. Create Purchase

Record a new purchase from a supplier.

```http
POST /api/v1/purchase
```

**Content-Type:** `application/json`

**Request Body:**

```json
{
  "party_id": "integer (required, supplier)",
  "invoiceNumber": "string (optional, auto-generated if not provided)",
  "purchaseDate": "date (optional, defaults to today)",
  "payment_type_id": "integer (optional)",
  "vat_id": "integer (optional)",
  "vat_amount": "number (optional)",
  "totalAmount": "number (required)",
  "discountAmount": "number (optional, default: 0)",
  "shipping_charge": "number (optional, default: 0)",
  "paidAmount": "number (required)",
  "dueAmount": "number (optional, calculated as totalAmount - paidAmount)",
  "products": [
    {
      "product_id": "integer (required)",
      "variant_id": "integer (optional, for variant products)",
      "batch_no": "string (optional, for batch tracking)",
      "quantities": "number (required)",
      "productPurchasePrice": "number (required, cost per unit)",
      "productSalePrice": "number (optional)",
      "productDealerPrice": "number (optional)",
      "productWholeSalePrice": "number (optional)",
      "profit_percent": "number (optional)",
      "mfg_date": "date (optional)",
      "expire_date": "date (optional)"
    }
  ]
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8700/api/v1/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": 2,
    "purchaseDate": "2026-01-14",
    "payment_type_id": 1,
    "vat_id": 1,
    "totalAmount": 5000.00,
    "discountAmount": 100.00,
    "shipping_charge": 50.00,
    "paidAmount": 4900.00,
    "products": [
      {
        "product_id": 1,
        "quantities": 50,
        "productPurchasePrice": 100.00,
        "productSalePrice": 150.00,
        "productDealerPrice": 130.00,
        "productWholeSalePrice": 120.00,
        "profit_percent": 50,
        "mfg_date": "2026-01-01",
        "expire_date": "2027-01-01"
      }
    ]
  }'
```

**Response (201 Created):**
```json
{
  "message": "Data saved successfully.",
  "data": {
    "id": 1,
    "invoiceNumber": "P-00001",
    "party_id": 2,
    "totalAmount": 5000.00,
    "discountAmount": 100.00,
    "shipping_charge": 50.00,
    "paidAmount": 4900.00,
    "dueAmount": 0,
    "isPaid": true,
    "purchaseDate": "2026-01-14",
    "user_id": 1,
    "business_id": 1,
    "user": {
      "id": 1,
      "name": "John Doe",
      "role": "admin"
    },
    "party": {
      "id": 2,
      "name": "ABC Suppliers",
      "email": "abc@suppliers.com",
      "phone": "+1234567890",
      "type": "Supplier"
    },
    "details": [
      {
        "id": 1,
        "purchase_id": 1,
        "product_id": 1,
        "quantities": 50,
        "productPurchasePrice": 100.00,
        "productSalePrice": 150.00,
        "mfg_date": "2026-01-01",
        "expire_date": "2027-01-01",
        "product": {
          "id": 1,
          "productName": "Electronics Item",
          "category": {
            "id": 1,
            "categoryName": "Electronics"
          }
        }
      }
    ],
    "created_at": "2026-01-14T10:45:30Z",
    "updated_at": "2026-01-14T10:45:30Z"
  }
}
```

**Validation Rules:**
- `party_id` - Required, must exist in parties table, must be type "Supplier"
- `totalAmount` - Required, numeric, min 0
- `paidAmount` - Required, numeric, min 0
- `products` - Required, array with at least 1 product
- `products.*.product_id` - Required, product must exist
- `products.*.quantities` - Required, numeric, min 0.01
- `products.*.productPurchasePrice` - Required, numeric, min 0

**Error Response (422 Unprocessable Entity):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "party_id": ["The party_id field is required."],
    "products": ["The products field is required."]
  }
}
```

**Error Response (400 Bad Request - Credit Limit):**
```json
{
  "success": false,
  "message": "Cannot create purchase. Party due will exceed credit limit!"
}
```

---

### 4. Update Purchase

Update an existing purchase.

```http
PUT /api/v1/purchase/{id}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Purchase ID |

**Request Body:** Same as Create Purchase (all fields optional for update)

**Example Request:**
```bash
curl -X PUT http://localhost:8700/api/v1/purchase/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paidAmount": 5000.00,
    "dueAmount": 0
  }'
```

**Response (200 OK):**
```json
{
  "message": "Data updated successfully.",
  "data": {
    "id": 1,
    "invoiceNumber": "P-00001",
    "paidAmount": 5000.00,
    "dueAmount": 0,
    "isPaid": true,
    "updated_at": "2026-01-14T11:30:00Z"
  }
}
```

**Restrictions:**
- Cannot update purchase if it has associated returns
- Stock quantities will be recalculated if products are modified
- Supplier due balance will be adjusted automatically

---

### 5. Delete Purchase

Delete a purchase record.

```http
DELETE /api/v1/purchase/{id}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Purchase ID |

**Response (200 OK):**
```json
{
  "message": "Data deleted successfully.",
  "data": {}
}
```

**Restrictions:**
- Cannot delete purchase if it has returns
- Stock quantities will be reversed
- Supplier due will be adjusted

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Cannot delete purchase with returns."
}
```

---

## Request/Response Examples

### Example 1: Simple Purchase - Cash Payment

**Scenario:** Buying 50 units of a simple product, paying in cash.

```bash
curl -X POST http://localhost:8700/api/v1/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": 5,
    "purchaseDate": "2026-01-14",
    "payment_type_id": 1,
    "totalAmount": 5000.00,
    "paidAmount": 5000.00,
    "products": [
      {
        "product_id": 10,
        "quantities": 50,
        "productPurchasePrice": 100.00,
        "productSalePrice": 150.00
      }
    ]
  }'
```

**Response:**
```json
{
  "message": "Data saved successfully.",
  "data": {
    "id": 1,
    "invoiceNumber": "P-00001",
    "party_id": 5,
    "totalAmount": 5000.00,
    "paidAmount": 5000.00,
    "dueAmount": 0,
    "isPaid": true,
    "purchaseDate": "2026-01-14",
    "details": [
      {
        "product_id": 10,
        "quantities": 50,
        "productPurchasePrice": 100.00,
        "productSalePrice": 150.00
      }
    ]
  }
}
```

---

### Example 2: Purchase with Discount and Shipping

**Scenario:** Bulk purchase with 10% discount and delivery charge.

```bash
curl -X POST http://localhost:8700/api/v1/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": 3,
    "purchaseDate": "2026-01-14",
    "payment_type_id": 2,
    "totalAmount": 10000.00,
    "discountAmount": 1000.00,
    "shipping_charge": 500.00,
    "paidAmount": 9500.00,
    "products": [
      {
        "product_id": 5,
        "quantities": 100,
        "productPurchasePrice": 85.00,
        "productSalePrice": 135.00
      }
    ]
  }'
```

---

### Example 3: Batch Product Purchase with Expiry Tracking

**Scenario:** Purchasing batch products (e.g., medicines) with mfg and expiry dates.

```bash
curl -X POST http://localhost:8700/api/v1/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": 7,
    "purchaseDate": "2026-01-14",
    "payment_type_id": 3,
    "totalAmount": 20000.00,
    "paidAmount": 10000.00,
    "dueAmount": 10000.00,
    "products": [
      {
        "product_id": 20,
        "batch_no": "BATCH-2026-001",
        "quantities": 500,
        "productPurchasePrice": 40.00,
        "productSalePrice": 75.00,
        "mfg_date": "2026-01-01",
        "expire_date": "2028-01-01"
      }
    ]
  }'
```

---

### Example 4: Variant Product Purchase

**Scenario:** Purchasing variant products (e.g., t-shirts in different sizes).

```bash
curl -X POST http://localhost:8700/api/v1/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": 4,
    "purchaseDate": "2026-01-14",
    "totalAmount": 3000.00,
    "paidAmount": 3000.00,
    "products": [
      {
        "product_id": 15,
        "variant_id": 1,
        "quantities": 25,
        "productPurchasePrice": 50.00,
        "productSalePrice": 100.00
      },
      {
        "product_id": 15,
        "variant_id": 2,
        "quantities": 20,
        "productPurchasePrice": 50.00,
        "productSalePrice": 100.00
      }
    ]
  }'
```

---

### Example 5: Multiple Products Purchase with VAT

**Scenario:** Purchasing multiple product types with VAT included.

```bash
curl -X POST http://localhost:8700/api/v1/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": 6,
    "purchaseDate": "2026-01-14",
    "vat_id": 1,
    "totalAmount": 5500.00,
    "discountAmount": 0,
    "shipping_charge": 100.00,
    "paidAmount": 5500.00,
    "products": [
      {
        "product_id": 8,
        "quantities": 30,
        "productPurchasePrice": 150.00,
        "productSalePrice": 250.00
      },
      {
        "product_id": 12,
        "quantities": 20,
        "productPurchasePrice": 75.00,
        "productSalePrice": 125.00
      }
    ]
  }'
```

---

## Pagination Modes

### Mode 1: Default (All Items with Safety Limit)

```bash
GET /api/v1/purchase
```

Returns all purchases up to 1000 items. Best for initial data load.

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    { /* purchase 1 */ },
    { /* purchase 2 */ }
  ]
}
```

---

### Mode 2: Limit Mode (Dropdown)

```bash
GET /api/v1/purchase?limit=50
```

Returns first 50 purchases as flat array. Perfect for dropdown lists.

**Response:** Same structure as Mode 1, max 50 items.

---

### Mode 3: Offset Pagination (Tables)

```bash
GET /api/v1/purchase?page=1&per_page=20
```

Returns page-based pagination with metadata. Ideal for management tables.

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "pagination": {
    "total": 250,
    "per_page": 20,
    "current_page": 1,
    "last_page": 13,
    "from": 1,
    "to": 20
  }
}
```

**Navigation:**
```bash
# Page 1
GET /api/v1/purchase?page=1&per_page=20

# Page 2
GET /api/v1/purchase?page=2&per_page=20

# Page 13 (last)
GET /api/v1/purchase?page=13&per_page=20
```

---

### Mode 4: Cursor Pagination (Sync)

```bash
GET /api/v1/purchase?cursor=0&per_page=500
```

Returns items with cursor for efficient syncing/export.

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "cursor": 501,
  "has_more": true
}
```

**Navigation:**
```bash
# First batch
GET /api/v1/purchase?cursor=0&per_page=500

# Next batch (use returned cursor)
GET /api/v1/purchase?cursor=501&per_page=500

# When has_more=false, all data synced
GET /api/v1/purchase?cursor=1001&per_page=500
# Response: has_more=false (no more data)
```

---

## Filtering & Search

### Filter by Supplier

```bash
# Get purchases from supplier ID 5
GET /api/v1/purchase?party_id=5

# Combined with limit
GET /api/v1/purchase?party_id=5&limit=50

# Combined with pagination
GET /api/v1/purchase?party_id=5&page=1&per_page=20
```

### Filter by Payment Status

```bash
# Get paid purchases only
GET /api/v1/purchase?isPaid=true

# Get pending/due purchases
GET /api/v1/purchase?isPaid=false
```

### Filter by Date Range

```bash
# Purchases in January 2026
GET /api/v1/purchase?date_from=2026-01-01&date_to=2026-01-31

# Combined with supplier
GET /api/v1/purchase?party_id=5&date_from=2026-01-01&date_to=2026-01-31
```

### Filter Purchases with Returns

```bash
# Show only purchases that have been returned
GET /api/v1/purchase?returned-purchase=true

# Combined with other filters
GET /api/v1/purchase?returned-purchase=true&date_from=2026-01-01
```

### Search by Invoice or Supplier

```bash
# Search invoice number
GET /api/v1/purchase?search=P-00001

# Search supplier name
GET /api/v1/purchase?search=ABC%20Suppliers

# Search with pagination
GET /api/v1/purchase?search=ABC&page=1&per_page=20
```

### Combined Filters

```bash
# All filters together
GET /api/v1/purchase?party_id=5&date_from=2026-01-01&isPaid=false&search=P-000&page=1&per_page=20

# Sync purchases for offline app
GET /api/v1/purchase?date_from=2026-01-01&cursor=0&per_page=500
```

---

## Error Handling

### 401 Unauthorized - Missing/Invalid Token
```json
{
  "message": "Unauthenticated."
}
```

### 404 Not Found - Purchase Does Not Exist
```json
{
  "success": false,
  "message": "Purchase not found"
}
```

### 422 Unprocessable Entity - Validation Failed
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "party_id": ["The party_id field is required."],
    "totalAmount": ["The totalAmount field is required."],
    "products": ["The products field is required."]
  }
}
```

### 400 Bad Request - Supplier Credit Limit Exceeded
```json
{
  "success": false,
  "message": "Cannot create purchase. Party due will exceed credit limit!"
}
```

### 400 Bad Request - Cannot Delete with Returns
```json
{
  "success": false,
  "message": "Cannot delete purchase with returns."
}
```

### 500 Internal Server Error - Server Error
```json
{
  "message": "Error message describing what went wrong"
}
```

---

## Best Practices

### 1. Input Validation

Always validate required fields before sending:
```javascript
if (!partyId || !totalAmount || !paidAmount || !products.length) {
  throw new Error("Missing required fields");
}
```

### 2. Price Consistency

Ensure pricing makes sense:
```javascript
// Cost ≤ Sale ≤ Dealer ≤ Wholesale (or set strategically)
if (productSalePrice < productPurchasePrice) {
  console.warn("Warning: Selling below cost price");
}
```

### 3. Due Amount Handling

For partial payments:
```javascript
const dueAmount = totalAmount - paidAmount;
if (dueAmount > 0) {
  // Track as pending payment
  // Supplier balance will increase
}
```

### 4. Batch/Expiry Tracking

For batch products, always include dates:
```javascript
const purchaseItem = {
  product_id: id,
  batch_no: batchNumber,
  quantities: qty,
  productPurchasePrice: cost,
  mfg_date: manufacturingDate,  // YYYY-MM-DD
  expire_date: expiryDate        // YYYY-MM-DD
};
```

### 5. Pagination Selection

Choose appropriate mode:
```javascript
// For dropdown lists
fetch('/api/v1/purchase?limit=50')

// For tables with sorting
fetch('/api/v1/purchase?page=1&per_page=20')

// For offline sync
fetch('/api/v1/purchase?cursor=0&per_page=500')

// For reports/exports
fetch('/api/v1/purchase?cursor=0&per_page=1000')
```

### 6. Error Recovery

Implement proper error handling:
```javascript
try {
  const response = await fetch('/api/v1/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(purchaseData)
  });
  
  if (response.status === 422) {
    const errors = await response.json();
    // Show validation errors to user
    console.error('Validation errors:', errors.errors);
  } else if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return data.data;
} catch (error) {
  console.error('Failed to create purchase:', error);
  // Show user-friendly error message
}
```

### 7. Batch Operations

For multiple purchases, use individual requests with proper rate-limiting:
```javascript
async function createPurchases(purchases) {
  const results = [];
  
  for (const purchase of purchases) {
    try {
      const response = await fetch('/api/v1/purchase', {
        method: 'POST',
        body: JSON.stringify(purchase)
      });
      results.push(await response.json());
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({ error: error.message });
    }
  }
  
  return results;
}
```

### 8. Stock Integration

Understand stock auto-creation:
```
When Purchase is Created:
1. System creates/updates Stock record for each product
2. Stock quantity = existing + purchase quantity
3. Batch/expiry info linked to stock
4. Pricing (sale, dealer, wholesale) stored in stock
```

---

## Related Endpoints

### Stock Management
- `GET /api/v1/stocks` - List all stock
- `POST /api/v1/stocks` - Add/update stock
- `GET /api/v1/stocks/{id}` - Get stock details
- `PUT /api/v1/stocks/{id}` - Update stock

### Purchase Returns
- `GET /api/v1/purchases-return` - List purchase returns
- `POST /api/v1/purchases-return` - Create return
- `GET /api/v1/purchases-return/{id}` - Get return details

### Supplier Management
- `GET /api/v1/parties?type=Supplier` - List all suppliers
- `POST /api/v1/parties` - Create new supplier
- `PUT /api/v1/parties/{id}` - Update supplier info

### Due Collection
- `GET /api/v1/dues` - View supplier dues
- `POST /api/v1/dues` - Record supplier payment
- `GET /api/v1/dues/invoices?party_id={id}` - Get unpaid purchases

### Finance
- `GET /api/v1/summary` - Business summary with purchase totals
- `GET /api/v1/dashboard` - Dashboard with purchase statistics

---

## Field Reference

### Purchase Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique purchase identifier |
| `invoiceNumber` | string | Purchase invoice number |
| `party_id` | integer | Supplier ID |
| `totalAmount` | decimal | Total purchase amount |
| `discountAmount` | decimal | Discount amount |
| `discount_percent` | decimal | Discount percentage |
| `shipping_charge` | decimal | Shipping cost |
| `vat_amount` | decimal | Tax amount |
| `vat_percent` | decimal | Tax percentage |
| `paidAmount` | decimal | Amount paid |
| `dueAmount` | decimal | Amount still owed |
| `isPaid` | boolean | Payment status |
| `purchaseDate` | date | Date of purchase |
| `payment_type_id` | integer | Payment method ID |
| `user_id` | integer | User who created purchase |
| `business_id` | integer | Business ID |
| `created_at` | timestamp | Creation time (ISO8601) |
| `updated_at` | timestamp | Last update time (ISO8601) |

### Purchase Detail Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Line item ID |
| `purchase_id` | integer | Parent purchase ID |
| `product_id` | integer | Product ID |
| `variant_id` | integer | Variant ID (if variant product) |
| `quantities` | decimal | Quantity purchased |
| `productPurchasePrice` | decimal | Cost per unit |
| `productSalePrice` | decimal | Selling price per unit |
| `productDealerPrice` | decimal | Dealer price per unit |
| `productWholeSalePrice` | decimal | Wholesale price per unit |
| `mfg_date` | date | Manufacturing date |
| `expire_date` | date | Expiry date |
| `profit_percent` | decimal | Expected profit margin % |

---

## Authentication

All Purchase endpoints require a valid Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8700/api/v1/purchase
```

**Getting a Token:**
```bash
curl -X POST http://localhost:8700/api/v1/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

Response includes `token` field to use in Authorization header.

---

## Rate Limiting & Performance

- ✅ No explicit rate limits (adjust per deployment)
- ✅ Index on `party_id` and `purchaseDate` for fast filtering
- ✅ Use pagination for large result sets (don't fetch all without limit)
- ✅ Cache list responses if purchase data changes infrequently
- ✅ Use cursor pagination for sync/export of large datasets

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-01-14 | Initial comprehensive documentation created |

---

**For questions or issues**, refer to the main [API_DOCUMENTATION.md](API_DOCUMENTATION.md) or contact the development team.
