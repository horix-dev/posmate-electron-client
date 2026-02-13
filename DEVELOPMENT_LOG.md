
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
