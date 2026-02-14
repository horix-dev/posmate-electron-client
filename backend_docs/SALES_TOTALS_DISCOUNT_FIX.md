# Sales Totals Report - Total Discount Missing

## Issue

The `/api/v1/reports/sales/totals` endpoint is returning `total_discount: 0` in the main `totals` object, even though discounts are correctly calculated in the `summary_by_type` breakdown.

### Current Backend Response
```json
{
  "totals": {
    "total_discount": 0.00,  // ❌ WRONG - Should be 100.00
    "total_sale_price": 5820.00,
    "total_cost": 4199.00,
    "total_returns": 0.00,
    "net_sales": 5820.00,
    "total_profit": 1521.00,
    "profit_margin": 26.13,
    "total_transactions": 8,
    "total_items_sold": 24
  },
  "summary_by_type": {
    "single": {
      "total_discount": 50.00,  // ✅ Correct
      ...
    },
    "variant": {
      "total_discount": 50.00,  // ✅ Correct
      ...
    }
  }
}
```

### Expected Response
```json
{
  "totals": {
    "total_discount": 100.00,  // ✅ Sum of all discounts
    ...
  }
}
```

## Root Cause

The backend controller/service is calculating discounts per product type but **NOT summing them** for the top-level `totals.total_discount` field.

## Backend Fix Required

### Location
File: Likely in `app/Http/Controllers/Reports/SalesReportController.php` or similar

### Solution 1: Sum from sale_details table
```php
// Calculate total discount from all sale details in the period
$totalDiscount = SaleDetail::whereHas('sale', function($query) use ($startDate, $endDate, $branchId) {
    $query->whereBetween('saleDate', [$startDate, $endDate]);
    if ($branchId) {
        $query->where('branch_id', $branchId);
    }
})->sum('discount_amount');

$totals['total_discount'] = $totalDiscount;
```

### Solution 2: Sum from already calculated summary_by_type
```php
// After calculating summary_by_type
$totalDiscount = 0;
foreach ($summaryByType as $type => $summary) {
    $totalDiscount += $summary['total_discount'];
}

$totals['total_discount'] = $totalDiscount;
```

### Solution 3: Direct aggregation with sales
```php
// When building the totals query
$totals = Sale::whereBetween('saleDate', [$startDate, $endDate])
    ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
    ->selectRaw('
        SUM(totalAmount) as total_sale_price,
        SUM((SELECT SUM(discount_amount) FROM sale_details WHERE sale_details.sale_id = sales.id)) as total_discount
    ')
    ->first();
```

## Verification

After the fix, test with this PowerShell command:

```powershell
$token = "YOUR_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/json"
}

$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/reports/sales/totals?period=today" -Headers $headers -Method Get

# Check totals
Write-Host "Total Discount: $($response.data.totals.total_discount)" -ForegroundColor Cyan

# Check summary by type
$singleDiscount = $response.data.summary_by_type.single.total_discount
$variantDiscount = $response.data.summary_by_type.variant.total_discount
$comboDiscount = $response.data.summary_by_type.combo.total_discount

$expectedTotal = $singleDiscount + $variantDiscount + $comboDiscount
Write-Host "Expected Total: $expectedTotal" -ForegroundColor Yellow

# Verify they match
if ($response.data.totals.total_discount -eq $expectedTotal) {
    Write-Host "✅ PASS - Totals match!" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL - Totals don't match" -ForegroundColor Red
}
```

## Database Schema Reference

The discount data should come from the `sale_details` table:

```sql
-- Check if discount_amount exists and has data
SELECT 
    COUNT(*) as total_sales,
    SUM(discount_amount) as total_discounts,
    AVG(discount_amount) as avg_discount
FROM sale_details
WHERE discount_amount > 0;
```

## Related Fields

Ensure these fields are all calculated correctly in the sales totals:
- ✅ `total_sale_price` - Working
- ✅ `total_cost` - Working  
- ❌ `total_discount` - **BROKEN - Needs fix**
- ✅ `total_returns` - Working
- ✅ `net_sales` - Working
- ✅ `total_profit` - Working

## Frontend Implementation

The frontend is correctly displaying whatever the backend returns. No frontend changes are needed. Once the backend fix is deployed, the "Total Discount" card will automatically show the correct value.

**Frontend File**: `src/pages/reports/SalesTotalsPage.tsx` (line 367-374)
```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Discount</CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-orange-600">
      {formatCurrency(data.totals.total_discount)}  {/* ← Displays backend value */}
    </div>
    <p className="text-xs text-muted-foreground">Applied to sales</p>
  </CardContent>
</Card>
```

## Priority

**HIGH** - This affects financial reporting accuracy. Users cannot see the total discount amount applied to sales in the reporting period.
