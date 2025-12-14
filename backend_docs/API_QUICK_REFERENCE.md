# Horix POS Pro - API Quick Reference

**Base URL:** `http://your-domain/api/v1`

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
| GET | `/products` | ✅ | List all products |
| GET | `/products/{id}` | ✅ | Get single product |
| POST | `/products` | ✅ | Create product |
| PUT | `/products/{id}` | ✅ | Update product |
| DELETE | `/products/{id}` | ✅ | Delete product |

### Categories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | ✅ | List categories |
| POST | `/categories` | ✅ | Create category |
| PUT | `/categories/{id}` | ✅ | Update category |
| DELETE | `/categories/{id}` | ✅ | Delete category |

### Brands
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/brands` | ✅ | List brands |
| POST | `/brands` | ✅ | Create brand |
| PUT | `/brands/{id}` | ✅ | Update brand |
| DELETE | `/brands/{id}` | ✅ | Delete brand |

### Units
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/units` | ✅ | List units |
| POST | `/units` | ✅ | Create unit |
| PUT | `/units/{id}` | ✅ | Update unit |
| DELETE | `/units/{id}` | ✅ | Delete unit |

### Product Models
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/product-models` | ✅ | List models |
| POST | `/product-models` | ✅ | Create model |
| PUT | `/product-models/{id}` | ✅ | Update model |
| DELETE | `/product-models/{id}` | ✅ | Delete model |

### Attributes (Variable Products)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/attributes` | ✅ | List all attributes |
| GET | `/attributes/{id}` | ✅ | Get single attribute |
| POST | `/attributes` | ✅ | Create attribute |
| PUT | `/attributes/{id}` | ✅ | Update attribute |
| DELETE | `/attributes/{id}` | ✅ | Delete attribute |
| POST | `/attributes/{id}/values` | ✅ | Add value to attribute |
| PUT | `/attribute-values/{id}` | ✅ | Update attribute value |
| DELETE | `/attribute-values/{id}` | ✅ | Delete attribute value |

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
| GET | `/sales` | ✅ | List sales |
| POST | `/sales` | ✅ | Create sale |
| PUT | `/sales/{id}` | ✅ | Update sale |
| DELETE | `/sales/{id}` | ✅ | Delete sale |

### Purchases
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/purchase` | ✅ | List purchases |
| POST | `/purchase` | ✅ | Create purchase |
| PUT | `/purchase/{id}` | ✅ | Update purchase |
| DELETE | `/purchase/{id}` | ✅ | Delete purchase |

### Returns
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sales-return` | ✅ | List sale returns |
| POST | `/sales-return` | ✅ | Create sale return |
| GET | `/sales-return/{id}` | ✅ | Get sale return |
| GET | `/purchases-return` | ✅ | List purchase returns |
| POST | `/purchases-return` | ✅ | Create purchase return |
| GET | `/purchases-return/{id}` | ✅ | Get purchase return |

## Financial

### Due Collection
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dues` | ✅ | List due collections |
| POST | `/dues` | ✅ | Collect due |

### Expenses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/expenses` | ✅ | List expenses |
| POST | `/expenses` | ✅ | Create expense |
| GET | `/expense-categories` | ✅ | List categories |
| POST | `/expense-categories` | ✅ | Create category |
| PUT | `/expense-categories/{id}` | ✅ | Update category |
| DELETE | `/expense-categories/{id}` | ✅ | Delete category |

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

## Settings & Configuration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/vats` | ✅ | List VATs |
| POST | `/vats` | ✅ | Create VAT |
| PUT | `/vats/{id}` | ✅ | Update VAT |
| DELETE | `/vats/{id}` | ✅ | Delete VAT |
| GET | `/payment-types` | ✅ | List payment types |
| POST | `/payment-types` | ✅ | Create payment type |
| PUT | `/payment-types/{id}` | ✅ | Update payment type |
| DELETE | `/payment-types/{id}` | ✅ | Delete payment type |
| GET | `/currencies` | ✅ | List currencies |
| GET | `/currencies/{id}` | ✅ | Change currency |
| GET | `/product-settings` | ✅ | Get product settings |
| POST | `/product-settings` | ✅ | Update product settings |
| GET | `/business-settings` | ✅ | Get business settings |
| GET | `/invoice-settings` | ✅ | Get invoice settings |
| POST | `/invoice-settings/update` | ✅ | Update invoice settings |

## Inventory

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/stocks` | ✅ | Add stock |
| PUT | `/stocks/{id}` | ✅ | Update stock |
| DELETE | `/stocks/{id}` | ✅ | Delete stock |
| GET | `/warehouses` | ✅ | List warehouses |
| POST | `/warehouses` | ✅ | Create warehouse |
| PUT | `/warehouses/{id}` | ✅ | Update warehouse |
| DELETE | `/warehouses/{id}` | ✅ | Delete warehouse |

## Reports & Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/summary` | ✅ | Get today's summary |
| GET | `/dashboard` | ✅ | Get dashboard data |

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
    "description": "High-quality cotton t-shirt",
    "variants": [
      {
        "sku": "TSHIRT-S-RED",
        "cost_price": 300,
        "price": 599,
        "dealer_price": 549,
        "wholesale_price": 499,
        "attribute_value_ids": [1, 4]
      },
      {
        "sku": "TSHIRT-S-BLUE",
        "cost_price": 300,
        "price": 599,
        "dealer_price": 549,
        "wholesale_price": 499,
        "attribute_value_ids": [1, 5]
      },
      {
        "sku": "TSHIRT-M-RED",
        "cost_price": 320,
        "price": 649,
        "dealer_price": 599,
        "wholesale_price": 549,
        "attribute_value_ids": [2, 4]
      },
      {
        "sku": "TSHIRT-M-BLUE",
        "cost_price": 320,
        "price": 649,
        "dealer_price": 599,
        "wholesale_price": 549,
        "attribute_value_ids": [2, 5]
      },
      {
        "sku": "TSHIRT-L-RED",
        "cost_price": 350,
        "price": 699,
        "dealer_price": 649,
        "wholesale_price": 599,
        "attribute_value_ids": [3, 4]
      },
      {
        "sku": "TSHIRT-L-BLUE",
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
curl -X POST http://localhost:8000/api/v1/stock \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "variant_id": 156,
    "quantity": 100,
    "cost_price": 300,
    "warehouse_id": 1,
    "reference": "PO-001"
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

**Last Updated:** December 4, 2025
