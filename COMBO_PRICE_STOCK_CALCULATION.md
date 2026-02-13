# Combo Product Price & Stock Calculation - Implementation Summary

**Date:** February 13, 2026  
**Feature:** Automatic price and stock calculation for combo products

## Overview

Enhanced combo product creation to automatically calculate and store price and stock information in the `products` table based on component data. This allows combo products to display meaningful pricing and availability without querying components on every request.

## Changes Made

### 1. ComboProductService Enhancements

**File:** `app/Services/ComboProductService.php`

Added three new methods to handle automatic calculations:

#### `updateComboPriceAndStock(Product $combo): void`
- Automatically called after syncing components
- Calculates total prices by summing (component_price × quantity) for all components
- Calculates available stock as minimum available combos across all components
- Updates products table fields:
  - `productSalePrice` - Sum of component sale prices
  - `productDealerPrice` - Sum of component dealer prices
  - `productPurchasePrice` - Sum of component purchase prices
  - `productWholeSalePrice` - Sum of component wholesale prices
  - `productStock` - MIN(component_stock / component_quantity) for all components

#### `getAverageStockPrices(Product $product): array`
- Gets average prices from a product's stock records
- Used for components without variant pricing
- Returns: sale_price, dealer_price, purchase_price, wholesale_price

#### `getComponentAvailableStock(Product $product, ?int $variantId): float`
- Calculates total available stock for a component
- Handles both regular products and product variants
- Sums stock across all batches with productStock > 0

### 2. ProductResource Creation

**File:** `app/Http/Resources/ProductResource.php` (NEW)

Created a new API resource to properly format combo product responses with detailed stock information:

```json
{
  "id": 1,
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
        "component_product_id": 5,
        "component_product_name": "Coffee",
        "component_variant_id": null,
        "component_variant_name": null,
        "unit_id": 1,
        "unit_name": "Cup",
        "quantity_per_combo": 1,
        "stock_details": {
          "total_available": 50,
          "max_combos_from_this_component": 50,
          "batches": [
            {
              "stock_id": 10,
              "batch_no": "BATCH001",
              "quantity": 30,
              "sale_price": 5.00,
              "purchase_price": 3.00,
              "expiry_date": "2026-12-31",
              "days_until_expiry": 280
            },
            {
              "stock_id": 11,
              "batch_no": "BATCH002",
              "quantity": 20,
              "sale_price": 5.00,
              "purchase_price": 3.00,
              "expiry_date": "2027-01-15",
              "days_until_expiry": 295
            }
          ]
        }
      },
      {
        "id": 2,
        "component_product_id": 6,
        "component_product_name": "Toast",
        "quantity_per_combo": 2,
        "stock_details": {
          "total_available": 20,
          "max_combos_from_this_component": 10,
          "batches": [...]
        }
      }
    ]
  }
}
```

**Key Features:**
- Shows aggregate pricing at product level
- Exposes detailed stock information per component
- Includes batch-level details (batch numbers, quantities, expiry dates)
- Calculates `max_combos_from_this_component` for each component
- Only included when components relationship is loaded

### 3. ProductController Updates

**File:** `app/Http/Controllers/Api/ProductController.php`

#### Changes:
1. Added `ProductResource` import
2. Updated `index()` to load components relationship for combo products
3. Updated `show()` to use `ProductResource` for formatted response
4. Enhanced comments in `store()` and `update()` methods to clarify automatic calculation

**Key Behavior:**
- When creating/updating combo products, price and stock are automatically calculated
- No manual price/stock input required for combo products
- Component sync triggers recalculation via `syncComponents()` → `updateComboPriceAndStock()`

## Usage Examples

### Creating a Combo Product

**Request:**
```http
POST /api/v1/products
Content-Type: application/json
Authorization: Bearer {token}

{
  "productName": "Breakfast Combo",
  "product_type": "combo",
  "category_id": 1,
  "components": [
    {
      "component_product_id": 5,
      "component_variant_id": null,
      "unit_id": 1,
      "quantity": 1
    },
    {
      "component_product_id": 6,
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
    "id": 10,
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

**What Happens:**
1. Combo product created with components
2. System calculates:
   - Coffee (1 × $5) + Toast (2 × $5) = $15 sale price
   - Coffee has 50 units → 50 combos possible
   - Toast has 20 units → 10 combos possible (2 per combo)
   - Final stock = MIN(50, 10) = **10 combos**
3. Products table updated with calculated values

### Viewing Combo Details

**Request:**
```http
GET /api/v1/products/10
Authorization: Bearer {token}
```

**Response:**
Returns ProductResource with `combo_details` section showing:
- Aggregate pricing (total_sale_price, etc.)
- Available combos count
- Per-component breakdown with stock details
- Batch-level information for each component

## Price Calculation Logic

### For Components with Variants:
Uses variant-specific pricing:
- `variant.price` → component sale price
- `variant.dealer_price` → component dealer price
- `variant.cost_price` → component purchase price
- `variant.wholesale_price` → component wholesale price

### For Components without Variants:
Uses average of all stock records:
```php
avg(stocks.productSalePrice) × quantity
avg(stocks.productDealerPrice) × quantity
avg(stocks.productPurchasePrice) × quantity
avg(stocks.productWholeSalePrice) × quantity
```

### Total Combo Price:
```
combo_price = SUM(component_price × component_quantity)
```

## Stock Calculation Logic

### Available Stock Per Component:
```
component_available = SUM(stock.productStock WHERE productStock > 0)
```

### Maximum Combos from Component:
```
max_combos = FLOOR(component_available / component_quantity)
```

### Total Available Combos:
```
combo_stock = MIN(max_combos_from_all_components)
```

**Example:**
- Coffee: 50 units, need 1 per combo → 50 combos
- Toast: 20 units, need 2 per combo → 10 combos
- **Result: 10 combos available** (limited by toast)

## Benefits

### 1. Performance
- Price and stock stored directly in products table
- No need to query components on every product list request
- Faster API responses for product listings

### 2. Clarity
- Combo products show meaningful price and stock at product level
- Frontend can display combo price without calculations
- Stock level reflects actual availability

### 3. Detailed Breakdown
- `combo_details` provides full transparency
- Shows which component limits availability
- Exposes batch-level stock information
- Enables frontend to display component breakdowns

### 4. Automatic Updates
- Price recalculated when components change
- Stock recalculated when components change
- No manual intervention required

## Frontend Display Recommendations

### Product List View
Show data from products table:
```json
{
  "productName": "Breakfast Combo",
  "productSalePrice": 15.00,
  "productStock": 10
}
```

### Product Detail View
Show `combo_details` section:
- Display aggregate pricing prominently
- Show "Available: 10 combos" from `available_combos`
- Expandable component list showing:
  - Component name and quantity
  - Component stock availability
  - Which component limits combo availability
  - Batch details (optional, for inventory management)

### Example UI:
```
Breakfast Combo - $15.00
Stock: 10 combos available

Components:
✓ Coffee (1 cup) - 50 available → can make 50 combos
⚠ Toast (2 slices) - 20 available → can make 10 combos (LIMITING)

Batch Details:
  Coffee:
    - Batch BATCH001: 30 cups, expires in 280 days
    - Batch BATCH002: 20 cups, expires in 295 days
  Toast:
    - Batch TOAST001: 20 slices, expires in 30 days
```

## Limitations

1. **No Auto-Update on Component Stock Changes**
   - Combo stock is calculated at component sync time
   - If component stock changes (sale, purchase), combo stock is NOT automatically updated
   - **Solution:** Manually trigger component sync or implement event listeners

2. **Pricing Reflects Creation-Time Values**
   - If component prices change, combo price is NOT automatically updated
   - **Solution:** Re-save combo product or sync components

3. **Branch/Warehouse Scoping**
   - Stock calculation uses global product stock, not branch-specific
   - May show more availability than exists at specific location
   - **Future Enhancement:** Add branch_id parameter to calculation methods

## Future Enhancements

### Event-Based Auto-Updates
```php
// Listen to stock changes
Stock::updated(function($stock) {
    // Find combos using this product
    $combos = ProductComponent::where('component_product_id', $stock->product_id)
        ->with('comboProduct')
        ->get();
    
    // Recalculate each combo
    foreach ($combos as $component) {
        app(ComboProductService::class)
            ->updateComboPriceAndStock($component->comboProduct);
    }
});
```

### Artisan Command
```bash
php artisan combo:recalculate [--combo-id=10]
```

### Scheduled Updates
```php
// In Console/Kernel.php
$schedule->command('combo:recalculate')->hourly();
```

## Testing

### Manual Testing Steps

1. **Create a combo product with components:**
   - Verify productSalePrice = sum of component prices
   - Verify productStock = minimum available combos

2. **Update component quantities:**
   - Change component quantities
   - Verify prices and stock recalculate

3. **View combo details:**
   - GET /api/v1/products/{combo_id}
   - Verify combo_details section present
   - Verify batch details loaded

4. **Component stock changes:**
   - Change a component's stock (via purchase/sale)
   - Note: Combo stock NOT automatically updated (expected)
   - Re-sync components to update

### Test Cases to Add

```php
/** @test */
public function combo_price_calculated_from_components()
{
    // Create products with stock
    // Create combo with components
    // Assert combo price = sum(component_price * quantity)
}

/** @test */
public function combo_stock_limited_by_minimum_component()
{
    // Create component A with 50 stock
    // Create component B with 20 stock (need 2 per combo)
    // Create combo
    // Assert combo stock = 10 (limited by B)
}

/** @test */
public function combo_details_includes_batch_information()
{
    // Create combo with components
    // GET /api/v1/products/{combo}
    // Assert combo_details.components[].stock_details.batches exists
}
```

## Related Files

- **Service:** `app/Services/ComboProductService.php`
- **Resource:** `app/Http/Resources/ProductResource.php`
- **Controller:** `app/Http/Controllers/Api/ProductController.php`
- **Model:** `app/Models/Product.php`
- **Model:** `app/Models/ProductComponent.php`
- **Model:** `app/Models/Stock.php`

## API Endpoints

- `POST /api/v1/products` - Create combo (auto-calculates price/stock)
- `PUT /api/v1/products/{id}` - Update combo (re-calculates price/stock if components change)
- `GET /api/v1/products/{id}` - View combo with combo_details
- `POST /api/v1/products/{id}/components` - Sync components (triggers recalculation)
- `GET /api/v1/products` - List all products (includes combo components relationship)

## Migration Notes

- No database migration required
- Uses existing products table columns
- Existing combos (if any) will have 0 price/stock until components re-synced
- **Action Required:** Re-sync components for existing combo products to populate values

---

**Implementation Status:** ✅ Complete  
**Testing Status:** ⏳ Pending
**Documentation Status:** ✅ Complete
