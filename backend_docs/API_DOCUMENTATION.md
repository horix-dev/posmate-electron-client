# Horix POS Pro - REST API Documentation

**Version:** 1.0  
**Base URL:** `/api/v1`  
**Authentication:** Bearer Token (Laravel Sanctum)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Business & Profile](#2-business--profile)
3. [Products](#3-products)
4. [Categories](#4-categories)
5. [Brands](#5-brands)
6. [Units](#6-units)
7. [Product Models](#7-product-models)
8. [Attributes (Variable Products)](#8-attributes-variable-products)
9. [Product Variants](#9-product-variants)
10. [Parties (Customers/Suppliers)](#10-parties-customerssuppliers)
11. [Sales](#11-sales)
12. [Purchases](#12-purchases)
13. [Sale Returns](#13-sale-returns)
14. [Purchase Returns](#14-purchase-returns)
15. [Due Collection](#15-due-collection)
16. [Expenses](#16-expenses)
17. [Incomes](#17-incomes)
18. [Expense Categories](#18-expense-categories)
19. [Income Categories](#19-income-categories)
20. [VAT/Tax](#20-vattax)
21. [Payment Types](#21-payment-types)
22. [Stocks](#22-stocks)
23. [Warehouses](#23-warehouses)
24. [Racks](#24-racks)
25. [Shelves](#25-shelves)
26. [Currencies](#26-currencies)
27. [Invoices](#27-invoices)
28. [Variant Reports & Analytics](#28-variant-reports--analytics)
29. [Dashboard & Statistics](#29-dashboard--statistics)
30. [Users & Staff](#30-users--staff)
31. [Settings](#31-settings)
32. [Bulk Upload](#32-bulk-upload)
33. [Batch/Lot Management](#33-batchlot-management)
34. [Additional Resources](#34-additional-resources)

---

## Response Format

All API responses follow this standard format:

```json
{
  "message": "Success message or error description",
  "data": { } // or []
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 406 | Not Acceptable |
| 422 | Validation Error |
| 500 | Server Error |

---

## 1. Authentication

### 1.1 Sign Up

Creates a new user account.

**Endpoint:** `POST /sign-up`  
**Auth Required:** No

**Request Body:**
```json
{
  "name": "string (required, max: 255)",
  "email": "string (required, email)",
  "password": "string (required, min: 6, max: 100)"
}
```

**Response (Success):**
```json
{
  "message": "Sign Up completed. Please setup your profile.",
  "token": "bearer_token_string",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "is_verified": 1
  }
}
```

**Response (OTP Enabled):**
```json
{
  "message": "An otp code has been sent to your email. Please check and confirm.",
  "token": null,
  "data": { }
}
```

---

### 1.2 Sign In

Authenticates user and returns access token.

**Endpoint:** `POST /sign-in`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "string (required, email)",
  "password": "string (required)"
}
```

**Response:**
```json
{
  "message": "User login successfully!",
  "data": {
    "is_setup": true,
    "token": "bearer_token_string",
    "currency": {
      "id": 1,
      "name": "US Dollar",
      "code": "USD",
      "symbol": "$",
      "position": "before"
    }
  }
}
```

---

### 1.3 Submit OTP

Verifies OTP code for email verification.

**Endpoint:** `POST /submit-otp`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "string (required, email)",
  "otp": "string (required, min: 4, max: 15)"
}
```

**Response:**
```json
{
  "message": "Logged In successfully!",
  "is_setup": true,
  "token": "bearer_token_string",
  "currency": { }
}
```

---

### 1.4 Resend OTP

Resends OTP to email.

**Endpoint:** `POST /resend-otp`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "string (required, email, exists in users)"
}
```

---

### 1.5 Sign Out

Logs out current user and invalidates token.

**Endpoint:** `GET /sign-out`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Sign out successfully"
}
```

---

### 1.6 Refresh Token

Generates a new access token.

**Endpoint:** `GET /refresh-token`  
**Auth Required:** Yes

**Response:**
```json
{
  "token": "new_bearer_token_string"
}
```

---

### 1.7 Check Module

Checks if a module is enabled.

**Endpoint:** `GET /module-check`  
**Auth Required:** No

**Query Parameters:**
- `module_name` - Name of the module to check

**Response:**
```json
{
  "status": true
}
```

---

### 1.8 Get OTP Settings

Retrieves OTP/email verification settings.

**Endpoint:** `GET /otp-settings`  
**Auth Required:** No

**Response:**
```json
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

---

### 1.11 Reset Password

Resets password using verified code.

**Endpoint:** `POST /password-reset`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "string (required, email)",
  "code": "string (required)",
  "password": "string (required, min: 6)"
}
```

---

## 2. Business & Profile

### 2.1 Get Business Info

Retrieves current business information with settings.

**Endpoint:** `GET /business`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "companyName": "My Store",
    "phoneNumber": "+1234567890",
    "address": "123 Main St",
    "pictureUrl": "path/to/logo.jpg",
    "shopOpeningBalance": 10000,
    "user": {
      "id": 1,
      "name": "Owner Name",
      "role": "shop-owner",
      "email": "owner@store.com",
      "active_branch": null
    },
    "business_currency": {
      "id": 1,
      "name": "US Dollar",
      "code": "USD",
      "symbol": "$",
      "position": "before"
    },
    "invoice_logo": "path/to/invoice-logo.jpg",
    "sale_rounding_option": "none",
    "invoice_size": "a4",
    "branch_count": 3,
    "addons": {
      "AffiliateAddon": false,
      "MultiBranchAddon": true,
      "WarehouseAddon": true,
      "ThermalPrinterAddon": true,
      "HrmAddon": false,
      "CustomDomainAddon": false
    }
  }
}
```

---

### 2.2 Create Business

Sets up a new business (first time setup).

**Endpoint:** `POST /business`  
**Auth Required:** Yes

**Request Body (multipart/form-data):**
```json
{
  "companyName": "string (required, max: 250)",
  "business_category_id": "integer (required, exists)",
  "phoneNumber": "string (optional)",
  "address": "string (optional, max: 250)",
  "shopOpeningBalance": "numeric (optional)",
  "pictureUrl": "file (optional, image, max: 5MB)"
}
```

---

### 2.3 Update Business

Updates business information and settings.

**Endpoint:** `PUT /business/{business_id}`  
**Auth Required:** Yes

**Request Body (multipart/form-data):**
```json
{
  "companyName": "string (optional, max: 250)",
  "phoneNumber": "string (optional)",
  "address": "string (optional, max: 250)",
  "pictureUrl": "file (optional, image, max: 5MB)",
  "invoice_logo": "file (optional, image, max: 5MB)",
  "sale_rounding_option": "enum: none|round_up|nearest_whole_number|nearest_0.05|nearest_0.1|nearest_0.5",
  "invoice_size": "string (optional, max: 100)",
  "invoice_note_level": "string (optional)",
  "invoice_note": "string (optional)",
  "gratitude_message": "string (optional, max: 100)",
  "vat_name": "string (optional)",
  "vat_no": "string (optional)"
}
```

---

### 2.4 Delete Business

Permanently deletes the business.

**Endpoint:** `DELETE /business/delete`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "password": "string (required)"
}
```

---

### 2.5 Get Profile

Gets current user's profile.

**Endpoint:** `GET /profile`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "image": "path/to/avatar.jpg",
    "business": { }
  }
}
```

---

### 2.6 Update Profile

Updates current user's profile.

**Endpoint:** `POST /profile`  
**Auth Required:** Yes

**Request Body (multipart/form-data):**
```json
{
  "name": "string (required, max: 250)",
  "email": "string (required, email, unique)",
  "image": "file (optional, image, max: 1MB, max dimensions: 2000x2000)"
}
```

---

### 2.7 Change Password

Changes user's password.

**Endpoint:** `POST /profile/change-password`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "current_password": "string (required)",
  "password": "string (required, min: 6)"
}
```

---

### 2.8 Get Business Categories

Lists all business categories for setup.

**Endpoint:** `GET /business-categories`  
**Auth Required:** No

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "name": "Retail Store",
      "status": 1
    }
  ]
}
```

---

## 3. Products

### 3.1 List Products

Retrieves all products with stock information.

**Endpoint:** `GET /products`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "total_stock_value": 150000.00,
  "data": [
    {
      "id": 1,
      "productName": "Product Name",
      "productCode": "PRD001",
      "productPurchasePrice": 100.00,
      "productStock": 50,
      "alert_qty": 10,
      "product_type": "single",
      "productPicture": "path/to/image.jpg",
      "stocks_sum_product_stock": 50,
      "unit": {
        "id": 1,
        "unitName": "Piece"
      },
      "vat": {
        "id": 1,
        "rate": 10
      },
      "brand": {
        "id": 1,
        "brandName": "Brand Name"
      },
      "category": {
        "id": 1,
        "categoryName": "Category Name"
      },
      "product_model": {
        "id": 1,
        "name": "Model XYZ"
      },
      "stocks": [
        {
          "id": 1,
          "batch_no": "BATCH001",
          "productStock": 50,
          "productPurchasePrice": 100.00,
          "productSalePrice": 150.00,
          "productDealerPrice": 130.00,
          "productWholeSalePrice": 120.00,
          "profit_percent": 50,
          "mfg_date": "2024-01-01",
          "expire_date": "2025-12-31"
        }
      ],
      "variants": [
        {
          "id": 156,
          "sku": "TSHIRT-S-RED",
          "barcode": "8901234567001",
          "price": 599,
          "cost_price": 300,
          "is_active": true,
          "attributeValues": [
            {
              "id": 1,
              "value": "Small",
              "attribute": {
                "id": 1,
                "name": "Size"
              }
            },
            {
              "id": 4,
              "value": "Red",
              "attribute": {
                "id": 2,
                "name": "Color"
              }
            }
          ],
          "stocks": [
            {
              "id": 123,
              "productStock": 45,
              "productPurchasePrice": 300,
              "productSalePrice": 599
            }
          ]
        }
      ]
    }
  ]
}
```

**Note:** For variable products (`product_type: 'variable'`), the `variants` array contains all attribute-based variants with their attribute combinations and stock information. For single and batch products, the `variants` array will be empty.

---

### 3.1b Get Product by Barcode

Searches and retrieves product/variant/batch by barcode. Universal barcode lookup across all data types.

**Endpoint:** `GET /products/by-barcode/{barcode}`  
**Auth Required:** Yes

**Response (Product Match):**
```json
{
  "message": "Product found.",
  "type": "product",
  "data": {
    "id": 1,
    "productName": "Laptop Charger",
    "product_type": "single",
    "barcode": "8901234567890",
    "productPurchasePrice": 500.00,
    "stocks": []
  }
}
```

**Response (Variant Match):**
```json
{
  "message": "Variant found.",
  "type": "variant",
  "data": {
    "id": 156,
    "sku": "TSHIRT-S-RED",
    "barcode": "8901234567001",
    "price": 599,
    "product": {
      "id": 245,
      "productName": "Premium T-Shirt"
    }
  }
}
```

**Response (Not Found):**
```json
{
  "message": "No product, variant, or batch found for barcode: 9999999999",
  "type": "not_found"
}
```

---

### 3.2 Get Single Product

Retrieves a specific product by ID.

**Endpoint:** `GET /products/{id}`  
**Auth Required:** Yes

**Response (variable product example):**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 24,
    "productName": "Premium T-Shirt",
    "productCode": "TSHIRT-PREM-001",
    "product_type": "variable",
    "stocks": [],
    "variants": [
      {
        "id": 156,
        "sku": "TSHIRT-S-RED",
        "barcode": "8901234567001",
        "price": 599,
        "cost_price": 300,
        "wholesale_price": 499,
        "dealer_price": 549,
        "is_active": true,
        "stocks": [
          {
            "id": 501,
            "batch_no": "INIT-TSHIRT-S-RED",
            "productStock": 20,
            "productPurchasePrice": 300,
            "productSalePrice": 599,
            "productWholeSalePrice": 499,
            "productDealerPrice": 549
          }
        ],
        "attributeValues": [
          { "id": 1, "attribute_id": 1, "value": "Small" },
          { "id": 4, "attribute_id": 2, "value": "Red" }
        ]
      },
      {
        "id": 157,
        "sku": "TSHIRT-S-BLUE",
        "barcode": "8901234567002",
        "price": 599,
        "cost_price": 300,
        "wholesale_price": 499,
        "dealer_price": 549,
        "is_active": true,
        "stocks": [],
        "attributeValues": [
          { "id": 1, "attribute_id": 1, "value": "Small" },
          { "id": 5, "attribute_id": 2, "value": "Blue" }
        ]
      }
    ]
  }
}
```

---

### 3.3 Create Product

Creates a new product. Supports three product types:

**Endpoint:** `POST /products`  
**Auth Required:** Yes

**Product Type Comparison:**

| `product_type` Value | Common Name | Use Case | Stock Tracking |
|---------------------|-------------|----------|----------------|
| **`single`** | Simple Product | Basic product (e.g., Laptop Charger) | Single stock record |
| **`variant`** | **Batch Product** | Batch/Lot tracking (e.g., Medicines with expiry dates) | Multiple stock records by `batch_no` |
| **`variable`** | **Variant Product** | Attribute-based variants (e.g., T-Shirt: Size S/M/L × Color Red/Blue) | Stock per attribute combination |

**⚠️ NAMING NOTE:** The system uses `product_type: 'variant'` for **batch products** and `product_type: 'variable'` for **attribute-based variants**. This may seem counterintuitive, but it's the current implementation.

**⚠️ CRITICAL API DIFFERENCES:**

- **Batch products (`product_type: 'variant'`)**: Use **arrays at root level** (`batch_no[]`, `productSalePrice[]`, `productStock[]`)
- **Variant products (`product_type: 'variable'`)**: Use **`variants` array** with objects containing `attribute_value_ids`, `sku`, pricing

**Response Format:**
```json
{
  "success": true,
  "message": "string",
  "data": {
    "id": "integer",
    "productName": "string",
    "product_type": "string",
    "business_id": "integer",
    "variants": []
  }
}
```

---

#### 3.3.1 Create Single Product

Simple product with standard pricing and stock.

**Request Body (multipart/form-data):**
```json
{
  "productName": "Laptop Charger",
  "productCode": "CHARGER-001",
  "category_id": 5,
  "brand_id": 3,
  "product_type": "single",
  "productPurchasePrice": 800,
  "productSalePrice": 1200,
  "productDealerPrice": 1100,
  "productWholeSalePrice": 1050,
  "productStock": 100,
  "profit_percent": 50,
  "alert_qty": 10,
  "productPicture": "<file>"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "productName=Laptop Charger" \
  -F "product_type=single" \
  -F "productPurchasePrice=800" \
  -F "productSalePrice=1200" \
  -F "productStock=100"
```

---

#### 3.3.2 Create Batch Product (`product_type: 'variant'`)

Product with multiple stock entries tracked by batch numbers. Used for products where you need to track different batches/lots (e.g., medicines with different expiry dates).

**⚠️ Note:** Despite the naming, use `product_type: 'variant'` for batch products (not `'batch'`).

**Request Body (multipart/form-data):**
```json
{
  "productName": "Medicine Tablets",
  "productCode": "MED-001",
  "category_id": 8,
  "brand_id": 3,
  "product_type": "variant",
  "batch_no": ["BATCH20240101", "BATCH20240201"],
  "productStock": [50, 45],
  "productPurchasePrice": [50, 52],
  "productSalePrice": [100, 105],
  "productDealerPrice": [90, 95],
  "productWholeSalePrice": [85, 90],
  "profit_percent": [100, 102],
  "mfg_date": ["2024-01-01", "2024-02-01"],
  "expire_date": ["2025-01-01", "2025-02-01"]
}
```

**Important Notes:**
- All batch-related fields must be **arrays** with matching indices
- Each index represents one batch (e.g., `batch_no[0]` corresponds to `productStock[0]`, `mfg_date[0]`, etc.)
- Minimum required: `batch_no[]` array
- Stock is created immediately for each batch

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "productName=Medicine Tablets" \
  -F "product_type=variant" \
  -F "batch_no[]=BATCH20240101" \
  -F "batch_no[]=BATCH20240201" \
  -F "productStock[]=50" \
  -F "productStock[]=45" \
  -F "productPurchasePrice[]=50" \
  -F "productPurchasePrice[]=52" \
  -F "productSalePrice[]=100" \
  -F "productSalePrice[]=105"
```

---

#### 3.3.3 Create Variant Product with Attributes (`product_type: 'variable'`)

Product with attribute-based variants (e.g., Size × Color combinations). All variants are created in a single API call.

**⚠️ Note:** Despite the naming, use `product_type: 'variable'` for attribute-based variants (not `'variant'`).

**Requirements:**
1. Attributes must be created first via `POST /api/v1/attributes`
2. Attribute values must exist for the attributes
3. Provide `attribute_value_ids` for each variant
4. `barcode` is optional; if provided it must be unique per business
5. Optional `initial_stock` per variant seeds stock during creation; if omitted, add stock later via `POST /api/v1/stock`

**Request Body (JSON):**
```json
{
  "productName": "T-Shirt",
  "productCode": "TSHIRT-001",
  "category_id": 2,
  "brand_id": 1,
  "product_type": "variable",
  "description": "Premium cotton T-shirt available in multiple sizes and colors",
  "variants": [
    {
      "sku": "TSHIRT-S-RED",
      "barcode": "8901234567001",
      "enabled": 1,
      "cost_price": 300,
      "price": 599,
      "dealer_price": 549,
      "wholesale_price": 499,
      "initial_stock": 20,
      "is_active": 1,
      "attribute_value_ids": [1, 5]
    },
    {
      "sku": "TSHIRT-S-BLUE",
      "barcode": "8901234567002",
      "enabled": 1,
      "cost_price": 300,
      "price": 599,
      "dealer_price": 549,
      "wholesale_price": 499,
      "is_active": 1,
      "attribute_value_ids": [1, 6]
    },
    {
      "sku": "TSHIRT-M-RED",
      "enabled": 1,
      "cost_price": 320,
      "price": 649,
      "dealer_price": 599,
      "wholesale_price": 549,
      "is_active": 1,
      "attribute_value_ids": [2, 5]
    },
    {
      "sku": "TSHIRT-M-BLUE",
      "enabled": 1,
      "cost_price": 320,
      "price": 649,
      "dealer_price": 599,
      "wholesale_price": 549,
      "is_active": 1,
      "attribute_value_ids": [2, 6]
    },
    {
      "sku": "TSHIRT-L-RED",
      "enabled": 1,
      "cost_price": 350,
      "price": 699,
      "dealer_price": 649,
      "wholesale_price": 599,
      "is_active": 1,
      "attribute_value_ids": [3, 5]
    },
    {
      "sku": "TSHIRT-L-BLUE",
      "enabled": 1,
      "cost_price": 350,
      "price": 699,
      "dealer_price": 649,
      "wholesale_price": 599,
      "is_active": 1,
      "attribute_value_ids": [3, 6]
    }
  ]
}
```

**Attribute Value Reference (example):**
- ID 1: Size = Small
- ID 2: Size = Medium  
- ID 3: Size = Large
- ID 5: Color = Red
- ID 6: Color = Blue

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "T-Shirt",
    "productCode": "TSHIRT-001",
    "category_id": 2,
    "product_type": "variable",
    "variants": [
      {
        "sku": "TSHIRT-S-RED",
        "barcode": "8901234567001",
        "cost_price": 300,
        "price": 599,
        "initial_stock": 20,
        "attribute_value_ids": [1, 5]
      },
      {
        "sku": "TSHIRT-M-RED",
        "barcode": "8901234567003",
        "cost_price": 320,
        "price": 649,
        "attribute_value_ids": [2, 5]
      }
    ]
  }'
```

**Response (Variable Product):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 245,
    "productName": "T-Shirt",
    "product_type": "variable",
    "business_id": 1,
    "variants": [
      {
        "id": 156,
        "product_id": 245,
        "sku": "TSHIRT-S-RED",
        "barcode": "8901234567001",
        "cost_price": 300.00,
        "price": 599.00,
        "dealer_price": 549.00,
        "wholesale_price": 499.00,
        "is_active": 1,
        "variant_name": "Small, Red",
        "attributeValues": [
          {"id": 1, "attribute_id": 1, "value": "Small"},
          {"id": 5, "attribute_id": 2, "value": "Red"}
        ]
      },
      {
        "id": 157,
        "product_id": 245,
        "sku": "TSHIRT-S-BLUE",
        "barcode": "8901234567002",
        "cost_price": 300.00,
        "price": 599.00,
        "dealer_price": 549.00,
        "wholesale_price": 499.00,
        "is_active": 1,
        "variant_name": "Small, Blue",
        "attributeValues": [
          {"id": 1, "attribute_id": 1, "value": "Small"},
          {"id": 6, "attribute_id": 2, "value": "Blue"}
        ]
      }
    ]
  }
}
```

**Stock Management for Variable Products:**

- `POST /products` (variable) supports optional `variants[*].initial_stock` to seed stock.
- If omitted, use one of:
  1. `POST /products/{product}/variants` with `initial_stock` to seed stock for that variant, **or**
  2. `POST /stock` to add stock (preferred for purchases/inventory flows).

Example stock addition via stock endpoint:
```bash
curl -X POST http://localhost:8000/api/v1/stock \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "variant_id": 156,
    "quantity": 50,
    "cost_price": 300,
    "warehouse_id": 1
  }'
```

---

### 3.4 Update Product

Updates an existing product. Supports updating single and batch products.

**Endpoint:** `PUT /products/{id}`  
**Auth Required:** Yes

---

#### 3.4.1 Update Single Product

**Request Body (multipart/form-data):**
```json
{
  "productName": "Updated Laptop Charger",
  "productCode": "CHARGER-001-V2",
  "category_id": 5,
  "brand_id": 3,
  "product_type": "single",
  "productPurchasePrice": 850,
  "productSalePrice": 1300,
  "productDealerPrice": 1150,
  "productWholeSalePrice": 1100,
  "productStock": 120,
  "profit_percent": 53,
  "alert_qty": 15,
  "productPicture": "<file>"
}
```

---

#### 3.4.2 Update Batch Product

**Request Body (multipart/form-data):**
```json
{
  "productName": "Updated Medicine Tablets",
  "product_type": "variant",
  "batch_no": ["BATCH20240101", "BATCH20240201", "BATCH20240301"],
  "productStock": [50, 45, 60],
  "productPurchasePrice": [50, 52, 54],
  "productSalePrice": [100, 105, 110],
  "productDealerPrice": [90, 95, 100],
  "productWholeSalePrice": [85, 90, 95],
  "profit_percent": [100, 102, 104],
  "mfg_date": ["2024-01-01", "2024-02-01", "2024-03-01"],
  "expire_date": ["2025-01-01", "2025-02-01", "2025-03-01"]
}
```

**Note:** Update replaces ALL batch records. Include all batches you want to keep.

---

#### 3.4.3 Update Variant Product (Attribute-Based)

⚠️ **LIMITATION:** Direct update of variable products (`product_type: 'variable'`) with variants is **not currently supported** via the main update endpoint.

**Workaround:** To update attribute-based variants:
1. Use individual variant endpoints: `PUT /api/v1/product-variants/{variantId}`
2. Or delete and recreate the product with new variants

**Alternative Endpoint (if available):**
```
PUT /api/v1/product-variants/{variantId}
```

---

### 3.5 Delete Product

Deletes a product.

**Endpoint:** `DELETE /products/{id}`  
**Auth Required:** Yes

---

### 3.6 Product Variants Management

Manage individual variants for products with `product_type: 'variable'`.

---

#### 3.6.1 List Product Variants

Get all variants for a specific product.

**Endpoint:** `GET /products/{productId}/variants`  
**Auth Required:** Yes

**Query Parameters:**
- `active` (optional): Filter by active status (`true`/`false`)

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "product_id": 24,
      "sku": "TSHIRT-S-RED",
      "barcode": "8901234567001",
      "price": 599,
      "cost_price": 300,
      "wholesale_price": 499,
      "dealer_price": 549,
      "is_active": true,
      "sort_order": 0,
      "total_stock": 45,
      "variant_name": "Small / Red",
      "effective_price": 599,
      "attributeValues": [
        {
          "id": 1,
          "attribute_id": 1,
          "value": "Small",
          "attribute": {
            "id": 1,
            "name": "Size"
          }
        },
        {
          "id": 5,
          "attribute_id": 2,
          "value": "Red",
          "attribute": {
            "id": 2,
            "name": "Color"
          }
        }
      ],
      "stocks": [
        {
          "id": 123,
          "variant_id": 1,
          "productStock": 45,
          "warehouse_id": 1
        }
      ]
    }
  ]
}
```

---

#### 3.6.2 Get Single Variant

Get details of a specific variant.

**Endpoint:** `GET /variants/{variantId}`  
**Auth Required:** Yes

**Response:** Same format as list item above, with additional `product` object.

---

#### 3.6.3 Create New Variant

Add a new variant to an existing variable product.

**Endpoint:** `POST /products/{productId}/variants`  
**Auth Required:** Yes

**Request Body (JSON):**
```json
{
  "sku": "TSHIRT-XL-RED",
  "barcode": "8901234567010",
  "attribute_value_ids": [4, 5],
  "price": 749,
  "cost_price": 380,
  "wholesale_price": 649,
  "dealer_price": 699,
  "weight": 0.25,
  "initial_stock": 30,
  "is_active": true,
  "sort_order": 0
}
```

**Field Descriptions:**
- `sku` (required): Unique stock keeping unit
- `barcode` (optional): Unique barcode
- `attribute_value_ids` (required): Array of attribute value IDs (e.g., [Size=XL, Color=Red])
- `price`, `cost_price`, `wholesale_price`, `dealer_price` (optional): Pricing (falls back to parent product prices)
- `initial_stock` (optional): Initial stock quantity (creates stock record)
- `is_active` (optional): Enable/disable variant (default: true)
- `sort_order` (optional): Display order (default: 0)

---

#### 3.6.4 Update Variant

Update an existing variant's details.

**Endpoint:** `PUT /variants/{variantId}`  
**Auth Required:** Yes

**Request Body (JSON):**
```json
{
  "sku": "TSHIRT-XL-RED-V2",
  "barcode": "8901234567011",
  "price": 799,
  "cost_price": 400,
  "wholesale_price": 699,
  "dealer_price": 749,
  "is_active": true,
  "sort_order": 1
}
```

**Note:** Cannot update `attribute_value_ids`. To change attributes, delete and create a new variant.

---

#### 3.6.5 Delete Variant

Delete a variant from a product.

**Endpoint:** `DELETE /variants/{variantId}`  
**Auth Required:** Yes

**Validation:**
- Cannot delete if variant has sale records
- Cannot delete if variant has stock > 0

**Response:**
```json
{
  "message": "Variant deleted successfully."
}
```

---

#### 3.6.6 Update Variant Stock

Update stock quantity for a specific variant.

**Endpoint:** `PUT /variants/{variantId}/stock`  
**Auth Required:** Yes

**Request Body (JSON):**
```json
{
  "warehouse_id": 1,
  "quantity": 50,
  "adjustment_type": "set"
}
```

**adjustment_type options:**
- `set`: Set stock to exact quantity
- `add`: Add quantity to existing stock
- `subtract`: Subtract quantity from existing stock

---

#### 3.6.7 Find Variant by Attributes

Find a variant by its attribute combination.

**Endpoint:** `POST /products/{productId}/variants/find`  
**Auth Required:** Yes

**Request Body (JSON):**
```json
{
  "attribute_value_ids": [1, 5]
}
```

**Response:**
```json
{
  "message": "Variant found.",
  "data": {
    "id": 1,
    "sku": "TSHIRT-S-RED",
    "price": 599,
    "total_stock": 45
  }
}
```

---

#### 3.6.8 Bulk Update Variants

Updates multiple variants in a single request with partial success handling (HTTP 207 Multi-Status).

**Endpoint:** `PUT /products/{productId}/variants/bulk`  
**Auth Required:** Yes

**Request Body (JSON):**
```json
{
  "variants": [
    {
      "id": 156,
      "sku": "TSHIRT-S-RED-V2",
      "price": 599,
      "cost_price": 300,
      "is_active": true
    },
    {
      "id": 157,
      "sku": "TSHIRT-S-BLUE-V2",
      "price": 649,
      "cost_price": 320,
      "is_active": true
    }
  ]
}
```

**Response (Partial Success - HTTP 207):**
```json
{
  "message": "Bulk update completed with 1 success and 1 failure",
  "data": {
    "successful": [
      {
        "id": 156,
        "sku": "TSHIRT-S-RED-V2",
        "message": "Variant updated successfully"
      }
    ],
    "failed": [
      {
        "id": 157,
        "sku": "TSHIRT-S-BLUE-V2",
        "errors": {
          "sku": ["SKU already exists for this business"]
        }
      }
    ]
  }
}
```

---

#### 3.6.9 Duplicate Variant

Creates a copy of an existing variant with new attributes or pricing.

**Endpoint:** `POST /products/{productId}/variants/duplicate`  
**Auth Required:** Yes

**Request Body (JSON):**
```json
{
  "variant_id": 156,
  "new_sku": "TSHIRT-M-RED",
  "new_barcode": "8901234567010",
  "attribute_value_ids": [2, 4],
  "price_adjustment": 50,
  "copy_stock": true
}
```

**Field Descriptions:**
- `variant_id` (required): ID of variant to clone
- `new_sku` (required): New SKU for cloned variant
- `new_barcode` (optional): New barcode
- `attribute_value_ids` (optional): New attribute combination
- `price_adjustment` (optional): Add/subtract from price (e.g., 50 adds 50 to price)
- `copy_stock` (optional): Copy stock from source variant (default: false)

**Response:**
```json
{
  "message": "Variant duplicated successfully",
  "data": {
    "id": 158,
    "sku": "TSHIRT-M-RED",
    "barcode": "8901234567010",
    "price": 649,
    "attributeValues": [
      {"id": 2, "value": "Medium"},
      {"id": 4, "value": "Red"}
    ]
  }
}
```

---

#### 3.6.10 Toggle Variant Active Status

Quick toggle for variant active/inactive status with version tracking.

**Endpoint:** `PATCH /variants/{variantId}/toggle-active`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Variant toggled successfully",
  "data": {
    "id": 156,
    "sku": "TSHIRT-S-RED",
    "is_active": false,
    "version": 5
  }
}
```

---

#### 3.6.11 Stock Summary by Location

Get stock breakdown by warehouse/branch for a product's variants.

**Endpoint:** `GET /products/{productId}/variants/stock-summary`  
**Auth Required:** Yes

**Query Parameters:**
- `group_by` (optional): `warehouse` (default) or `branch`
- `low_stock_threshold` (optional): Highlight items below this quantity (default: null)

**Response:**
```json
{
  "message": "Stock summary retrieved",
  "data": {
    "product_id": 245,
    "productName": "Premium T-Shirt",
    "total_variants": 6,
    "total_stock_value": 25000.00,
    "summary_by_warehouse": [
      {
        "id": 1,
        "name": "Main Warehouse",
        "variants": [
          {
            "id": 156,
            "sku": "TSHIRT-S-RED",
            "variant_name": "Small, Red",
            "quantity": 45,
            "value": 26955.00,
            "low_stock": false
          },
          {
            "id": 157,
            "sku": "TSHIRT-S-BLUE",
            "variant_name": "Small, Blue",
            "quantity": 3,
            "value": 1797.00,
            "low_stock": true
          }
        ],
        "warehouse_total_quantity": 48,
        "warehouse_total_value": 28752.00
      }
    ]
  }
}
```

---

#### 3.6.12 Get Variant by Barcode

Retrieves a specific variant by its barcode.

**Endpoint:** `GET /variants/by-barcode/{barcode}`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Variant found",
  "data": {
    "id": 156,
    "sku": "TSHIRT-S-RED",
    "barcode": "8901234567001",
    "price": 599,
    "cost_price": 300,
    "variant_name": "Small, Red",
    "product": {
      "id": 245,
      "productName": "Premium T-Shirt"
    }
  }
}
```

---

#### 3.6.13 Generate Variants (Bulk)

Auto-generate all possible variants from attribute combinations.

**Endpoint:** `POST /products/{productId}/variants/generate`  
**Auth Required:** Yes

**Request Body (JSON):**
```json
{
  "attributes": {
    "1": [1, 2, 3],
    "2": [5, 6]
  },
  "default_price": 599,
  "default_cost_price": 300
}
```

**Explanation:**
- `attributes`: Object where keys are attribute IDs, values are arrays of attribute value IDs
- Example generates 6 variants: Size (S/M/L) × Color (Red/Blue) = 6 combinations
- All variants get the default pricing

---

## 4. Categories

The Categories API supports **flexible pagination** via query parameters, allowing different pagination modes for different use cases (POS dropdowns, management tables, offline sync).

### 4.1 List Categories (Flexible Pagination)

**Endpoint:** `GET /categories`  
**Auth Required:** Yes
**Description:** Retrieve categories with flexible pagination modes based on query parameters.

#### Pagination Modes

**Mode 1: Default (No Parameters)**
Returns all categories as flat array with safety limit of 1000.

**Request:**
```bash
GET /categories
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "categoryName": "Electronics",
      "icon": "categories/icon.jpg",
      "status": 1,
      "variationCapacity": 0,
      "variationColor": 1,
      "variationSize": 1,
      "variationType": 0,
      "variationWeight": 0,
      "version": 1,
      "updated_at": "2025-12-18T10:00:00.000000Z",
      "created_at": "2025-12-18T10:00:00.000000Z",
      "deleted_at": null,
      "business_id": 1
    }
  ],
  "_server_timestamp": "2025-12-18T10:00:00+00:00"
}
```

---

**Mode 2: Limit (For POS Dropdowns)**
Returns first N items as flat array.

**Request:**
```bash
GET /categories?limit=100
```

**Query Parameters:**
- `limit` (integer, max: 1000): Number of items to return

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [ /* max 100 items */ ],
  "_server_timestamp": "2025-12-18T10:00:00+00:00"
}
```

---

**Mode 3: Offset Pagination (For Management Tables)**
Returns paginated object with metadata.

**Request:**
```bash
GET /categories?page=1&per_page=10
```

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `per_page` (integer, default: 10, max: 100): Items per page

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "categoryName": "Electronics",
        "icon": "categories/icon.jpg",
        "status": 1
      }
    ],
    "first_page_url": "http://localhost:8700/api/v1/categories?page=1",
    "from": 1,
    "last_page": 5,
    "last_page_url": "http://localhost:8700/api/v1/categories?page=5",
    "next_page_url": "http://localhost:8700/api/v1/categories?page=2",
    "path": "http://localhost:8700/api/v1/categories",
    "per_page": 10,
    "prev_page_url": null,
    "to": 10,
    "total": 50
  },
  "_server_timestamp": "2025-12-18T10:00:00+00:00"
}
```

---

**Mode 4: Cursor Pagination (For Offline Sync)**
Returns flat array with cursor metadata for efficient batch processing.

**Request:**
```bash
GET /categories?cursor=0&per_page=100
```

**Query Parameters:**
- `cursor` (integer, default: 0): Last ID from previous batch (use 0 for first batch)
- `per_page` (integer, default: 100, max: 1000): Items per batch

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "categoryName": "Electronics",
      "status": 1
    }
  ],
  "pagination": {
    "next_cursor": 100,
    "has_more": true,
    "count": 100,
    "per_page": 100
  },
  "_server_timestamp": "2025-12-18T10:00:00+00:00"
}
```

**Cursor Pagination Flow:**
1. Start with `cursor=0`
2. Use `next_cursor` from response for next batch
3. Continue until `has_more` is `false`
4. No duplicate IDs between batches (guaranteed by ID ordering)

---

#### Filters (All Modes)

All pagination modes support the following filters:

**Query Parameters:**
- `status` (boolean, optional): Filter by status (1=active, 0=inactive)
- `search` (string, optional): Search by category name (case-insensitive, partial match)

**Examples:**
```bash
# Active categories only with limit
GET /categories?status=1&limit=50

# Search with pagination
GET /categories?search=elec&page=1&per_page=10

# Search with cursor pagination
GET /categories?search=food&cursor=0&per_page=100

# Inactive categories
GET /categories?status=0&limit=100
```

---

### 4.2 List Categories (Legacy - Paginated)

**Endpoint:** `GET /categories/paginated`  
**Auth Required:** Yes
**Description:** Legacy endpoint. Use `GET /categories?page=1&per_page=10` instead.

**⚠️ Deprecated:** This endpoint is maintained for backward compatibility. New integrations should use the main `/categories` endpoint with query parameters.

---

### 4.3 Filter Categories (Legacy)

**Endpoint:** `GET /categories/filter`  
**Auth Required:** Yes
**Description:** Legacy search endpoint. Use `GET /categories?search=term` instead.

**⚠️ Deprecated:** This endpoint is maintained for backward compatibility. New integrations should use the main `/categories` endpoint with `search` parameter.

---

### 4.4 Create Category

**Endpoint:** `POST /categories`  
**Auth Required:** Yes
**Description:** Create a new category.

**Request Body:**
```json
{
  "categoryName": "string (required, unique per business)",
  "variationCapacity": "boolean (optional, 'true'/'false')",
  "variationColor": "boolean (optional, 'true'/'false')",
  "variationSize": "boolean (optional, 'true'/'false')",
  "variationType": "boolean (optional, 'true'/'false')",
  "variationWeight": "boolean (optional, 'true'/'false')",
  "icon": "file (optional, image: jpg,png,jpeg,gif)"
}
```

**Response (Success):**
```json
{
  "message": "Category created successfully",
  "data": {}
}
```

---

### 4.5 Get Single Category

**Endpoint:** `GET /categories/{id}`  
**Auth Required:** Yes
**Description:** Retrieve details of a specific category.

**Response (Success):**
```json
{
  "message": "Data fetched successfully.",
  "data": {}
}
```

---

### 4.6 Update Category

**Endpoint:** `PUT /categories/{id}`  
**Auth Required:** Yes
**Description:** Update an existing category.

**Request Body:** Same as Create Category

**Response (Success):**
```json
{
  "message": "Category updated successfully",
  "data": {}
}
```

---

### 4.7 Delete Category

**Endpoint:** `DELETE /categories/{id}`  
**Auth Required:** Yes
**Description:** Delete a specific category.

**Response (Success):**
```json
{
  "message": "Category deleted successfully"
}
```

---

### 4.8 Update Category Status

**Endpoint:** `PATCH /categories/{id}/status`  
**Auth Required:** Yes
**Description:** Update category status.

**Request Body:**
```json
{
  "status": "boolean (required, true/false)"
}
```

**Response (Success):**
```json
{
  "message": "Status updated successfully",
  "data": {}
}
```

---

### 4.9 Delete Multiple Categories

**Endpoint:** `POST /categories/delete-all`  
**Auth Required:** Yes
**Description:** Delete multiple categories at once.

**Request Body:**
```json
{
  "ids": "array of integers (required) - array of category IDs to delete"
}
```

**Response (Success):**
```json
{
  "message": "Selected categories deleted successfully"
}
```

---

## 5. Brands

**Base Endpoint:** `GET /brands`  
**Auth Required:** Yes  
**Description:** Flexible pagination with multiple modes

### Pagination Modes

The `/brands` endpoint supports 4 pagination modes via query parameters:

#### Mode 1: Default (No Parameters)
Returns all brands with safety limit of 1000.

**Request:**
```bash
GET /brands
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "brandName": "Apple",
      "status": 1,
      "version": 1,
      "created_at": "2025-12-17T10:00:00+00:00",
      "updated_at": "2025-12-17T10:00:00+00:00",
      "deleted_at": null,
      "business_id": 1
    }
  ],
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

---

#### Mode 2: Limit (For Dropdowns)
Returns first N brands as flat array (max: 1000).

**Request:**
```bash
GET /brands?limit=100
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [ /* array of brands */ ],
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

---

#### Mode 3: Offset Pagination (For Management Tables)
Returns paginated data with metadata (max: 100 per page).

**Request:**
```bash
GET /brands?page=1&per_page=10
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "current_page": 1,
    "data": [ /* array of brands */ ],
    "first_page_url": "http://localhost/api/v1/brands?page=1",
    "from": 1,
    "last_page": 5,
    "last_page_url": "http://localhost/api/v1/brands?page=5",
    "next_page_url": "http://localhost/api/v1/brands?page=2",
    "path": "http://localhost/api/v1/brands",
    "per_page": 10,
    "prev_page_url": null,
    "to": 10,
    "total": 50
  },
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

---

#### Mode 4: Cursor Pagination (For Offline Sync)
Returns brands with cursor for efficient sequential fetching (max: 1000 per batch).

**Request:**
```bash
GET /brands?cursor=0&per_page=100
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [ /* array of brands */ ],
  "pagination": {
    "next_cursor": 100,
    "has_more": true,
    "count": 100,
    "per_page": 100
  },
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

**Cursor Pagination Flow:**
1. Start: `GET /brands?cursor=0&per_page=100`
2. Next: `GET /brands?cursor=100&per_page=100` (use `next_cursor` from previous response)
3. Continue until `has_more` is `false`

---

### Filters

All pagination modes support these filters:

**Query Parameters:**
- `status`: `1` (active) or `0` (inactive) - also accepts `true`/`false`
- `search`: Text search in `brandName`

**Examples:**
```bash
GET /brands?status=1&limit=50
GET /brands?search=apple&page=1&per_page=10
GET /brands?status=true&cursor=0&per_page=100
```

---

### 5.1 Legacy Endpoints (Deprecated)

⚠️ **These endpoints are deprecated. Use query parameters instead.**

**Old:** `GET /brands/filter?search=apple`  
**New:** `GET /brands?search=apple&limit=100`

---

### 5.2 Create Brand

**Endpoint:** `POST /brands`  
**Auth Required:** Yes
**Description:** Create a new brand.

**Request Body:**
```json
{
  "brandName": "string (required, unique per business, max:255)",
  "description": "string (optional)",
  "icon": "file (optional, image: jpeg,png,jpg,gif,svg, max:2048KB)"
}
```

**Response (Success):**
```json
{
  "message": "Brand created successfully",
  "data": {
    "id": 1,
    "brandName": "Apple",
    "status": 1,
    "version": 1,
    "created_at": "2025-12-17T10:00:00+00:00",
    "updated_at": "2025-12-17T10:00:00+00:00",
    "deleted_at": null,
    "business_id": 1
  }
}
```

---

### 5.3 Get Single Brand

**Endpoint:** `GET /brands/{id}`  
**Auth Required:** Yes
**Description:** Retrieve details of a specific brand.

**Response (Success):**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "brandName": "Apple",
    "status": 1,
    "version": 1,
    "created_at": "2025-12-17T10:00:00+00:00",
    "updated_at": "2025-12-17T10:00:00+00:00",
    "deleted_at": null,
    "business_id": 1
  }
}
```

---

### 5.4 Update Brand

**Endpoint:** `PUT /brands/{id}`  
**Auth Required:** Yes
**Description:** Update an existing brand.

**Request Body:** Same as Create Brand

**Response (Success):**
```json
{
  "message": "Brand updated successfully",
  "data": {
    "id": 1,
    "brandName": "Apple Inc.",
    "status": 1,
    "version": 2,
    "created_at": "2025-12-17T10:00:00+00:00",
    "updated_at": "2025-12-17T11:00:00+00:00",
    "deleted_at": null,
    "business_id": 1
  }
}
```

---

### 5.5 Delete Brand

**Endpoint:** `DELETE /brands/{id}`  
**Auth Required:** Yes
**Description:** Delete a specific brand.

**Response (Success):**
```json
{
  "message": "Brand deleted successfully"
}
```

---

### 5.6 Update Brand Status

**Endpoint:** `PATCH /brands/{id}/status`  
**Auth Required:** Yes
**Description:** Update brand status.

**Request Body:**
```json
{
  "status": "boolean (required, true/false or 1/0)"
}
```

**Response (Success):**
```json
{
  "message": "Status updated successfully",
  "data": {
    "id": 1,
    "brandName": "Apple",
    "status": 0,
    "version": 1,
    "created_at": "2025-12-17T10:00:00+00:00",
    "updated_at": "2025-12-17T11:00:00+00:00",
    "deleted_at": null,
    "business_id": 1
  }
}
```

---

### 5.7 Delete Multiple Brands

**Endpoint:** `POST /brands/delete-all`  
**Auth Required:** Yes
**Description:** Delete multiple brands at once.

**Request Body:**
```json
{
  "ids": [1, 2, 3]
}
```

**Response (Success):**
```json
{
  "message": "Selected brands deleted successfully",
  "deleted_count": 3
}
```

---

## 6. Units

**Base Endpoint:** `GET /units`  
**Auth Required:** Yes  
**Description:** Flexible pagination with multiple modes

### Pagination Modes

The `/units` endpoint supports 4 pagination modes via query parameters:

#### Mode 1: Default (No Parameters)
Returns all units with safety limit of 1000.

**Request:**
```bash
GET /units
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "unitName": "Piece",
      "status": 1,
      "version": 1,
      "created_at": "2025-12-17T10:00:00+00:00",
      "updated_at": "2025-12-17T10:00:00+00:00",
      "deleted_at": null,
      "business_id": 1
    }
  ],
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

---

#### Mode 2: Limit (For Dropdowns)
Returns first N units as flat array (max: 1000).

**Request:**
```bash
GET /units?limit=100
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [ /* array of units */ ],
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

---

#### Mode 3: Offset Pagination (For Management Tables)
Returns paginated data with metadata (max: 100 per page).

**Request:**
```bash
GET /units?page=1&per_page=10
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "current_page": 1,
    "data": [ /* array of units */ ],
    "first_page_url": "http://localhost/api/v1/units?page=1",
    "from": 1,
    "last_page": 5,
    "last_page_url": "http://localhost/api/v1/units?page=5",
    "next_page_url": "http://localhost/api/v1/units?page=2",
    "path": "http://localhost/api/v1/units",
    "per_page": 10,
    "prev_page_url": null,
    "to": 10,
    "total": 50
  },
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

---

#### Mode 4: Cursor Pagination (For Offline Sync)
Returns units with cursor for efficient sequential fetching (max: 1000 per batch).

**Request:**
```bash
GET /units?cursor=0&per_page=100
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [ /* array of units */ ],
  "pagination": {
    "next_cursor": 100,
    "has_more": true,
    "count": 100,
    "per_page": 100
  },
  "_server_timestamp": "2025-12-17T10:00:00+00:00"
}
```

**Cursor Pagination Flow:**
1. Start: `GET /units?cursor=0&per_page=100`
2. Next: `GET /units?cursor=100&per_page=100` (use `next_cursor` from previous response)
3. Continue until `has_more` is `false`

---

### Filters

All pagination modes support these filters:

**Query Parameters:**
- `status`: `1` (active) or `0` (inactive) - also accepts `true`/`false`
- `search`: Text search in `unitName`

**Examples:**
```bash
GET /units?status=1&limit=50
GET /units?search=kg&page=1&per_page=10
GET /units?status=true&cursor=0&per_page=100
```

---

### 6.1 Legacy Endpoints (Deprecated)

⚠️ **These endpoints are deprecated. Use query parameters instead.**

**Old:** `GET /units/filter?search=kg`  
**New:** `GET /units?search=kg&limit=100`

---

### 6.2 Create Unit

**Endpoint:** `POST /units`  
**Auth Required:** Yes
**Description:** Create a new unit.

**Request Body:**
```json
{
  "unitName": "string (required, unique per business, max:255)",
  "status": "boolean (optional, default: 1)"
}
```

**Response (Success):**
```json
{
  "message": "Data saved successfully.",
  "data": {
    "id": 1,
    "unitName": "Kilogram",
    "status": 1,
    "version": 1,
    "created_at": "2025-12-17T10:00:00+00:00",
    "updated_at": "2025-12-17T10:00:00+00:00",
    "deleted_at": null,
    "business_id": 1
  }
}
```

---

### 6.3 Get Single Unit

**Endpoint:** `GET /units/{id}`  
**Auth Required:** Yes
**Description:** Retrieve details of a specific unit.

**Response (Success):**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "unitName": "Kilogram",
    "status": 1,
    "version": 1,
    "created_at": "2025-12-17T10:00:00+00:00",
    "updated_at": "2025-12-17T10:00:00+00:00",
    "deleted_at": null,
    "business_id": 1
  }
}
```

---

### 6.4 Update Unit

**Endpoint:** `PUT /units/{id}`  
**Auth Required:** Yes
**Description:** Update an existing unit.

**Request Body:**
```json
{
  "unitName": "string (required, unique per business, max:255)",
  "status": "boolean (optional)"
}
```

**Response (Success):**
```json
{
  "message": "Data saved successfully.",
  "data": {
    "id": 1,
    "unitName": "Kg",
    "status": 1,
    "version": 2,
    "created_at": "2025-12-17T10:00:00+00:00",
    "updated_at": "2025-12-17T11:00:00+00:00",
    "deleted_at": null,
    "business_id": 1
  }
}
```

---

### 6.5 Delete Unit

**Endpoint:** `DELETE /units/{id}`  
**Auth Required:** Yes
**Description:** Delete a specific unit.

**Response (Success):**
```json
{
  "message": "Data deleted successfully."
}
```

---

### 6.6 Update Unit Status

**Endpoint:** `PATCH /units/{id}/status`  
**Auth Required:** Yes  
**Description:** Toggle or set the `status` field for a unit.

**Request Body:**
```json
{
  "status": "boolean (required, true/false or 1/0)"
}
```

**Response (Success):**
```json
{
  "message": "Status updated successfully",
  "data": {
    "id": 1,
    "unitName": "Piece",
    "status": 0,
    "version": 1,
    "created_at": "2025-12-17T10:00:00+00:00",
    "updated_at": "2025-12-17T11:00:00+00:00",
    "deleted_at": null,
    "business_id": 1
  }
}
```

---

### 6.7 Delete Multiple Units

**Endpoint:** `POST /units/delete-all`  
**Auth Required:** Yes  
**Description:** Delete multiple units by IDs.

**Request Body:**
```json
{
  "ids": [1, 2, 3]
}
```

**Response (Success):**
```json
{
  "message": "Selected units deleted successfully",
  "deleted_count": 3
}
```

---

## 7. Product Models

### 7.1 List Models

**Endpoint:** `GET /product-models`  
**Auth Required:** Yes
**Description:** List all product models with pagination.

**Query Parameters:**
```json
{
  "per_page": "integer (optional, default: 10, max: 200)",
  "page": "integer (optional, default: 1)"
}
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "name": "iPhone 14",
        "status": 1
      }
    ],
    "per_page": 10,
    "total": 25
  }
}
```

---

### 7.2 Filter Product Models

**Endpoint:** `GET /product-models/filter`  
**Auth Required:** Yes
**Description:** Search and filter product models.

**Query Parameters:**
```json
{
  "search": "string (optional) - searches name",
  "per_page": "integer (optional, default: 10)"
}
```

**Response:**
```json
{
  "message": "Data filtered successfully.",
  "data": []
}
```

---

### 7.3 Create Model

**Endpoint:** `POST /product-models`  
**Auth Required:** Yes
**Description:** Create a new product model.

**Request Body:**
```json
{
  "name": "string (required, unique per business, max:255)",
  "status": "boolean (optional, default: 1)"
}
```

**Response (Success):**
```json
{
  "message": "Model saved successfully",
  "data": {}
}
```

---

### 7.4 Get Single Model

**Endpoint:** `GET /product-models/{id}`  
**Auth Required:** Yes
**Description:** Retrieve details of a specific product model.

**Response (Success):**
```json
{
  "message": "Data fetched successfully.",
  "data": {}
}
```

---

### 7.5 Update Model

**Endpoint:** `PUT /product-models/{id}`  
**Auth Required:** Yes
**Description:** Update an existing product model.

**Request Body:**
```json
{
  "name": "string (required, unique per business, max:255)",
  "status": "boolean (optional)"
}
```

**Response (Success):**
```json
{
  "message": "Model updated successfully",
  "data": {}
}
```

---

### 7.6 Delete Model

**Endpoint:** `DELETE /product-models/{id}`  
**Auth Required:** Yes
**Description:** Delete a specific product model.

**Response (Success):**
```json
{
  "message": "Model deleted successfully"
}
```

---

### 7.7 Update Model Status

**Endpoint:** `PATCH /product-models/{id}/status`  
**Auth Required:** Yes
**Description:** Update product model status.

**Request Body:**
```json
{
  "status": "boolean (required, true/false)"
}
```

**Response (Success):**
```json
{
  "message": "Status updated successfully",
  "data": {}
}
```

---

### 7.8 Delete Multiple Models

**Endpoint:** `POST /product-models/delete-all`  
**Auth Required:** Yes
**Description:** Delete multiple product models at once.

**Request Body:**
```json
{
  "ids": "array of integers (required) - array of model IDs to delete"
}
```

**Response (Success):**
```json
{
  "message": "Selected models deleted successfully"
}
```

---

## 8. Attributes (Variable Products)

Attributes define product variation types like Size, Color, Material, etc.

### 8.1 List Attributes

Retrieves all attributes with their values.

**Endpoint:** `GET /attributes`  
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "message": "Attributes retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Size",
      "slug": "size",
      "is_active": true,
      "sort_order": 0,
      "values": [
        {
          "id": 1,
          "value": "Small",
          "slug": "small",
          "sort_order": 0
        },
        {
          "id": 2,
          "value": "Medium",
          "slug": "medium",
          "sort_order": 1
        },
        {
          "id": 3,
          "value": "Large",
          "slug": "large",
          "sort_order": 2
        }
      ]
    }
  ]
}
```

---

### 8.2 Get Single Attribute

**Endpoint:** `GET /attributes/{id}`  
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "message": "Attribute retrieved successfully",
  "data": {
    "id": 1,
    "name": "Size",
    "slug": "size",
    "is_active": true,
    "values": [...]
  }
}
```

---

### 8.3 Create Attribute

**Endpoint:** `POST /attributes`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, max: 100)",
  "slug": "string (optional, auto-generated from name)",
  "is_active": "boolean (optional, default: true)",
  "sort_order": "integer (optional, default: 0)",
  "values": [
    {
      "value": "string (required)",
      "slug": "string (optional)",
      "color_code": "string (optional, for color attributes)",
      "sort_order": "integer (optional)"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attribute created successfully",
  "data": {
    "id": 1,
    "name": "Color",
    "slug": "color",
    "values": [...]
  }
}
```

---

### 8.4 Update Attribute

**Endpoint:** `PUT /attributes/{id}`  
**Auth Required:** Yes

**Request Body:** Same as Create Attribute

---

### 8.5 Delete Attribute

**Endpoint:** `DELETE /attributes/{id}`  
**Auth Required:** Yes

**Note:** Cannot delete attributes that are used by product variants.

---

### 8.6 Add Value to Attribute

**Endpoint:** `POST /attributes/{id}/values`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "value": "string (required)",
  "slug": "string (optional)",
  "color_code": "string (optional)",
  "sort_order": "integer (optional)"
}
```

---

### 8.7 Update Attribute Value

**Endpoint:** `PUT /attribute-values/{id}`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "value": "string (required)",
  "slug": "string (optional)",
  "color_code": "string (optional)",
  "is_active": "boolean (optional)",
  "sort_order": "integer (optional)"
}
```

---

### 8.8 Delete Attribute Value

**Endpoint:** `DELETE /attribute-values/{id}`  
**Auth Required:** Yes

**Note:** Cannot delete values that are used by product variants.

---

## 9. Product Variants

Product variants represent specific combinations of attribute values (e.g., "Large Red T-Shirt").

### 9.1 List Product Variants

**Endpoint:** `GET /products/{product_id}/variants`  
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "message": "Variants retrieved successfully",
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "sku": "TSHIRT-LRG-RED",
      "variant_name": "Large / Red",
      "price": 29.99,
      "cost_price": 15.00,
      "stock_quantity": 50,
      "low_stock_threshold": 5,
      "is_active": true,
      "sort_order": 0,
      "attribute_values": [
        {
          "id": 3,
          "attribute_id": 1,
          "attribute_name": "Size",
          "value": "Large"
        },
        {
          "id": 5,
          "attribute_id": 2,
          "attribute_name": "Color",
          "value": "Red"
        }
      ]
    }
  ]
}
```

---

### 9.2 Create Single Variant

**Endpoint:** `POST /products/{product_id}/variants`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "sku": "string (required, unique per business)",
  "barcode": "string (optional, unique per business)",
  "price": "decimal (optional)",
  "cost_price": "decimal (optional)",
  "wholesale_price": "decimal (optional)",
  "dealer_price": "decimal (optional)",
  "weight": "decimal (optional)",
  "image": "string (optional)",
  "is_active": "boolean (optional, default: true)",
  "sort_order": "integer (optional)",
  "attribute_values": [1, 5],
  "initial_stock": "integer (optional, >= 0)"
}
```

---

### 9.3 Generate Variants (Bulk)

Generates all possible variant combinations from selected attribute values.

**Endpoint:** `POST /products/{product_id}/variants/generate`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "attribute_value_ids": [1, 2, 3, 4, 5, 6],
  "base_price": 29.99,
  "base_cost_price": 15.00,
  "base_sku": "TSHIRT"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 6 variants successfully",
  "data": {
    "created": 6,
    "skipped": 0,
    "variants": [...]
  }
}
```

---

### 9.4 Find Variant by Attributes

Finds a specific variant by its attribute value combination. Used in POS for variant selection.

**Endpoint:** `POST /products/{product_id}/variants/find`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "attribute_value_ids": [3, 5]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Variant found",
  "data": {
    "id": 1,
    "sku": "TSHIRT-LRG-RED",
    "variant_name": "Large / Red",
    "price": 29.99,
    "stock_quantity": 50,
    "attribute_values": [...]
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "message": "Variant not found for selected attributes"
}
```

---

### 9.5 Get Variant Details

**Endpoint:** `GET /variants/{id}`  
**Auth Required:** Yes

---

### 9.6 Update Variant

**Endpoint:** `PUT /variants/{id}`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "sku": "string (optional, unique per business)",
  "barcode": "string (optional, unique per business)",
  "price": "decimal (optional)",
  "cost_price": "decimal (optional)",
  "wholesale_price": "decimal (optional)",
  "dealer_price": "decimal (optional)",
  "weight": "decimal (optional)",
  "image": "string (optional)",
  "is_active": "boolean (optional)",
  "sort_order": "integer (optional)"
}
```

---

### 9.7 Delete Variant

**Endpoint:** `DELETE /variants/{id}`  
**Auth Required:** Yes

**Note:** Cannot delete variants that have been used in sales.

---

### 9.8 Update Variant Stock

Quick stock update for a variant.

**Endpoint:** `PUT /variants/{id}/stock`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "quantity": "integer (required)",
  "operation": "string (optional: 'set', 'add', 'subtract', default: 'set')"
}
```

---

## 10. Parties (Customers/Suppliers)

### 8.1 List Parties

Retrieves all customers and suppliers.

**Endpoint:** `GET /parties`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "name": "John Customer",
      "email": "john@email.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "type": "Retailer",
      "due": 500.00,
      "wallet": 0,
      "credit_limit": 10000.00,
      "opening_balance": 0,
      "opening_balance_type": "due",
      "image": "path/to/image.jpg"
    }
  ]
}
```

**Party Types:**
- `Retailer` - Retail customer
- `Dealer` - Dealer customer
- `Wholesaler` - Wholesale customer
- `Supplier` - Supplier/Vendor

---

### 8.2 Create Party

**Endpoint:** `POST /parties`  
**Auth Required:** Yes

**Request Body (multipart/form-data):**
```json
{
  "name": "string (required, max: 255)",
  "type": "enum: Retailer|Dealer|Wholesaler|Supplier (required)",
  "phone": "string (optional, max: 20, unique per business)",
  "email": "string (optional)",
  "address": "string (optional, max: 255)",
  "credit_limit": "numeric (optional, min: 0, max: 999999999999.99)",
  "opening_balance": "numeric (optional)",
  "opening_balance_type": "enum: due|advance (required)",
  "image": "file (optional, image)"
}
```

---

### 8.3 Update Party

**Endpoint:** `PUT /parties/{id}`  
**Auth Required:** Yes

**Request Body:** Same as Create Party

---

### 8.4 Delete Party

**Endpoint:** `DELETE /parties/{id}`  
**Auth Required:** Yes

**Note:** Party cannot be deleted if it has associated transactions.

---

### 8.5 Send Due Message

Sends SMS reminder for due amount.

**Endpoint:** `GET /parties/{id}`  
**Auth Required:** Yes

**Note:** Requires MESSAGE_ENABLED=true in environment.

---

## 11. Sales

### 11.1 List Sales

**Endpoint:** `GET /sales`  
**Auth Required:** Yes

#### Pagination Modes

This endpoint supports 4 pagination modes following the standard pattern:

**1. Default Mode (All items with safety limit)**
```bash
GET /sales
GET /sales?limit=1000
```

**2. Dropdown Mode (Limited flat array)**
```bash
GET /sales?limit=50
```

**3. Table Mode (Offset pagination)**
```bash
GET /sales?page=1&per_page=20
```

**4. Sync Mode (Cursor-based)**
```bash
GET /sales?cursor=0&per_page=500
```

#### Query Parameters

**Pagination:**
- `limit` - Max items to return (1-1000). Default: 1000
- `page` - Page number for offset pagination (1-based)
- `per_page` - Items per page (max 100 for table mode, max 1000 for cursor mode)
- `cursor` - Starting ID for cursor-based pagination

**Filters:**
- `returned-sales=true` - Show only sales with returns
- `party_id=1` - Filter by customer/party
- `date_from=2024-01-01` - Start date filter
- `date_to=2024-12-31` - End date filter
- `isPaid=true` - Filter by payment status (true/false)
- `invoiceNumber=S-00001` - Exact invoice number match
- `search=keyword` - Search in invoice number, party name

#### Response Examples

**Default/Dropdown/Cursor Mode Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "invoiceNumber": "S-00001",
      "saleDate": "2024-01-15",
      "totalAmount": 1500.00,
      "discountAmount": 50.00,
      "discount_percent": 3.33,
      "discount_type": "percentage",
      "shipping_charge": 0,
      "vat_amount": 150.00,
      "vat_percent": 10.0,
      "paidAmount": 1450.00,
      "dueAmount": 0,
      "change_amount": 0,
      "isPaid": true,
      "paymentType": "cash",
      "rounding_option": "none",
      "rounding_amount": 0,
      "final_amount": 1450.00,
      "created_at": "2024-01-15T10:00:00.000000Z",
      "updated_at": "2024-01-15T10:00:00.000000Z",
      "user": {
        "id": 1,
        "name": "Cashier",
        "role": "staff"
      },
      "party": {
        "id": 1,
        "name": "Walk-in Customer",
        "email": "customer@example.com",
        "phone": "+1234567890",
        "type": "Retailer"
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
      "branch": {
        "id": 1,
        "name": "Main Branch",
        "phone": "+1234567890",
        "address": "123 Main St"
      },
      "details": [
        {
          "id": 1,
          "product_id": 1,
          "variant_id": null,
          "stock_id": 1,
          "quantities": 2,
          "price": 750.00,
          "subTotal": 1500.00,
          "lossProfit": 225.00,
          "product": {
            "id": 1,
            "productName": "Product A",
            "productCode": "PRD001",
            "product_type": "standard",
            "productPurchasePrice": 500.00,
            "productStock": 100,
            "category": {
              "id": 1,
              "categoryName": "Electronics"
            }
          },
          "variant": null,
          "stock": {
            "id": 1,
            "batch_no": "BATCH001"
          }
        }
      ],
      "saleReturns": []
    }
  ]
}
```

**Cursor Mode Additional Fields:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "cursor": 501,
  "has_more": true
}
```

**Table Mode Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "pagination": {
    "total": 2500,
    "per_page": 20,
    "current_page": 1,
    "last_page": 125,
    "from": 1,
    "to": 20
  }
}
```

#### Usage Examples

**Example 1: Get all sales (with safety limit)**
```bash
curl -X GET "http://localhost:8000/api/sales" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 2: Get dropdown list for UI**
```bash
curl -X GET "http://localhost:8000/api/sales?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 3: Get paginated table data**
```bash
curl -X GET "http://localhost:8000/api/sales?page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 4: Sync sales in batches**
```bash
# First batch
curl -X GET "http://localhost:8000/api/sales?cursor=0&per_page=500" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Next batch using returned cursor
curl -X GET "http://localhost:8000/api/sales?cursor=501&per_page=500" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 5: Filter by customer and date range**
```bash
curl -X GET "http://localhost:8000/api/sales?party_id=5&date_from=2024-01-01&date_to=2024-12-31&page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 6: Get sales with returns only**
```bash
curl -X GET "http://localhost:8000/api/sales?returned-sales=true&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 7: Search by invoice number or customer**
```bash
curl -X GET "http://localhost:8000/api/sales?search=S-00001&page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 11.2 Create Sale

Creates a new sale transaction.

**Endpoint:** `POST /sales`  
**Auth Required:** Yes

**Request Body (multipart/form-data):**
```json
{
  "products": "JSON string (required)",
  "saleDate": "date (optional)",
  "invoiceNumber": "string (optional)",
  "party_id": "integer (optional, exists)",
  "payment_type_id": "integer (optional)",
  "vat_id": "integer (optional)",
  "vat_amount": "numeric (optional)",
  "totalAmount": "numeric (required)",
  "discountAmount": "numeric (optional, default: 0)",
  "paidAmount": "numeric (required)",
  "dueAmount": "numeric (optional, default: 0)",
  "change_amount": "numeric (optional)",
  "isPaid": "boolean (optional)",
  "rounding_option": "enum: none|round_up|nearest_whole_number|nearest_0.05|nearest_0.1|nearest_0.5",
  "note": "string (optional)",
  "customer_phone": "string (optional)",
  "image": "file (optional, image)"
}
```

**Products JSON Format:**
```json
[
  {
    "stock_id": 1,
    "product_name": "Product A",
    "quantities": 2,
    "price": 750.00,
    "lossProfit": 225.00
  }
]
```

**Response:**
```json
{
  "message": "Data saved successfully.",
  "data": {
    "id": 1,
    "invoiceNumber": "S-00001",
    "details": [],
    "party": {},
    "payment_type": {}
  }
}
```

---

### 11.3 Update Sale

Updates an existing sale.

**Endpoint:** `PUT /sales/{id}`  
**Auth Required:** Yes

**Request Body:** Same as Create Sale

**Note:** Cannot update if sale has returns.

---

### 11.4 Delete Sale

**Endpoint:** `DELETE /sales/{id}`  
**Auth Required:** Yes

**Note:** Restores stock quantities and adjusts party due.

---

## 12. Purchases

### 12.1 List Purchases

**Endpoint:** `GET /purchase`  
**Auth Required:** Yes

#### Pagination Modes

This endpoint supports 4 pagination modes following the standard pattern:

**1. Default Mode (All items with safety limit)**
```bash
GET /purchase
GET /purchase?limit=1000
```

**2. Dropdown Mode (Limited flat array)**
```bash
GET /purchase?limit=50
```

**3. Table Mode (Offset pagination)**
```bash
GET /purchase?page=1&per_page=20
```

**4. Sync Mode (Cursor-based)**
```bash
GET /purchase?cursor=0&per_page=500
```

#### Query Parameters

**Pagination:**
- `limit` - Max items to return (1-1000). Default: 1000
- `page` - Page number for offset pagination (1-based)
- `per_page` - Items per page (max 100 for table mode, max 1000 for cursor mode)
- `cursor` - Starting ID for cursor-based pagination

**Filters:**
- `returned-purchase=true` - Show only purchases with returns
- `party_id=1` - Filter by supplier/party
- `date_from=2024-01-01` - Start date filter
- `date_to=2024-12-31` - End date filter
- `isPaid=true` - Filter by payment status (true/false)
- `invoiceNumber=P-00001` - Exact invoice number match
- `search=keyword` - Search in invoice number, party name

#### Response Examples

**Default/Dropdown/Cursor Mode Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "invoiceNumber": "P-00001",
      "purchaseDate": "2024-01-10",
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
      "created_at": "2024-01-10T10:00:00.000000Z",
      "updated_at": "2024-01-10T10:00:00.000000Z",
      "user": {
        "id": 1,
        "name": "John Doe",
        "role": "admin"
      },
      "party": {
        "id": 1,
        "name": "ABC Suppliers",
        "email": "abc@suppliers.com",
        "phone": "+1234567890",
        "type": "Supplier"
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
      "branch": {
        "id": 1,
        "name": "Main Branch",
        "phone": "+1234567890",
        "address": "123 Main St"
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
          "product": {
            "id": 1,
            "productName": "Product A",
            "product_type": "standard",
            "category": {
              "id": 1,
              "categoryName": "Electronics"
            },
            "vat": {
              "id": 1,
              "name": "VAT 10%",
              "rate": 10.0
            }
          },
          "variant": null,
          "stock": {
            "id": 1,
            "batch_no": "BATCH001",
            "expire_date": "2025-12-31",
            "mfg_date": "2024-01-01"
          }
        }
      ],
      "purchaseReturns": []
    }
  ]
}
```

**Cursor Mode Additional Fields:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "cursor": 501,
  "has_more": true
}
```

**Table Mode Response:**
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

#### Usage Examples

**Example 1: Get all purchases (with safety limit)**
```bash
curl -X GET "http://localhost:8000/api/purchase" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 2: Get dropdown list for UI**
```bash
curl -X GET "http://localhost:8000/api/purchase?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 3: Get paginated table data**
```bash
curl -X GET "http://localhost:8000/api/purchase?page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 4: Sync purchases in batches**
```bash
# First batch
curl -X GET "http://localhost:8000/api/purchase?cursor=0&per_page=500" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Next batch using returned cursor
curl -X GET "http://localhost:8000/api/purchase?cursor=501&per_page=500" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 5: Filter by supplier and date range**
```bash
curl -X GET "http://localhost:8000/api/purchase?party_id=5&date_from=2024-01-01&date_to=2024-12-31&page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 6: Get purchases with returns only**
```bash
curl -X GET "http://localhost:8000/api/purchase?returned-purchase=true&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 7: Search by invoice number or party**
```bash
curl -X GET "http://localhost:8000/api/purchase?search=P-00001&page=1&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 12.2 Create Purchase

**Endpoint:** `POST /purchases`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "party_id": "integer (required, exists)",
  "invoiceNumber": "string (optional)",
  "purchaseDate": "date (optional)",
  "payment_type_id": "integer (optional)",
  "vat_id": "integer (optional)",
  "vat_amount": "numeric (optional)",
  "totalAmount": "numeric (required)",
  "discountAmount": "numeric (optional)",
  "paidAmount": "numeric (required)",
  "dueAmount": "numeric (optional)",
  "products": [
    {
      "product_id": 1,
      "variant_id": "integer (optional, for variant-specific stock tracking)",
      "batch_no": "string (optional, for batch products)",
      "quantities": 50,
      "productPurchasePrice": 100.00,
      "productSalePrice": 150.00,
      "productDealerPrice": 130.00,
      "productWholeSalePrice": 120.00,
      "profit_percent": 50,
      "mfg_date": "2024-01-01",
      "expire_date": "2025-12-31"
    }
  ]
}
```

---

### 12.3 Update Purchase

**Endpoint:** `PUT /purchases/{id}`  
**Auth Required:** Yes

**Note:** Cannot update if purchase has returns.

---

### 12.4 Delete Purchase

**Endpoint:** `DELETE /purchases/{id}`  
**Auth Required:** Yes

---

## 13. Sale Returns

### 13.1 List Sale Returns

**Endpoint:** `GET /sale-returns`  
**Auth Required:** Yes

**Query Parameters:**
- `start_date` - Filter start date
- `end_date` - Filter end date

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "sale_id": 1,
      "return_date": "2024-01-20",
      "sale": {
        "id": 1,
        "invoiceNumber": "S-00001",
        "party": {
          "id": 1,
          "name": "Customer"
        }
      },
      "details": [
        {
          "id": 1,
          "sale_detail_id": 1,
          "return_qty": 1,
          "return_amount": 750.00
        }
      ]
    }
  ]
}
```

---

### 11.2 Create Sale Return

**Endpoint:** `POST /sale-returns`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "sale_id": "integer (required, exists)",
  "return_date": "date (required)",
  "sale_detail_id": ["array of sale detail IDs"],
  "return_qty": ["array of quantities"],
  "return_amount": ["array of amounts"],
  "lossProfit": ["array of profit adjustments"],
  "totalAmount": "numeric",
  "paidAmount": "numeric",
  "dueAmount": "numeric",
  "discountAmount": "numeric"
}
```

---

### 13.3 Get Sale Return Details

**Endpoint:** `GET /sale-returns/{id}`  
**Auth Required:** Yes

---

## 14. Purchase Returns

### 14.1 List Purchase Returns

**Endpoint:** `GET /purchase-returns`  
**Auth Required:** Yes

**Query Parameters:**
- `start_date` - Filter start date
- `end_date` - Filter end date

---

### 14.2 Create Purchase Return

**Endpoint:** `POST /purchase-returns`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "purchase_id": "integer (required, exists)",
  "return_date": "date (required)",
  "purchase_detail_id": ["array of purchase detail IDs"],
  "return_qty": ["array of quantities"],
  "return_amount": ["array of amounts"],
  "totalAmount": "numeric",
  "paidAmount": "numeric",
  "dueAmount": "numeric",
  "discountAmount": "numeric"
}
```

---

### 14.3 Get Purchase Return Details

**Endpoint:** `GET /purchase-returns/{id}`  
**Auth Required:** Yes

---

## 15. Due Collection

### 15.1 List Due Collections

**Endpoint:** `GET /dues`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "party_id": 1,
      "payDueAmount": 500.00,
      "totalDue": 1500.00,
      "dueAmountAfterPay": 1000.00,
      "paymentDate": "2024-01-15",
      "invoiceNumber": "S-00001",
      "party": {
        "id": 1,
        "name": "Customer Name"
      },
      "payment_type": {
        "id": 1,
        "name": "Cash"
      }
    }
  ]
}
```

---

### 13.2 Collect Due

**Endpoint:** `POST /dues`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "party_id": "integer (required, exists)",
  "payment_type_id": "integer (required, exists)",
  "paymentDate": "string (required)",
  "payDueAmount": "numeric (required)",
  "invoiceNumber": "string (optional, exists in sales/purchases)"
}
```

**Note:** 
- If party is Supplier, collects from purchases due
- Otherwise, collects from sales due
- When logged into a branch, invoice selection is required

---

## 16. Expenses

### 16.1 List Expenses

**Endpoint:** `GET /expenses`  
**Auth Required:** Yes
**Description:** List all expenses with categories, payment types, and branches for the authenticated user's business.

**Response (Success):**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "amount": 500.00,
      "expense_category_id": 1,
      "payment_type_id": 1,
      "branch_id": 1,
      "expenseFor": "string",
      "referenceNo": "REF001",
      "expenseDate": "2024-12-10",
      "note": "string",
      "category": { "id": 1, "categoryName": "Office Expenses" },
      "payment_type": { "id": 1, "name": "Cash" },
      "branch": { "id": 1, "name": "Main Branch" }
    }
  ],
  "expense_categories": [],
  "payment_types": [],
  "branches": []
}
```

---

### 16.2 Filter Expenses

**Endpoint:** `GET /expenses/filter`  
**Auth Required:** Yes
**Description:** Search and filter expenses by branch and/or search term.

**Query Parameters:**
```json
{
  "branch_id": "integer (optional)",
  "search": "string (optional) - searches amount, expenseFor, paymentType, referenceNo, category name, branch name, payment type name",
  "per_page": "integer (optional, default: 10)"
}
```

**Response (Success):**
```json
{
  "message": "Data filtered successfully.",
  "data": []
}
```

---

### 16.3 Create Expense

**Endpoint:** `POST /expenses`  
**Auth Required:** Yes
**Description:** Create a new expense record.

**Request Body:**
```json
{
  "amount": "numeric (required)",
  "expense_category_id": "integer (required, exists in expense_categories)",
  "payment_type_id": "integer (required, exists in payment_types)",
  "expenseFor": "string (optional)",
  "referenceNo": "string (optional)",
  "expenseDate": "string (optional)",
  "note": "string (optional)"
}
```

**Response (Success - 201):**
```json
{
  "message": "Expense saved successfully.",
  "data": {
    "id": 1,
    "amount": 500.00,
    "expense_category_id": 1,
    "payment_type_id": 1,
    "expenseFor": "string",
    "referenceNo": "REF001",
    "expenseDate": "2024-12-10",
    "note": "string",
    "user_id": 1,
    "business_id": 1
  }
}
```

---

### 16.4 Get Single Expense

**Endpoint:** `GET /expenses/{id}`  
**Auth Required:** Yes
**Description:** Retrieve details of a specific expense.

**Response (Success):**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "amount": 500.00,
    "expense_category_id": 1,
    "payment_type_id": 1,
    "branch_id": 1,
    "expenseFor": "string",
    "referenceNo": "REF001",
    "expenseDate": "2024-12-10",
    "note": "string",
    "category": { "id": 1, "categoryName": "Office Expenses" },
    "payment_type": { "id": 1, "name": "Cash" },
    "branch": { "id": 1, "name": "Main Branch" }
  }
}
```

---

### 16.5 Update Expense

**Endpoint:** `PUT /expenses/{id}`  
**Auth Required:** Yes
**Description:** Update an existing expense record.

**Request Body:**
```json
{
  "amount": "numeric (required)",
  "expense_category_id": "integer (required, exists in expense_categories)",
  "payment_type_id": "integer (required, exists in payment_types)",
  "expenseFor": "string (optional)",
  "referenceNo": "string (optional)",
  "expenseDate": "string (optional)",
  "note": "string (optional)"
}
```

**Response (Success):**
```json
{
  "message": "Expense updated successfully.",
  "data": {}
}
```

---

### 16.6 Delete Expense

**Endpoint:** `DELETE /expenses/{id}`  
**Auth Required:** Yes
**Description:** Delete a specific expense record.

**Response (Success):**
```json
{
  "message": "Expense deleted successfully"
}
```

---

### 16.7 Delete Multiple Expenses

**Endpoint:** `POST /expenses/delete-all`  
**Auth Required:** Yes
**Description:** Delete multiple expense records at once.

**Request Body:**
```json
{
  "ids": "array of integers (required) - array of expense IDs to delete"
}
```

**Response (Success):**
```json
{
  "message": "Selected items deleted successfully."
}
```

---

## 17. Incomes

### 17.1 List Incomes

**Endpoint:** `GET /incomes`  
**Auth Required:** Yes
**Description:** List all incomes with categories, payment types, and branches for the authenticated user's business.

**Response (Success):**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "amount": 5000.00,
      "income_category_id": 1,
      "payment_type_id": 1,
      "branch_id": 1,
      "incomeFor": "string",
      "referenceNo": "REF001",
      "incomeDate": "2024-12-10",
      "note": "string",
      "category": { "id": 1, "categoryName": "Sales" },
      "payment_type": { "id": 1, "name": "Cash" },
      "branch": { "id": 1, "name": "Main Branch" }
    }
  ],
  "income_categories": [],
  "payment_types": [],
  "branches": []
}
```

---

### 17.2 Filter Incomes

**Endpoint:** `GET /incomes/filter`  
**Auth Required:** Yes
**Description:** Search and filter incomes by branch and/or search term.

**Query Parameters:**
```json
{
  "branch_id": "integer (optional)",
  "search": "string (optional) - searches amount, incomeFor, paymentType, referenceNo, incomeDate, category name, branch name, payment type name",
  "per_page": "integer (optional, default: 10)"
}
```

**Response (Success):**
```json
{
  "message": "Data filtered successfully.",
  "data": []
}
```

---

### 17.3 Create Income

**Endpoint:** `POST /incomes`  
**Auth Required:** Yes
**Description:** Create a new income record.

**Request Body:**
```json
{
  "amount": "numeric (required)",
  "income_category_id": "integer (required, exists in income_categories)",
  "payment_type_id": "integer (required, exists in payment_types)",
  "incomeFor": "string (optional)",
  "referenceNo": "string (optional)",
  "incomeDate": "string (optional)",
  "note": "string (optional)"
}
```

**Response (Success - 201):**
```json
{
  "message": "Income saved successfully.",
  "data": {
    "id": 1,
    "amount": 5000.00,
    "income_category_id": 1,
    "payment_type_id": 1,
    "incomeFor": "string",
    "referenceNo": "REF001",
    "incomeDate": "2024-12-10",
    "note": "string",
    "user_id": 1,
    "business_id": 1
  }
}
```

---

### 17.4 Get Single Income

**Endpoint:** `GET /incomes/{id}`  
**Auth Required:** Yes
**Description:** Retrieve details of a specific income.

**Response (Success):**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "amount": 5000.00,
    "income_category_id": 1,
    "payment_type_id": 1,
    "branch_id": 1,
    "incomeFor": "string",
    "referenceNo": "REF001",
    "incomeDate": "2024-12-10",
    "note": "string",
    "category": { "id": 1, "categoryName": "Sales" },
    "payment_type": { "id": 1, "name": "Cash" },
    "branch": { "id": 1, "name": "Main Branch" }
  }
}
```

---

### 17.5 Update Income

**Endpoint:** `PUT /incomes/{id}`  
**Auth Required:** Yes
**Description:** Update an existing income record.

**Request Body:**
```json
{
  "amount": "numeric (required)",
  "income_category_id": "integer (required, exists in income_categories)",
  "payment_type_id": "integer (required, exists in payment_types)",
  "incomeFor": "string (optional)",
  "referenceNo": "string (optional)",
  "incomeDate": "string (optional)",
  "note": "string (optional)"
}
```

**Response (Success):**
```json
{
  "message": "Income updated successfully.",
  "data": {}
}
```

---

### 17.6 Delete Income

**Endpoint:** `DELETE /incomes/{id}`  
**Auth Required:** Yes
**Description:** Delete a specific income record.

**Response (Success):**
```json
{
  "message": "Income deleted successfully"
}
```

---

### 17.7 Delete Multiple Incomes

**Endpoint:** `POST /incomes/delete-all`  
**Auth Required:** Yes
**Description:** Delete multiple income records at once.

**Request Body:**
```json
{
  "ids": "array of integers (required) - array of income IDs to delete"
}
```

**Response (Success):**
```json
{
  "message": "Selected Items deleted successfully."
}
```

---

## 18. Expense Categories

### 18.1 List Expense Categories

**Endpoint:** `GET /expense-categories`  
**Auth Required:** Yes

---

### 18.2 Create Expense Category

**Endpoint:** `POST /expense-categories`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "categoryName": "string (required, unique per business)",
  "status": "boolean (optional, 'true'/'false')"
}
```

---

### 18.3 Update Expense Category

**Endpoint:** `PUT /expense-categories/{id}`  
**Auth Required:** Yes

---

### 18.4 Delete Expense Category

**Endpoint:** `DELETE /expense-categories/{id}`  
**Auth Required:** Yes

---

## 19. Income Categories

### 19.1 List Income Categories

**Endpoint:** `GET /income-categories`  
**Auth Required:** Yes

---

### 19.2 Create Income Category

**Endpoint:** `POST /income-categories`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "categoryName": "string (required, unique per business)",
  "status": "boolean (optional)"
}
```

---

### 17.3 Update Income Category

**Endpoint:** `PUT /income-categories/{id}`  
**Auth Required:** Yes

---

### 19.4 Delete Income Category

**Endpoint:** `DELETE /income-categories/{id}`  
**Auth Required:** Yes

---

## 20. VAT/Tax

### 20.1 List VAT/Taxes

**Endpoint:** `GET /vats`  
**Auth Required:** Yes

**Query Parameters:**
- `type=single` - Only single VATs
- `type=group` - Only VAT groups
- `status=active` - Only active VATs
- `status=inactive` - Only inactive VATs

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "name": "VAT 10%",
      "rate": 10,
      "status": 1,
      "sub_vat": null
    },
    {
      "id": 2,
      "name": "Combined Tax",
      "rate": 18,
      "status": 1,
      "sub_vat": [
        {"id": 1, "name": "VAT 10%", "rate": 10},
        {"id": 3, "name": "Service Tax", "rate": 8}
      ]
    }
  ]
}
```

---

### 20.2 Create VAT

**Endpoint:** `POST /vats`  
**Auth Required:** Yes

**For Single VAT:**
```json
{
  "name": "string (required, max: 255)",
  "rate": "numeric (required)"
}
```

**For VAT Group:**
```json
{
  "name": "string (required, max: 255)",
  "vat_ids": ["array of VAT IDs to combine"]
}
```

---

### 20.3 Update VAT

**Endpoint:** `PUT /vats/{id}`  
**Auth Required:** Yes

---

### 20.4 Delete VAT

**Endpoint:** `DELETE /vats/{id}`  
**Auth Required:** Yes

**Note:** Cannot delete if VAT is part of a VAT group.

---

## 21. Payment Types

### 21.1 List Payment Types

**Endpoint:** `GET /payment-types`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "name": "Cash"
    },
    {
      "id": 2,
      "name": "Card"
    }
  ]
}
```

---

### 19.2 Create Payment Type

**Endpoint:** `POST /payment-types`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, unique per business)"
}
```

---

### 21.3 Update Payment Type

**Endpoint:** `PUT /payment-types/{id}`  
**Auth Required:** Yes

---

### 21.4 Delete Payment Type

**Endpoint:** `DELETE /payment-types/{id}`  
**Auth Required:** Yes

---

## 22. Stocks

### 22.1 Add Stock

Adds stock quantity to existing stock entry.

**Endpoint:** `POST /stocks`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "stock_id": "integer (required, exists)",
  "productStock": "integer (required)"
}
```

---

### 22.2 Update Stock

Updates stock details.

**Endpoint:** `PUT /stocks/{id}`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "productStock": "integer (optional)",
  "productPurchasePrice": "numeric (optional)",
  "productSalePrice": "numeric (optional)",
  "productDealerPrice": "numeric (optional)",
  "productWholeSalePrice": "numeric (optional)",
  "profit_percent": "numeric (optional)",
  "mfg_date": "date (optional)",
  "expire_date": "date (optional)"
}
```

---

### 22.3 Delete Stock

**Endpoint:** `DELETE /stocks/{id}`  
**Auth Required:** Yes

---

## 23. Warehouses

### 23.1 List Warehouses

**Endpoint:** `GET /warehouses`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "name": "Main Warehouse",
      "phone": "+1234567890",
      "email": "warehouse@store.com",
      "address": "123 Warehouse St",
      "total_quantity": 500,
      "total_value": 50000.00
    }
  ]
}
```

---

### 21.2 Create Warehouse

**Endpoint:** `POST /warehouses`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, max: 255)",
  "phone": "string (optional, max: 20)",
  "email": "string (optional, email, unique per business)",
  "address": "string (optional, max: 500)"
}
```

---

### 23.3 Update Warehouse

**Endpoint:** `PUT /warehouses/{id}`  
**Auth Required:** Yes

---

### 23.4 Delete Warehouse

**Endpoint:** `DELETE /warehouses/{id}`  
**Auth Required:** Yes

---

## 24. Racks

### 24.1 List Racks

**Endpoint:** `GET /racks`  
**Auth Required:** Yes
**Description:** List all racks with pagination and shelf relationships.

**Query Parameters:**
```json
{
  "per_page": "integer (optional, default: 20, max: 200)",
  "page": "integer (optional, default: 1)"
}
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "name": "Rack A1",
        "status": true,
        "shelves": [
          {
            "id": 1,
            "name": "Shelf 1",
            "status": true
          }
        ]
      }
    ],
    "per_page": 20,
    "total": 5
  }
}
```

---

### 24.2 Create Rack

**Endpoint:** `POST /racks`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, max: 255)",
  "status": "boolean (optional, default: 1)",
  "shelf_id": "array (optional) - array of shelf IDs to associate"
}
```

**Response (Success):**
```json
{
  "message": "Rack created successfully.",
  "data": {
    "id": 1,
    "name": "Rack A1",
    "status": true,
    "shelves": []
  }
}
```

---

### 24.3 Get Single Rack

**Endpoint:** `GET /racks/{id}`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "name": "Rack A1",
    "status": true,
    "shelves": [
      {
        "id": 1,
        "name": "Shelf 1",
        "status": true
      }
    ]
  }
}
```

---

### 24.4 Update Rack

**Endpoint:** `PUT /racks/{id}`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, max: 255)",
  "status": "boolean (optional)",
  "shelf_id": "array (optional) - shelf IDs to sync"
}
```

---

### 24.5 Delete Rack

**Endpoint:** `DELETE /racks/{id}`  
**Auth Required:** Yes

---

### 24.6 Update Rack Status

**Endpoint:** `PATCH /racks/{id}/status`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "status": "boolean (required)"
}
```

**Response (Success):**
```json
{
  "message": "Status updated successfully",
  "data": {
    "id": 1,
    "name": "Rack A1",
    "status": true
  }
}
```

---

### 24.7 Delete Multiple Racks

**Endpoint:** `POST /racks/delete-all`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "ids": [1, 2, 3]
}
```

**Response (Success):**
```json
{
  "message": "Selected racks deleted successfully"
}
```

---

### 24.8 Filter Racks

**Endpoint:** `GET /racks/filter`  
**Auth Required:** Yes
**Description:** Search and filter racks by name with pagination.

**Query Parameters:**
```json
{
  "search": "string (optional) - searches name",
  "per_page": "integer (optional, default: 10, max: 200)",
  "page": "integer (optional, default: 1)"
}
```

**Response:**
```json
{
  "message": "Data filtered successfully.",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "name": "Rack A1",
        "status": true,
        "shelves": []
      }
    ],
    "per_page": 10,
    "total": 1
  }
}
```

---

## 25. Shelves

### 25.1 List Shelves

**Endpoint:** `GET /shelves`  
**Auth Required:** Yes
**Description:** List all shelves with pagination and rack relationships.

**Query Parameters:**
```json
{
  "per_page": "integer (optional, default: 20, max: 200)",
  "page": "integer (optional, default: 1)"
}
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "name": "Shelf 1",
        "status": true,
        "racks": [
          {
            "id": 1,
            "name": "Rack A1",
            "status": true
          }
        ]
      }
    ],
    "per_page": 20,
    "total": 3
  }
}
```

---

### 25.2 Create Shelf

**Endpoint:** `POST /shelves`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, max: 255)",
  "status": "boolean (optional, default: 1)"
}
```

**Response (Success):**
```json
{
  "message": "Shelf created successfully.",
  "data": {
    "id": 1,
    "name": "Shelf 1",
    "status": true
  }
}
```

---

### 25.3 Get Single Shelf

**Endpoint:** `GET /shelves/{id}`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "name": "Shelf 1",
    "status": true,
    "racks": [
      {
        "id": 1,
        "name": "Rack A1",
        "status": true
      }
    ]
  }
}
```

---

### 25.4 Update Shelf

**Endpoint:** `PUT /shelves/{id}`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, max: 255)",
  "status": "boolean (optional)"
}
```

---

### 25.5 Delete Shelf

**Endpoint:** `DELETE /shelves/{id}`  
**Auth Required:** Yes

---

### 25.6 Update Shelf Status

**Endpoint:** `PATCH /shelves/{id}/status`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "status": "boolean (required)"
}
```

**Response (Success):**
```json
{
  "message": "Status updated successfully",
  "data": {
    "id": 1,
    "name": "Shelf 1",
    "status": true
  }
}
```

---

### 25.7 Delete Multiple Shelves

**Endpoint:** `POST /shelves/delete-all`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "ids": [1, 2, 3]
}
```

**Response (Success):**
```json
{
  "message": "Selected shelves deleted successfully"
}
```

---

### 25.8 Filter Shelves

**Endpoint:** `GET /shelves/filter`  
**Auth Required:** Yes
**Description:** Search and filter shelves by name with pagination.

**Query Parameters:**
```json
{
  "search": "string (optional) - searches name",
  "per_page": "integer (optional, default: 10, max: 200)",
  "page": "integer (optional, default: 1)"
}
```

**Response:**
```json
{
  "message": "Data filtered successfully.",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "name": "Shelf 1",
        "status": true,
        "racks": []
      }
    ],
    "per_page": 10,
    "total": 1
  }
}
```

---

## 26. Currencies

### 24.1 List Currencies

Lists all available currencies.

**Endpoint:** `GET /currencies`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "name": "US Dollar",
      "code": "USD",
      "symbol": "$",
      "position": "before",
      "rate": 1,
      "is_default": 1,
      "status": 1,
      "country_name": "United States"
    }
  ]
}
```

---

### 24.2 Change Currency

Changes the business currency.

**Endpoint:** `GET /currencies/{id}`  
**Auth Required:** Yes

---

## 25. Invoices

### 25.1 Get Party Invoices with Due

Gets all invoices with due amounts for a party.

**Endpoint:** `GET /invoices`  
**Auth Required:** Yes

**Query Parameters:**
- `party_id` (required) - Party ID

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "name": "Customer Name",
    "due": 1500.00,
    "type": "Retailer",
    "sales_dues": [
      {
        "id": 1,
        "invoiceNumber": "S-00001",
        "dueAmount": 500.00,
        "paidAmount": 1000.00,
        "totalAmount": 1500.00
      }
    ]
  }
}
```

---

### 23.2 Generate New Invoice Number

Generates a new invoice number.

**Endpoint:** `GET /new-invoice`  
**Auth Required:** Yes

**Query Parameters:**
- `platform` (required) - `sales`, `purchases`, `due_collects`, `sales_return`, `purchases_return`

**Response:**
```json
"S-00001"
```

---

## 26. Dashboard & Statistics

### 26.1 Get Summary

Gets today's summary statistics.

**Endpoint:** `GET /summary`  
**Auth Required:** Yes

**Query Parameters:**
- `date` (optional) - Date for summary (default: today)

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "sales": 15000.00,
    "income": 5000.00,
    "expense": 2000.00,
    "purchase": 10000.00
  }
}
```

---

### 26.2 Get Dashboard

Gets comprehensive dashboard data with charts.

**Endpoint:** `GET /dashboard`  
**Auth Required:** Yes

**Query Parameters:**
- `duration` (required) - One of:
  - `today`
  - `yesterday`
  - `last_seven_days`
  - `last_thirty_days`
  - `current_month`
  - `last_month`
  - `current_year`
  - `custom_date`
- `from_date` (required for custom_date)
- `to_date` (required for custom_date)

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "total_expense": 5000.00,
    "total_income": 25000.00,
    "total_items": 150,
    "total_categories": 10,
    "stock_value": 500000.00,
    "total_due": 15000.00,
    "total_profit": 50000.00,
    "total_loss": -500.00,
    "sales": [
      {"date": "01", "amount": 5000.00},
      {"date": "02", "amount": 7500.00}
    ],
    "purchases": [
      {"date": "01", "amount": 3000.00},
      {"date": "02", "amount": 4500.00}
    ]
  }
}
```

---

## 27. Users & Staff

### 27.1 List Staff

Lists all staff members.

**Endpoint:** `GET /users`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 2,
      "name": "Staff Member",
      "email": "staff@store.com",
      "role": "staff",
      "visibility": "all",
      "branch": {
        "id": 1,
        "name": "Main Branch"
      }
    }
  ]
}
```

---

### 27.2 Create Staff

**Endpoint:** `POST /users`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, max: 30)",
  "email": "string (required, email, unique)",
  "password": "string (required, min: 4, max: 15)",
  "visibility": "string (optional)",
  "branch_id": "integer (optional, exists)"
}
```

---

### 27.3 Update Staff

**Endpoint:** `PUT /users/{id}`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, max: 30)",
  "email": "string (required, email, unique)",
  "password": "string (optional, min: 4, max: 15)",
  "visibility": "string (optional)",
  "branch_id": "integer (optional, exists)"
}
```

---

### 27.4 Delete Staff

**Endpoint:** `DELETE /users/{id}`  
**Auth Required:** Yes

---

## 28. Settings

### 28.1 Get Product Settings

**Endpoint:** `GET /product-settings`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "business_id": 1,
    "modules": {
      "show_product_type_single": "1",
      "show_product_category": "1",
      "show_alert_qty": "1",
      "show_product_unit": "1",
      "show_product_code": "0",
      "show_product_brand": "0",
      "show_batch_no": "0",
      "show_expire_date": "0",
      "show_mfg_date": "0"
    }
  }
}
```

---

### 28.2 Update Product Settings

**Endpoint:** `POST /product-settings`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "show_product_name": "1|0",
  "show_product_price": "1|0",
  "show_product_code": "1|0",
  "show_product_stock": "1|0",
  "show_product_category": "1|0",
  "show_product_brand": "1|0",
  "show_product_unit": "1|0",
  "show_alert_qty": "1|0",
  "show_batch_no": "1|0",
  "show_expire_date": "1|0",
  "show_mfg_date": "1|0",
  "show_vat_id": "1|0",
  "show_vat_type": "1|0"
}
```

---

### 28.3 Get Invoice Settings

**Endpoint:** `GET /invoice-settings`  
**Auth Required:** Yes

---

### 28.4 Update Invoice Settings

**Endpoint:** `POST /invoice-settings`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "invoice_size": "enum: a4|3_inch_80mm|2_inch_58mm (required)"
}
```

---

### 28.5 Get Business Settings (Invoice Logo)

**Endpoint:** `GET /business-settings`  
**Auth Required:** Yes

---

## 29. Bulk Upload

### 29.1 Upload Products

Bulk uploads products from Excel/CSV file.

**Endpoint:** `POST /bulk-upload`  
**Auth Required:** Yes

**Request Body (multipart/form-data):**
```json
{
  "file": "file (required, xlsx|xls|csv)"
}
```

---

## 33. Batch/Lot Management

The batch/lot management system provides comprehensive tracking and management of product batches with manufacturing and expiry dates. This is essential for food safety compliance, pharmaceutical tracking, and inventory FIFO/FEFO management.

### 33.1 Get Product Batches

Get all batches for a specific product.

**Endpoint:** `GET /products/{product_id}/batches`  
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "batches": [
    {
      "id": 123,
      "batch_no": "BATCH-2024-001",
      "quantity": 100,
      "mfg_date": "2024-01-15",
      "expire_date": "2025-01-15",
      "is_expired": false,
      "is_expiring_soon": false,
      "days_until_expiry": 365,
      "warehouse": "Main Warehouse",
      "variant": {
        "id": 45,
        "name": "Red - Large"
      }
    }
  ]
}
```

### 33.2 Get Variant Batches

Get all batches for a specific product variant.

**Endpoint:** `GET /variants/{variant_id}/batches`  
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "batches": [
    {
      "id": 124,
      "batch_no": "BATCH-2024-002",
      "quantity": 50,
      "mfg_date": "2024-02-01",
      "expire_date": "2025-02-01",
      "is_expired": false,
      "is_expiring_soon": true,
      "days_until_expiry": 30,
      "warehouse": "Main Warehouse",
      "product": {
        "id": 1,
        "name": "Product Name"
      }
    }
  ]
}
```

### 33.3 Get Expiring Batches

Get batches expiring within a specified number of days.

**Endpoint:** `GET /batches/expiring?days=30`  
**Auth Required:** Yes

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to look ahead

**Response:**
```json
{
  "success": true,
  "days": 30,
  "count": 5,
  "batches": [
    {
      "id": 125,
      "batch_no": "BATCH-2024-003",
      "quantity": 25,
      "mfg_date": "2024-01-01",
      "expire_date": "2024-12-31",
      "days_until_expiry": 15,
      "warehouse": "Main Warehouse",
      "product": {
        "id": 2,
        "name": "Product Name"
      },
      "variant": null
    }
  ]
}
```

### 33.4 Get Expired Batches

Get all expired batches that still have stock quantity.

**Endpoint:** `GET /batches/expired`  
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "count": 2,
  "batches": [
    {
      "id": 126,
      "batch_no": "BATCH-2023-100",
      "quantity": 10,
      "mfg_date": "2023-01-01",
      "expire_date": "2023-12-31",
      "days_expired": 30,
      "warehouse": "Main Warehouse",
      "product": {
        "id": 3,
        "name": "Product Name"
      },
      "variant": {
        "id": 50,
        "name": "Blue - Medium"
      }
    }
  ]
}
```

### 33.5 Get Batch Details

Get detailed information about a specific batch including stock and movement history.

**Endpoint:** `GET /batches/{batch_id}`  
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "batch": {
    "id": 127,
    "batch_no": "BATCH-2024-005",
    "quantity": 75,
    "mfg_date": "2024-03-01",
    "expire_date": "2025-03-01",
    "is_expired": false,
    "is_expiring_soon": false,
    "days_until_expiry": 300,
    "warehouse": {
      "id": 1,
      "name": "Main Warehouse"
    },
    "product": {
      "id": 4,
      "name": "Product Name",
      "sku": "SKU-001"
    },
    "variant": null
  },
  "movement_summary": {
    "total_movements": 8,
    "total_received": 150,
    "total_issued": 75
  },
  "movements": [
    {
      "id": 1,
      "movement_type": "purchase",
      "quantity_before": 0,
      "quantity_after": 100,
      "quantity_changed": 100,
      "reference_type": "App\\Models\\Purchase",
      "reference_id": 45,
      "notes": "Initial purchase",
      "created_at": "2024-03-01T10:00:00.000000Z",
      "user": {
        "id": 1,
        "name": "Admin User"
      }
    }
  ]
}
```

### 33.6 Get Batch Movement History

Get the complete movement history for a specific batch.

**Endpoint:** `GET /batches/{batch_id}/movements`  
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "batch": {
    "id": 128,
    "batch_no": "BATCH-2024-006",
    "quantity": 50,
    "mfg_date": "2024-04-01",
    "expire_date": "2025-04-01",
    "product": {
      "id": 5,
      "name": "Product Name"
    },
    "variant": null
  },
  "movements": [
    {
      "id": 2,
      "movement_type": "sale",
      "quantity_before": 100,
      "quantity_after": 50,
      "quantity_changed": -50,
      "reference_type": "App\\Models\\Sale",
      "reference_id": 78,
      "notes": "Sale to customer",
      "created_at": "2024-04-15T14:30:00.000000Z",
      "user": {
        "id": 2,
        "name": "Sales User"
      }
    }
  ]
}
```

### Movement Types

The system tracks the following movement types:
- `purchase` - Stock received from supplier
- `sale` - Stock sold to customer
- `purchase_return` - Stock returned to supplier
- `sale_return` - Stock returned from customer
- `adjustment` - Inventory adjustment (can be positive or negative)
- `transfer_out` - Stock transferred to another warehouse
- `transfer_in` - Stock received from another warehouse
- `dispose` - Stock disposed/written off
- `initial` - Initial stock entry

### Expired Stock Validation

**Critical Feature:** The system automatically prevents the sale of expired batches. When attempting to sell a product with an expired batch:

**Error Response:**
```json
{
  "success": false,
  "message": "Cannot sell expired batch",
  "error": "Cannot sell expired batch",
  "batch": {
    "batch_no": "BATCH-2023-100",
    "expire_date": "2023-12-31",
    "days_expired": 30
  }
}
```

**HTTP Status Code:** 406 Not Acceptable

---

### 33.7 Batch Selection Strategies (Phase 2)

#### Overview

Phase 2 introduces automatic batch selection strategies that intelligently choose which batches to use for sales based on configurable rules. This eliminates manual batch selection and ensures optimal inventory rotation.

**Available Strategies:**
- **`manual`** (default) - User manually selects batches
- **`fifo`** - First In First Out - selects oldest batches first by manufacturing date
- **`fefo`** - First Expire First Out - selects batches expiring soonest (ideal for perishables)
- **`lifo`** - Last In First Out - selects newest batches first by manufacturing date

#### Configure Batch Strategy

Set the batch selection strategy for a product:

**Endpoint:** `PUT /products/{id}`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "batch_selection_strategy": "fefo"
}
```

**Supported Values:**
- `manual` - No automatic selection
- `fifo` - Oldest first (manufacturing date)
- `fefo` - Expiring soonest first
- `lifo` - Newest first (manufacturing date)

---

#### 33.7.1 Auto-Select Batches

Automatically selects batches for a sale based on the product's configured strategy.

**Endpoint:** `POST /products/{productId}/select-batches`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "quantity": 150,
  "variant_id": 12,
  "warehouse_id": 1
}
```

**Parameters:**
- `quantity` (required, integer, min: 1): Total quantity needed
- `variant_id` (optional, integer): Filter batches by specific variant
- `warehouse_id` (optional, integer): Filter batches by warehouse

**Response (Success - HTTP 200):**
```json
{
  "success": true,
  "strategy": "fefo",
  "requested_quantity": 150,
  "total_available": 250,
  "selected_batches": [
    {
      "stock_id": 45,
      "batch_no": "BATCH-2024-001",
      "allocated_quantity": 100,
      "available_quantity": 100,
      "mfg_date": "2024-01-15",
      "expire_date": "2025-06-30",
      "is_expired": false,
      "days_until_expiry": 190,
      "warehouse": {
        "id": 1,
        "name": "Main Warehouse",
        "address": "123 Main St"
      },
      "pricing": {
        "cost_price": 100.00,
        "sale_price": 150.00,
        "wholesale_price": 130.00,
        "dealer_price": 140.00
      }
    },
    {
      "stock_id": 46,
      "batch_no": "BATCH-2024-002",
      "allocated_quantity": 50,
      "available_quantity": 150,
      "mfg_date": "2024-02-20",
      "expire_date": "2025-12-31",
      "is_expired": false,
      "days_until_expiry": 365,
      "warehouse": {
        "id": 1,
        "name": "Main Warehouse"
      },
      "pricing": {
        "cost_price": 105.00,
        "sale_price": 155.00
      }
    }
  ],
  "all_available_batches": [
    {
      "stock_id": 45,
      "batch_no": "BATCH-2024-001",
      "available_quantity": 100,
      "expire_date": "2025-06-30"
    },
    {
      "stock_id": 46,
      "batch_no": "BATCH-2024-002",
      "available_quantity": 150,
      "expire_date": "2025-12-31"
    }
  ]
}
```

**Response (Insufficient Stock - HTTP 400):**
```json
{
  "success": false,
  "message": "Insufficient stock available",
  "requested_quantity": 300,
  "available_quantity": 250,
  "shortage": 50
}
```

**Response (Manual Strategy - HTTP 200):**
```json
{
  "success": true,
  "strategy": "manual",
  "message": "Manual selection required",
  "requested_quantity": 100,
  "total_available": 250,
  "all_available_batches": [
    {
      "stock_id": 45,
      "batch_no": "BATCH-2024-001",
      "available_quantity": 100
    },
    {
      "stock_id": 46,
      "batch_no": "BATCH-2024-002",
      "available_quantity": 150
    }
  ]
}
```

**Validation Errors (HTTP 422):**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "quantity": ["The quantity field is required."],
    "quantity": ["The quantity must be at least 1."]
  }
}
```

---

#### 33.7.2 Strategy Behavior

**FIFO (First In First Out)**
- Selects batches with **oldest manufacturing date** first
- Use case: General inventory rotation
- Ensures older stock is used before newer stock

Example:
```
Batch A: mfg_date = 2024-01-01, qty = 50  ← Selected first
Batch B: mfg_date = 2024-02-15, qty = 100 ← Selected second
Batch C: mfg_date = 2024-03-20, qty = 75  ← Selected third
```

**FEFO (First Expire First Out)**
- Selects batches with **nearest expiry date** first
- Use case: Perishable goods (medicines, food, cosmetics)
- Minimizes waste from expired inventory

Example:
```
Batch X: expire_date = 2025-06-30, qty = 50  ← Selected first
Batch Y: expire_date = 2025-12-31, qty = 100 ← Selected second
Batch Z: expire_date = 2026-03-15, qty = 75  ← Selected third
```

**LIFO (Last In First Out)**
- Selects batches with **newest manufacturing date** first
- Use case: Non-perishable items where freshness matters (technology, fashion)
- Customers get newest stock

Example:
```
Batch C: mfg_date = 2024-03-20, qty = 75  ← Selected first
Batch B: mfg_date = 2024-02-15, qty = 100 ← Selected second
Batch A: mfg_date = 2024-01-01, qty = 50  ← Selected third
```

**Manual**
- No automatic selection
- API returns all available batches
- User/POS system must choose batches manually

---

#### 33.7.3 Batch Filtering

The selection service automatically filters batches:

✅ **Included:**
- Active batches with quantity > 0
- Non-expired batches (expire_date > today)
- Batches matching optional filters (variant_id, warehouse_id)

❌ **Excluded:**
- Expired batches
- Zero or negative quantity batches
- Batches from other warehouses (if warehouse_id specified)
- Batches for other variants (if variant_id specified)

---

#### 33.7.4 Batch Reservations

Phase 2 includes a reservation system to prevent over-allocation during concurrent sales:

**Features:**
- Time-based reservations (default: 15 minutes)
- Automatic expiration cleanup
- Reserve/release/complete lifecycle
- Prevents double-booking of stock

**Note:** Reservations are managed internally. The select-batches endpoint shows available quantity after considering active reservations.

---

#### 33.7.5 Integration with Sales

Use the selected batches in your sale transaction:

```bash
# Step 1: Get batch selection
curl -X POST http://localhost/api/v1/products/123/select-batches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 100}'

# Step 2: Create sale with selected batches
curl -X POST http://localhost/api/v1/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {
        "stock_id": 45,
        "batch_no": "BATCH-2024-001",
        "quantities": 70,
        "price": 150.00
      },
      {
        "stock_id": 46,
        "batch_no": "BATCH-2024-002",
        "quantities": 30,
        "price": 155.00
      }
    ],
    "party_id": 15,
    "payment_type_id": 1,
    "totalAmount": 15050.00,
    "paidAmount": 15050.00
  }'
```

---

#### 33.7.6 cURL Examples

**Example 1: FEFO Selection for Medicines**
```bash
curl -X POST http://localhost:8000/api/v1/products/245/select-batches \
  -H "Authorization: Bearer 1|abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 500,
    "warehouse_id": 1
  }'
```

**Example 2: FIFO Selection with Variant**
```bash
curl -X POST http://localhost:8000/api/v1/products/120/select-batches \
  -H "Authorization: Bearer 1|abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 250,
    "variant_id": 34,
    "warehouse_id": 2
  }'
```

**Example 3: Configure Product Strategy**
```bash
curl -X PUT http://localhost:8000/api/v1/products/245 \
  -H "Authorization: Bearer 1|abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_selection_strategy": "fefo"
  }'
```

---

## 30. Additional Resources

### 30.1 List Languages

Lists available languages for the app.

**Endpoint:** `GET /lang`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "code": "en",
      "name": "English"
    }
  ]
}
```

---

### 30.2 Create/Store Language

**Endpoint:** `POST /lang`  
**Auth Required:** Yes

---

### 30.3 List Banners

Lists promotional banners.

**Endpoint:** `GET /banners`  
**Auth Required:** Yes

---

### 30.4 List Plans

Lists available subscription plans.

**Endpoint:** `GET /plans`  
**Auth Required:** Yes

---

### 30.5 List Subscriptions

Lists active subscriptions.

**Endpoint:** `GET /subscribes`  
**Auth Required:** Yes

---

### 30.6 Update Invoice Settings (Alternative)

Updates invoice size settings.

**Endpoint:** `POST /invoice-settings/update`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "invoice_size": "enum: a4|3_inch_80mm|2_inch_58mm (required)"
}
```

---

### 30.7 Get Update Expiry Date

Updates business expiry date.

**Endpoint:** `GET /update-expire-date`  
**Auth Required:** Yes

**Query Parameters:**
- `days` - Number of days (required)
- `operation` - `add` or `sub` (required)

**Response:**
```json
{
  "message": "Expiry date updated successfully.",
  "will_expire": "2024-12-31"
}
```

---

### 30.8 Bulk Upload Products

Bulk imports products from Excel/CSV.

**Endpoint:** `POST /bulk-uploads`  
**Auth Required:** Yes

**Request Body (multipart/form-data):**
```json
{
  "file": "file (required, xlsx|xls|csv)"
}
```

---

### 30.9 Get New Invoice Number

Generates next invoice number.

**Endpoint:** `GET /new-invoice`  
**Auth Required:** Yes

**Query Parameters:**
- `platform` (required) - Invoice type: `sales`, `purchases`, `due_collects`, `sales_return`, `purchases_return`

**Response:**
```json
"S-00001"
```

---

## Error Responses

### Validation Error (422)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": [
      "Error message"
    ]
  }
}
```

### Unauthorized (401)
```json
{
  "message": "Unauthenticated."
}
```

### Not Found (404)
```json
{
  "message": "Resource not found."
}
```

### Business Logic Error (400/406)
```json
{
  "message": "Cannot create sale. Party due will exceed credit limit!"
}
```

---

## Data Models Summary

### User
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| name | string | User name |
| email | string | Email address |
| phone | string | Phone number |
| role | string | `shop-owner` or `staff` |
| business_id | integer | Associated business |
| branch_id | integer | Assigned branch |
| active_branch_id | integer | Currently active branch |
| visibility | string | Data visibility level |
| image | string | Profile image path |

### Product
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| productName | string | Product name |
| productCode | string | SKU/barcode |
| category_id | integer | Category FK |
| brand_id | integer | Brand FK |
| unit_id | integer | Unit FK |
| model_id | integer | Model FK |
| vat_id | integer | VAT/Tax FK |
| vat_type | string | Tax type |
| alert_qty | integer | Low stock alert threshold |
| product_type | string | `single` or `variant` |
| productPicture | string | Image path |

### Stock
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| product_id | integer | Product FK |
| batch_no | string | Batch/lot number |
| productStock | integer | Current quantity |
| productPurchasePrice | decimal | Purchase price |
| productSalePrice | decimal | Sale price |
| productDealerPrice | decimal | Dealer price |
| productWholeSalePrice | decimal | Wholesale price |
| profit_percent | decimal | Profit margin % |
| mfg_date | date | Manufacturing date |
| expire_date | date | Expiry date |
| warehouse_id | integer | Warehouse FK |
| branch_id | integer | Branch FK |

### Sale
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| invoiceNumber | string | Invoice number |
| saleDate | date | Sale date |
| party_id | integer | Customer FK |
| user_id | integer | Cashier FK |
| payment_type_id | integer | Payment method FK |
| vat_id | integer | VAT FK |
| totalAmount | decimal | Total amount |
| discountAmount | decimal | Discount |
| paidAmount | decimal | Amount paid |
| dueAmount | decimal | Amount due |
| change_amount | decimal | Change returned |
| vat_amount | decimal | Tax amount |
| lossProfit | decimal | Profit/Loss |
| isPaid | boolean | Fully paid flag |
| rounding_option | string | Rounding method |

### Party
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| name | string | Party name |
| email | string | Email |
| phone | string | Phone |
| address | string | Address |
| type | string | `Retailer`, `Dealer`, `Wholesaler`, `Supplier` |
| due | decimal | Outstanding due |
| wallet | decimal | Advance balance |
| credit_limit | decimal | Credit limit |
| opening_balance | decimal | Opening balance |
| opening_balance_type | string | `due` or `advance` |
| image | string | Image path |

---

## 26. Variant Reports & Analytics

Advanced reporting endpoints for variant product analysis and insights.

### 26.1 Variant Sales Summary

Get detailed sales analytics for variants with flexible grouping and filtering options.

**Endpoint:** `GET /reports/variants/sales-summary`  
**Auth Required:** Yes

**Query Parameters:**
- `group_by` (optional): `variant` (default), `product`, `day`, or `month`
- `sort_by` (optional): `quantity` (default), `revenue`, or `profit`
- `order` (optional): `desc` (default) or `asc`
- `start_date` (optional): Filter start date (YYYY-MM-DD)
- `end_date` (optional): Filter end date (YYYY-MM-DD)
- `product_id` (optional): Filter by specific product

**Response (Group by Variant):**
```json
{
  "message": "Sales summary retrieved",
  "data": [
    {
      "variant_id": 156,
      "sku": "TSHIRT-S-RED",
      "variant_name": "Small, Red",
      "product_name": "Premium T-Shirt",
      "quantity_sold": 125,
      "revenue": 74875.00,
      "cost": 37500.00,
      "profit": 37375.00,
      "profit_margin": 49.88,
      "transactions": 45
    },
    {
      "variant_id": 157,
      "sku": "TSHIRT-S-BLUE",
      "variant_name": "Small, Blue",
      "product_name": "Premium T-Shirt",
      "quantity_sold": 98,
      "revenue": 58702.00,
      "cost": 29400.00,
      "profit": 29302.00,
      "profit_margin": 49.89,
      "transactions": 36
    }
  ]
}
```

**Response (Group by Day):**
```json
{
  "message": "Sales summary retrieved",
  "data": [
    {
      "date": "2025-12-10",
      "quantity_sold": 223,
      "revenue": 133577.00,
      "profit": 66702.00,
      "transactions": 81
    },
    {
      "date": "2025-12-09",
      "quantity_sold": 189,
      "revenue": 112914.00,
      "profit": 56477.00,
      "transactions": 68
    }
  ]
}
```

---

### 26.2 Top Selling Variants

Identify best-performing variants by various metrics.

**Endpoint:** `GET /reports/variants/top-selling`  
**Auth Required:** Yes

**Query Parameters:**
- `metric` (optional): `quantity` (default), `revenue`, or `profit`
- `limit` (optional): Number of top variants to return (default: 10, max: 100)
- `start_date` (optional): Filter start date (YYYY-MM-DD)
- `end_date` (optional): Filter end date (YYYY-MM-DD)

**Response:**
```json
{
  "message": "Top selling variants retrieved",
  "metric": "revenue",
  "period": "last_30_days",
  "data": [
    {
      "rank": 1,
      "variant_id": 156,
      "sku": "TSHIRT-S-RED",
      "variant_name": "Small, Red",
      "product_name": "Premium T-Shirt",
      "quantity_sold": 125,
      "revenue": 74875.00,
      "profit": 37375.00,
      "transactions": 45
    },
    {
      "rank": 2,
      "variant_id": 159,
      "sku": "TSHIRT-L-BLUE",
      "variant_name": "Large, Blue",
      "product_name": "Premium T-Shirt",
      "quantity_sold": 112,
      "revenue": 67688.00,
      "profit": 33844.00,
      "transactions": 41
    }
  ]
}
```

---

### 26.3 Slow Moving Variants

Identify slow-moving inventory for optimization and clearance decisions.

**Endpoint:** `GET /reports/variants/slow-moving`  
**Auth Required:** Yes

**Query Parameters:**
- `days_threshold` (optional): Consider variant slow-moving if no sales in X days (default: 30)
- `stock_threshold` (optional): Only show variants with stock >= X (default: 0)
- `limit` (optional): Number of results to return (default: 50, max: 500)
- `product_id` (optional): Filter by specific product
- `sort_by` (optional): `stock` (default), `days_without_sale`, or `stock_value`

**Response:**
```json
{
  "message": "Slow moving variants retrieved",
  "config": {
    "days_threshold": 30,
    "stock_threshold": 0
  },
  "data": [
    {
      "variant_id": 170,
      "sku": "TSHIRT-XL-GREEN",
      "variant_name": "Extra Large, Green",
      "product_name": "Premium T-Shirt",
      "current_stock": 145,
      "stock_value": 87255.00,
      "days_without_sale": 45,
      "last_sale_date": "2025-10-26",
      "cost_price": 350,
      "selling_price": 699,
      "profit_margin": 49.93
    },
    {
      "variant_id": 171,
      "sku": "TSHIRT-XXL-RED",
      "variant_name": "2XL, Red",
      "product_name": "Premium T-Shirt",
      "current_stock": 82,
      "stock_value": 57318.00,
      "days_without_sale": 38,
      "last_sale_date": "2025-11-03",
      "cost_price": 350,
      "selling_price": 699,
      "profit_margin": 49.93
    }
  ]
}
```

---

## Offline Sync Considerations

For your Electron + React offline POS app, consider these sync strategies:

### Essential Data to Cache Locally
1. **Products** with stocks (frequent reads)
2. **Categories, Brands, Units** (master data)
3. **Parties/Customers** (for sale creation)
4. **Payment Types** (for sale creation)
5. **VAT/Taxes** (for calculations)
6. **Business Settings** (currency, invoice settings)

### Sync Strategy
1. **Initial Sync:** Download all master data on first login
2. **Periodic Sync:** Refresh products/parties every X minutes
3. **Offline Sales:** Queue sales locally, sync when online
4. **Conflict Resolution:** Use timestamps and server-wins strategy
5. **Invoice Numbers:** Generate locally with device prefix (e.g., `D1-S-00001`)

### Offline Sale Structure
```typescript
interface OfflineSale {
  localId: string;          // UUID for local reference
  syncStatus: 'pending' | 'synced' | 'failed';
  createdAt: string;        // Local timestamp
  syncedAt?: string;        // Server sync timestamp
  serverId?: number;        // Server ID after sync
  // ... sale data
}
```

---

## Rate Limits

No specific rate limits are enforced, but consider:
- Implement request throttling in your app
- Batch sync operations where possible
- Use pagination for large datasets

---

## Changelog

### v1.0 (Current)
- Initial API documentation
- Full CRUD for all resources
- Authentication with Sanctum
- Multi-branch support
- Warehouse addon support
- Thermal printer addon support
