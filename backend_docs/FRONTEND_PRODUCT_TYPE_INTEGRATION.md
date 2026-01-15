# Product Type System - Frontend Integration Guide

**Document Version:** 1.0  
**Last Updated:** January 15, 2026  
**Status:** ✅ Ready for Implementation  
**Target Audience:** Frontend Developers

---

## Quick Summary

The product type system has been refactored for clarity and flexibility:

| Before | After |
|--------|-------|
| Confusing `product_type='variant'` (meant batch tracking) | Clear `is_batch_tracked` boolean flag |
| Only 2 types: `'single'`, `'variant'` | 2 types + batch flag: `'simple'`, `'variable'` + `is_batch_tracked` |
| Variable products couldn't have batch tracking | All 4 combinations now supported |

**🚀 Key Changes:**
- ✅ New field: `is_batch_tracked` (boolean) - Independent of product type
- ✅ `product_type` now only `'simple'` or `'variable'`
- ✅ Legacy `'variant'` and `'single'` auto-migrated
- ✅ Automatic barcode generation for all products/variants

---

## Table of Contents
1. [Product Type Matrix](#product-type-matrix)
2. [API Request Examples](#api-request-examples)
3. [API Response Structure](#api-response-structure)
4. [Barcode Auto-Generation](#barcode-auto-generation)
5. [Migration Guide](#migration-guide)
6. [UI Implementation Examples](#ui-implementation-examples)
7. [Testing Checklist](#testing-checklist)

---

## Product Type Matrix

### The 4 Product Types

| product_type | is_batch_tracked | Name | Use Case | Example |
|--------------|------------------|------|----------|---------|
| `simple` | `false` | **Simple Product** | Non-perishable, single SKU | Office supplies, electronics |
| `simple` | `true` | **Batch Product** | Perishable with expiry dates | Food, medicine, cosmetics |
| `variable` | `false` | **Variable Product** | Multiple SKUs (size/color) | T-shirts, shoes, furniture |
| `variable` | `true` | **Variable Batch Product** | Multiple SKUs + expiry | Variable medicine packs |

### Visual Decision Tree

```
Is your product perishable/tracked by lot?
│
├─ NO ─┐
│      │
│      └─ Does it have size/color variations?
│         │
│         ├─ NO  → Simple Product (simple + non-batch)
│         └─ YES → Variable Product (variable + non-batch)
│
└─ YES ─┐
        │
        └─ Does it have size/color variations?
           │
           ├─ NO  → Batch Product (simple + batch)
           └─ YES → Variable Batch Product (variable + batch)
```

---

## API Request Examples

### 1. Simple Product (Non-Batch)

**Use Case:** Office chair, laptop, any non-perishable single-SKU item

**Request:**
```javascript
POST /api/v1/products
{
  "productName": "Office Chair",
  "productCode": "CHAIR-001",
  "product_type": "simple",
  "is_batch_tracked": false,
  "productSalePrice": 150.00,
  "productPurchasePrice": 100.00,
  "productStock": 50,
  "category_id": 1,
  "unit_id": 1,
  "status": 1
  // barcode is optional - will be auto-generated
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 245,
    "productName": "Office Chair",
    "productCode": "CHAIR-001",
    "product_type": "simple",
    "is_batch_tracked": false,
    "barcode": "CHAIR-1-1ABC5D-X9Z2",  // ← Auto-generated
    "productSalePrice": 150.00,
    "productStock": 50,
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

---

### 2. Simple Batch Product

**Use Case:** Milk, yogurt, medicine - items with expiry dates/batch numbers

**Request:**
```javascript
POST /api/v1/products
{
  "productName": "Fresh Milk 1L",
  "productCode": "MILK-1L",
  "product_type": "simple",
  "is_batch_tracked": true,  // ← This enables batch tracking
  "productSalePrice": 5.00,
  "productPurchasePrice": 3.50,
  "category_id": 2,
  "unit_id": 3,
  "status": 1,
  
  // Batch-specific fields (parallel arrays):
  "batch_no": ["BATCH-2026-001", "BATCH-2026-002"],
  "productStock": [100, 50],
  "expire_date": ["2026-02-15", "2026-02-20"]
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": 246,
    "productName": "Fresh Milk 1L",
    "productCode": "MILK-1L",
    "product_type": "simple",
    "is_batch_tracked": true,
    "barcode": "MILK-L1-1ABC5D-X9Z2",
    "productSalePrice": 5.00,
    "batches": [
      {
        "id": 101,
        "batch_no": "BATCH-2026-001",
        "quantity": 100,
        "expire_date": "2026-02-15",
        "is_expired": false,
        "days_until_expiry": 31
      },
      {
        "id": 102,
        "batch_no": "BATCH-2026-002",
        "quantity": 50,
        "expire_date": "2026-02-20",
        "is_expired": false,
        "days_until_expiry": 36
      }
    ]
  }
}
```

---

### 3. Variable Product (Non-Batch)

**Use Case:** T-shirt with sizes, phone with colors - multiple SKUs without expiry

**Request:**
```javascript
POST /api/v1/products
{
  "productName": "Cotton T-Shirt",
  "productCode": "TSHIRT-001",
  "product_type": "variable",
  "is_batch_tracked": false,
  "category_id": 5,
  "status": 1,
  
  // Variants with attribute combinations:
  "variants": [
    {
      "sku": "TSHIRT-S-RED",
      "price": 599,
      "cost_price": 300,
      "attribute_value_ids": [1, 5],  // [Size: Small, Color: Red]
      "is_active": 1
      // barcode optional - will be auto-generated
    },
    {
      "sku": "TSHIRT-M-RED",
      "price": 649,
      "cost_price": 320,
      "attribute_value_ids": [2, 5],  // [Size: Medium, Color: Red]
      "is_active": 1
    }
  ]
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": 247,
    "productName": "Cotton T-Shirt",
    "productCode": "TSHIRT-001",
    "product_type": "variable",
    "is_batch_tracked": false,
    "variants": [
      {
        "id": 156,
        "sku": "TSHIRT-S-RED",
        "barcode": "TSHIRTS-1-1ABC5D-X9Z2",  // ← Auto-generated from SKU
        "variant_name": "Small / Red",
        "price": 599,
        "total_stock": 0,
        "attributes": [
          {"name": "Size", "value": "Small"},
          {"name": "Color", "value": "Red"}
        ]
      },
      {
        "id": 157,
        "sku": "TSHIRT-M-RED",
        "barcode": "TSHIRTM-1-1ABC5D-X9Z2",
        "variant_name": "Medium / Red",
        "price": 649,
        "total_stock": 0
      }
    ]
  }
}
```

---

### 4. Variable Batch Product

**Use Case:** Medicine with different strengths and expiry dates

**Request:**
```javascript
POST /api/v1/products
{
  "productName": "Pain Relief Medicine",
  "productCode": "MED-001",
  "product_type": "variable",
  "is_batch_tracked": true,  // ← Variants will have batch tracking
  "category_id": 10,
  "status": 1,
  
  "variants": [
    {
      "sku": "MED-10MG",
      "price": 50,
      "cost_price": 30,
      "attribute_value_ids": [10],  // [Strength: 10mg]
      "is_active": 1
    },
    {
      "sku": "MED-20MG",
      "price": 80,
      "cost_price": 50,
      "attribute_value_ids": [11],  // [Strength: 20mg]
      "is_active": 1
    }
  ]
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": 248,
    "productName": "Pain Relief Medicine",
    "product_type": "variable",
    "is_batch_tracked": true,
    "variants": [
      {
        "id": 158,
        "sku": "MED-10MG",
        "barcode": "MED-101-1ABC5D-X9Z2",
        "variant_name": "10mg",
        "price": 50,
        "can_have_batches": true  // ← This variant supports batch tracking
      }
    ]
  }
}
```

> **Note:** Stock for variable batch products is added through purchase/stock endpoints with batch details per variant.

---

## API Response Structure

### Common Fields (All Product Types)

```typescript
interface Product {
  id: number;
  productName: string;
  productCode: string;
  product_type: 'simple' | 'variable';
  is_batch_tracked: boolean;
  barcode: string;  // Auto-generated if not provided
  productSalePrice: number;
  productPurchasePrice?: number;
  category_id: number;
  unit_id: number;
  status: 0 | 1;
  created_at: string;
  updated_at: string;
}
```

### Simple Product Extensions

```typescript
interface SimpleProduct extends Product {
  product_type: 'simple';
  is_batch_tracked: false;
  productStock: number;  // Total stock
}

interface SimpleBatchProduct extends Product {
  product_type: 'simple';
  is_batch_tracked: true;
  batches: Array<{
    id: number;
    batch_no: string;
    quantity: number;
    expire_date: string;
    is_expired: boolean;
    days_until_expiry: number;
  }>;
}
```

### Variable Product Extensions

```typescript
interface VariableProduct extends Product {
  product_type: 'variable';
  is_batch_tracked: boolean;
  variants: Array<{
    id: number;
    sku: string;
    barcode: string;  // Auto-generated
    variant_name: string;  // e.g., "Small / Red"
    price: number;
    cost_price?: number;
    total_stock: number;
    is_active: boolean;
    attributes: Array<{
      name: string;
      value: string;
    }>;
    // If is_batch_tracked=true:
    batches?: Array<{
      batch_no: string;
      quantity: number;
      expire_date: string;
    }>;
  }>;
}
```

---

## Barcode Auto-Generation

### How It Works

All products and variants automatically get unique barcodes if not provided.

**Format:** `{PREFIX}{BUSINESS_ID}-{TIMESTAMP_BASE36}-{RANDOM}`

**Examples:**
- Product: `LAPTOP1-1ABC5D-X9Z2` (from productCode "LAPTOP")
- Variant: `TSHSM1-1ABC5D-X9Z2` (from SKU "TSHIRT-S-MEDIUM")

**Frontend Handling:**

```javascript
// When creating product
const productData = {
  productName: "Office Chair",
  productCode: "CHAIR-001",
  // barcode: "123456789",  ← Optional: provide your own
};

// Backend will auto-generate if omitted
// Response will include: barcode: "CHAIR-1-1ABC5D-X9Z2"
```

**Manual Barcode Override:**
```javascript
// If you have existing barcodes:
const productData = {
  productName: "Office Chair",
  productCode: "CHAIR-001",
  barcode: "8901234567890",  // ← Use your barcode
};

// Backend will validate uniqueness within your business
```

---

## Migration Guide

### What Changed?

| Old Field | New Field | Migration |
|-----------|-----------|-----------|
| `product_type: 'single'` | `product_type: 'simple'` | ✅ Auto-migrated |
| `product_type: 'variant'` | `product_type: 'simple'` + `is_batch_tracked: true` | ✅ Auto-migrated |
| N/A | `is_batch_tracked` | ✅ Added to all products |
| `barcode` (sometimes missing) | `barcode` (always present) | ✅ Auto-generated |

### Frontend Updates Required

**1. Product Form - Add Batch Tracking Toggle:**

```javascript
// Old form (pseudo-code):
<select name="product_type">
  <option value="single">Single Product</option>
  <option value="variant">Batch Product</option>
  <option value="variable">Variable Product</option>
</select>

// New form:
<select name="product_type">
  <option value="simple">Simple Product</option>
  <option value="variable">Variable Product</option>
</select>

<label>
  <input type="checkbox" name="is_batch_tracked" />
  Track by batch/lot with expiry dates
</label>
```

**2. Product List - Update Filters:**

```javascript
// Add new filter option
<select name="filter_batch_tracking">
  <option value="">All Products</option>
  <option value="true">Batch Tracked Only</option>
  <option value="false">Non-Batch Only</option>
</select>
```

**3. API Calls - Update Request Structure:**

```javascript
// Old (don't use):
{
  product_type: "variant",  // ❌ Deprecated
}

// New (use this):
{
  product_type: "simple",
  is_batch_tracked: true,   // ✅ Correct
}
```

---

## UI Implementation Examples

### Product Creation Form

```javascript
const ProductForm = () => {
  const [productType, setProductType] = useState('simple');
  const [isBatchTracked, setIsBatchTracked] = useState(false);
  const [variants, setVariants] = useState([]);

  const handleSubmit = async (formData) => {
    const payload = {
      productName: formData.name,
      productCode: formData.code,
      product_type: productType,
      is_batch_tracked: isBatchTracked,
      productSalePrice: formData.price,
      category_id: formData.category,
      unit_id: formData.unit,
      status: 1,
    };

    // Add batch fields if batch tracking enabled
    if (isBatchTracked && productType === 'simple') {
      payload.batch_no = formData.batchNumbers;
      payload.productStock = formData.batchQuantities;
      payload.expire_date = formData.expiryDates;
    }

    // Add variants if variable product
    if (productType === 'variable') {
      payload.variants = variants.map(v => ({
        sku: v.sku,
        price: v.price,
        cost_price: v.cost,
        attribute_value_ids: v.attributes,
        is_active: 1,
      }));
    }

    const response = await fetch('/api/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('Created product:', result.data);
    console.log('Auto-generated barcode:', result.data.barcode);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Product Type Selector */}
      <select value={productType} onChange={e => setProductType(e.target.value)}>
        <option value="simple">Simple Product</option>
        <option value="variable">Variable Product (with sizes/colors)</option>
      </select>

      {/* Batch Tracking Toggle */}
      <label>
        <input
          type="checkbox"
          checked={isBatchTracked}
          onChange={e => setIsBatchTracked(e.target.checked)}
        />
        Track by batch/lot with expiry dates
      </label>

      {/* Conditional Fields */}
      {isBatchTracked && productType === 'simple' && (
        <BatchFieldsComponent />
      )}

      {productType === 'variable' && (
        <VariantManagerComponent
          variants={variants}
          setVariants={setVariants}
          batchTracked={isBatchTracked}
        />
      )}

      <button type="submit">Create Product</button>
    </form>
  );
};
```

---

### Product Display Logic

```javascript
const ProductCard = ({ product }) => {
  const getProductTypeBadge = () => {
    if (product.product_type === 'simple' && !product.is_batch_tracked) {
      return <span className="badge badge-blue">Simple</span>;
    }
    if (product.product_type === 'simple' && product.is_batch_tracked) {
      return <span className="badge badge-yellow">Batch Tracked</span>;
    }
    if (product.product_type === 'variable' && !product.is_batch_tracked) {
      return <span className="badge badge-purple">Variable</span>;
    }
    if (product.product_type === 'variable' && product.is_batch_tracked) {
      return <span className="badge badge-orange">Variable + Batch</span>;
    }
  };

  return (
    <div className="product-card">
      <h3>{product.productName}</h3>
      {getProductTypeBadge()}
      <p>Barcode: {product.barcode}</p>
      
      {product.is_batch_tracked && product.batches && (
        <div className="batches">
          {product.batches.map(batch => (
            <div key={batch.id} className={batch.is_expired ? 'expired' : ''}>
              <span>{batch.batch_no}</span>
              <span>Qty: {batch.quantity}</span>
              <span>Expires: {batch.expire_date}</span>
              {batch.is_expired && <span className="badge badge-red">EXPIRED</span>}
            </div>
          ))}
        </div>
      )}
      
      {product.variants && (
        <div className="variants">
          {product.variants.map(variant => (
            <div key={variant.id}>
              <span>{variant.variant_name}</span>
              <span>${variant.price}</span>
              <span>Barcode: {variant.barcode}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## Testing Checklist

### Manual Testing

- [ ] **Simple Non-Batch:**
  - [ ] Create product without barcode → Verify auto-generation
  - [ ] Create product with manual barcode → Verify accepted
  - [ ] Verify single stock entry created

- [ ] **Simple Batch:**
  - [ ] Create with multiple batches → Verify all batches created
  - [ ] Create with expiry dates → Verify expiry calculations
  - [ ] Verify is_expired and days_until_expiry fields

- [ ] **Variable Non-Batch:**
  - [ ] Create with 2+ variants → Verify all created
  - [ ] Verify variant barcodes auto-generated from SKU
  - [ ] Verify variant_name generated from attributes

- [ ] **Variable Batch:**
  - [ ] Create variable product with is_batch_tracked=true
  - [ ] Add stock via purchase with batch details
  - [ ] Verify batches linked to correct variants

### API Testing Examples

```bash
# Test 1: Simple Product
curl -X POST http://localhost:8700/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Test Chair",
    "productCode": "CHAIR-TEST",
    "product_type": "simple",
    "is_batch_tracked": false,
    "productSalePrice": 100
  }'

# Test 2: Simple Batch Product
curl -X POST http://localhost:8700/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Test Milk",
    "productCode": "MILK-TEST",
    "product_type": "simple",
    "is_batch_tracked": true,
    "batch_no": ["BATCH-001"],
    "productStock": [100],
    "expire_date": ["2026-03-15"]
  }'

# Test 3: Variable Product
curl -X POST http://localhost:8700/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Test T-Shirt",
    "productCode": "TSHIRT-TEST",
    "product_type": "variable",
    "is_batch_tracked": false,
    "variants": [
      {
        "sku": "TSHIRT-S",
        "price": 50,
        "cost_price": 30,
        "attribute_value_ids": [1]
      }
    ]
  }'
```

---

## Common Questions

### Q1: Can I still use `product_type='variant'`?
**A:** No, use `product_type='simple'` with `is_batch_tracked=true` instead. Legacy data was auto-migrated.

### Q2: What if I don't provide a barcode?
**A:** Backend automatically generates a unique barcode. You'll get it in the API response.

### Q3: Can variable products have batch tracking?
**A:** Yes! Set `product_type='variable'` and `is_batch_tracked=true`. Each variant can then have batches.

### Q4: How do I add stock to batch products?
**A:** For simple batch: Include `batch_no`, `productStock`, `expire_date` arrays in product creation.  
For variable batch: Use purchase/stock endpoints with variant_id and batch details.

### Q5: Will this break existing frontend code?
**A:** Minimal impact. Main changes:
- Replace `'variant'` → `'simple'` with `is_batch_tracked=true`
- Add `is_batch_tracked` field to forms
- Read new `barcode` field from responses

---

## Support & Resources

**Backend Documentation:**
- `docs/PRODUCT_TYPE_SYSTEM_PLAN.md` - Complete technical specification
- `docs/BACKEND_DEVELOPMENT_LOG.md` - Implementation log (January 15, 2026 entry)
- `docs/API_DOCUMENTATION.md` - Full API reference

**Backend Endpoints:**
- `POST /api/v1/products` - Create product (all types)
- `GET /api/v1/products/{id}` - Get product details
- `PUT /api/v1/products/{id}` - Update product
- `GET /api/v1/products` - List products (supports `is_batch_tracked` filter)

**Questions?**  
Contact backend team or check BACKEND_DEVELOPMENT_LOG.md for latest updates.

---

**Document Prepared:** January 15, 2026  
**Backend Version:** Laravel 10+  
**API Version:** v1  
**Status:** ✅ Ready for Frontend Integration
