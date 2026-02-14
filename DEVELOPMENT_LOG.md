
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
