# Combo Product API - Quick Usage Guide

## Creating a Combo Product with Auto-Calculated Pricing

### Step 1: Create the Combo Product

```http
POST /api/v1/products
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "productName": "Breakfast Combo",
  "product_type": "combo",
  "category_id": 5,
  "productCode": "COMBO-001",
  "components": [
    {
      "component_product_id": 10,
      "component_variant_id": null,
      "unit_id": 1,
      "quantity": 1
    },
    {
      "component_product_id": 15,
      "component_variant_id": null,
      "unit_id": 2,
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "id": 100,
    "productName": "Breakfast Combo",
    "productSalePrice": 15.00,
    "productDealerPrice": 12.00,
    "productPurchasePrice": 10.00,
    "productWholeSalePrice": 13.00,
    "productStock": 10,
    "product_type": "combo"
  }
}
```

### Step 2: View Combo Details

```http
GET /api/v1/products/100
Authorization: Bearer YOUR_TOKEN
```

**Response shows combo_details:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 100,
    "productName": "Breakfast Combo",
    "productSalePrice": 15.00,
    "productStock": 10,
    "product_type": "combo",
    "combo_details": {
      "total_sale_price": 15.00,
      "total_dealer_price": 12.00,
      "total_purchase_price": 10.00,
      "total_wholesale_price": 13.00,
      "available_combos": 10,
      "components": [
        {
          "id": 1,
          "component_product_id": 10,
          "component_product_name": "Coffee",
          "quantity_per_combo": 1,
          "is_limiting_component": false,
          "stock_details": {
            "total_available": 50,
            "max_combos_from_this_component": 50,
            "batches": [
              {
                "stock_id": 25,
                "batch_no": "BATCH001",
                "quantity": 50,
                "sale_price": 5.00,
                "dealer_price": 4.00,
                "purchase_price": 3.00,
                "wholesale_price": 4.50,
                "expiry_date": "2027-01-01",
                "mfg_date": "2026-01-01",
                "days_until_expiry": 350
              }
            ]
          }
        },
        {
          "id": 2,
          "component_product_id": 15,
          "component_product_name": "Toast",
          "quantity_per_combo": 2,
          "is_limiting_component": true,
          "stock_details": {
            "total_available": 20,
            "max_combos_from_this_component": 10,
            "batches": [...]
          }
        }
      ]
    }
  }
}
```

## Updating Combo Components

```http
POST /api/v1/products/100/components
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "components": [
    {
      "component_product_id": 10,
      "quantity": 2
    },
    {
      "component_product_id": 15,
      "quantity": 1
    }
  ]
}
```

**This will automatically:**
1. Replace all existing components
2. Recalculate total prices
3. Recalculate available stock

## Understanding the Stock Calculation

**Formula:** `available_combos = MIN(component_stock / component_quantity for all components)`

**Example:**
- Coffee: 50 units, need 1 per combo → can make 50 combos
- Toast: 20 units, need 2 per combo → can make 10 combos
- **Result: 10 combos available** (limited by toast)

The `stock_details` in the response shows which component is the limiting factor!

## Frontend Display Tips

### Product List
Show the data directly from products table:
- `productName`: "Breakfast Combo"
- `productSalePrice`: $15.00
- `productStock`: 10 combos

### Product Details Page
Expand `combo_details` to show:

```
Breakfast Combo - $15.00
━━━━━━━━━━━━━━━━━━━━━━━━━━
Available: 10 combos

Prices:
  Sale: $15.00
  Dealer: $12.00
  Purchase: $10.00
  Wholesale: $13.00

Components:
━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Coffee (1 cup)
  - Available: 50 units
  - Can make: 50 combos
  
⚠️ Toast (2 slices) [LIMITING COMPONENT]
  - Available: 20 units
  - Can make: 10 combos
  
Batch Details (Click to expand):
  Coffee - BATCH001:
    - Qty: 50 cups
    - Expires: 350 days
    - Prices: $5.00 (sale) / $3.00 (purchase)
    
  Toast - TOAST001:
    - Qty: 20 slices
    - Expires: 30 days
    - Prices: $5.00 (sale) / $2.00 (purchase)
```

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/products` | Create combo with components |
| `PUT` | `/api/v1/products/{id}` | Update combo (including components) |
| `GET` | `/api/v1/products/{id}` | View combo with detailed stock info |
| `GET` | `/api/v1/products/{id}/components` | List combo components |
| `POST` | `/api/v1/products/{id}/components` | Replace combo components |

## Important Notes

1. **Price is Auto-Calculated**: ✅ Backend automatically ignores any price fields sent for combos
2. **Stock is Auto-Calculated**: ✅ Backend automatically ignores productStock field for combos
3. **Stock Updates**: Combo stock is recalculated only when components are synced, not when component stock changes
4. **No Manual Stock Entries**: Combo products don't have stock records (no entries in `stocks` table)
5. **Batch Details**: Available when components relationship is loaded (use `GET /products/{id}` endpoint)
6. **Limiting Component**: `is_limiting_component: true` flag identifies which component restricts combo availability
7. **All Price Types**: Response includes sale, dealer, purchase, and wholesale prices at both combo and batch level
8. **Recalculation**: Use `POST /products/{id}/components` to trigger price/stock recalculation

## API Response Fields Explained

### combo_details Structure
```typescript
{
  total_sale_price: number;        // Sum of component sale prices
  total_dealer_price: number;      // Sum of component dealer prices
  total_purchase_price: number;    // Sum of component purchase prices
  total_wholesale_price: number;   // Sum of component wholesale prices
  available_combos: number;        // Minimum available from all components
  components: [
    {
      id: number;
      component_product_id: number;
      component_product_name: string;
      component_variant_id: number | null;
      component_variant_name: string | null;
      unit_id: number | null;
      unit_name: string;
      quantity_per_combo: number;
      is_limiting_component: boolean;    // 🆕 TRUE if this component limits stock
      stock_details: {
        total_available: number;
        max_combos_from_this_component: number;
        batches: [
          {
            stock_id: number;
            batch_no: string | null;
            quantity: number;
            sale_price: number;
            dealer_price: number;          // 🆕 Added
            purchase_price: number;
            wholesale_price: number;       // 🆕 Added
            expiry_date: string | null;
            mfg_date: string | null;       // 🆕 Added
            days_until_expiry: number | null;
          }
        ]
      }
    }
  ]
}
```

## Testing

Verify calculations work:
```bash
php test_combo_price_calculation.php
```

All tests should show ✓ PASS.
