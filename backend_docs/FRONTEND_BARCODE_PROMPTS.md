# Print Labels / Barcode Generator - Frontend Implementation Prompts

## Overview
Build a **Print Labels** section within the Product Settings page. This feature allows users to generate and print barcodes for products with customizable labels. The implementation should work with any modern frontend framework (React, Vue, Angular, etc.) or vanilla JavaScript.

---

## Page Structure & Layout

### Main Container
- **Page Title:** "Print Labels" or "Barcode Generator"
- **Location:** Product Settings → Print Labels section
- **Layout:** Single-column form with collapsible/tabbed sections

### Section 1: Product Selection
**Purpose:** Allow users to search and select products for barcode generation

**UI Components Needed:**
- Search Input field (with real-time autocomplete)
- Search Results Dropdown list
- Selected Products Table/List with columns:
  - Product Name
  - Product Code
  - Unit Price
  - Available Stock
  - Quantity to Print (editable input)
  - Batch Number (dropdown, optional)
  - Packing Date (date picker, optional)
  - Remove Action button

**Functionality:**
1. User types product name/code in search box
2. On input change, call API: `GET /api/v1/barcodes/search-products?search=value&per_page=10`
3. Display results in dropdown
4. When product clicked, show product details (stock info, batches)
5. Let user enter quantity and optional batch/date
6. Add to selected products table
7. Allow removing products from table

---

### Section 2: Label Configuration
**Purpose:** Configure what information appears on each barcode label

**UI Components Needed:**
- Multiple toggle switches for:
  - Show Business Name (+ text input for business name + font size slider)
  - Show Product Name (+ font size slider)
  - Show Product Price (+ font size slider)
  - Show Product Code (+ font size slider)
  - Show Packing Date (+ font size slider)
- Radio buttons for Tax Calculation:
  - Exclusive Tax
  - Inclusive Tax
- Each section should have min/max font size (8-32px)

**Functionality:**
1. When toggle is ON, show additional controls (business name input, size slider)
2. When toggle is OFF, disable/hide controls
3. Display real-time preview of label layout
4. Font sizes should have visual preview (sample text showing selected size)

---

### Section 3: Barcode Settings
**Purpose:** Configure barcode type and paper format

**UI Components Needed:**
- Dropdown for Barcode Type:
  - Code 128
  - Code 39
  - EAN 13
  - EAN 8
  - UPC-A
- Radio buttons for Paper Setting:
  - Roll Label 38mm x 25mm (1.5" x 1")
  - Roll Label 50mm x 25mm (2" x 1")
  - Sheet Label A4 (28 labels per sheet)

**Functionality:**
1. Load options from API: `GET /api/v1/barcodes/settings`
2. Display with descriptions and dimensions
3. Selected value affects preview layout

---

### Section 4: Preview Section
**Purpose:** Show live preview of how barcodes will look

**UI Components Needed:**
- Preview Toggle Button (Show/Hide)
- Preview Container with scrollable area
- Multiple barcode previews (side-by-side or stacked)
- Each preview card shows:
  - Business Name (if enabled)
  - Product Name (if enabled)
  - Barcode SVG/Image
  - Product Code (if enabled)
  - Product Price (if enabled)
  - Packing Date (if enabled)
- Total count indicator (e.g., "5 barcodes to print")

**Functionality:**
1. Call API: `POST /api/v1/barcodes/preview` with current configuration
2. Receive barcode data with SVG content
3. Render each barcode with proper styling based on font sizes and settings
4. Apply CSS classes based on paper_setting to show correct dimensions
5. Update preview when any configuration changes

---

### Section 5: Action Buttons
**Purpose:** Control flow and trigger printing

**UI Components Needed:**
- "Preview" Button (primary/secondary style)
- "Generate & Print" Button (primary style)
- "Clear Selection" Button (secondary style)
- Confirmation dialog before print

**Functionality:**
1. Preview Button: Call preview API and show Section 4
2. Generate & Print: Call generate API and trigger print dialog
3. Clear: Empty all selections and reset form
4. Disable buttons when no products selected

---

## API Integration Details

### Step 1: Load Settings (On Page Load)
```
API Call: GET /api/v1/barcodes/settings
When: Page initialization
Store: Global state/context (barcode types, paper settings, font sizes, vat options)
Display: Populate dropdowns and radio buttons
```

### Step 2: Product Search (Real-time)
```
API Call: GET /api/v1/barcodes/search-products?search={query}&per_page=10
When: User types in search box (with debounce of 300-500ms)
Headers: Authorization: Bearer {token}
Response: Paginated list of products
Display: In dropdown, show product name, code, price
Action: On click → call Step 3
```

### Step 3: Get Product Details
```
API Call: GET /api/v1/barcodes/product-details/{productId}
When: Product selected from search results
Headers: Authorization: Bearer {token}
Response: Product info, stocks, batch numbers, available quantity
Display: In product row, show available stock and populate batch dropdown
```

### Step 4: Generate Preview
```
API Call: POST /api/v1/barcodes/preview
When: User clicks "Preview" button or changes any setting
Headers: Authorization: Bearer {token}, Content-Type: application/json
Request Body:
{
  items: [
    {
      product_id: number,
      quantity: number,
      batch_id: number or null,
      packing_date: string (YYYY-MM-DD) or null
    }
  ],
  barcode_type: "C128",
  barcode_setting: "1|2|3",
  show_business_name: boolean,
  business_name: string,
  business_name_size: number,
  show_product_name: boolean,
  product_name_size: number,
  show_product_price: boolean,
  product_price_size: number,
  show_product_code: boolean,
  product_code_size: number,
  show_pack_date: boolean,
  pack_date_size: number,
  vat_type: "inclusive|exclusive"
}
Response: Array of barcode objects with SVG content
Display: Render in preview area
```

### Step 5: Generate for Print
```
API Call: POST /api/v1/barcodes/generate
When: User clicks "Generate & Print" button
Headers: Same as preview
Request Body: Same as preview
Response: Same as preview
Action: Trigger window.print() after successful response
```

---

## State Management

**Required State Variables:**
```
- selectedProducts: Array<{product_id, quantity, batch_id, packing_date}>
- showBusinessName: boolean
- businessName: string
- businessNameSize: number (8-32)
- showProductName: boolean
- productNameSize: number (8-32)
- showProductPrice: boolean
- productPriceSize: number (8-32)
- showProductCode: boolean
- productCodeSize: number (8-32)
- showPackDate: boolean
- packDateSize: number (8-32)
- barcodeType: string (C128|C39|EAN13|EAN8|UPCA)
- barcodeSetting: string (1|2|3)
- vatType: string (inclusive|exclusive)
- previewBarcodes: Array<barcode object>
- isLoading: boolean
- error: string or null
- settings: {barcode_types, paper_settings, font_sizes, vat_options}
```

---

## Styling & Design Requirements

### Color Scheme
- Primary buttons: Use theme primary color
- Secondary buttons: Use theme secondary color
- Danger actions (remove): Use theme danger/red color
- Success feedback: Green for successful actions

### Typography
- Section Headers: Large, bold (h3 equivalent)
- Labels: Medium weight, readable
- Values in table: Regular weight
- Helper text: Smaller, gray color

### Spacing
- Sections separated by adequate margin (20-30px)
- Form inputs with consistent padding
- Table rows with clear borders and hover effects
- Preview cards with shadow or border

### Responsive Design
- Desktop: Full layout with side-by-side elements where possible
- Tablet: Stack elements vertically
- Mobile: Single column, simplified preview
- Table should be horizontally scrollable on mobile

### Form Validation
- Highlight required fields
- Show validation errors inline
- Disable submit button if form invalid
- Show success message after successful generation

---

## Error Handling

**Scenarios to Handle:**
1. Search API fails: Show "Unable to load products" message
2. No products found: Display "No products found" message
3. Product details load fails: Show error toast/alert
4. Preview API fails: Show "Unable to generate preview" error
5. Generate API fails: Show error and suggest retry
6. Validation errors: Highlight invalid fields

**Error Display:**
- Toast notifications for temporary errors
- Inline error messages for form validation
- Alert dialogs for critical errors

---

## User Experience Flow

### Happy Path:
1. User clicks "Print Labels" section
2. Page loads with search box visible
3. User types product name → sees dropdown results
4. Clicks product → adds to selected products table
5. User adjusts quantity, batch, packing date
6. Toggles label display options (business name, price, etc.)
7. Selects barcode type and paper size
8. Clicks "Preview" → sees all barcodes
9. Clicks "Generate & Print" → print dialog opens
10. User prints

### Alternative Path:
1. User selects multiple products
2. Adjusts all settings
3. Clicks "Preview" multiple times with different settings
4. Regenerates preview after changing settings
5. Finally clicks print

### Error Path:
1. Search returns no results
2. User sees helpful message
3. Tries different search term
4. Continues normal flow

---

## Performance Considerations

- Debounce search input (300-500ms) to reduce API calls
- Lazy load preview (don't auto-generate, wait for button click)
- Virtualize preview list if showing 100+ barcodes
- Cache barcode settings in localStorage if unchanged
- Show loading spinner during API calls
- Implement request cancellation for previous search queries

---

## Accessibility

- All form inputs labeled with associated labels
- Keyboard navigation through form fields
- Screen reader announcements for search results
- ARIA labels for toggles and checkboxes
- Sufficient color contrast for all text
- Font size options make labels readable
- Tab order makes sense and follows visual layout

---

## Testing Checklist

- [✓] Search returns correct products
- [✓] Multiple products can be added
- [✓] Products can be removed from selection
- [✓] Toggle switches enable/disable related controls
- [✓] Font size sliders work (8-32 range)
- [✓] Batch dropdown populates for product
- [✓] Packing date picker works
- [✓] Preview generates correct SVG barcodes
- [✓] Preview updates when settings change
- [✓] Print dialog opens on "Generate & Print"
- [✓] Form validation prevents submission with no products
- [✓] Error messages display on API failures
- [✓] Responsive on mobile/tablet/desktop
- [✓] Token is included in all API calls
- [✓] Loading states show during API requests

---

## Optional Enhancements

1. **Saved Templates:** Allow users to save/load label configurations
2. **Batch Operations:** Bulk add products from category
3. **Export Options:** Export as PDF instead of just printing
4. **History:** Track recent barcode generations
5. **Custom Sizing:** Allow custom font sizes and label dimensions
6. **Barcode Validation:** Validate barcode format before generation
7. **Quantity Presets:** Quick buttons for common quantities (10, 50, 100)
8. **Product Filters:** Filter search results by category/brand

---

## Code Structure Recommendation

```
/src
  /components
    /PrintLabels (main component)
    /ProductSearch
    /SelectedProductsTable
    /LabelConfiguration
    /BarcodeSettings
    /BarcodePreview
    /ActionButtons
  /hooks
    /useBarcodeAPI
    /useBarcodeSettings
    /useProductSearch
  /utils
    /api.js (barcode API calls)
    /validators.js
    /formatters.js
  /context
    /BarcodeContext.js (state management)
  /styles
    /PrintLabels.css
    /responsive.css
```

This comprehensive structure allows for modular development and easy maintenance across different parts of the barcode generator feature.
