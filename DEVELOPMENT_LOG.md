
## 2026-02-18 - Enhancement: POS - Partial Loading State for Product Refresh

**Problem Description:**
After completing a sale, when products were refreshed to show updated stock, the entire POS page displayed a full-screen loader. This interrupted the cashier's workflow and made the interface feel unresponsive, even though only the product grid needed to reload.

**User Request:**
"it's load total page is it possible loader here only" - User wanted the loader to appear only on the product grid section, not block the entire page.

**Solution Implemented:**
1. **Added `isProductsLoading` state** - Destructured from usePOSData hook (was already available)
2. **Changed refetch to partial loading** - Pass `false` to `refetch()` to use `isProductsLoading` instead of `isLoading`
3. **Updated ProductGrid loading state** - Now checks both `isLoading` OR `isProductsLoading`

**Changes Made:**
```typescript
// 1. Added isProductsLoading to destructuring
const { products, categories, paymentTypes, isLoading, isProductsLoading, filteredProducts, refetch } = usePOSData(filters)

// 2. Use partial loading for refresh after sale
await refetch(false) // false = only show loader on product grid, not full page

// 3. ProductGrid shows loader during both full and partial loading
<ProductGrid isLoading={isLoading || isProductsLoading} ... />
```

**Behavior:**
- **Initial page load**: Full page loader (better UX for first load)
- **After sale completion**: Only product grid shows loader (cart sidebar, header remain accessible)
- **Automatic refresh (30s polling)**: Only product grid shows loader
- **Coming back online**: Only product grid shows loader

**User Experience Improvement:**
- ✅ Cashier can still see cart total and customer info during refresh
- ✅ No full-screen blocking - feels more responsive
- ✅ Clear visual feedback that products are updating
- ✅ Faster perceived performance

**Files Modified:**
- [src/pages/pos/POSPage.tsx](src/pages/pos/POSPage.tsx#L136): Added isProductsLoading to destructuring
- [src/pages/pos/POSPage.tsx](src/pages/pos/POSPage.tsx#L713): Changed refetch() to refetch(false)
- [src/pages/pos/POSPage.tsx](src/pages/pos/POSPage.tsx#L1152): Updated ProductGrid isLoading prop

## 2026-02-18 - Fix: POS - Product Stock Not Updating After Sale Completion

**Problem Description:**
After completing a sale successfully, products in the POS grid were still showing the old stock values. For example, "Test 201" showed "Stock: 12 (1 in cart)" before sale, but after selling all 12 units and completing the transaction, the product grid still displayed "Stock: 12" instead of "Stock: 0".

**Root Cause:**
The `handleProcessPayment` function in POSPage.tsx was not refreshing the product data after a successful sale. Products are cached locally (SQLite/IndexedDB) and only automatically refreshed:
- On page mount
- When coming back online
- Every 30 seconds via polling

This meant after a sale, the backend correctly deducted stock, but the frontend UI continued showing stale cached data until the next automatic refresh.

**Solution Implemented:**
1. **Added `refetch` to usePOSData hook destructuring** - Now included in the returned values from the hook
2. **Call refetch after successful sale** - Added `await refetch()` after `closeDialog('payment')` when online
3. **Added refetch to dependency array** - Included in `handleProcessPayment` useCallback dependencies

**Changes Made:**
```typescript
// Before: Missing refetch in destructuring
const { products, categories, paymentTypes, isLoading, filteredProducts } = usePOSData(filters)

// After: Added refetch
const { products, categories, paymentTypes, isLoading, filteredProducts, refetch } = usePOSData(filters)

// Added after clearing cart and closing payment dialog:
if (!result.isOffline) {
  try {
    await refetch()
  } catch (error) {
    console.warn('[POS] Failed to refresh products after sale:', error)
  }
}
```

**Behavior:**
- **Online sales**: Stock updates immediately after sale completion (fresh data from API)
- **Offline sales**: Stock remains cached until device comes online and syncs
- **Error handling**: Refreshing is optional - sale still succeeds even if refresh fails

**Files Modified:**
- [src/pages/pos/POSPage.tsx](src/pages/pos/POSPage.tsx#L136): Added refetch to usePOSData destructuring
- [src/pages/pos/POSPage.tsx](src/pages/pos/POSPage.tsx#L710-L716): Added refetch call after successful sale
- [src/pages/pos/POSPage.tsx](src/pages/pos/POSPage.tsx#L738): Added refetch to dependency array

## 2026-02-17 - Fix: Dashboard - Total Sales Now Shows Gross Sales (Before Discounts)

**Problem Description:**
Dashboard was showing Total Sales = Net Total (both Rs 26,830), which didn't match the Sales Totals Report flow:
- **Report**: Total Sales (27,900) → Discount (1,070) → Gross Sales (26,830) → Returns (0) → Net Sales (26,830)
- **Dashboard (Old)**: Total Sales (26,830) = Net Total (26,830) ❌

**Root Cause:**
Dashboard was using `total_sale_price` (26,830) for Total Sales instead of `gross_sales` (27,900), hiding the discount impact.

**Solution Implemented:**
Changed Total Sales to use `gross_sales` to show the complete sales flow:
- **Before**: `total_sales: salesTotals.total_sale_price` (Rs 26,830)
- **After**: `total_sales: salesTotals.gross_sales` (Rs 27,900)

**Complete Sales Flow Now Visible:**
1. **Total Sales**: Rs 27,900 ✅ (Before discounts)
2. **Total Discount**: Rs 1,070 ✅ (Discounts applied)
3. **Total Returns**: Rs 0 ✅ (Returns/refunds)
4. **Net Total**: Rs 26,830 ✅ (After discounts and returns)

**Calculation Verification:**
- Total Sales: 27,900
- Minus Discount: -1,070
- = Gross Sales: 26,830
- Minus Returns: -0
- = Net Sales: 26,830 ✅

**Files Modified:**
- [src/pages/dashboard/DashboardPage.tsx](src/pages/dashboard/DashboardPage.tsx#L490): Changed from total_sale_price to gross_sales

## 2026-02-17 - Enhancement: Dashboard - Replaced Total Income with Total Discount

**User Request:**
1. Remove "Total Income" card
2. Add "Total Discount" card before "Net Total"
3. Noted that Total Sales and Net Total showed same value (Rs 26,830.00)

**Changes Implemented:**
1. **Added total_discount and net_sales fields** to `DashboardData` interface
2. **Integrated discount and net sales data** from Sales Totals API
3. **Replaced Total Income card with Total Discount card**
4. **Reordered cards** to: Total Sales → Total Discount → Total Returns → Net Total → Total Expenses
5. **Updated Net Total** to use `net_sales` directly from API instead of calculating it

**New Dashboard Card Order:**
1. **Total Sales**: Rs 26,830 (total_sale_price) - Gross sales after discount
2. **Total Discount**: Rs 1,070 (total_discount) - Discounts applied ✨ **NEW**
3. **Total Returns**: Rs 0 (total_returns) - Returns/Refunds
4. **Net Total**: Rs 26,830 (net_sales) - Sales after returns
5. **Total Expenses**: Rs 0 (total_expense) - Business expenses

**Why Total Sales = Net Total:**
When there are no returns (Rs 0), Net Total equals Total Sales:
- Total Sales: Rs 26,830
- Returns: Rs 0
- Net Total: Rs 26,830 - Rs 0 = Rs 26,830 ✅ Correct!

When you have returns, they will show different values.

**Files Modified:**
- [src/types/api.types.ts](src/types/api.types.ts#L1123-L1140): Added total_discount and net_sales to DashboardData
- [src/pages/dashboard/DashboardPage.tsx](src/pages/dashboard/DashboardPage.tsx): 
  - Integrated discount and net_sales from API
  - Replaced Total Income with Total Discount card
  - Updated grid to lg:grid-cols-5
  - Net Total now uses net_sales from API

## 2026-02-17 - Fix: Dashboard - Aligned Total Sales with Sales Totals Report

**Problem Description:**
Dashboard and Sales Totals Report were showing different values for sales:
- **Dashboard**: Total Sales = Rs 27,900.00
- **Sales Totals Report**: Gross Sales = Rs 26,830.00

The dashboard was displaying `gross_sales` (pre-discount value) instead of `total_sale_price` (post-discount, pre-returns value), causing a mismatch with the report.

**Root Cause:**
The dashboard was using `gross_sales` (Rs 27,900) which represents total sales before any discounts. The Sales Totals Report's main "Gross Sales" figure uses `total_sale_price` (Rs 26,830) which represents sales after discounts but before returns.

**Solution Implemented:**
Changed dashboard's "Total Sales" to use `total_sale_price` instead of `gross_sales`:
- **Before**: `total_sales: salesTotals.gross_sales` (Rs 27,900)
- **After**: `total_sales: salesTotals.total_sale_price` (Rs 26,830)

**Data Alignment:**
Now Dashboard matches Sales Totals Report exactly:
- **Total Sales**: Rs 26,830 (Gross Sales after discounts, before returns)
- **Total Returns**: Rs 0.00 (Returns/refunds)
- **Net Total**: Rs 26,830 (Total Sales - Returns)

**Field Mapping:**
- `gross_sales` (27,900) = Raw sales before discounts → Not shown in dashboard
- `total_sale_price` (26,830) = Sales after discounts → **Total Sales** card ✅
- `total_returns` (0) = Returns → **Total Returns** card ✅
- `net_sales` (26,830) = Sales after returns → **Net Total** (calculated) ✅

**Files Modified:**
- [src/pages/dashboard/DashboardPage.tsx](src/pages/dashboard/DashboardPage.tsx#L489): Changed from gross_sales to total_sale_price

## 2026-02-17 - Enhancement: Dashboard - Integrated Sales Totals API for Accurate Data

**Enhancement Description:**
Integrated the Sales Totals API into the dashboard to provide more accurate and consistent sales statistics. The dashboard now uses the same data source as the Sales Totals Report, ensuring consistency across the application.

**Changes Implemented:**
1. **API Integration**: Added `reportsService.getSalesTotals()` call alongside existing dashboard API
2. **Data Mapping**: Mapped sales totals data to dashboard cards:
   - `gross_sales` → **Total Sales**
   - `total_returns` → **Total Returns** 
   - `total_profit` → **Total Profit** (used as fallback calculation basis)
3. **Parameter Handling**: Properly converts dashboard date filters to sales totals API parameters
   - Predefined periods use `period` parameter
   - Custom dates use `from_date` and `to_date` parameters

**Benefits:**
- **Accuracy**: Uses the same calculation logic as the Sales Totals Report
- **Consistency**: Same data displayed in both Dashboard and Reports
- **Reliability**: Sales totals API provides comprehensive aggregated data
- **Future-proof**: Easy to add more metrics from sales totals (discount, cost, etc.)

**Data Flow:**
```
Dashboard Date Filters → Sales Totals API → Dashboard Cards
- Total Sales: gross_sales (raw sales before adjustments)
- Total Returns: total_returns (refunded amounts)
- Net Total: Calculated as (total_sales - total_returns)
```

**Files Modified:**
- [src/pages/dashboard/DashboardPage.tsx](src/pages/dashboard/DashboardPage.tsx): 
  - Added reportsService import
  - Integrated getSalesTotals API call
  - Mapped sales totals data to dashboard state
  - Updated comments to reflect new data source

**Technical Notes:**
- Maintains backward compatibility with existing dashboard API for other metrics
- Falls back to manual profit calculation if sales totals data is unavailable
- Uses Promise.all for parallel API calls to maintain performance

## 2026-02-17 - Fix: Dashboard - Net Total Calculation Corrected

**Problem Description:**
The Dashboard was displaying the same value for both "Total Sales" and "Net Total" (Rs 27,900.00), making them appear identical. This was confusing because Net Total should reflect sales after deducting returns.

**Root Cause:**
The "Net Total" card was incorrectly displaying `total_profit` (Total Sales - Returns - Expenses) instead of Net Sales (Total Sales - Returns). When there were no returns and no expenses, both values appeared identical, but the semantic meaning was wrong.

**Solution Implemented:**
Changed the "Net Total" card calculation to properly display **Net Sales**:
- **Before**: `total_profit` (Total Sales - Returns - Expenses)
- **After**: `total_sales - total_return_amount` (Total Sales - Returns)

**Impact:**
- **Net Total** now correctly shows sales after deducting returns only (not expenses)
- **Total Profit** calculation remains unchanged (for other uses in the system)
- When returns exist, the difference between Total Sales and Net Total will be visible

**Example:**
- Total Sales: Rs 30,000.00
- Returns: Rs 2,000.00
- **Net Total (Fixed)**: Rs 28,000.00 ✅ (30,000 - 2,000)
- **Net Total (Old)**: Would show Net Profit (30,000 - 2,000 - expenses)

**Files Modified:**
- [src/pages/dashboard/DashboardPage.tsx](src/pages/dashboard/DashboardPage.tsx#L744-L750): Updated Net Total calculation to show Net Sales

## 2026-02-17 - Fix: Sales Totals Report - TypeScript Type Error and Card Reordering

**Problem Description:**
1. TypeScript error: Property 'gross_sales' does not exist on type 'SalesTotalsSummary'
2. Total Discount card needed to be positioned right after Total Sales card

**Root Cause:**
The `SalesTotalsSummary` interface in api.types.ts was missing the `gross_sales` property, even though the backend API returns this field.

**Solution Implemented:**
1. **Type Fix**: Added `gross_sales: number` property to `SalesTotalsSummary` interface
2. **Card Reordering**: Moved Total Discount card to position 2 (right after Total Sales)

**New Card Order:**
1. **Total Sales**: Rs 14,500 (gross_sales) - Before adjustments
2. **Total Discount**: Rs 820 (total_discount) - Applied to sales ✨ **MOVED HERE**
3. **Gross Sales**: Rs 13,680 (total_sale_price) - After processing
4. **Returns**: Rs 1,150 (total_returns)  
5. **Net Sales**: Rs 12,530 (net_sales)
6. **Total Cost**: Rs 10,036 (total_cost)
7. **Total Profit**: Rs 2,494 (total_profit)
8. **Items Sold**: 28 (total_items_sold)

**Files Modified:**
- [src/types/api.types.ts](src/types/api.types.ts#L135-L145): Added gross_sales property to SalesTotalsSummary interface
- [src/pages/reports/SalesTotalsPage.tsx](src/pages/reports/SalesTotalsPage.tsx): Reordered cards to show Total Discount after Total Sales

## 2026-02-17 - Enhancement: Sales Totals Report - Added Total Sales Card

**Enhancement Description:**
Added a new "Total Sales" card to the Sales Totals Report to display the `gross_sales` value (Rs 14,500) from the API response. This provides users with visibility into total sales before any adjustments.

**Changes Made:**
- **New Card Added**: "Total Sales" card displaying `data.totals.gross_sales` (Rs 14,500)
- **Grid Layout Updated**: Changed from `xl:grid-cols-7` to `xl:grid-cols-8` to accommodate the new card
- **Visual Design**: Used purple color (`text-purple-600`) with "Before adjustments" description
- **Card Position**: Placed between "Total Profit" and "Items Sold" cards
- **Responsive**: Maintains same responsive behavior as other cards

**Complete Sales Summary Now Shows:**
1. **Gross Sales**: Rs 13,680 (total_sale_price) - Sales after certain processing
2. **Returns**: Rs 1,150 (total_returns) - Refunded to customers  
3. **Net Sales**: Rs 12,530 (net_sales) - Sales after returns
4. **Total Cost**: Rs 10,036 (total_cost) - Cost of goods sold
5. **Total Discount**: Rs 820 (total_discount) - Discounts applied
6. **Total Profit**: Rs 2,494 (total_profit) - Profit earned
7. **Total Sales**: Rs 14,500 (gross_sales) - ✨ NEW: Total sales before adjustments
8. **Items Sold**: 28 (total_items_sold) - Quantity of items

**Files Modified:**
- [src/pages/reports/SalesTotalsPage.tsx](src/pages/reports/SalesTotalsPage.tsx): Added Total Sales card and updated grid layout

## 2026-02-17 - Enhancement: Sales Totals Report - Responsive UI and Correct Value Display

**Problem Description:**
1. The Sales Totals Report needed to display 13,680 (total_sale_price) instead of 14,500 (gross_sales) for the Gross Sales card
2. The UI was not responsive and looked cramped on mobile devices
3. The interface needed better mobile optimization

**Solution Implemented:**
**Value Mapping:**
- Changed Gross Sales card to display `total_sale_price` (Rs 13,680) instead of `gross_sales`

**Responsive Design Improvements:**
- **Summary Cards**: Improved grid layout from `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7` to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7`
- **Typography**: Responsive text sizing (`text-lg sm:text-xl md:text-2xl` for card values, `text-xs sm:text-sm` for titles)
- **Icons**: Responsive icon sizing (`h-3 w-3 sm:h-4 sm:w-4`)
- **Spacing**: Reduced gaps on mobile (`gap-3`)
- **Hover Effects**: Added hover shadows for better UX
- **Header Section**: 
  - Stacks vertically on mobile with proper spacing
  - Responsive button text (abbreviated on mobile)
  - Better padding (`p-3 sm:p-4 md:p-6`)
- **Filter Section**:
  - Responsive grid layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
  - Smaller form controls on mobile (`h-8 sm:h-10`)
  - Responsive labels and inputs

**Files Modified:**
- [src/pages/reports/SalesTotalsPage.tsx](src/pages/reports/SalesTotalsPage.tsx): Complete responsive redesign and value correction

**Responsive Breakpoints:**
- Mobile (< 640px): Single column layout, smaller text/icons
- Small (≥ 640px): Two columns, medium text/icons  
- Medium (≥ 768px): Three columns for cards
- Large (≥ 1024px): Four columns for cards, full filter layout
- XL (≥ 1280px): Seven columns for all summary cards

## 2026-02-17 - Fix: Sales Totals Report - Correct Gross Sales Value Display

**Problem Description:**
The Sales Totals Report was displaying incorrect value for Gross Sales. The UI was showing Rs 13,680.00 but the API response contained `gross_sales: 14500`. The frontend was incorrectly mapping the `total_sale_price` field (13,680) instead of the `gross_sales` field (14,500) for the Gross Sales card.

**Root Cause:**
Frontend mapping error in the [SalesTotalsPage.tsx](src/pages/reports/SalesTotalsPage.tsx) component. The Gross Sales card was using `data.totals.total_sale_price` instead of `data.totals.gross_sales`.

**Solution Implemented:**
Updated the Gross Sales card to display the correct field from the API response:
- **Before**: `data.totals.total_sale_price` (Rs 13,680.00)
- **After**: `data.totals.gross_sales` (Rs 14,500.00)

**Files Modified:**
- [src/pages/reports/SalesTotalsPage.tsx](src/pages/reports/SalesTotalsPage.tsx#L327-L333): Fixed Gross Sales card to use correct API field

**API Field Mapping:**
- `gross_sales`: Total sales before any deductions → **Gross Sales card**
- `total_sale_price`: Sales after certain adjustments → (currently unused in UI)
- `net_sales`: Sales after returns → **Net Sales card**

## 2026-02-17 - Fix: Batch Price Updates Not Persisting During Product Edits

**Problem Description:**
When editing products with batch tracking enabled, updates to Purchase Price, Sale Price, Wholesale Price, and Dealer Price fields were not being saved. The UI would accept the changes, but they wouldn't persist to the backend.

**Root Cause:**
Frontend issue in the `formDataToFormData` function. When editing a product (`isEdit=true`), the entire batch data section was being excluded from the API request. This was originally designed to prevent stock updates during product edits, but it incorrectly excluded all batch data, including price fields which should be updatable.

**Solution Implemented:**
Modified the `formDataToFormData` function to:
- **Always include** batch price data (Purchase Price, Sale Price, Wholesale Price, Dealer Price) and date fields for both create and edit operations
- **Only exclude** stock data (`productStock`) during edit operations (since stock is managed separately)
- **Preserve existing logic** for simple products (non-batch)

**Files Modified:**
- [src/pages/products/schemas/product.schema.ts](src/pages/products/schemas/product.schema.ts#L406-L442): Updated batch data handling in `formDataToFormData` function

**Technical Details:**
- Previously: All batch data excluded when `isEdit=true`
- Now: Only stock data excluded when `isEdit=true`, prices and dates always included
- This maintains the separation of stock management while allowing price updates during product edits

## 2026-02-17 - Fix: Variant Product Update - Remove Stock Validation for Edits

**Problem Description:**
When updating existing variant products, the system was showing the error "All variants must have stock > 0, cost price > 0, and sale price > 0". This validation was inappropriate for edit operations since:
- Stock levels should not be required when just updating product information
- Stock levels are managed separately from product edits
- Only price validations should apply during product updates

**Solution Implemented:**
Modified the variant validation logic in the `handleSubmit` function to:
- **Edit Mode**: Only validate that cost price > 0 and sale price > 0 (skip stock validation)
- **Create Mode**: Validate stock > 0, cost price > 0, and sale price > 0 (original behavior)

**Files Modified:**
- [src/pages/products/ProductFormPage.tsx](src/pages/products/ProductFormPage.tsx#L394-L409): Updated variant validation logic to conditionally check stock based on edit/create mode

**Technical Details:**
- Added conditional stock validation using `isEditMode` flag
- Separated price validation (always required) from stock validation (create mode only)
- Updated error messages to reflect different requirements for edit vs create

## 2026-02-14 - Issue: Sales Totals Report - Backend Total Discount Calculation

**Issue Identified:**
The Sales Totals Report is displaying `total_discount: 0` in the main summary card, even though individual product type discounts are calculated correctly.

**Observed Behavior:**
- Main "Total Discount" card shows: Rs 0.00 ❌
- Single Products discount shows: Rs 50.00 ✅
- Variant Products discount shows: Rs 50.00 ✅
- Expected total should be: Rs 100.00

**Root Cause:**
Backend API endpoint `/api/v1/reports/sales/totals` is not calculating or summing the `total_discount` field in the main `totals` object. The field exists and is being returned, but the value is 0.

**Backend Fix Required:**
The Laravel backend needs to sum all `discount_amount` values from the `sale_details` table for the selected period and include it in `totals.total_discount`.

**Documentation Created:**
- Created `backend_docs/SALES_TOTALS_DISCOUNT_FIX.md` with detailed fix instructions
- Includes 3 solution approaches with SQL/PHP examples
- Includes verification test script

**Files Modified:**
- backend_docs/SALES_TOTALS_DISCOUNT_FIX.md (created)

**Status:** 
⚠️ **BLOCKED** - Requires Laravel backend fix before frontend can display correct values

**Frontend Status:**
✅ Frontend is correctly implemented and will automatically display the correct value once backend is fixed

## 2026-02-14 - Fix: Sales Totals Report - TypeScript Type Inference

**Fix:**
Resolved TypeScript compilation errors related to type inference in the Sales Totals Report.

**Changes:**
1. **Hook Updates:**
   - Updated offline fallback data structure to include `total_discount`, `total_returns`, and `net_sales`
   - Ensured fallback data matches updated `SalesTotalsSummary` interface

2. **Component Type Annotations:**
   - Added explicit type imports: `SalesTotalsData`, `SalesTotalsByType`, `SalesTotalsProduct`
   - Added explicit type annotation to hook return value
   - Added type annotations to map callbacks for `summary_by_type` and `products`

3. **Fixed Type Errors:**
   - Property access errors on `data.totals`, `data.products`, `data.summary_by_type`
   - Implicit 'any' type errors on map callback parameters
   - Type inference issues with 'unknown' summary type

**Files Modified:**
- src/pages/reports/hooks/useSalesTotalsReport.ts (updated offline fallback)
- src/pages/reports/SalesTotalsPage.tsx (added explicit type annotations)

**Technical Notes:**
- TypeScript strict mode requires explicit typing when inference is ambiguous
- Map callbacks now properly typed as `[string, SalesTotalsByType]` and `(product: SalesTotalsProduct, index: number)`
- All 27 previous TypeScript errors resolved

## 2026-02-14 - Enhancement: Sales Totals Report - Returns Tracking

**Enhancement:**
Added comprehensive returns tracking to the Sales Totals Report to show returned items and their impact on net sales and profit.

**Changes:**
1. **Type Definitions:**
   - Added `total_returns` to `SalesTotalsProduct` interface
   - Added `total_returns` and `net_sales` to `SalesTotalsSummary` interface
   - Added `total_returns` to `SalesTotalsByType` interface

2. **Summary Cards (7 cards total):**
   - **Gross Sales**: Shows `total_sale_price` (original sales amount) in blue
   - **Returns**: Shows `total_returns` (refunded amounts) in red with Undo2 icon
   - **Net Sales**: Shows `net_sales` (gross - returns) in green
   - **Total Cost**: Shows `total_cost` (unchanged)
   - **Total Discount**: Shows `total_discount` (unchanged, orange)
   - **Total Profit**: Shows `total_profit` (now based on net_sales - cost) with dynamic color (green if positive, red if negative)
   - **Items Sold**: Shows `total_items_sold` (unchanged)

3. **Product Table:**
   - Added "Returns" column between "Sale Price" and "Profit"
   - Shows per-product return amounts in red color
   - Updated "Profit" column to use dynamic coloring (green/red)

4. **Summary by Type:**
   - Added "Returns" row between "Discount" and "Profit"
   - Shows return amounts for Single, Variant, and Combo products
   - Displayed in red color for visual consistency

**Calculations:**
- `net_sales = total_sale_price - total_returns`
- `total_profit = net_sales - total_cost`
- `profit_margin` calculated based on `net_sales`

**Visual Layout:**
- Responsive grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7`
- Cards reorganized to show calculation flow: Gross → Returns → Net → Cost → Discount → Profit → Items
- Returns displayed in red to indicate refunded money
- Profit uses conditional coloring (green for positive, red for negative)

**Files Modified:**
- src/types/api.types.ts (added total_returns and net_sales fields)
- src/pages/reports/SalesTotalsPage.tsx (UI updates, added Undo2 icon)

**Technical Notes:**
- Returns shown in red (#DC2626) to indicate money leaving the business
- Net Sales provides clearer picture of actual revenue after returns
- Profit calculation now accurately reflects impact of returns
- All amounts formatted with currency helper

## 2026-02-14 - Enhancement: Sales Totals Report - Discount Display

**Enhancement:**
Added discount amount display to the Sales Totals Report across all sections.

**Changes:**
1. **Type Definitions:**
   - Added `total_discount` to `SalesTotalsProduct` interface
   - Added `total_discount` to `SalesTotalsSummary` interface
   - Added `total_discount` to `SalesTotalsByType` interface

2. **UI Enhancements:**
   - Added new "Total Discount" summary card (5th card)
   - Displays total discount amount with orange color (#FFA500)
   - Shows "Applied to sales" as subtitle

3. **Product Table:**
   - Added "Discount" column between "Cost" and "Sale Price"
   - Shows per-product discount amount in orange color
   - Helps understand discount impact per product

4. **Summary by Type:**
   - Added discount row to each product type summary
   - Shows discount amount for Single, Variant, and Combo products
   - Displayed in orange color for visual consistency

**Visual Layout:**
- Summary cards changed from 4-column to 5-column grid
- Order: Sale Price → Cost → Discount → Profit → Items Sold

**Files Modified:**
- src/types/api.types.ts (added total_discount fields)
- src/pages/reports/SalesTotalsPage.tsx (UI updates)

**Technical Notes:**
- Discount shown in orange (#FFA500) to differentiate from profit (green) and cost (default)
- All discount amounts formatted with currency helper
- Responsive grid layout adjusts across breakpoints

## 2026-02-14 - Feature: Sales Totals Export (Excel & CSV)

**Feature:**
Added Excel and CSV export functionality to the Sales Totals Report with full filter support.

**Implementation:**
1. **Export Buttons:**
   - Added "Export Excel" and "Export CSV" buttons in the report header
   - Buttons are disabled when exporting, loading, or no data available
   - Shows "Exporting..." state during download

2. **Export Handler:**
   - Fetches data from backend export endpoints
   - Supports all report filters (period, custom dates, branch, party, payment type)
   - Automatically downloads file with timestamped filename
   - Shows success/error toast notifications

3. **API Integration:**
   - Excel endpoint: `/api/v1/reports/sales/totals/export-excel`
   - CSV endpoint: `/api/v1/reports/sales/totals/export-csv`
   - Uses Bearer token authentication from auth store
   - Handles Content-Disposition filename from backend

4. **User Experience:**
   - Export buttons positioned next to offline mode badge
   - Disabled state shown with proper visual feedback
   - Loading state prevents multiple simultaneous exports
   - Success confirmation via toast message

**Files Modified:**
- src/pages/reports/SalesTotalsPage.tsx

**Technical Details:**
- Uses fetch API for file download
- Creates blob URL for browser download
- Cleans up blob URL after download
- Respects current filter state when exporting
- Handles authentication token from Zustand store

## 2026-02-14 - Enhancement: Sales Totals Report Navigation & Debugging

**Enhancement:**
Added navigation helper and debugging to improve Sales Totals Report discoverability and troubleshooting.

**Changes:**
1. **Navigation Banner:**
   - Added prominent info banner on the main Reports page
   - Guides users to the Sales Totals Report with clear call-to-action button
   - Explains that cost, sale price, and profit analysis are available in Sales Totals

2. **Debug Logging:**
   - Added console logging to SalesTotalsPage for troubleshooting
   - Logs data, total_cost, total_sale_price, and total_profit when data loads
   - Helps identify API response issues

3. **Documentation:**
   - Created SALES_TOTALS_GUIDE.md with step-by-step access instructions
   - Includes debugging steps and common issues troubleshooting

**Files Modified:**
- src/pages/reports/ReportsPage.tsx (added navigation banner)
- src/pages/reports/SalesTotalsPage.tsx (added debug logging)

**Files Created:**
- SALES_TOTALS_GUIDE.md (user guide)

## 2026-02-14 - Feature: Sales Totals Report

**Feature:**
Added a comprehensive Sales Totals Report under the Reports section in the sidebar, providing detailed breakdown of sales by product with cost, profit, and margins.

**Implementation:**
1. **API Integration:**
   - Added SalesTotalsData, SalesTotalsProduct, SalesTotalsSummary, and SalesTotalsByType type definitions to api.types.ts
   - Added SALES_TOTALS endpoint to API_ENDPOINTS.REPORTS
   - Created getSalesTotals service method in reports.service.ts

2. **Data Layer:**
   - Created useSalesTotalsReport hook with offline support and caching (15-minute TTL)
   - Follows existing pattern with online/offline fallback behavior

3. **UI Components:**
   - Created SalesTotalsPage with comprehensive report view
   - Features include:
     * Summary cards showing total sale price, cost, profit, and items sold
     * Profit margin percentage display
     * Summary breakdown by product type (single, variant, combo)
     * Detailed product table with batch/lot tracking information
     * Filter options: predefined periods or custom date ranges
     * Offline mode indicator

4. **Routing and Navigation:**
   - Added /reports/sales-totals route with lazy loading
   - Updated sidebar Reports section to include submenu with:
     * All Reports (existing reports page)
     * Sales Totals (new report)
   - Reports section now expands to show children

**Files Created:**
- src/pages/reports/SalesTotalsPage.tsx
- src/pages/reports/hooks/useSalesTotalsReport.ts

**Files Modified:**
- src/types/api.types.ts
- src/api/endpoints.ts
- src/api/services/reports.service.ts
- src/routes/index.tsx
- src/components/layout/Sidebar.tsx

## 2026-02-14 - Fix: Prevent scan-triggered payment popup

**Problem:**
Barcode scanners sometimes sent a trailing space, which triggered the payment popup because the POS shortcut for pay is mapped to the spacebar.

**Solution:**
1.  **Scanner Key Suppression:**
    *   Updated the barcode scanner hook to stop propagation for rapid scanner keystrokes after the first character, preventing POS shortcuts from firing during scans.

**Files Modified:**
- src/pages/pos/hooks/useBarcodeScanner.ts

## 2026-02-14 - Change: Stop barcode scans filling search

**Problem:**
Barcode scans were being typed into the POS search input, disrupting manual product searches.

**Solution:**
1.  **Search Input Behavior:**
    *   Removed the barcode-scan allowance and auto-focus from the POS search field so scans no longer populate the search query.

**Files Modified:**
- src/pages/pos/components/ProductGrid.tsx

## 2026-02-14 - Fix: Merge identical cart items

**Problem:**
Scanning the same product repeatedly created duplicate line items instead of incrementing quantity.

**Solution:**
1.  **Cart Merge Logic:**
    *   Updated cart item matching to use stable keys (variant id or stock id) rather than the timestamp-based cart item id.

**Files Modified:**
- src/stores/cart.store.ts

## 2024-07-26 - Fix: Combo Product Edit Form

**Problem:**
When editing a combo product, the list of component products was empty. This was because the frontend was not correctly interpreting the data structure returned by the backend API. The API provides combo components in a nested combo_components array, while the form expected a flat combo_products array.

**Solution:**
1.  **Updated Type Definitions:**
    *   Modified src/types/api.types.ts to include the ComboComponent interface and add the combo_components?: ComboComponent[] field to the Product interface, accurately reflecting the backend response.

2.  **Corrected Data Transformation:**
    *   Updated the productToFormData function in src/pages/products/schemas/product.schema.ts.
    *   The function now maps data from the product.combo_components array to the form's combo_products field.
    *   It correctly extracts nested details like productName, quantity, prices, and stock levels from the component_product and its associated stocks array.

3.  **Resolved Type Conflicts:**
    *   Fixed TypeScript errors in ProductFormPage.tsx and product.schema.ts that arose from mismatches between the API data type and the form's expected data type. Made the productName property optional in the form schema to align with the API type.

**Files Modified:**
- src/pages/products/schemas/product.schema.ts
- src/types/api.types.ts
