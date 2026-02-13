# Combo Products - Implementation and API Guide

This guide documents the combo product implementation, data model, and API usage.

## Overview

Combo products are bundles of existing products sold together. A combo product has no stock of its own. When a combo is sold, stock is deducted from its component products (and batches/variants as applicable). Sale details track the component allocations used for audit and returns.

Key behaviors:
- Components are defined per combo product.
- Prices and stock quantities are stored in the products table.
- Detailed component and batch information available via API.
- Selling a combo expands into component stock deductions.
- Sale returns restore component stock proportionally.
- Combo composition is syncable for offline-first clients.

### New Features (Feb 2026)

**Enhanced API Response:**
- `combo_details` section with comprehensive component information
- All price types included (sale, dealer, purchase, wholesale)
- Batch-level stock details with expiry tracking
- `is_limiting_component` flag to identify stock bottlenecks
- `available_combos` calculated from component availability

**Improved Data Storage:**
- Prices stored in products table for quick access
- Stock quantity stored in products table
- Both products and stocks tables now populated during creation

## Data Model

### Product Type

`products.product_type` now supports:
- `simple`
- `variant` (batch)
- `variable` (attribute-based variants)
- `combo` (bundle of components)

### Tables

#### product_components

Stores combo composition.

Columns:
- `business_id`
- `combo_product_id`
- `component_product_id`
- `component_variant_id` (nullable)
- `unit_id` (nullable)
- `quantity`
- `version`
- `deleted_at`
- timestamps

#### sale_detail_components

Stores actual component stock allocations for a combo sale line.

Columns:
- `sale_detail_id`
- `stock_id` (nullable)
- `component_product_id`
- `component_variant_id` (nullable)
- `quantity`
- timestamps

## Service Layer

### ComboProductService

Location: `app/Services/ComboProductService.php`

Responsibilities:
- Validate combo component definitions
- Sync component list for a combo
- Validate stock availability for combo sales
- Allocate component batches/stock for combo sales

### SaleService

Location: `app/Services/SaleService.php`

Enhancements:
- Combo items are detected when `stock_id` is missing and `product_id` is provided.
- For combos, a sale detail is created and component stock is allocated and deducted.
- Component allocations are stored in `sale_detail_components`.
- On sale update/delete, component stocks are restored.

### SaleReturnController

Location: `app/Http/Controllers/Api/SaleReturnController.php`

Enhancements:
- When returning a combo sale detail, component stocks are restored proportionally.

## API Endpoints

### Create Combo Product

`POST /api/v1/products`

Important fields:
- `product_type: "combo"`
- `productSalePrice`: Saved to products table (if provided, otherwise defaults to 0)
- `productDealerPrice`: Saved to products table (if provided, otherwise defaults to 0)
- `productPurchasePrice`: Saved to products table (if provided, otherwise defaults to 0)
- `productWholeSalePrice`: Saved to products table (if provided, otherwise defaults to 0)
- `productStock`: Saved to products table (if provided, otherwise defaults to 0)
- optional `components` array

**Note:** Prices and stock are stored in the products table along with other product details.

Example:
```json
{
  "productName": "Starter Kit",
  "product_type": "combo",
  "productSalePrice": 19.99,
  "productDealerPrice": 15.99,
  "productPurchasePrice": 12.00,
  "productWholeSalePrice": 17.99,
  "components": [
    {
      "component_product_id": 12,
      "component_variant_id": null,
      "unit_id": 1,
      "quantity": 2
    }
  ]
}
```

### Update Combo Product

`PUT /api/v1/products/{id}`

Same as create. You can pass `components` to replace the component list. All price fields (productSalePrice, productDealerPrice, productPurchasePrice, productWholeSalePrice) and productStock are updated in the products table.

Example:
```json
{
  "productName": "Updated Kit",
  "productSalePrice": 24.99,
  "productDealerPrice": 19.99,
  "components": [
    {
      "component_product_id": 12,
      "quantity": 3
    },
    {
      "component_product_id": 15,
      "quantity": 1
    }
  ]
}
```

### Get Combo Product Details

`GET /api/v1/products/{id}`

Returns comprehensive product details including combo-specific information with stock details.

Response for combo products:
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 200,
    "productName": "Starter Kit",
    "productCode": "COMBO-001",
    "product_type": "combo",
    "productSalePrice": 15.00,
    "productDealerPrice": 12.00,
    "productPurchasePrice": 10.00,
    "productWholeSalePrice": 13.00,
    "productStock": 0,
    "category": { ... },
    "unit": { ... },
    "combo_details": {
      "total_sale_price": 15.00,
      "total_dealer_price": 12.00,
      "total_purchase_price": 10.00,
      "total_wholesale_price": 13.00,
      "available_combos": 10,
      "components": [
        {
          "id": 1,
          "component_product_id": 12,
          "component_product_name": "Coffee",
          "component_product_code": "PROD-012",
          "component_variant_id": null,
          "component_variant_name": null,
          "unit_id": 1,
          "unit_name": "Cup",
          "quantity_per_combo": 1,
          "is_limiting_component": false,
          "stock_details": {
            "total_available": 50,
            "max_combos_from_this_component": 50,
            "batches": [
              {
                "stock_id": 501,
                "batch_no": "BATCH001",
                "quantity": 50,
                "sale_price": 5.00,
                "dealer_price": 4.00,
                "purchase_price": 3.00,
                "wholesale_price": 4.50,
                "expiry_date": "2027-01-01",
                "mfg_date": "2026-01-01",
                "days_until_expiry": 350,
                "is_expired": false
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
            "batches": [ ... ]
          }
        }
      ]
    }
  }
}
```

**Response Fields Explained:**

**Product Level:**
- `productSalePrice`, `productDealerPrice`, `productPurchasePrice`, `productWholeSalePrice`: Stored in products table (sum of component prices)
- `productStock`: Stored in products table (minimum available combos)

**combo_details:**
- `total_sale_price`: Sum of component sale prices
- `total_dealer_price`: Sum of component dealer prices
- `total_purchase_price`: Sum of component purchase prices
- `total_wholesale_price`: Sum of component wholesale prices
- `available_combos`: Minimum available combos across all components

**Component Details:**
- `is_limiting_component`: Boolean flag indicating which component restricts combo availability
- `stock_details.total_available`: Total stock available for this component
- `stock_details.max_combos_from_this_component`: Maximum combos possible from this component alone

**Batch Details:**
- `sale_price`, `dealer_price`, `purchase_price`, `wholesale_price`: All price types per batch
- `expiry_date`, `mfg_date`: Date tracking
- `days_until_expiry`: Calculated days until expiration
- `is_expired`: Boolean flag if batch is expired

### List Combo Components

`GET /api/v1/products/{id}/components`

Response:
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "combo_product_id": 200,
      "component_product_id": 12,
      "component_variant_id": null,
      "unit_id": 1,
      "quantity": 2
    }
  ]
}
```

### Set Combo Components

`POST /api/v1/products/{id}/components`

Request body:
```json
{
  "components": [
    {
      "component_product_id": 12,
      "component_variant_id": null,
      "unit_id": 1,
      "quantity": 2
    }
  ]
}
```

### Sell a Combo

`POST /api/v1/sales`

For combo items, omit `stock_id` and use `product_id`:
```json
{
  "products": [
    {
      "product_id": 200,
      "quantities": 1,
      "price": 19.99
    }
  ],
  "totalAmount": 19.99,
  "paidAmount": 19.99
}
```

Behavior:
- Combo components are allocated to batches/stocks using FIFO/FEFO/LIFO strategies.
- Component stocks are decremented.
- Allocation details are recorded in `sale_detail_components`.
- Batch movements are logged for audit trail.

### Sale Response (Combo Components)

When sale details are loaded, `combo_components` are included per line:
```json
{
  "id": 10,
  "product_id": 200,
  "stock_id": null,
  "quantities": 1,
  "price": 19.99,
  "combo_components": [
    {
      "id": 1,
      "sale_detail_id": 10,
      "component_product_id": 12,
      "component_variant_id": null,
      "quantity": 2,
      "stock_id": 501,
      "component_product": {
        "id": 12,
        "productName": "Coffee",
        "productCode": "PROD-012"
      },
      "stock": {
        "id": 501,
        "batch_no": "BATCH001",
        "productStock": 48
      }
    }
  ]
}
```

## Validation Rules

Combo components:
- `component_product_id` must exist and belong to the same business
- `component_variant_id` must belong to the selected component product
- `quantity` must be > 0
- a combo cannot include itself
- combo components cannot be combo products

Sale items:
- `stock_id` is required for non-combo items
- `product_id` is required for combo items

## Sync Support

Combo definitions are syncable via `product_components` in the sync endpoints:
- `GET /api/v1/sync/full`
- `GET /api/v1/sync/changes`

## Frontend Usage Guide

### Product List Display

Use fields directly from the products table:
```javascript
// Simple display
{product.productName} - ${product.productSalePrice}
Stock: {product.productStock} {product.product_type === 'combo' ? 'combos' : 'units'}
```

### Product Detail Display

For combo products, use the `combo_details` section:

```javascript
// Show all price types
Sale Price: ${combo_details.total_sale_price}
Dealer Price: ${combo_details.total_dealer_price}
Purchase Price: ${combo_details.total_purchase_price}
Wholesale Price: ${combo_details.total_wholesale_price}

// Show availability
Available: {combo_details.available_combos} combos

// Show components with limiting indicator
{combo_details.components.map(component => {
  const limiting = component.is_limiting_component ? ' ⚠️ [LIMITING]' : '';
  return `${component.component_product_name}${limiting}
    Qty per combo: ${component.quantity_per_combo}
    Available: ${component.stock_details.total_available}
    Can make: ${component.stock_details.max_combos_from_this_component} combos`;
})}

// Optional: Show batch details
{component.stock_details.batches.map(batch => 
  `Batch ${batch.batch_no}: ${batch.quantity} units
   Expires in ${batch.days_until_expiry} days
   ${batch.is_expired ? '❌ EXPIRED' : '✓ Fresh'}`
)}
```

### TypeScript Interfaces

```typescript
interface Product {
  id: number;
  productName: string;
  productSalePrice: number;
  productDealerPrice: number;
  productPurchasePrice: number;
  productWholeSalePrice: number;
  productStock: number;
  product_type: 'simple' | 'variant' | 'variable' | 'combo';
  combo_details?: ComboDetails;
}

interface ComboDetails {
  total_sale_price: number;
  total_dealer_price: number;
  total_purchase_price: number;
  total_wholesale_price: number;
  available_combos: number;
  components: ComboComponent[];
}

interface ComboComponent {
  id: number;
  component_product_id: number;
  component_product_name: string;
  component_product_code: string | null;
  component_variant_id: number | null;
  component_variant_name: string | null;
  unit_id: number | null;
  unit_name: string;
  quantity_per_combo: number;
  is_limiting_component: boolean;
  stock_details: ComponentStockDetails;
}

interface ComponentStockDetails {
  total_available: number;
  max_combos_from_this_component: number;
  batches: ComponentBatch[];
}

interface ComponentBatch {
  stock_id: number;
  batch_no: string | null;
  quantity: number;
  sale_price: number;
  dealer_price: number;
  purchase_price: number;
  wholesale_price: number;
  expiry_date: string | null;
  mfg_date: string | null;
  days_until_expiry: number | null;
  is_expired: boolean;
}
```

## Notes and Limits

- Combo products store prices and stock in the products table for quick access and display.
- Combo products do not create or maintain stock rows in the stocks table.
- Detailed combo information including component stock details and batch information is available via the `combo_details` section when loading with components relationship.
- The `is_limiting_component` flag identifies which component restricts combo availability.
- Batch selection uses the configured batch selection strategy for each component product.
- Returns restore component stock based on the return quantity ratio.
- All price types (sale, dealer, purchase, wholesale) are tracked at both product and batch levels.

## Testing

Two test scripts are available to verify combo functionality:

### Test Price/Stock Calculation
```bash
php test_combo_price_calculation.php
```
Verifies:
- Component price summation
- Stock availability calculation
- Minimum combo detection

### Test API Response Structure
```bash
php test_combo_api_response.php
```
Verifies:
- Complete response structure
- combo_details presence
- Component and batch details
- All price fields
- Limiting component indicator

## Related Files

**Models:**
- `app/Models/Product.php`
- `app/Models/ProductComponent.php`
- `app/Models/SaleDetails.php`
- `app/Models/SaleDetailComponent.php`
- `app/Models/Stock.php`

**Services:**
- `app/Services/ComboProductService.php`
- `app/Services/SaleService.php`
- `app/Services/BatchSelectionService.php`

**Controllers:**
- `app/Http/Controllers/Api/ProductController.php`
- `app/Http/Controllers/Api/ProductComponentController.php`
- `app/Http/Controllers/Api/SaleReturnController.php`

**Resources:**
- `app/Http/Resources/ProductResource.php`
- `app/Http/Resources/SaleResource.php`

**Migrations:**
- `database/migrations/2026_02_13_000001_create_product_components_table.php`
- `database/migrations/2026_02_13_000002_create_sale_detail_components_table.php`
