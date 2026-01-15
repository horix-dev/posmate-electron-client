# Supplier & Customer API Documentation

**Version:** 1.0  
**Last Updated:** January 14, 2026  
**Base URL:** `/api/v1`  
**Authentication:** Bearer Token (Laravel Sanctum)  

---

## Table of Contents

1. [Overview](#overview)
2. [Party Types & Differences](#party-types--differences)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Error Handling](#error-handling)
6. [Filtering & Search](#filtering--search)
7. [Pagination](#pagination)
8. [Best Practices](#best-practices)
9. [Related Endpoints](#related-endpoints)

---

## Overview

The Horix POS Pro system uses a unified **Party** API that handles both **Customers** and **Suppliers**. A "party" is any entity that your business transacts with - whether buying from them (suppliers) or selling to them (customers).

### Key Features
- ✅ **Unified Management** - Single API for all party types
- ✅ **Multi-type Support** - Retailers, Dealers, Wholesalers, Suppliers
- ✅ **Credit Limits** - Set and track credit limits per customer
- ✅ **Opening Balances** - Track initial due/advance amounts
- ✅ **Soft Deletes** - Archive parties without losing data
- ✅ **Image Support** - Store party logos/images
- ✅ **Due Tracking** - Automatic calculation of outstanding dues
- ✅ **Multi-tenant** - Automatic business scoping

---

## Party Types & Differences

### Party Type Definitions

| Type | Description | Typical Use | Credit Feature |
|------|-------------|-------------|-----------------|
| **Retailer** | Retail store/end customer | Single purchase customers | Supported |
| **Dealer** | Dealer/distributor | Recurring purchases | Supported |
| **Wholesaler** | Wholesale buyer | Bulk purchases | Supported |
| **Supplier** | Supplier/vendor | Purchases inventory from them | N/A |

### Differences Between Customer and Supplier

| Feature | Customer | Supplier |
|---------|----------|----------|
| **Role** | Buys from your business | Sells to your business |
| **Type** | Retailer, Dealer, Wholesaler | Supplier |
| **Transactions** | Sales, Sales Returns | Purchases, Purchase Returns |
| **Due Calculation** | From sales | From purchases |
| **Primary Interaction** | In sales flow | In purchase flow |
| **Credit Limit** | Affects sale approval | Informational |

### Opening Balance Types

- **due** - Party owes you money (customer has outstanding balance)
- **advance** - You owe party money (prepayment/advance)

---

## API Endpoints

### 1. List All Parties

Retrieve all customers and suppliers for your business.

```http
GET /api/v1/parties
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `archived` | boolean | Show only soft-deleted parties (default: false) |
| `with_archived` | boolean | Include soft-deleted parties in results |
| `type` | string | Filter by party type: `Retailer`, `Dealer`, `Wholesaler`, `Supplier` |
| `search` | string | Search by name, email, or phone (partial match) |

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "business_id": 1,
      "name": "John Customer",
      "email": "john@email.com",
      "phone": "+1234567890",
      "address": "123 Main St, City",
      "type": "Retailer",
      "due": 500.00,
      "wallet": 0,
      "credit_limit": 10000.00,
      "opening_balance": 0,
      "opening_balance_type": "due",
      "image": "/storage/parties/image.jpg",
      "version": 1,
      "created_at": "2025-12-01T10:30:00Z",
      "updated_at": "2025-12-01T10:30:00Z"
    },
    {
      "id": 2,
      "business_id": 1,
      "name": "ABC Suppliers",
      "email": "abc@suppliers.com",
      "phone": "+0987654321",
      "address": "456 Supply Ave",
      "type": "Supplier",
      "due": 2500.00,
      "wallet": 0,
      "credit_limit": null,
      "opening_balance": 1000.00,
      "opening_balance_type": "advance",
      "image": null,
      "version": 2,
      "created_at": "2025-11-15T14:20:00Z",
      "updated_at": "2025-12-10T09:15:00Z"
    }
  ]
}
```

---

### 2. Get Single Party Details

Retrieve detailed information for a specific customer or supplier.

```http
GET /api/v1/parties/{id}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Party ID |

**Response:**
```json
{
  "success": true,
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "business_id": 1,
    "name": "John Customer",
    "email": "john@email.com",
    "phone": "+1234567890",
    "address": "123 Main St, City",
    "type": "Retailer",
    "due": 500.00,
    "wallet": 0,
    "credit_limit": 10000.00,
    "opening_balance": 0,
    "opening_balance_type": "due",
    "image": "/storage/parties/image.jpg",
    "version": 1,
    "created_at": "2025-12-01T10:30:00Z",
    "updated_at": "2025-12-01T10:30:00Z"
  },
  "_server_timestamp": "2026-01-14T10:45:30Z"
}
```

**HTTP Status Codes:**
- `200 OK` - Party found
- `404 Not Found` - Party does not exist
- `401 Unauthorized` - Invalid or missing token

---

### 3. Create Party

Create a new customer or supplier.

```http
POST /api/v1/parties
```

**Content-Type:** `application/json` or `multipart/form-data`

**Request Body:**

```json
{
  "name": "string (required, max: 255)",
  "type": "string (required, enum: Retailer|Dealer|Wholesaler|Supplier)",
  "phone": "string (optional, max: 20, unique per business)",
  "email": "string (optional, max: 255)",
  "address": "string (optional, max: 255)",
  "credit_limit": "number (optional, min: 0, max: 999999999999.99)",
  "opening_balance": "number (optional, default: 0)",
  "opening_balance_type": "string (required, enum: due|advance)"
}
```

**File Upload (optional):**
```
image: file (optional, accepted: jpeg, png, jpg, gif, max: 2MB)
```

**Example Request (JSON):**
```bash
curl -X POST http://localhost:8700/api/v1/parties \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Retail Store",
    "type": "Retailer",
    "phone": "+1-555-0123",
    "email": "store@example.com",
    "address": "789 Commerce Blvd",
    "credit_limit": 50000.00,
    "opening_balance": 0,
    "opening_balance_type": "due"
  }'
```

**Example Request (with Image - multipart/form-data):**
```bash
curl -X POST http://localhost:8700/api/v1/parties \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Premium Retail Store" \
  -F "type=Retailer" \
  -F "phone=+1-555-0123" \
  -F "email=store@example.com" \
  -F "address=789 Commerce Blvd" \
  -F "credit_limit=50000.00" \
  -F "opening_balance=0" \
  -F "opening_balance_type=due" \
  -F "image=@/path/to/image.jpg"
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Data saved successfully.",
  "data": {
    "id": 5,
    "business_id": 1,
    "name": "Premium Retail Store",
    "type": "Retailer",
    "phone": "+1-555-0123",
    "email": "store@example.com",
    "address": "789 Commerce Blvd",
    "credit_limit": 50000.00,
    "opening_balance": 0,
    "opening_balance_type": "due",
    "due": 0,
    "wallet": 0,
    "image": "/storage/parties/img_12345.jpg",
    "version": 1,
    "created_at": "2026-01-14T10:45:30Z",
    "updated_at": "2026-01-14T10:45:30Z"
  },
  "_server_timestamp": "2026-01-14T10:45:30Z"
}
```

**Validation Rules:**
- `name` - Required, max 255 characters, unique per business
- `type` - Required, must be one of: Retailer, Dealer, Wholesaler, Supplier
- `phone` - Optional, max 20 characters, unique per business (only if provided)
- `email` - Optional, max 255 characters, valid email format
- `address` - Optional, max 255 characters
- `credit_limit` - Optional, numeric, min 0
- `opening_balance` - Optional, numeric (can be negative for advance)
- `opening_balance_type` - Required, must be 'due' or 'advance'

**Error Response (422 Unprocessable Entity):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": ["The name is required."],
    "phone": ["The phone has already been taken for this business."],
    "type": ["The type must be one of: Retailer, Dealer, Wholesaler, Supplier."]
  }
}
```

---

### 4. Update Party

Update an existing customer or supplier.

```http
PUT /api/v1/parties/{id}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Party ID |

**Request Body:** Same as Create Party (all fields optional for update)

```json
{
  "name": "string (optional)",
  "type": "string (optional)",
  "phone": "string (optional)",
  "email": "string (optional)",
  "address": "string (optional)",
  "credit_limit": "number (optional)",
  "opening_balance": "number (optional)",
  "opening_balance_type": "string (optional)"
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:8700/api/v1/parties/5 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Retail Store - Updated",
    "credit_limit": 75000.00,
    "address": "789 Commerce Blvd, Suite 200"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Data updated successfully.",
  "data": {
    "id": 5,
    "business_id": 1,
    "name": "Premium Retail Store - Updated",
    "type": "Retailer",
    "phone": "+1-555-0123",
    "email": "store@example.com",
    "address": "789 Commerce Blvd, Suite 200",
    "credit_limit": 75000.00,
    "opening_balance": 0,
    "opening_balance_type": "due",
    "due": 0,
    "wallet": 0,
    "image": "/storage/parties/img_12345.jpg",
    "version": 2,
    "created_at": "2026-01-14T10:45:30Z",
    "updated_at": "2026-01-14T11:20:15Z"
  },
  "_server_timestamp": "2026-01-14T11:20:15Z"
}
```

**Important Notes:**
- Only provide fields you want to update
- Version increments with each update
- Business-scoped (unique phone constraint only applies within business)
- Cannot update deleted parties (use restore first)

---

### 5. Delete Party

Soft-delete a customer or supplier (archive).

```http
DELETE /api/v1/parties/{id}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Party ID |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Data deleted successfully.",
  "data": {}
}
```

**Restrictions:**
- Party cannot be deleted if it has associated transactions (sales, purchases, or dues)
- Use soft delete (archival) - data is not permanently removed
- Can be restored using the restore endpoint

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Cannot delete party with existing transactions."
}
```

---

### 6. Restore Archived Party

Restore a previously soft-deleted customer or supplier.

```http
POST /api/v1/parties/{id}/restore
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Party ID (must be soft-deleted) |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Party restored successfully.",
  "data": {
    "id": 5,
    "business_id": 1,
    "name": "Premium Retail Store",
    "type": "Retailer",
    "phone": "+1-555-0123",
    "email": "store@example.com",
    "address": "789 Commerce Blvd",
    "credit_limit": 75000.00,
    "opening_balance": 0,
    "opening_balance_type": "due",
    "due": 0,
    "wallet": 0,
    "image": "/storage/parties/img_12345.jpg",
    "version": 2,
    "deleted_at": null,
    "created_at": "2026-01-14T10:45:30Z",
    "updated_at": "2026-01-14T11:30:45Z"
  },
  "_server_timestamp": "2026-01-14T11:30:45Z"
}
```

---

## Request/Response Examples

### Example 1: Create a Supplier

**Scenario:** Adding a new supplier to purchase inventory from.

```bash
curl -X POST http://localhost:8700/api/v1/parties \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Wholesale Inc.",
    "type": "Supplier",
    "phone": "+1-800-TECH-123",
    "email": "sales@techwholesale.com",
    "address": "1000 Industrial Park Dr, Tech City, TC 12345",
    "opening_balance": 5000.00,
    "opening_balance_type": "advance"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Data saved successfully.",
  "data": {
    "id": 15,
    "business_id": 1,
    "name": "Tech Wholesale Inc.",
    "type": "Supplier",
    "phone": "+1-800-TECH-123",
    "email": "sales@techwholesale.com",
    "address": "1000 Industrial Park Dr, Tech City, TC 12345",
    "credit_limit": null,
    "opening_balance": 5000.00,
    "opening_balance_type": "advance",
    "due": 5000.00,
    "wallet": 0,
    "image": null,
    "version": 1,
    "created_at": "2026-01-14T12:00:00Z",
    "updated_at": "2026-01-14T12:00:00Z"
  }
}
```

**Explanation:**
- `type: "Supplier"` indicates this is a supplier, not a customer
- `opening_balance_type: "advance"` means you owe the supplier money (pre-payment)
- `due: 5000.00` reflects the opening balance owed to supplier

---

### Example 2: Create a Retail Customer with Credit Limit

**Scenario:** Adding a retail store that buys on credit.

```bash
curl -X POST http://localhost:8700/api/v1/parties \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Retail Store",
    "type": "Retailer",
    "phone": "+1-555-RETAIL-1",
    "email": "manager@downtownretail.com",
    "address": "123 Main Street, Downtown",
    "credit_limit": 25000.00,
    "opening_balance": 0,
    "opening_balance_type": "due"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Data saved successfully.",
  "data": {
    "id": 16,
    "business_id": 1,
    "name": "Downtown Retail Store",
    "type": "Retailer",
    "phone": "+1-555-RETAIL-1",
    "email": "manager@downtownretail.com",
    "address": "123 Main Street, Downtown",
    "credit_limit": 25000.00,
    "opening_balance": 0,
    "opening_balance_type": "due",
    "due": 0,
    "wallet": 0,
    "image": null,
    "version": 1,
    "created_at": "2026-01-14T12:15:30Z",
    "updated_at": "2026-01-14T12:15:30Z"
  }
}
```

**Explanation:**
- `type: "Retailer"` indicates a retail customer
- `credit_limit: 25000.00` customer can purchase up to this amount on credit
- `due: 0` means they currently have no outstanding balance

---

### Example 3: Bulk Customer Import with Different Types

**Scenario:** Creating multiple customer types.

```bash
# Wholesaler Customer
curl -X POST http://localhost:8700/api/v1/parties \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Regional Wholesale Co.",
    "type": "Wholesaler",
    "phone": "+1-555-WHOLE-1",
    "email": "wholesale@regionalbiz.com",
    "credit_limit": 100000.00,
    "opening_balance": 0,
    "opening_balance_type": "due"
  }'

# Dealer Customer
curl -X POST http://localhost:8700/api/v1/parties \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Dealer Ltd.",
    "type": "Dealer",
    "phone": "+1-555-DEAL-1",
    "email": "dealer@premium.com",
    "credit_limit": 50000.00,
    "opening_balance": 0,
    "opening_balance_type": "due"
  }'
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Invalid Party Type
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "type": ["The type must be one of: Retailer, Dealer, Wholesaler, Supplier."]
  }
}
```

#### 401 Unauthorized - Missing Authentication
```json
{
  "message": "Unauthenticated."
}
```

#### 404 Not Found - Party Does Not Exist
```json
{
  "success": false,
  "message": "Party not found"
}
```

#### 422 Unprocessable Entity - Duplicate Phone
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "phone": ["The phone has already been taken for this business."]
  }
}
```

#### 422 Unprocessable Entity - Cannot Delete with Transactions
```json
{
  "success": false,
  "message": "Cannot delete party with existing transactions."
}
```

---

## Filtering & Search

### Filter by Party Type

```bash
# Get all retail customers
GET /api/v1/parties?type=Retailer

# Get all suppliers
GET /api/v1/parties?type=Supplier

# Get all dealers and wholesalers
GET /api/v1/parties?type=Dealer
GET /api/v1/parties?type=Wholesaler
```

### Search Functionality

```bash
# Search by name (partial match)
GET /api/v1/parties?search=Premium

# Search by email
GET /api/v1/parties?search=store@example.com

# Search by phone
GET /api/v1/parties?search=555-0123
```

### View Archived Parties

```bash
# Show only archived parties
GET /api/v1/parties?archived=true

# Show both active and archived
GET /api/v1/parties?with_archived=true
```

### Combined Filters

```bash
# All retail customers named "John"
GET /api/v1/parties?type=Retailer&search=John

# All suppliers that are archived
GET /api/v1/parties?archived=true&type=Supplier
```

---

## Pagination

The parties endpoint supports multiple pagination modes:

### Mode 1: Default (All Items)
```bash
GET /api/v1/parties
```
Returns all parties up to 1000 items.

### Mode 2: Limit Mode (Dropdown)
```bash
GET /api/v1/parties?limit=50
```
Returns first 50 parties as flat array (good for dropdowns).

### Mode 3: Offset Pagination (Tables)
```bash
GET /api/v1/parties?page=1&per_page=20
```
Returns paginated response with pagination metadata.

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    { /* party 1 */ },
    { /* party 2 */ }
  ],
  "pagination": {
    "total": 150,
    "per_page": 20,
    "current_page": 1,
    "last_page": 8,
    "from": 1,
    "to": 20
  }
}
```

### Mode 4: Cursor Pagination (Sync)
```bash
GET /api/v1/parties?cursor=0&per_page=500
```
Returns items with cursor for efficient syncing.

---

## Best Practices

### 1. Validate Data Before Sending

Always validate party information on client-side before sending:
```javascript
// Example validation
if (!name || name.length > 255) {
  throw new Error("Name is required and max 255 characters");
}
if (!['Retailer', 'Dealer', 'Wholesaler', 'Supplier'].includes(type)) {
  throw new Error("Invalid party type");
}
```

### 2. Handle Soft Deletes Gracefully

When listing parties, consider whether to show archived items:
```bash
# Show active parties only (default)
GET /api/v1/parties

# Show active and archived
GET /api/v1/parties?with_archived=true

# Show only archived for restore operations
GET /api/v1/parties?archived=true
```

### 3. Use Appropriate Credit Limits

- **Retailer**: Set based on purchase history
- **Dealer**: Higher credit limits for wholesale operations
- **Wholesaler**: Highest credit limits
- **Supplier**: Use opening_balance instead

### 4. Handle Concurrent Updates

Use version numbers to detect conflicts:
```javascript
// If response shows version mismatch, refresh party data
if (response.data.version !== localVersion) {
  console.warn("Party data changed on server");
  // Fetch fresh data and retry
}
```

### 5. Batch Operations

For multiple party operations, consider:
```bash
# Create multiple parties in separate requests
for (let party of partiesToCreate) {
  await fetch('/api/v1/parties', {
    method: 'POST',
    body: JSON.stringify(party)
  });
}

# OR implement bulk import if available
```

### 6. Error Recovery

Implement proper error handling:
```javascript
try {
  const response = await fetch('/api/v1/parties', { method: 'POST', body: JSON.stringify(party) });
  
  if (response.status === 422) {
    const errors = await response.json();
    // Display validation errors to user
    console.error('Validation errors:', errors.errors);
  } else if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return data.data;
} catch (error) {
  console.error('Failed to create party:', error);
  // Show user-friendly error message
}
```

---

## Related Endpoints

### Sales (Customers)
- `GET /api/v1/sales` - List all sales
- `POST /api/v1/sales` - Create new sale
- `GET /api/v1/sales/{id}` - Get sale details
- `GET /api/v1/sales/report` - Sales report

### Purchases (Suppliers)
- `GET /api/v1/purchase` - List all purchases
- `POST /api/v1/purchase` - Create new purchase
- `GET /api/v1/purchase/{id}` - Get purchase details

### Due Collections
- `GET /api/v1/dues` - List all dues
- `POST /api/v1/dues` - Create new due collection
- `GET /api/v1/dues/invoices?party_id={id}` - Get invoices for party

### Due Collections (Alternative)
- `GET /api/v1/dues` - List dues with party filtering
- `POST /api/v1/dues` - Record payment collection

### Party-Related Reports
- `GET /api/v1/sales` - Filter sales by party_id
- `GET /api/v1/purchase` - Filter purchases by party_id
- `GET /api/v1/dues` - View outstanding dues per party

---

## Field Reference

### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique party identifier |
| `business_id` | integer | Business this party belongs to |
| `name` | string | Party name (required) |
| `type` | string | Party type: Retailer, Dealer, Wholesaler, Supplier |
| `phone` | string | Contact phone number |
| `email` | string | Email address |
| `address` | string | Physical address |
| `credit_limit` | number | Maximum credit amount for customers (null for suppliers) |
| `opening_balance` | number | Initial balance amount |
| `opening_balance_type` | string | 'due' (they owe you) or 'advance' (you owe them) |
| `due` | number | Current outstanding balance |
| `wallet` | number | Prepaid wallet balance (0 typically) |
| `image` | string | URL to party logo/image |
| `version` | integer | Record version (increments on updates) |
| `created_at` | timestamp | Record creation time (ISO8601) |
| `updated_at` | timestamp | Last update time (ISO8601) |
| `deleted_at` | timestamp | Soft delete time (null if active) |

---

## Authentication

All Party endpoints require a valid Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8700/api/v1/parties
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
- ✅ Index on `phone` and `business_id` for fast lookups
- ✅ Use pagination for large result sets
- ✅ Cache list responses if party data changes infrequently

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-01-14 | Initial comprehensive documentation created |

---

**For questions or issues**, refer to the main [API_DOCUMENTATION.md](API_DOCUMENTATION.md) or contact the development team.
