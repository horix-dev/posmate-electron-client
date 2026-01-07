# Horix POS Pro - API Quick Reference

**Base URL:** `http://your-domain/api/v1`  
**Last Updated:** December 27, 2025

---

## 🎉 Recent Updates

### Due Collection API - Complete CRUD (Dec 27, 2025) ✅
- ✅ **8 Full Endpoints**: List, Show, Store, Update, Destroy, DeleteAll, Filter, GetDueInvoices
- ✅ **Atomic Transactions**: Properly updates parties, sales/purchases, due_collects, branches
- ✅ **Payment Difference Handling**: Correctly tracks increases/decreases with balance adjustments
- ✅ **Invoice Management**: Get due invoices for party (for form population)
- ✅ **Flexible Pagination**: 4 modes (default, limit, offset, cursor)

### Quality Assurance (Dec 2025)
- ✅ **140 tests passing** with 1,012 assertions
- ✅ 100% API endpoint coverage for core features
- ✅ Comprehensive pagination testing (all 4 modes)

### New Features
- ✅ **Expired Batch Validation** - Automatic prevention in sales (406 error)
- ✅ **Batch Movement Tracking** - Full audit trail for all stock operations
- ✅ **Flexible Input Formats** - Sales endpoint accepts array or JSON string
- ✅ **Field Name Aliases** - `quantity`/`quantities`, `paid`/`paidAmount`, etc.

### API Improvements
- ✅ Standardized response structure (`data` key)
- ✅ Fixed route model binding for attribute values
- ✅ Invoice number search now uses LIKE (partial matches)
- ✅ Accurate batch quantity tracking (before/after)

---

## Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/sign-up` | ❌ | Create new account |
| POST | `/sign-in` | ❌ | Login user |
| POST | `/submit-otp` | ❌ | Verify OTP |
| POST | `/resend-otp` | ❌ | Resend OTP |
| GET | `/otp-settings` | ❌ | Get OTP settings |
| POST | `/send-reset-code` | ❌ | Send password reset code |
| POST | `/verify-reset-code` | ❌ | Verify reset code |
| POST | `/password-reset` | ❌ | Reset password |
| GET | `/sign-out` | ✅ | Logout user |
| GET | `/refresh-token` | ✅ | Get new token |
| GET | `/module-check` | ❌ | Check module status |

## Business & Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/business` | ✅ | Get business info |
| POST | `/business` | ✅ | Create business |
| PUT | `/business/{id}` | ✅ | Update business |
| POST | `/business-delete` | ✅ | Delete business |
| GET | `/profile` | ✅ | Get user profile |
| POST | `/profile` | ✅ | Update profile |
| POST | `/change-password` | ✅ | Change password |
| GET | `/business-categories` | ❌ | List business categories |

## Core Resources

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | ✅ | List all products with variants, stocks, and attributes |
| GET | `/products/{id}` | ✅ | Get single product (includes variants + variant stocks/attributes for variable products) |
| POST | `/products` | ✅ | Create product (single/batch/variable) |
| PUT | `/products/{id}` | ✅ | Update product (single/batch only) |
| DELETE | `/products/{id}` | ✅ | Delete product |
| GET | `/products/by-barcode/{barcode}` | ✅ | Find product by barcode (searches products, variants, batch numbers) |

### Product Variants (Attribute-Based)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products/{productId}/variants` | ✅ | List variants for a product |
| GET | `/variants/{variantId}` | ✅ | Get single variant details |
| POST | `/products/{productId}/variants` | ✅ | Create new variant |
| PUT | `/variants/{variantId}` | ✅ | Update variant (pricing, SKU, barcode, etc.) |
| DELETE | `/variants/{variantId}` | ✅ | Delete variant |
| PUT | `/variants/{variantId}/stock` | ✅ | Update variant stock |
| PATCH | `/variants/{variantId}/toggle-active` | ✅ | Toggle variant active/inactive status |
| POST | `/products/{productId}/variants/find` | ✅ | Find variant by attributes |
| POST | `/products/{productId}/variants/generate` | ✅ | Bulk generate variants |
| PUT | `/products/{productId}/variants/bulk` | ✅ | Bulk update multiple variants (HTTP 207 partial success) |
| POST | `/products/{productId}/variants/duplicate` | ✅ | Duplicate/clone a variant with new attributes |
| GET | `/products/{productId}/variants/stock-summary` | ✅ | Get stock breakdown by warehouse/branch |
| GET | `/variants/by-barcode/{barcode}` | ✅ | Find variant by barcode |

### Categories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | ✅ | **Flexible pagination** - supports 4 modes (see below) |
| GET | `/categories?limit=100` | ✅ | Limit mode - flat array (max 1000) |
| GET | `/categories?page=1&per_page=10` | ✅ | Offset pagination - paginated object (max 100/page) |
| GET | `/categories?cursor=0&per_page=100` | ✅ | Cursor pagination - flat array + cursor (max 1000/batch) |
| GET | `/categories?status=1&search=elec` | ✅ | Filters - works with all modes |
| GET | `/categories/paginated` | ✅ | ⚠️ Legacy - use `?page=1&per_page=10` instead |
| GET | `/categories/filter` | ✅ | ⚠️ Legacy - use `?search=term` instead |
| POST | `/categories` | ✅ | Create category |
| GET | `/categories/{id}` | ✅ | Get single category |
| PUT | `/categories/{id}` | ✅ | Update category |
| DELETE | `/categories/{id}` | ✅ | Delete category |
| PATCH | `/categories/{id}/status` | ✅ | Update category status |
| POST | `/categories/delete-all` | ✅ | Delete multiple categories |

**Pagination Modes:**
- **Default** (no params): All items, flat array, limit 1000
- **Limit** (`?limit=N`): First N items, flat array, max 1000 (for dropdowns)
- **Offset** (`?page=X&per_page=Y`): Paginated object, max 100/page (for tables)
- **Cursor** (`?cursor=X&per_page=Y`): Flat array + cursor, max 1000/batch (for sync)

**Filters:** `status` (1/0), `search` (text) - compatible with all modes

### Brands
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/brands` | ✅ | List all brands with pagination |
| GET | `/brands/filter` | ✅ | Search/filter brands by name & description |
| POST | `/brands` | ✅ | Create brand |
| GET | `/brands/{id}` | ✅ | Get single brand |
| PUT | `/brands/{id}` | ✅ | Update brand |
| DELETE | `/brands/{id}` | ✅ | Delete brand |
| PATCH | `/brands/{id}/status` | ✅ | Update brand status |
| POST | `/brands/delete-all` | ✅ | Delete multiple brands |

Note: List and filter endpoints accept `per_page` and `page`.

### Units
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/units` | ✅ | List units (pagination) |
| GET | `/units/filter` | ✅ | Search/filter units by name |
| POST | `/units` | ✅ | Create unit |
| PUT | `/units/{id}` | ✅ | Update unit |
| DELETE | `/units/{id}` | ✅ | Delete unit |
| PATCH | `/units/{id}/status` | ✅ | Update unit status |
| POST | `/units/delete-all` | ✅ | Delete multiple units |

Note: List and filter endpoints accept `per_page` and `page`.

### Product Models
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/product-models` | ✅ | List all models with pagination |
| GET | `/product-models/filter` | ✅ | Search/filter models by name |
| POST | `/product-models` | ✅ | Create model |
| GET | `/product-models/{id}` | ✅ | Get single model |
| PUT | `/product-models/{id}` | ✅ | Update model |
| DELETE | `/product-models/{id}` | ✅ | Delete model |
| PATCH | `/product-models/{id}/status` | ✅ | Update model status |
| POST | `/product-models/delete-all` | ✅ | Delete multiple models |

Note: List and filter endpoints accept `per_page` and `page`.

### Attributes (Variable Products)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/attributes` | ✅ | List all attributes |
| GET | `/attributes/{id}` | ✅ | Get single attribute |
| POST | `/attributes` | ✅ | Create attribute |
| PUT | `/attributes/{id}` | ✅ | Update attribute |
| DELETE | `/attributes/{id}` | ✅ | Delete attribute |
| POST | `/attributes/{id}/values` | ✅ | Add value to attribute |
| PUT | `/attribute-values/{id}` | ✅ | **Update attribute value** (✨ Fixed route binding) |
| DELETE | `/attribute-values/{id}` | ✅ | **Delete attribute value** (✨ Fixed route binding) |

**Note:** Attribute value routes now use proper route model binding with `{attributeValue}` parameter internally.

### Product Variants
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products/{id}/variants` | ✅ | List product variants |
| POST | `/products/{id}/variants` | ✅ | Create single variant |
| POST | `/products/{id}/variants/generate` | ✅ | Bulk generate variants |
| POST | `/products/{id}/variants/find` | ✅ | Find variant by attributes |
| GET | `/variants/{id}` | ✅ | Get variant details |
| PUT | `/variants/{id}` | ✅ | Update variant |
| DELETE | `/variants/{id}` | ✅ | Delete variant |
| PUT | `/variants/{id}/stock` | ✅ | Update variant stock |

## Transactions

### Parties (Customers/Suppliers)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/parties` | ✅ | List all parties |
| POST | `/parties` | ✅ | Create party |
| PUT | `/parties/{id}` | ✅ | Update party |
| DELETE | `/parties/{id}` | ✅ | Delete party |

### Sales
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sales` | ✅ | List sales (supports pagination: limit, page/per_page, cursor) |
| POST | `/sales` | ✅ | **Create sale** (✨ with expired batch validation & auto-tracking) |
| PUT | `/sales/{id}` | ✅ | Update sale |
| DELETE | `/sales/{id}` | ✅ | Delete sale |

**✨ New Features (Dec 2025):**
- ✅ Automatic expired batch validation (returns 406 if batch expired)
- ✅ Automatic batch movement tracking for audit trail
- ✅ Flexible input: accepts `products` as array OR JSON string
- ✅ Field aliases: `quantity`/`quantities`, `paid`/`paidAmount`, `date`/`saleDate`

**Sales Pagination Examples:**
```bash
# Default - all with safety limit
GET /sales

# Dropdown mode
GET /sales?limit=50

# Table mode with filters
GET /sales?page=1&per_page=20&party_id=5&isPaid=true

# Cursor mode for sync
GET /sales?cursor=0&per_page=500

# Filter by date range
GET /sales?date_from=2024-01-01&date_to=2024-12-31&limit=100

# Show only sales with returns
GET /sales?returned-sales=true

# Search by invoice number (LIKE match)
GET /sales?invoiceNumber=S-001
```

### Purchases
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/purchase` | ✅ | List purchases (supports pagination: limit, page/per_page, cursor) |
| POST | `/purchase` | ✅ | Create purchase (supports variant_id for variant-specific stock tracking) |
| PUT | `/purchase/{id}` | ✅ | Update purchase (supports variant_id for variant-specific stock) |
| DELETE | `/purchase/{id}` | ✅ | Delete purchase |

**Purchases Pagination Examples:**
```bash
# Default - all with safety limit
GET /purchase

# Dropdown mode
GET /purchase?limit=50

# Table mode with filters
GET /purchase?page=1&per_page=20&party_id=5&isPaid=true

# Cursor mode for sync
GET /purchase?cursor=0&per_page=500

# Filter by date range
GET /purchase?date_from=2024-01-01&date_to=2024-12-31&limit=100

# Show only purchases with returns
GET /purchase?returned-purchase=true
```

### Returns
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sales-return` | ✅ | List sale returns |
| POST | `/sales-return` | ✅ | Create sale return |
| GET | `/sales-return/{id}` | ✅ | Get sale return |
| GET | `/purchases-return` | ✅ | **Flexible pagination** - List purchase returns (4 modes: default, limit, offset, cursor) |
| GET | `/purchases-return?limit=100` | ✅ | Limit mode - flat array (max 1000) |
| GET | `/purchases-return?page=1&per_page=20` | ✅ | Offset pagination - paginated object (max 100/page) |
| GET | `/purchases-return?cursor=0&per_page=500` | ✅ | Cursor pagination - flat array + cursor (max 1000/batch) |
| GET | `/purchases-return?date_from=2025-01-01&date_to=2025-01-31` | ✅ | Filter by date range |
| GET | `/purchases-return?purchase_id=5` | ✅ | Filter by purchase ID |
| GET | `/purchases-return?search=John` | ✅ | Search by invoice or party name |
| POST | `/purchases-return` | ✅ | Create purchase return |
| GET | `/purchases-return/{id}` | ✅ | Get purchase return details |

## Financial

### Due Collection
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dues` | ✅ | List due collections with pagination & filters |
| GET | `/dues/invoices?party_id={id}` | ✅ | Get due invoices for a specific party |
| GET | `/dues/filter` | ✅ | Search/filter due collections |
| POST | `/dues` | ✅ | Create due collection |
| GET | `/dues/{id}` | ✅ | Get single due collection details |
| PUT | `/dues/{id}` | ✅ | Update due collection |
| DELETE | `/dues/{id}` | ✅ | Delete due collection |
| POST | `/dues/delete-all` | ✅ | Delete multiple due collections |

### Expenses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/expenses` | ✅ | List all expenses with related data |
| GET | `/expenses/filter` | ✅ | Search/filter expenses by branch & search term |
| POST | `/expenses` | ✅ | Create expense |
| GET | `/expenses/{id}` | ✅ | Get single expense details |
| PUT | `/expenses/{id}` | ✅ | Update expense |
| DELETE | `/expenses/{id}` | ✅ | Delete expense |
| POST | `/expenses/delete-all` | ✅ | Delete multiple expenses |
| GET | `/expense-categories` | ✅ | List categories |
| POST | `/expense-categories` | ✅ | Create category |
| PUT | `/expense-categories/{id}` | ✅ | Update category |
| DELETE | `/expense-categories/{id}` | ✅ | Delete category |
| GET | `/expense-categories/filter` | ✅ | Filter categories (status/search/date + pagination) |
| POST | `/expense-categories/delete-all` | ✅ | Delete multiple categories |
| PATCH | `/expense-categories/{id}/status` | ✅ | Toggle category status |

### Incomes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/incomes` | ✅ | List all incomes with related data |
| GET | `/incomes/filter` | ✅ | Search/filter incomes by branch & search term |
| POST | `/incomes` | ✅ | Create income |
| GET | `/incomes/{id}` | ✅ | Get single income details |
| PUT | `/incomes/{id}` | ✅ | Update income |
| DELETE | `/incomes/{id}` | ✅ | Delete income |
| POST | `/incomes/delete-all` | ✅ | Delete multiple incomes |
| GET | `/income-categories` | ✅ | List categories |
| POST | `/income-categories` | ✅ | Create category |
| PUT | `/income-categories/{id}` | ✅ | Update category |
| DELETE | `/income-categories/{id}` | ✅ | Delete category |
| GET | `/income-categories/filter` | ✅ | Filter categories (status/search/date + pagination) |
| POST | `/income-categories/delete-all` | ✅ | Delete multiple categories |
| PATCH | `/income-categories/{id}/status` | ✅ | Toggle category status |

## Settings & Configuration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/vats` | ✅ | List VATs |
| GET | `/vats/filter` | ✅ | Filter VATs (type/status/search + pagination) |
| POST | `/vats` | ✅ | Create VAT |
| PUT | `/vats/{id}` | ✅ | Update VAT |
| DELETE | `/vats/{id}` | ✅ | Delete VAT |
| PATCH | `/vats/{id}/status` | ✅ | Update VAT status |
| POST | `/vats/delete-all` | ✅ | Delete multiple VATs |
| GET | `/payment-types` | ✅ | List payment types |
| GET | `/payment-types/filter` | ✅ | Filter payment types |
| GET | `/payment-types` | ✅ | List payment types (includes `is_credit` flag) |
| PATCH | `/payment-types/{id}/status` | ✅ | Update payment type status |
| PUT | `/payment-types/{id}` | ✅ | Update payment type |
| DELETE | `/payment-types/{id}` | ✅ | Delete payment type |
| POST | `/payment-types/delete-all` | ✅ | Delete multiple payment types |

### Currencies
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/currencies` | ✅ | List currencies (4 pagination modes: default, limit, offset, cursor) |
| GET | `/currencies?limit=50` | ✅ | Get limited currencies for dropdown |
| GET | `/currencies?page=1&per_page=20` | ✅ | Get paginated currencies for tables |
| GET | `/currencies?cursor=0&per_page=500` | ✅ | Get currencies with cursor pagination for sync |
| GET | `/currencies?status=1` | ✅ | Filter currencies by status |
| GET | `/currencies?search=USD` | ✅ | Search currencies by name/code/country |
| GET | `/currencies/business/active` | ✅ | Get active business currency (from user_currencies) |
| GET | `/currencies/{id}` | ✅ | Change business currency (updates user_currencies) |
| PUT | `/currencies/{id}/set-global-default` | ✅ | Set global default currency (updates currencies.is_default) |

### Settings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/product-settings` | ✅ | Get product settings |
| POST | `/product-settings` | ✅ | Update product settings |
| GET | `/business-settings` | ✅ | Get business settings |
| GET | `/invoice-settings` | ✅ | Get invoice settings |
| POST | `/invoice-settings/update` | ✅ | Update invoice settings |
| GET | `/barcodes/config` | ✅ | Barcode types + printer presets |

### Print Labels
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/print-labels` | ✅ | List print labels (supports limit/offset/cursor) |
| GET | `/print-labels/filter` | ✅ | Search/filter print labels |
| POST | `/print-labels` | ✅ | Create label template |
| GET | `/print-labels/{id}` | ✅ | Get single label template |
| PUT | `/print-labels/{id}` | ✅ | Update label template |
| DELETE | `/print-labels/{id}` | ✅ | Delete label template |
| PATCH | `/print-labels/{id}/status` | ✅ | Toggle label status |
| POST | `/print-labels/delete-all` | ✅ | Delete multiple labels |
| GET | `/print-labels/config` | ✅ | Get barcode types, label formats, printer presets |
| GET | `/print-labels/products` | ✅ | Search products for label generation |
| POST | `/print-labels/generate` | ✅ | Generate printable labels payload |

## Inventory

### Stocks & Warehouses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/stocks` | ✅ | Add stock |
| PUT | `/stocks/{id}` | ✅ | Update stock |
| DELETE | `/stocks/{id}` | ✅ | Delete stock |
| GET | `/warehouses` | ✅ | List warehouses |
| POST | `/warehouses` | ✅ | Create warehouse |
| PUT | `/warehouses/{id}` | ✅ | Update warehouse |
| DELETE | `/warehouses/{id}` | ✅ | Delete warehouse |

Notes:
- `inventory_tracking_mode` (product field) can be `simple` (default) or `batch`.
- `POST /stocks` supports two modes:
  - Increment existing stock: `{ "stock_id": 123, "productStock": 5 }`
  - Create new stock/batch entry: `{ "product_id": 10, "variant_id": 156, "batch_no": "B-001", "productStock": 50 }`

### Racks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/racks` | ✅ | List racks (pagination) |
| GET | `/racks/filter` | ✅ | Search/filter racks by name |
| POST | `/racks` | ✅ | Create rack |
| GET | `/racks/{id}` | ✅ | Get single rack |
| PUT | `/racks/{id}` | ✅ | Update rack |
| DELETE | `/racks/{id}` | ✅ | Delete rack |
| PATCH | `/racks/{id}/status` | ✅ | Update rack status |
| POST | `/racks/delete-all` | ✅ | Delete multiple racks |

Note: List and filter endpoints accept `per_page` and `page`.

### Shelves
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shelves` | ✅ | List shelves (pagination) |
| GET | `/shelves/filter` | ✅ | Search/filter shelves by name |
| POST | `/shelves` | ✅ | Create shelf |
| GET | `/shelves/{id}` | ✅ | Get single shelf |
| PUT | `/shelves/{id}` | ✅ | Update shelf |
| DELETE | `/shelves/{id}` | ✅ | Delete shelf |
| PATCH | `/shelves/{id}/status` | ✅ | Update shelf status |
| POST | `/shelves/delete-all` | ✅ | Delete multiple shelves |

Note: List and filter endpoints accept `per_page` and `page`.

## Reports & Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/summary` | ✅ | Get today's summary |
| GET | `/dashboard` | ✅ | Get dashboard data |
| GET | `/sales/report` | ✅ | Sales report with due collections (includes summary totals) |
| GET | `/reports/variants/sales-summary` | ✅ | Variant sales analysis with grouping (by variant/product/day/month) |
| GET | `/reports/variants/top-selling` | ✅ | Top selling variants by quantity/revenue/profit |
| GET | `/reports/variants/slow-moving` | ✅ | Slow-moving inventory analysis with stock insights |

## Users & Staff

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | ✅ | List staff |
| POST | `/users` | ✅ | Create staff |
| PUT | `/users/{id}` | ✅ | Update staff |
| DELETE | `/users/{id}` | ✅ | Delete staff |

## Utilities

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/invoices` | ✅ | Get party invoices |
| GET | `/new-invoice` | ✅ | Generate invoice number |
| POST | `/bulk-uploads` | ✅ | Bulk upload products |
| GET | `/lang` | ✅ | List languages |
| POST | `/lang` | ✅ | Create language |
| GET | `/banners` | ✅ | List banners |
| GET | `/plans` | ✅ | List plans |
| GET | `/subscribes` | ✅ | List subscriptions |
| GET | `/update-expire-date` | ✅ | Update expiry date |

---

## Common Request Headers

```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
Accept: application/json
```

## Example: Login Flow

```bash
# 1. Sign in
curl -X POST http://localhost/api/v1/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response:
{
  "message": "User login successfully!",
  "data": {
    "is_setup": true,
    "token": "1|abc123def456...",
    "currency": { ... }
  }
}

# 2. Use token for protected endpoints
curl -X GET http://localhost/api/v1/products \
  -H "Authorization: Bearer 1|abc123def456..."

# 3. Refresh token when needed
curl -X GET http://localhost/api/v1/refresh-token \
  -H "Authorization: Bearer 1|abc123def456..."

# 4. Sign out
curl -X GET http://localhost/api/v1/sign-out \
  -H "Authorization: Bearer 1|abc123def456..."
```

## Example: Create Sale

```bash
curl -X POST http://localhost/api/v1/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "products": "[
      {
        \"stock_id\": 1,
        \"product_name\": \"Product A\",
        \"quantities\": 2,
        \"price\": 750.00,
        \"lossProfit\": 225.00
      }
    ]",
    "totalAmount": 1500.00,
    "discountAmount": 0,
    "paidAmount": 1500.00,
    "dueAmount": 0,
    "isPaid": true,
    "party_id": 1,
    "payment_type_id": 1
  }'
```

**⚠️ Payment Type Validation:**
- Walk-in customers (no `party_id`) cannot use credit payment types
- Payment types with `is_credit: true` require a valid `party_id`
- Returns HTTP 400 with error: "You cannot sell on credit to a walk-in customer"

**Payment Type Response:**
```json
{
    "id": 5,
    "name": "Due",
    "is_credit": true,
    "status": 1
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 406 | Not Acceptable |
| 422 | Validation Error |
| 500 | Server Error |

---

## Rate Limiting

No specific rate limits enforced. Recommended best practices:
- Implement client-side request throttling
- Batch operations when possible
- Use pagination for large datasets
- Cache responses appropriately for offline support

---

## Example: Create Variable Product with Variants (Single API Call)

**NOTE:** As of Phase 2.7, the API now supports creating a product and all its variants in a single POST call, eliminating the need for multiple API requests.

### Step-by-Step Workflow

#### Step 1: Create Attributes (Optional - if not already created)

```bash
curl -X POST http://localhost:8000/api/v1/attributes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Size",
    "values": ["Small", "Medium", "Large"]
  }'

# Response includes attribute_id: 1, value_ids: [1, 2, 3]

curl -X POST http://localhost:8000/api/v1/attributes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Color",
    "values": ["Red", "Blue", "Green"]
  }'

# Response includes attribute_id: 2, value_ids: [4, 5, 6]
```

#### Step 2: Create Variable Product with Variants (Single Call)

*Note:* `barcode` is optional but must be unique per business when provided.

```bash
curl -X POST http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Premium T-Shirt",
    "productCode": "TSHIRT-PREM-001",
    "category_id": 2,
    "brand_id": 1,
    "product_type": "variable",
    "inventory_tracking_mode": "simple",
    "description": "High-quality cotton t-shirt",
    "variants": [
      {
        "sku": "TSHIRT-S-RED",
        "barcode": "8901234567001",
        "cost_price": 300,
        "price": 599,
        "dealer_price": 549,
        "wholesale_price": 499,
        "initial_stock": 20,
        "attribute_value_ids": [1, 4]
      },
      {
        "sku": "TSHIRT-S-BLUE",
        "barcode": "8901234567002",
        "cost_price": 300,
        "price": 599,
        "dealer_price": 549,
        "wholesale_price": 499,
        "attribute_value_ids": [1, 5]
      },
      {
        "sku": "TSHIRT-M-RED",
        "barcode": "8901234567003",
        "cost_price": 320,
        "price": 649,
        "dealer_price": 599,
        "wholesale_price": 549,
        "attribute_value_ids": [2, 4]
      },
      {
        "sku": "TSHIRT-M-BLUE",
        "barcode": "8901234567004",
        "cost_price": 320,
        "price": 649,
        "dealer_price": 599,
        "wholesale_price": 549,
        "attribute_value_ids": [2, 5]
      },
      {
        "sku": "TSHIRT-L-RED",
        "barcode": "8901234567005",
        "cost_price": 350,
        "price": 699,
        "dealer_price": 649,
        "wholesale_price": 599,
        "attribute_value_ids": [3, 4]
      },
      {
        "sku": "TSHIRT-L-BLUE",
        "barcode": "8901234567006",
        "cost_price": 350,
        "price": 699,
        "dealer_price": 649,
        "wholesale_price": 599,
        "attribute_value_ids": [3, 5]
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 245,
    "productName": "Premium T-Shirt",
    "product_type": "variable",
    "business_id": 1,
    "variants": [
      {
        "id": 156,
        "sku": "TSHIRT-S-RED",
        "barcode": "8901234567001",
        "variant_name": "Small, Red",
        "price": 599,
        "attributeValues": [
          {"id": 1, "attribute_id": 1, "value": "Small"},
          {"id": 4, "attribute_id": 2, "value": "Red"}
        ]
      },
      {
        "id": 157,
        "sku": "TSHIRT-S-BLUE",
        "barcode": "8901234567002",
        "variant_name": "Small, Blue",
        "price": 599,
        "attributeValues": [
          {"id": 1, "attribute_id": 1, "value": "Small"},
          {"id": 5, "attribute_id": 2, "value": "Blue"}
        ]
      }
    ]
  }
}
```

#### Step 3: Add Stock to Variants

Stock is added separately via the stock/inventory API:

```bash
curl -X POST http://localhost:8000/api/v1/stocks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 245,
    "variant_id": 156,
    "batch_no": "BATCH-TSHIRT-001",
    "productStock": 100,
    "productPurchasePrice": 300,
    "warehouse_id": 1
  }'
```

#### Step 4: Find Variant by Attributes (For POS)
curl -X POST http://localhost/api/v1/products/1/variants/find \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attribute_value_ids": [1, 4]
  }'
```

---

## Batch/Lot Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products/{id}/batches` | ✅ | List all batches for a product |
| GET | `/variants/{id}/batches` | ✅ | List all batches for a variant |
| GET | `/batches/expiring?days=30` | ✅ | Get batches expiring within N days |
| GET | `/batches/expired` | ✅ | Get all expired batches |
| GET | `/batches/{id}` | ✅ | Get batch details with history |
| GET | `/batches/{id}/movements` | ✅ | Get batch movement history |
| POST | `/products/{id}/select-batches` | ✅ | **Auto-select batches** using FIFO/FEFO/LIFO strategy |

### Batch Selection Strategies

Products can be configured with automatic batch selection strategies:

- **`manual`** (default) - No automatic selection, user chooses batches
- **`fifo`** - First In First Out - selects oldest batches first (by manufacturing date)
- **`fefo`** - First Expire First Out - selects batches expiring soonest first
- **`lifo`** - Last In First Out - selects newest batches first (by manufacturing date)

**Configure Strategy:**
```bash
curl -X PUT http://localhost/api/v1/products/{id} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"batch_selection_strategy": "fefo"}'
```

**Auto-Select Batches:**
```bash
curl -X POST http://localhost/api/v1/products/{id}/select-batches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 100,
    "variant_id": 12,
    "warehouse_id": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "strategy": "fefo",
  "requested_quantity": 100,
  "total_available": 150,
  "selected_batches": [
    {
      "stock_id": 45,
      "batch_no": "BATCH-001",
      "allocated_quantity": 50,
      "available_quantity": 50,
      "mfg_date": "2024-01-15",
      "expire_date": "2025-06-30",
      "warehouse": {"id": 1, "name": "Main Warehouse"},
      "pricing": {
        "cost_price": 100.00,
        "sale_price": 150.00
      }
    },
    {
      "stock_id": 46,
      "batch_no": "BATCH-002",
      "allocated_quantity": 50,
      "available_quantity": 100,
      "expire_date": "2025-12-31"
    }
  ]
}
```

Notes:
- `mfg_date` and `expire_date` are optional. If `expire_date` is omitted/null, the stock is treated as non-expiring.
- Expired-stock prevention only blocks a sale when the selected stock has an `expire_date` that is in the past.

### Movement Types
- `purchase` - Stock received from supplier
- `sale` - Stock sold to customer  
- `purchase_return` - Stock returned to supplier
- `sale_return` - Stock returned from customer
- `adjustment` - Inventory adjustment
- `transfer_out` - Stock transferred out
- `transfer_in` - Stock transferred in
- `dispose` - Stock disposed/written off
- `initial` - Initial stock entry

### Expired Stock Prevention
The system automatically blocks sales of expired batches and returns:
```json
{
  "success": false,
  "message": "Cannot sell expired batch",
  "batch": {
    "batch_no": "BATCH-2023-100",
    "expire_date": "2023-12-31",
    "days_expired": 30
  }
}
```
**HTTP Status:** 406 Not Acceptable

---

**Last Updated:** December 21, 2025
