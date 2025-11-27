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
8. [Parties (Customers/Suppliers)](#8-parties-customerssuppliers)
9. [Sales](#9-sales)
10. [Purchases](#10-purchases)
11. [Sale Returns](#11-sale-returns)
12. [Purchase Returns](#12-purchase-returns)
13. [Due Collection](#13-due-collection)
14. [Expenses](#14-expenses)
15. [Incomes](#15-incomes)
16. [Expense Categories](#16-expense-categories)
17. [Income Categories](#17-income-categories)
18. [VAT/Tax](#18-vattax)
19. [Payment Types](#19-payment-types)
20. [Stocks](#20-stocks)
21. [Warehouses](#21-warehouses)
22. [Currencies](#22-currencies)
23. [Invoices](#23-invoices)
24. [Dashboard & Statistics](#24-dashboard--statistics)
25. [Users & Staff](#25-users--staff)
26. [Settings](#26-settings)
27. [Bulk Upload](#27-bulk-upload)

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

### 1.2 Login

Authenticates user and returns access token.

**Endpoint:** `POST /login`  
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

**Endpoint:** `POST /sign-out`  
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

**Endpoint:** `POST /refresh-token`  
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

**Endpoint:** `POST /module-check`  
**Auth Required:** Yes

**Query Parameters:**
- `module_name` - Name of the module to check

**Response:**
```json
{
  "status": true
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
      ]
    }
  ]
}
```

---

### 3.2 Get Single Product

Retrieves a specific product by ID.

**Endpoint:** `GET /products/{id}`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "productName": "Product Name",
    "productCode": "PRD001",
    "stocks": [ ]
  }
}
```

---

### 3.3 Create Product

Creates a new product.

**Endpoint:** `POST /products`  
**Auth Required:** Yes

**Request Body (multipart/form-data):**

**For Single Product:**
```json
{
  "productName": "string (required, max: 250)",
  "productCode": "string (optional, unique per business)",
  "category_id": "integer (optional, exists)",
  "brand_id": "integer (optional, exists)",
  "unit_id": "integer (optional, exists)",
  "model_id": "integer (optional, exists)",
  "vat_id": "integer (optional, exists)",
  "vat_type": "string (optional)",
  "alert_qty": "integer (optional, default: 0)",
  "product_type": "single",
  "productPurchasePrice": "numeric (optional)",
  "productSalePrice": "numeric (optional)",
  "productDealerPrice": "numeric (optional)",
  "productWholeSalePrice": "numeric (optional)",
  "productStock": "integer (optional)",
  "profit_percent": "numeric (optional)",
  "mfg_date": "date (optional)",
  "expire_date": "date (optional)",
  "productPicture": "file (optional, image)"
}
```

**For Variant Product:**
```json
{
  "productName": "string (required)",
  "product_type": "variant",
  "batch_no[]": ["BATCH001", "BATCH002"],
  "productPurchasePrice[]": [100, 110],
  "productSalePrice[]": [150, 160],
  "productDealerPrice[]": [130, 140],
  "productWholeSalePrice[]": [120, 130],
  "productStock[]": [50, 30],
  "profit_percent[]": [50, 45],
  "mfg_date[]": ["2024-01-01", "2024-02-01"],
  "expire_date[]": ["2025-12-31", "2025-11-30"]
}
```

---

### 3.4 Update Product

Updates an existing product.

**Endpoint:** `PUT /products/{id}`  
**Auth Required:** Yes

**Request Body:** Same as Create Product

---

### 3.5 Delete Product

Deletes a product.

**Endpoint:** `DELETE /products/{id}`  
**Auth Required:** Yes

---

## 4. Categories

### 4.1 List Categories

**Endpoint:** `GET /categories`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "categoryName": "Electronics",
      "variationCapacity": 0,
      "variationColor": 1,
      "variationSize": 1,
      "variationType": 0,
      "variationWeight": 0
    }
  ]
}
```

---

### 4.2 Create Category

**Endpoint:** `POST /categories`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "categoryName": "string (required, unique per business)",
  "variationCapacity": "boolean (optional, 'true'/'false')",
  "variationColor": "boolean (optional)",
  "variationSize": "boolean (optional)",
  "variationType": "boolean (optional)",
  "variationWeight": "boolean (optional)"
}
```

---

### 4.3 Update Category

**Endpoint:** `PUT /categories/{id}`  
**Auth Required:** Yes

**Request Body:** Same as Create Category

---

### 4.4 Delete Category

**Endpoint:** `DELETE /categories/{id}`  
**Auth Required:** Yes

---

## 5. Brands

### 5.1 List Brands

**Endpoint:** `GET /brands`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "brandName": "Apple"
    }
  ]
}
```

---

### 5.2 Create Brand

**Endpoint:** `POST /brands`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "brandName": "string (required, unique per business)"
}
```

---

### 5.3 Update Brand

**Endpoint:** `PUT /brands/{id}`  
**Auth Required:** Yes

---

### 5.4 Delete Brand

**Endpoint:** `DELETE /brands/{id}`  
**Auth Required:** Yes

---

## 6. Units

### 6.1 List Units

**Endpoint:** `GET /units`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "unitName": "Piece"
    }
  ]
}
```

---

### 6.2 Create Unit

**Endpoint:** `POST /units`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "unitName": "string (required, unique per business)"
}
```

---

### 6.3 Update Unit

**Endpoint:** `PUT /units/{id}`  
**Auth Required:** Yes

---

### 6.4 Delete Unit

**Endpoint:** `DELETE /units/{id}`  
**Auth Required:** Yes

---

## 7. Product Models

### 7.1 List Models

**Endpoint:** `GET /product-models`  
**Auth Required:** Yes

---

### 7.2 Create Model

**Endpoint:** `POST /product-models`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (required, unique per business)"
}
```

---

### 7.3 Update Model

**Endpoint:** `PUT /product-models/{id}`  
**Auth Required:** Yes

---

### 7.4 Delete Model

**Endpoint:** `DELETE /product-models/{id}`  
**Auth Required:** Yes

---

## 8. Parties (Customers/Suppliers)

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

## 9. Sales

### 9.1 List Sales

Retrieves all sales.

**Endpoint:** `GET /sales`  
**Auth Required:** Yes

**Query Parameters:**
- `returned-sales=true` - Filter only sales with returns

**Response:**
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
      "paidAmount": 1450.00,
      "dueAmount": 0,
      "change_amount": 0,
      "lossProfit": 450.00,
      "isPaid": 1,
      "rounding_option": "none",
      "vat_amount": 150.00,
      "user": {
        "id": 1,
        "name": "Cashier",
        "role": "staff"
      },
      "party": {
        "id": 1,
        "name": "Walk-in Customer",
        "phone": null,
        "type": "Retailer"
      },
      "details": [
        {
          "id": 1,
          "product_id": 1,
          "stock_id": 1,
          "quantities": 2,
          "price": 750.00,
          "lossProfit": 225.00,
          "product": {
            "id": 1,
            "productName": "Product A",
            "productCode": "PRD001"
          },
          "stock": {
            "id": 1,
            "batch_no": "BATCH001"
          }
        }
      ],
      "vat": {
        "id": 1,
        "name": "VAT 10%",
        "rate": 10
      },
      "payment_type": {
        "id": 1,
        "name": "Cash"
      },
      "branch": {
        "id": 1,
        "name": "Main Branch"
      },
      "saleReturns": []
    }
  ]
}
```

---

### 9.2 Create Sale

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

### 9.3 Update Sale

Updates an existing sale.

**Endpoint:** `PUT /sales/{id}`  
**Auth Required:** Yes

**Request Body:** Same as Create Sale

**Note:** Cannot update if sale has returns.

---

### 9.4 Delete Sale

**Endpoint:** `DELETE /sales/{id}`  
**Auth Required:** Yes

**Note:** Restores stock quantities and adjusts party due.

---

## 10. Purchases

### 10.1 List Purchases

**Endpoint:** `GET /purchases`  
**Auth Required:** Yes

**Query Parameters:**
- `returned-purchase=true` - Filter only purchases with returns

**Response:**
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
      "paidAmount": 4900.00,
      "dueAmount": 0,
      "party": {
        "id": 1,
        "name": "Supplier Name",
        "type": "Supplier"
      },
      "details": [
        {
          "id": 1,
          "product_id": 1,
          "stock_id": 1,
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
  ]
}
```

---

### 10.2 Create Purchase

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
      "batch_no": "BATCH001",
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

### 10.3 Update Purchase

**Endpoint:** `PUT /purchases/{id}`  
**Auth Required:** Yes

**Note:** Cannot update if purchase has returns.

---

### 10.4 Delete Purchase

**Endpoint:** `DELETE /purchases/{id}`  
**Auth Required:** Yes

---

## 11. Sale Returns

### 11.1 List Sale Returns

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

### 11.3 Get Sale Return Details

**Endpoint:** `GET /sale-returns/{id}`  
**Auth Required:** Yes

---

## 12. Purchase Returns

### 12.1 List Purchase Returns

**Endpoint:** `GET /purchase-returns`  
**Auth Required:** Yes

**Query Parameters:**
- `start_date` - Filter start date
- `end_date` - Filter end date

---

### 12.2 Create Purchase Return

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

### 12.3 Get Purchase Return Details

**Endpoint:** `GET /purchase-returns/{id}`  
**Auth Required:** Yes

---

## 13. Due Collection

### 13.1 List Due Collections

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

## 14. Expenses

### 14.1 List Expenses

**Endpoint:** `GET /expenses`  
**Auth Required:** Yes

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "amount": 500.00,
      "description": "Office supplies",
      "expense_category_id": 1,
      "payment_type_id": 1,
      "created_at": "2024-01-15",
      "category": {
        "id": 1,
        "categoryName": "Office Expenses"
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

### 14.2 Create Expense

**Endpoint:** `POST /expenses`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "amount": "numeric (required)",
  "expense_category_id": "integer (required, exists)",
  "payment_type_id": "integer (optional)",
  "description": "string (optional)"
}
```

---

## 15. Incomes

### 15.1 List Incomes

**Endpoint:** `GET /incomes`  
**Auth Required:** Yes

---

### 15.2 Create Income

**Endpoint:** `POST /incomes`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "amount": "numeric (required)",
  "income_category_id": "integer (required, exists)",
  "payment_type_id": "integer (optional)",
  "description": "string (optional)"
}
```

---

## 16. Expense Categories

### 16.1 List Expense Categories

**Endpoint:** `GET /expense-categories`  
**Auth Required:** Yes

---

### 16.2 Create Expense Category

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

### 16.3 Update Expense Category

**Endpoint:** `PUT /expense-categories/{id}`  
**Auth Required:** Yes

---

### 16.4 Delete Expense Category

**Endpoint:** `DELETE /expense-categories/{id}`  
**Auth Required:** Yes

---

## 17. Income Categories

### 17.1 List Income Categories

**Endpoint:** `GET /income-categories`  
**Auth Required:** Yes

---

### 17.2 Create Income Category

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

### 17.4 Delete Income Category

**Endpoint:** `DELETE /income-categories/{id}`  
**Auth Required:** Yes

---

## 18. VAT/Tax

### 18.1 List VAT/Taxes

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

### 18.2 Create VAT

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

### 18.3 Update VAT

**Endpoint:** `PUT /vats/{id}`  
**Auth Required:** Yes

---

### 18.4 Delete VAT

**Endpoint:** `DELETE /vats/{id}`  
**Auth Required:** Yes

**Note:** Cannot delete if VAT is part of a VAT group.

---

## 19. Payment Types

### 19.1 List Payment Types

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

### 19.3 Update Payment Type

**Endpoint:** `PUT /payment-types/{id}`  
**Auth Required:** Yes

---

### 19.4 Delete Payment Type

**Endpoint:** `DELETE /payment-types/{id}`  
**Auth Required:** Yes

---

## 20. Stocks

### 20.1 Add Stock

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

### 20.2 Update Stock

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

### 20.3 Delete Stock

**Endpoint:** `DELETE /stocks/{id}`  
**Auth Required:** Yes

---

## 21. Warehouses

### 21.1 List Warehouses

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

### 21.3 Update Warehouse

**Endpoint:** `PUT /warehouses/{id}`  
**Auth Required:** Yes

---

### 21.4 Delete Warehouse

**Endpoint:** `DELETE /warehouses/{id}`  
**Auth Required:** Yes

---

## 22. Currencies

### 22.1 List Currencies

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

### 22.2 Change Currency

Changes the business currency.

**Endpoint:** `GET /currencies/{id}`  
**Auth Required:** Yes

---

## 23. Invoices

### 23.1 Get Party Invoices with Due

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

## 24. Dashboard & Statistics

### 24.1 Get Summary

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

### 24.2 Get Dashboard

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

## 25. Users & Staff

### 25.1 List Staff

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

### 25.2 Create Staff

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

### 25.3 Update Staff

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

### 25.4 Delete Staff

**Endpoint:** `DELETE /users/{id}`  
**Auth Required:** Yes

---

## 26. Settings

### 26.1 Get Product Settings

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

### 26.2 Update Product Settings

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

### 26.3 Get Invoice Settings

**Endpoint:** `GET /invoice-settings`  
**Auth Required:** Yes

---

### 26.4 Update Invoice Settings

**Endpoint:** `POST /invoice-settings`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "invoice_size": "enum: a4|3_inch_80mm|2_inch_58mm (required)"
}
```

---

### 26.5 Get Business Settings (Invoice Logo)

**Endpoint:** `GET /business-settings`  
**Auth Required:** Yes

---

## 27. Bulk Upload

### 27.1 Upload Products

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
