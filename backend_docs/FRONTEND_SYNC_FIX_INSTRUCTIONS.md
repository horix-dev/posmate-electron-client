# Frontend Fix Required: Sync Batch Products Format

**Date:** December 29, 2025  
**Priority:** 🔴 HIGH - Blocks offline sales sync  
**Estimated Fix Time:** 5-10 minutes

---

## Issue

The sync batch endpoint is rejecting your requests with this error:

```json
{
  "status": "error",
  "error": "Field 'products' must be a JSON array type, not a string. Please send the array directly without JSON.stringify()"
}
```

## Root Cause

You're sending `products` as a **JSON string** instead of an **array**:

### ❌ Current (Wrong):
```json
{
  "operations": [
    {
      "data": {
        "products": "[{\"stock_id\":11,\"quantities\":1,\"price\":350}]"
      }
    }
  ]
}
```

The `products` field is a **string** containing JSON.

### ✅ Required (Correct):
```json
{
  "operations": [
    {
      "data": {
        "products": [
          {
            "stock_id": 11,
            "quantities": 1,
            "price": 350
          }
        ]
      }
    }
  ]
}
```

The `products` field is an **array** type.

---

## How to Fix

### Location
Find where you're building the sync batch payload (likely in your sync service/offline queue handler).

### JavaScript/TypeScript Fix

#### Before (Wrong):
```javascript
// ❌ Don't stringify products
const operation = {
  idempotency_key: generateKey(),
  entity: "sale",
  action: "create",
  data: {
    products: JSON.stringify(products),  // ❌ Wrong - converts to string
    invoiceNumber: "S-00025",
    party_id: 5,
    // ...
  }
};
```

#### After (Correct):
```javascript
// ✅ Send products as-is (array type)
const operation = {
  idempotency_key: generateKey(),
  entity: "sale",
  action: "create",
  data: {
    products: products,  // ✅ Correct - keeps as array
    invoiceNumber: "S-00025",
    party_id: 5,
    // ...
  }
};
```

### If Products Come from localStorage

If you're storing products in localStorage as a string, parse it **before** building the payload:

```javascript
// Get from localStorage
const productsString = localStorage.getItem('offline_sale_products');

// Parse once
const products = JSON.parse(productsString);

// Use parsed array directly
const operation = {
  data: {
    products: products,  // ✅ Now it's an array
    // ...
  }
};
```

### React/Redux Example

```typescript
// In your sync action/saga
const syncOfflineSales = async (offlineSales: OfflineSale[]) => {
  const operations = offlineSales.map(sale => ({
    idempotency_key: sale.id,
    entity: "sale",
    action: "create",
    data: {
      // If sale.products is already an array
      products: sale.products,  // ✅ Good
      
      // If sale.products is stored as string in DB/storage
      products: JSON.parse(sale.products),  // ✅ Also good
      
      // Don't do this:
      products: JSON.stringify(sale.products),  // ❌ Bad
      
      invoiceNumber: sale.invoiceNumber,
      totalAmount: sale.totalAmount,
      // ...
    },
    offline_timestamp: sale.createdAt
  }));

  const response = await fetch('/api/v1/sync/batch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operations,
      client_timestamp: new Date().toISOString(),
      device_id: deviceId
    })
  });
};
```

### Flutter/Dart Example

```dart
// ❌ Wrong
final operation = {
  'data': {
    'products': jsonEncode(products),  // Don't encode to string
    // ...
  }
};

// ✅ Correct
final operation = {
  'data': {
    'products': products,  // Keep as List<Map>
    // ...
  }
};

// When sending
final body = jsonEncode({
  'operations': operations,  // jsonEncode handles it all at once
  'client_timestamp': DateTime.now().toIso8601String(),
  'device_id': deviceId,
});
```

---

## Testing Your Fix

### 1. Check Request Payload

Before sending, log your payload and verify structure:

```javascript
console.log('Sync payload:', JSON.stringify(payload, null, 2));
```

**Look for:**
```json
"products": [           // ✅ Should be array brackets
  {
    "stock_id": 11,
    // ...
  }
]
```

**NOT:**
```json
"products": "[{\"stock_id\":11,...}]"  // ❌ String with escaped quotes
```

### 2. Test Sync

After fixing, attempt to sync. Success response:
```json
{
  "success": true,
  "results": [
    {
      "idempotency_key": "sale_create_123",
      "status": "created",
      "server_id": 1234,
      "invoice_number": "INV-001234"
    }
  ]
}
```

---

## API Contract

### POST /api/v1/sync/batch

**Type Requirements:**
| Field | Type | Example |
|-------|------|---------|
| `operations` | `Array` | `[...]` |
| `operations[].data` | `Object` | `{...}` |
| `operations[].data.products` | **`Array`** | `[{...}, {...}]` |
| `operations[].data.products[].stock_id` | `Number` | `11` |
| `operations[].data.products[].quantities` | `Number` | `2` |
| `operations[].data.products[].price` | `Number` | `350` |

**All fields must be their native JSON types, NOT stringified.**

---

## Why This Approach?

### Backend Enforces Strict Validation Because:
1. ✅ **Clear Contract** - One correct way to send data
2. ✅ **Better Performance** - No parsing overhead
3. ✅ **Easier Debugging** - Immediate feedback if wrong format
4. ✅ **Industry Standard** - REST APIs should be strict
5. ✅ **Prevents Bugs** - Forces correct usage from the start

### This is NOT a Backend Bug:
- The API contract expects array type
- Your code is converting array → string unnecessarily
- Remove the `JSON.stringify()` call on the products field

---

## Common Mistakes

### ❌ Don't Do This:
```javascript
// Mistake 1: Double stringifying
const payload = JSON.stringify({
  data: {
    products: JSON.stringify(products)  // ❌ Wrong
  }
});

// Mistake 2: Stringifying before adding to object
const data = {
  products: products.map(p => JSON.stringify(p))  // ❌ Wrong
};

// Mistake 3: Converting array to string
const data = {
  products: `[${products.join(',')}]`  // ❌ Wrong
};
```

### ✅ Do This:
```javascript
// Correct: Build object with arrays, stringify once at the end
const payload = JSON.stringify({
  operations: [{
    data: {
      products: products  // ✅ Array stays as array
    }
  }]
});
```

---

## Verification Checklist

After fixing, verify:

- [ ] Removed all `JSON.stringify()` calls on the `products` field
- [ ] `products` is sent as native array type
- [ ] Each product object has required fields: `stock_id`, `quantities`, `price`
- [ ] Request body uses `Content-Type: application/json`
- [ ] Tested with real offline sale sync
- [ ] No more "must be of type array" errors

---

## Need Help?

If you're still getting errors after this fix:

1. **Log the exact payload** before sending (use `JSON.stringify(payload, null, 2)`)
2. **Check the network tab** in browser DevTools
3. **Verify the `products` field** shows as array `[...]` not string `"[...]"`
4. **Share the request payload** if still failing

---

## Related Documentation

- **Sync API Reference:** `docs/OFFLINE_FIRST_BACKEND_API.md`
- **Backend Development Log:** `docs/BACKEND_DEVELOPMENT_LOG.md`
- **General Frontend Guide:** `docs/FRONTEND_PARTIAL_PAYMENT_GUIDE.md`

---

**Expected Fix Time:** 5-10 minutes  
**Impact:** Unblocks offline sales synchronization  
**Next Steps:** Test with real offline sales data after fixing
