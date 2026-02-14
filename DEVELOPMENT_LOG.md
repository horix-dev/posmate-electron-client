
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
