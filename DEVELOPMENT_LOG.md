
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
