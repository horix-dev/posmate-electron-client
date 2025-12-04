# Horix POS Pro - Development Log

> This document tracks development progress, architectural decisions, and implementation details for future reference.

---

## Project Overview

**Project**: Horix POS Pro - Desktop POS Client  
**Stack**: Electron 30+ | React 18 | TypeScript 5 | Vite | Tailwind CSS | shadcn/ui  
**Backend**: Laravel API (external)  
**Offline Storage**: SQLite (better-sqlite3) in Electron, IndexedDB fallback in browser  
**State Management**: Zustand  

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Feature Implementation Log](#feature-implementation-log)
3. [Offline Support System](#offline-support-system)
4. [Best Practices Applied](#best-practices-applied)
5. [Known Issues & Solutions](#known-issues--solutions)
6. [Testing](#testing)
7. [Build & Deployment](#build--deployment)

---

## Architecture Overview

### Directory Structure

```
src/
├── api/                    # API layer
│   ├── axios.ts           # Axios instance with interceptors
│   └── services/          # Service classes for each resource
├── components/
│   ├── common/            # Shared components (OfflineBanner, SyncStatusIndicator)
│   ├── layout/            # AppShell, Sidebar, Header
│   └── ui/                # shadcn/ui components
├── hooks/                 # Global custom hooks
│   ├── useOnlineStatus.ts # Online/offline detection hook
│   └── useSyncQueue.ts    # Sync queue management hook
├── lib/
│   ├── cache/             # Cache utilities with TTL & versioning
│   ├── db/                # IndexedDB (Dexie) schema, repositories, services
│   ├── errors/            # Typed error classes
│   └── utils.ts           # Utility functions (cn, formatters)
├── pages/                 # Feature-based page modules
│   ├── pos/               # POS page with hooks & components
│   ├── products/          # Products management
│   ├── sales/             # Sales history
│   └── ...
├── routes/                # React Router configuration
├── stores/                # Zustand stores
│   ├── auth.store.ts      # Authentication state
│   ├── cart.store.ts      # POS cart state (persisted)
│   ├── sync.store.ts      # Sync queue state
│   └── ui.store.ts        # UI preferences
├── types/                 # TypeScript type definitions
└── App.tsx               # Root component
```

### Key Patterns

1. **Feature-based modules**: Each page has its own `hooks/` and `components/` folders
2. **Repository pattern**: IndexedDB access through repository classes
3. **Service layer**: API calls abstracted into service classes
4. **Custom hooks**: Business logic encapsulated in hooks, not components

---

## Feature Implementation Log

### [Current Date - Update with today's date]

#### Variable Products - Single API Request Implementation (Complete)

**Problem**: The previous implementation of variable products required two API calls - first to create the product, then a separate call to generate variants. The backend API was updated to support creating/updating products with variants in a single request.

**New API Format**: Variable products now accept variants in the same request body:
```json
{
  "productName": "T-Shirt",
  "product_type": "variable",
  "variants": [{
    "sku": "TSHIRT-S-RED",
    "enabled": 1,
    "cost_price": 300,
    "price": 599,
    "attribute_value_ids": [1, 5]
  }]
}
```

**Solution**: 
1. Updated `VariantManager.tsx` to manage variants locally (no API calls during variant selection)
2. Variants are generated from selected attribute values using cartesian product
3. When saving, variants are included in the product payload for variable products
4. Simple products continue to use FormData (multipart/form-data)
5. Variable products use JSON body (application/json)

**Files Modified**:
- `src/types/variant.types.ts` - Added `VariantInput` interface with `attribute_value_ids`
- `src/pages/products/schemas/product.schema.ts` - Added `variantInputSchema`, `VariableProductPayload` type, `formDataToVariableProductPayload()` function
- `src/pages/products/schemas/index.ts` - Export new types and functions
- `src/api/services/products.service.ts` - Updated `create()` and `update()` to accept `isVariable` parameter, send JSON for variable products
- `src/pages/products/components/VariantManager.tsx` - Complete rewrite for local variant management with attribute selection
- `src/pages/products/components/ProductFormDialog.tsx` - Updated to manage variants state, pass to `VariantManager`, include in submission
- `src/pages/products/hooks/useProducts.ts` - Updated `createProduct()` and `updateProduct()` signatures to accept `isVariable` parameter
- `src/pages/products/ProductsPage.tsx` - Updated form submit handler to pass `isVariable` flag

**Key Changes**:

1. **VariantManager Component** (new implementation):
   - Accepts `variants` and `onVariantsChange` props for controlled state
   - `generateCombinations()` creates variants from selected attribute values (cartesian product)
   - Inline editing for SKU, cost price, sale price per variant
   - Auto-generates SKU from product code and attribute values

2. **Product Service**:
   ```typescript
   create(data, isVariable = false) {
     if (isVariable) {
       // Send JSON with variants array
       return api.post(url, data, { headers: { 'Content-Type': 'application/json' } })
     }
     // Send FormData for simple products
     return api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
   }
   ```

3. **Form Dialog**:
   - Manages `variants: VariantInputData[]` state
   - Validates that variable products have at least one variant
   - Calls appropriate payload converter based on product type

**Testing Notes**:
- Create simple product: Should use FormData, work as before
- Create variable product: Should include variants in JSON body
- Edit variable product: Should load existing variants and allow modification
- Verify variants are created with correct `attribute_value_ids`

---

### November 28, 2025

#### Offline Support - Storage Layer Fix (Complete)

**Problem**: Products showed "Out of Stock" (0 quantity) when offline, even though they had stock when online.

**Root Cause**: The app uses SQLite via `storage` abstraction in Electron, but the product/POS hooks were directly writing to IndexedDB using `productRepository.bulkSync()` and `db.categories.bulkPut()`. This meant:
- Products fetched from API were displayed correctly when online
- Products were saved to IndexedDB (wrong database)
- When offline, the app read from SQLite (correct database) which had no cached data
- Result: empty/zero stock displayed

**Solution**: Updated hooks to use the platform-agnostic `storage` abstraction:

```typescript
// Before (IndexedDB only)
await productRepository.bulkSync(localProducts)
await db.categories.bulkPut(localCategories)

// After (SQLite in Electron, IndexedDB fallback)
await storage.products.bulkUpsert(localProducts)
await storage.categories.bulkUpsert(localCategories)
```

**Files Modified**:
- `src/pages/pos/hooks/usePOSData.ts` - Use storage.products/categories.bulkUpsert()
- `src/pages/products/hooks/useProducts.ts` - Use storage.products.bulkUpsert()

**Key Learning**: Always use the `storage` abstraction from `@/lib/storage` for data persistence. It auto-detects the environment:
- Electron: Uses SQLite via `window.electronAPI.sqlite`
- Browser: Falls back to IndexedDB

---

#### Offline Support - Price/Category/Brand Fix (Complete)

**Problem**: When offline, products showed price as 0, category and brand as empty even though they existed when online.

**Root Cause 1 - Prices**: SQLite `productBulkUpsert` was reading prices from `p.purchasePrice` and `p.salePrice` but the data was actually nested in `p.stock.productPurchasePrice` and `p.stock.productSalePrice`.

**Root Cause 2 - Category/Brand**: When loading cached data, the code converted LocalProduct to Product but didn't join the category, brand, and unit objects from their respective caches.

**Solution**:
1. Fixed `electron/sqlite.service.ts` to read prices from `p.stock.productSalePrice` and return them in the `stock` object
2. Fixed `loadCachedData()` in both hooks to create lookup maps and join category/brand/unit objects

**Files Modified**:
- `electron/sqlite.service.ts` - Fixed productBulkUpsert and mapProduct for prices
- `src/pages/pos/hooks/usePOSData.ts` - Added category/brand/unit lookup and join
- `src/pages/products/hooks/useProducts.ts` - Same fix

---

#### Electron Routing Fix (Complete)

**Problem**: App showed 404 error on startup in Electron.

**Cause**: `BrowserRouter` uses HTML5 history API which doesn't work with `file://` protocol in Electron.

**Solution**: Use `HashRouter` (via `createHashRouter`) when running in Electron, `BrowserRouter` for web:

```typescript
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined
const routerCreator = isElectron ? createHashRouter : createBrowserRouter
```

**Files Modified**:
- `src/routes/index.tsx` - Conditional router based on environment

---

#### Sync Queue Display Fix (Complete)

**Problem**: After making an offline sale, the pending queue didn't show until back online.

**Cause**: `useSyncQueue` hook only polled the queue when `isSyncing` was true.

**Solution**: Changed to constant 2-second polling regardless of sync state:

```typescript
useEffect(() => {
  fetchItems() // Initial fetch
  const interval = setInterval(fetchItems, 2000) // Poll every 2s
  return () => clearInterval(interval)
}, [])
```

**Files Modified**:
- `src/hooks/useSyncQueue.ts` - Always poll every 2 seconds

---

#### UI Fix - Filter Popover Overflow (Complete)

**Problem**: Filter fields were overflowing outside the popover container.

**Solution**: Added proper positioning to PopoverContent and SelectContent:

```tsx
<PopoverContent side="bottom" sideOffset={5}>
<SelectContent position="popper">
```

**Files Modified**:
- `src/pages/products/components/ProductFiltersBar.tsx`

---

#### Offline Support - Image Caching (Complete)

**Problem**: Product images didn't display when offline.

**Solution**: Created `CachedImage` component that uses `useImageCache` hook to cache images in IndexedDB.

**Files Created**:
- `src/components/common/CachedImage.tsx`

**Files Modified**:
- `src/pages/products/components/ProductRow.tsx` - Use CachedImage
- `src/pages/pos/components/ProductCard.tsx` - Use CachedImage
- `src/pages/pos/components/CartItem.tsx` - Use CachedImage

---

#### Offline Support - Dashboard Caching (Complete)

**Problem**: Dashboard was making API requests even when offline.

**Solution**: Added offline detection and localStorage caching to DashboardPage.

**Files Modified**:
- `src/pages/dashboard/DashboardPage.tsx` - Check online status before API calls, cache to localStorage
- `src/lib/cache/index.ts` - Added DASHBOARD_SUMMARY, DASHBOARD_DATA cache keys

---

#### Documentation (Complete)

Created comprehensive offline architecture documentation.

**Files Created**:
- `OFFLINE_SUPPORT_ARCHITECTURE.md` - Full documentation with diagrams

---

### November 27, 2025

#### Production Build Fixes (Complete)

**Problem 1**: App crashed on startup with `Cannot read properties of undefined (reading 'on')`

**Cause**: `src/main.tsx` was calling `window.ipcRenderer.on()` directly, but in production builds with `contextBridge`, this isn't exposed.

**Solution**: Changed to use the properly exposed API:
```tsx
// Before (broken)
window.ipcRenderer.on('main-process-message', ...)

// After (fixed)
if (window.electronAPI?.onMainProcessMessage) {
  window.electronAPI.onMainProcessMessage((message) => { ... })
}
```

**Files Modified**: `src/main.tsx`

---

**Problem 2**: API calls failing with `file:///D:/undefined/api/v1/...`

**Cause**: `VITE_API_BASE_URL` environment variable was undefined in production because `.env.production` didn't exist.

**Solution**: 
1. Created `.env.production` with the production API URL
2. Added fallback in `src/api/axios.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.posmate.app'
```

**Files Created**: `.env.production`
**Files Modified**: `src/api/axios.ts`

---

**Problem 3**: Product images showing as broken (file:///D:/uploads/...)

**Cause**: Product images are stored as relative paths (`/uploads/25/08/...`) in the API. In Electron, these become `file:///D:/uploads/...` instead of the actual server URL.

**Solution**: Created `getImageUrl()` utility in `src/lib/utils.ts`:
```typescript
export function getImageUrl(path: string | undefined | null): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
```

**Files Modified**:
- `src/lib/utils.ts` - Added `getImageUrl()` helper
- `src/pages/pos/components/ProductCard.tsx` - Use `getImageUrl()`
- `src/pages/products/components/ProductRow.tsx` - Use `getImageUrl()`
- `src/pages/products/components/ProductDetailsDialog.tsx` - Use `getImageUrl()`
- `src/pages/products/components/ProductFormDialog.tsx` - Use `getImageUrl()`

---

#### Build Configuration (Complete)

**Updated electron-builder.json5**:
- `appId`: `com.posmate.app`
- `productName`: `POSMATE`

**Build Output**:
- Windows: `release/1.0.0/POS Mate-Windows-1.0.0-Setup.exe`
- Executable: `release/1.0.0/win-unpacked/POSMATE.exe`

---

#### UI Color Scheme - Purple Theme (Complete)

**Feature**: Updated app color scheme from neutral to purple primary with yellow accents.

**Design Decisions**:
- **Primary**: Purple (#7c3aed / HSL 262 83% 58%) - Brand identity, buttons, links
- **Accent**: Yellow (#eab308 / HSL 45 93% 58%) - Badges, notifications, highlights only
- **Hover States**: Darker purple shades (not yellow) - Industry standard approach
- **Category Colors**: 12 vibrant colors for POS category grid

**Why not yellow hover?**
Purple → Yellow on hover creates jarring contrast. Standard UI practice uses darker/lighter shades of the same color family for hover states.

**Files Modified**:
- `src/index.css` - CSS variables for colors, hover states, category colors
- `tailwind.config.js` - Added category colors and hover variants
- `src/components/layout/Sidebar.tsx` - Fixed hover from yellow to light purple
- `src/components/ui/tooltip.tsx` - Changed to neutral dark (gray-900)
- `src/components/ui/button.tsx` - Fixed outline/ghost variants to use muted instead of accent
- `src/components/ui/select.tsx` - Fixed focus state from accent to muted
- `src/components/ui/dropdown-menu.tsx` - Fixed all focus/hover states to use muted
- `src/components/common/SyncStatusIndicator.tsx` - Removed accent hover

**CSS Variables Added**:
```css
--primary: 262 83% 58%        /* Purple */
--primary-hover: 262 83% 50%  /* Darker purple for hover */
--accent: 45 93% 58%          /* Yellow for accents */
--category-1 through --category-12  /* POS grid colors */
```

**Usage**:
```tsx
// Buttons use purple with darker hover
<Button className="hover:bg-primary-hover">Save</Button>

// Yellow only for accent elements
<Badge className="bg-accent">New Item</Badge>

// Category colors for POS grid
<div className="bg-category-1">Beverages</div>
```

---

#### Offline App Loading (Complete)

**Problem**: App wouldn't load UI at all when offline - showed blank screen.

**Root Cause**: 
- `hydrateFromStorage()` in auth store was blocking on `fetchProfile()` API call
- `initializeOffline()` in App.tsx was awaiting sync operations
- Data hooks failed immediately on network error without fallback

**Solution Implemented**:

1. **Auth Store** (`src/stores/auth.store.ts`)
   - Added `isOfflineMode` state flag
   - `hydrateFromStorage()` now loads cached user data immediately (non-blocking)
   - `fetchProfile()` runs in background, falls back to cache on failure
   - Auth data cached with 7-day TTL

2. **App.tsx**
   - Made `initializeOffline()` completely non-blocking
   - Sync operations run in background with `.catch()` handlers
   - UI renders immediately

3. **Data Hooks** (`usePOSData`, `useProducts`)
   - Added `loadCachedData()` method to load from IndexedDB
   - Falls back to cache when API fails
   - Added `isOffline` state to return value
   - Uses `useOnlineStatus` hook for reactive status

4. **OfflineBanner Component** (`src/components/common/OfflineBanner.tsx`)
   - Yellow banner shown when offline
   - Retry and dismiss buttons
   - Auto-hides when back online

5. **Electron Main Process** (`electron/main.ts`)
   - Added `did-fail-load` handler for dev mode
   - Shows friendly offline page when Vite server unreachable

**Files Modified**:
- `src/stores/auth.store.ts`
- `src/App.tsx`
- `src/pages/pos/hooks/usePOSData.ts`
- `src/pages/products/hooks/useProducts.ts`
- `src/components/layout/AppShell.tsx`
- `electron/main.ts`

**Files Created**:
- `src/components/common/OfflineBanner.tsx`
- `src/lib/cache/index.ts`
- `src/hooks/useOnlineStatus.ts`
- `src/lib/errors/index.ts`

---

#### Sync Queue Management (Complete)

**Feature**: Visual sync queue panel and status indicator in sidebar.

**Components**:
- `SyncStatusIndicator` - Shows pending count with popover preview
- `SyncQueuePanel` - Full sheet with tabs (Pending/Failed/Synced)

**Files Created**:
- `src/hooks/useSyncQueue.ts`
- `src/components/common/SyncStatusIndicator.tsx`
- `src/components/common/SyncQueuePanel.tsx`

---

#### Sales History Module (Complete)

**Feature**: Full sales history page with filtering, stats, and detail views.

**Components**:
- `SalesPage` - Main page with filters
- `SalesTable` - Sortable data table
- `SalesStats` - Summary cards
- `SaleDetailsDialog` - View sale details
- `SaleReceiptDialog` - Print-ready receipt

**Files Created**:
- `src/pages/sales/SalesPage.tsx`
- `src/pages/sales/hooks/useSales.ts`
- `src/pages/sales/components/*`

---

### Previous Sessions

#### Products Module
- CRUD operations for products
- Batch import/export
- Stock management
- Category/Brand/Unit support

#### POS Module
- Product grid with search/filter
- Cart management with Zustand persistence
- Multiple payment methods
- Offline sale creation with queue

#### Authentication
- Login/SignUp/OTP flow
- Token refresh with interceptors
- Secure token storage (Electron Store)

---

### December 4, 2025

#### Variant Product System - Frontend Implementation (Complete)

**Feature**: Full frontend support for variant products (products with multiple variations like Size, Color, Material, etc.)

**Backend Reference**: Phase 2: Variant Product System from BACKEND_DEVELOPMENT_LOG.md

**What was implemented**:

1. **Type Definitions** (`src/types/variant.types.ts`):
   - `ProductType`: `'simple'` | `'variable'`
   - `AttributeType`: `'button'` | `'color'` | `'select'`
   - `Attribute`: Name, type, values, display order
   - `AttributeValue`: Value with optional color_code
   - `ProductVariant`: SKU, attribute values, stock info, pricing
   - `VariantStockInfo`: Stock details for variants

2. **API Types Updated** (`src/types/api.types.ts`):
   - `Product.product_type`: Changed from `'single'|'variant'` to `'simple'|'variable'`
   - `Product.variants`: Optional `ProductVariant[]` array
   - `Product.attributes`: Optional `ProductAttribute[]` array
   - `Stock.variant_id`: Links stock to variant
   - `SaleDetail.variant_id`, `variant_sku`, `variant_name`: Variant info in sales

3. **API Endpoints** (`src/api/endpoints.ts`):
   ```typescript
   ATTRIBUTES: {
     BASE: '/product-attributes',
     BY_ID: (id) => `/product-attributes/${id}`,
     VALUES: (id) => `/product-attributes/${id}/values`,
   },
   VARIANTS: {
     BY_PRODUCT: (productId) => `/products/${productId}/variants`,
     BY_ID: (productId, variantId) => `/products/${productId}/variants/${variantId}`,
     GENERATE: (productId) => `/products/${productId}/variants/generate`,
     UPDATE_STOCK: (productId, variantId) => `/products/${productId}/variants/${variantId}/stock`,
   }
   ```

4. **API Services Created**:
   - `attributes.service.ts`: CRUD for product attributes
   - `variants.service.ts`: CRUD for variants, stock updates, generation

5. **Cart Store Updated** (`src/stores/cart.store.ts`):
   ```typescript
   interface CartItem {
     // ... existing fields
     variant?: ProductVariant    // Selected variant
     variantName?: string        // Display name (e.g., "Size: Large, Color: Blue")
   }
   ```

6. **VariantSelectionDialog** (`src/pages/pos/components/VariantSelectionDialog.tsx`):
   - Opens when clicking a variable product in POS
   - Displays all product attributes with smart selectors:
     - **Button selector**: For Size, Material, etc.
     - **Color swatch selector**: Visual color picker with contrast-aware checkmarks
     - **Dropdown selector**: For attributes with many values
   - Shows only available combinations (based on stock)
   - Displays matched variant price, SKU, and stock
   - Handles out-of-stock variants gracefully

7. **ProductCard Updated** (`src/pages/pos/components/ProductCard.tsx`):
   - Shows "Options" badge for variable products
   - Calls `onSelectVariant` callback instead of directly adding to cart
   - Differentiates between simple and variable product handling

8. **CartItem Updated** (`src/pages/pos/components/CartItem.tsx`):
   - Displays variant name below product name (e.g., "Size: L, Color: Red")
   - Uses muted styling for variant info

9. **Offline Sales Support** (`src/api/services/offlineSales.service.ts`):
   - Includes `variant_id` in sale detail when syncing offline sales

**Type Standardization**:
- Standardized `product_type` across codebase to use `'simple'` | `'variable'`
- Updated files: `api.types.ts`, `product.schema.ts`, `cart.store.test.ts`

**Files Created**:
- `src/types/variant.types.ts`
- `src/api/services/attributes.service.ts`
- `src/api/services/variants.service.ts`
- `src/pages/pos/components/VariantSelectionDialog.tsx`

**Files Modified**:
- `src/types/api.types.ts` - Added variant fields, standardized product_type
- `src/api/endpoints.ts` - Added ATTRIBUTES and VARIANTS endpoints
- `src/api/services/index.ts` - Exported new services
- `src/stores/cart.store.ts` - Added variant support to CartItem
- `src/pages/pos/components/ProductCard.tsx` - Handle variable products
- `src/pages/pos/components/CartItem.tsx` - Display variant info
- `src/pages/pos/components/index.ts` - Export new dialog
- `src/api/services/offlineSales.service.ts` - Include variant_id in sync
- `src/pages/products/schemas/product.schema.ts` - Updated to 'simple'|'variable'
- `src/__tests__/stores/cart.store.test.ts` - Fixed product_type in mock

**Usage Example**:
```tsx
// In POS, when clicking a variable product:
<VariantSelectionDialog
  open={showVariantDialog}
  onOpenChange={setShowVariantDialog}
  product={selectedProduct}
  currencySymbol={currencySymbol}
  onSelectVariant={(product, stock, variant) => {
    addItem(product, stock, variant)
  }}
/>

// Cart item with variant:
{
  product: { id: 1, productName: "T-Shirt", product_type: "variable" },
  stock: { id: 5, variant_id: 3, productSalePrice: 29.99 },
  variant: { id: 3, sku: "TSHIRT-L-RED", attribute_values: [...] },
  variantName: "Size: L, Color: Red",
  quantity: 2
}
```

**Pending Implementation**:
- [x] Products page: Add/Edit variable products with variant management UI ✅
- [x] Product form: Attribute selection and variant generation ✅
- [ ] Variant stock management: Update stock for individual variants
- [ ] Variant pricing: Individual prices per variant
- [ ] Bulk variant operations: Enable/disable, delete multiple variants

---

#### Variable Product Management - Products Page (Complete)

**Feature**: Full variant management UI in Products page for creating and editing variable products with variants.

**What was implemented**:

1. **useAttributes Hook** (`src/pages/products/hooks/useAttributes.ts`):
   - Fetches product attributes with React Query pattern
   - CRUD operations: `createAttribute`, `createAttributeValue`
   - Error handling with toast notifications
   - Loading states for UI feedback

2. **VariantManager Component** (`src/pages/products/components/VariantManager.tsx`):
   - **AttributeSelector**: Select which attributes apply to the product
   - **Attribute Value Selection**: Checkbox-based selection of values (e.g., S, M, L for Size)
   - **Generate Variants Button**: Bulk creates variants from selected attribute value combinations
   - **VariantTable**: Displays existing variants with:
     - Attribute badges (Size: M, Color: Red)
     - Editable SKU field
     - Price display
     - Stock quantity with color-coded badges
     - Status toggle (Active/Inactive)
     - Delete action per variant
   - Collapsible attribute sections for compact UI

3. **ProductFormDialog Updates** (`src/pages/products/components/ProductFormDialog.tsx`):
   - Added tab-based UI: **General** (basic info) | **Variants** (for variable products)
   - New props: `attributes`, `attributesLoading`, `currencySymbol`
   - Variants tab only visible for `product_type === 'variable'`
   - Variant state management with `useState`
   - Passes product ID and variants to VariantManager when editing

4. **ProductsPage Integration** (`src/pages/products/ProductsPage.tsx`):
   - Integrated `useAttributes` hook
   - Passes attributes and loading state to ProductFormDialog

5. **ProductRow Variant Display** (`src/pages/products/components/ProductRow.tsx`):
   - Shows "Variable" badge for variable products
   - Displays variant count (e.g., "12 variants")
   - Settings icon indicator for variable products
   - Variable pricing display instead of fixed price

6. **ProductDetailsDialog Variant Section** (`src/pages/products/components/ProductDetailsDialog.tsx`):
   - New "Product Variants" section for variable products
   - Displays all variants in a read-only table:
     - Attribute badges per variant
     - SKU, Price, Stock, Status columns
     - Color-coded stock and status badges
   - Shows message when no variants configured
   - Improved product type badge (Simple/Variable Product)

**Shadcn Components Added**:
- `checkbox` - For attribute value selection
- `collapsible` - For expandable attribute sections
- `alert` - For informational messages

**Files Created**:
- `src/pages/products/hooks/useAttributes.ts`
- `src/pages/products/components/VariantManager.tsx`

**Files Modified**:
- `src/pages/products/hooks/index.ts` - Export useAttributes
- `src/pages/products/components/index.ts` - Export VariantManager
- `src/pages/products/components/ProductFormDialog.tsx` - Added tabs and variant support
- `src/pages/products/ProductsPage.tsx` - Integrated useAttributes
- `src/pages/products/components/ProductRow.tsx` - Show variant info
- `src/pages/products/components/ProductDetailsDialog.tsx` - Display variants

---

#### Product Attributes Settings (Complete)

**Feature**: Centralized attribute management in Settings page, following industry best practices (WooCommerce, Magento pattern).

**Industry Practice Analysis**:
| Platform | Attribute Location | Approach |
|----------|-------------------|----------|
| WooCommerce | Products → Attributes | Centralized + inline |
| Shopify | Product Options | Inline only |
| Magento | Stores → Attributes | Centralized |
| Square POS | Items → Variations | Inline only |

We implemented the **hybrid approach**: centralized management in Settings with reference from product form.

**What was implemented**:

1. **AttributesSettings Component** (`src/pages/settings/components/AttributesSettings.tsx`):
   - Full CRUD for product attributes
   - Create new attributes with name and display type (Button, Color Swatch, Dropdown)
   - Add/delete values for each attribute
   - Color picker for color-type attributes
   - Delete confirmation dialogs
   - Loading states for all operations

2. **Settings Page Integration** (`src/pages/settings/SettingsPage.tsx`):
   - Added "Attributes" tab with Tag icon
   - Fetches attributes on mount
   - Passes refresh callback to AttributesSettings

**Component Features**:
- **AttributeCard**: Displays attribute with its values
- **CreateAttributeDialog**: Form for new attributes with type selection
- **AddValueForm**: Inline form to add values with color picker for color types
- **Delete confirmations**: AlertDialog for destructive actions

**Files Created**:
- `src/pages/settings/components/AttributesSettings.tsx`
- `src/pages/settings/components/index.ts`

**Files Modified**:
- `src/pages/settings/SettingsPage.tsx` - Added Attributes tab

**UX Flow**:
1. User goes to Settings → Attributes
2. Creates attributes (Size, Color, Material)
3. Adds values to each attribute (S, M, L, XL for Size)
4. Goes to Products → Add Variable Product
5. In Variants tab, selects attributes and values
6. Generates variants from combinations

---

#### Bug Fix: Variant Value Selection Reset (Complete)

**Problem**: In VariantManager, users could only select 2 attribute values before the selection would reset.

**Root Cause**: The `useEffect` in `VariantManager` had `[product]` as dependency, causing it to re-run on every parent re-render (since `product` prop reference changes). This reset `selectedValues` state back to the values from existing variants.

**Solution**: Added `loadedProductId` state to track which product was already loaded:
```typescript
const [loadedProductId, setLoadedProductId] = useState<number | null>(null)

useEffect(() => {
  // Only load variants if product ID changed (not on every re-render)
  if (product?.id && product.id !== loadedProductId) {
    setLoadedProductId(product.id)
    // ... load variant data
  }
}, [product?.id, product?.variants, loadedProductId])
```

**Files Modified**:
- `src/pages/products/components/VariantManager.tsx` - Added loadedProductId tracking

---

#### Enhancement: Full Product Details on Edit (Complete)

**Problem**: Edit product dialog wasn't showing variants because product data from list didn't include full variant details.

**Solution**: Fetch complete product details via `productsService.getById()` when opening edit dialog:
```typescript
const handleEdit = useCallback(async (product: Product) => {
  setIsLoadingProduct(true)
  setIsFormDialogOpen(true)
  
  try {
    const response = await productsService.getById(product.id)
    setEditProduct(response.data)
  } catch (error) {
    setEditProduct(product) // Fallback to list data
  } finally {
    setIsLoadingProduct(false)
  }
}, [])
```

**Files Modified**:
- `src/pages/products/ProductsPage.tsx` - Added async product fetch on edit/view
- `src/pages/products/components/ProductFormDialog.tsx` - Added `isLoadingProduct` prop with loading UI

---

- `src/pages/products/components/ProductRow.tsx` - Show variant info
- `src/pages/products/components/ProductDetailsDialog.tsx` - Display variants

**UI/UX Details**:
- Tab navigation prevents losing form state when switching tabs
- Only shows Variants tab when product_type is 'variable'
- Attribute values shown as checkable badges
- Variant generation creates all combinations of selected values
- Stock shown with green/red color coding
- Status toggleable directly from variant table

---

#### Auto-Update System (Complete)

**Feature**: Implemented automatic update system for production deployment using electron-updater.

**Files Created**:
- `electron/autoUpdater.ts` - Auto-update service with GitHub Releases
- `src/components/common/UpdateNotification.tsx` - Update UI component

**Update Flow**:
1. App checks for updates on startup and every hour
2. Shows notification when update available
3. Downloads in background with progress
4. Prompts user to restart and install

---

### December 2025

#### SQLite Migration (Complete)

**Feature**: Migrated offline storage from IndexedDB (Dexie.js) to SQLite (better-sqlite3) for improved reliability and performance in desktop environment.

**Why SQLite?**
- Better reliability for large datasets and concurrent operations
- True ACID transactions (IndexedDB has quirks)
- Better tooling (can open `.db` file directly for debugging)
- Standard in desktop applications
- Faster bulk operations

**Architecture**:
```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │ React App    │──▶│ SQLiteAdapter│──▶│ window.electronAPI│ │
│  └──────────────┘   └──────────────┘   │ .sqlite.*        │ │
│                                         └────────┬─────────┘ │
└──────────────────────────────────────────────────┼───────────┘
                                              IPC Bridge
┌──────────────────────────────────────────────────┼───────────┐
│                      Main Process                 ▼          │
│  ┌──────────────┐   ┌──────────────────────────────────────┐ │
│  │ ipcMain      │──▶│ SQLiteService (better-sqlite3)       │ │
│  │ handlers     │   │ - Products, Categories, Parties      │ │
│  └──────────────┘   │ - Sales, SyncQueue, Metadata         │ │
│                     └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                     📁 userData/posmate.db
```

**Files Created**:
- `electron/sqlite.service.ts` - Complete SQLite database service with all CRUD operations
- `src/lib/storage/interface.ts` - Storage adapter interface for abstraction
- `src/lib/storage/adapters/sqlite.adapter.ts` - SQLite adapter using IPC bridge
- `src/lib/storage/adapters/indexeddb.adapter.ts` - IndexedDB adapter (legacy)
- `src/lib/storage/migration.tsx` - React component for one-time data migration

**Files Modified**:
- `electron/main.ts` - Added SQLite initialization and IPC handlers (20+ handlers)
- `electron/preload.ts` - Exposed `sqlite` API via contextBridge
- `src/lib/storage/index.ts` - Auto-detects environment, uses SQLite in Electron
- `src/types/electron.d.ts` - Added SQLiteAPI types

**Storage Adapter Pattern**:
```typescript
// Same interface, swappable implementations
interface StorageAdapter {
  products: ProductRepository
  categories: CategoryRepository
  parties: PartyRepository
  sales: SaleRepository
  syncQueue: SyncQueueRepository
}

// Automatically uses SQLite in Electron, IndexedDB in browser
import { storage } from '@/lib/storage'
const products = await storage.products.getAll()
```

**Migration Component**:
- Shows progress UI during one-time migration
- Migrates: Products, Categories, Parties, Sales, SyncQueue
- Sets localStorage flag when complete
- Can be triggered by: `import { needsMigration } from '@/lib/storage'`

**Dependencies Added**:
- `better-sqlite3` - Native SQLite binding for Node.js
- `@types/better-sqlite3` - TypeScript definitions
- Rebuilt native modules with `npx electron-rebuild`

**Usage**:
```typescript
// Import works the same way
import { storage } from '@/lib/storage'

// All operations are the same
const products = await storage.products.getAll()
await storage.sales.createOffline(saleData)
await storage.syncQueue.enqueue(operation)
```

---

#### Backend Sync API Integration (Complete)

**Feature**: Full integration with backend's offline-first sync API (`/api/v1/sync/*`).

**What was implemented**:
1. **Sync API Service** - Client for all backend sync endpoints
2. **Batch Sync** - Upload multiple offline operations in one request
3. **Incremental Sync** - Download only changes since last sync
4. **Idempotency Keys** - Prevent duplicate operations on retry
5. **Version Conflict Handling** - Detect and handle optimistic locking conflicts
6. **Device Registration** - Register device with backend on first run

**Backend Endpoints Supported**:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sync/health` | GET | Health check with server timestamp |
| `/sync/register` | POST | Register device |
| `/sync/full` | GET | Full initial data download |
| `/sync/changes` | GET | Incremental sync (changes since timestamp) |
| `/sync/batch` | POST | Batch upload offline operations |

**Files Created**:
- `src/api/services/sync.service.ts` - Sync API client with all endpoints
- `src/lib/db/services/enhancedSync.service.ts` - Enhanced sync with batch processing
- `src/hooks/useDeviceRegistration.ts` - Device registration hook

**Files Modified**:
- `src/api/axios.ts` - Added `X-Device-ID` header, server timestamp capture
- `src/lib/db/schema.ts` - Added `idempotencyKey`, `version`, `offlineTimestamp` to SyncQueueItem
- `src/api/services/offlineSales.service.ts` - Updated to use batch sync format
- `src/stores/sync.store.ts` - Uses `enhancedSyncService` for batch sync
- `src/api/services/index.ts` - Export sync service and types
- `vite.config.ts` - Externalize `better-sqlite3` for native module support

**Sync Flow**:
```
┌─────────────────────────────────────────────────────────────────┐
│                        OFFLINE SALE                              │
│  1. User creates sale while offline                             │
│  2. Generate idempotency key: sale_create_1733123456789_abc123  │
│  3. Generate offline invoice: OFF-D001-1733123456789            │
│  4. Save to local SQLite                                         │
│  5. Add to sync queue with idempotency key                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (When online)
┌─────────────────────────────────────────────────────────────────┐
│                       BATCH SYNC                                 │
│  POST /sync/batch                                                │
│  {                                                               │
│    "operations": [                                               │
│      {                                                           │
│        "idempotency_key": "sale_create_...",                    │
│        "entity": "sale",                                         │
│        "action": "create",                                       │
│        "data": { "offline_invoice_no": "OFF-D001-...", ... }    │
│      }                                                           │
│    ],                                                            │
│    "device_id": "D001",                                          │
│    "client_timestamp": "2025-12-02T10:00:00Z"                   │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RESPONSE                                    │
│  {                                                               │
│    "results": [                                                  │
│      { "idempotency_key": "...", "status": "created",           │
│        "server_id": 1234, "invoice_number": "INV-001234" }      │
│    ],                                                            │
│    "server_timestamp": "2025-12-02T10:00:01Z"                   │
│  }                                                               │
│  → Update local sale with server_id and real invoice number     │
│  → Mark sync queue item as completed                             │
└─────────────────────────────────────────────────────────────────┘
```

**Conflict Handling**:
```typescript
// When server returns 409 Conflict:
{
  "status": "conflict",
  "conflict_data": { /* server's current data */ }
}

// Frontend stores conflict for resolution:
enhancedSyncService.getConflicts() // Returns pending conflicts
enhancedSyncService.resolveConflict(id, 'client_wins' | 'server_wins' | 'discard')
```

**Usage**:
```typescript
// Sync is automatic when online, or trigger manually:
import { useSyncStore } from '@/stores/sync.store'

const { startQueueSync, pendingSyncCount, syncStatus } = useSyncStore()

// Start sync
await startQueueSync()

// Check status
console.log(pendingSyncCount) // Number of pending operations
console.log(syncStatus) // 'idle' | 'syncing' | 'error' | 'offline'
```

---

#### TypeScript Compilation Fixes (December 2, 2025)

**Problem**: Build failed with 10 TypeScript errors after adding sync integration features:
- Missing required fields `idempotencyKey` and `offlineTimestamp` in sync queue enqueue calls
- Test mock factory not generating required fields
- Pre-existing type errors in `imageCache.ts` (IndexedDB schema issues)

**Solution Implemented**:

1. **Fixed offlineHandler.ts** (2 errors):
   - Added `generateIdempotencyKey()` import from `enhancedSync.types.ts`
   - Added `idempotencyKey: generateIdempotencyKey(entityType, operation)` to both enqueue calls
   - Added `offlineTimestamp: new Date().toISOString()` to both enqueue calls

2. **Fixed sync.service.test.ts** (1 error):
   - Updated `createMockQueueItem()` factory to include:
     - `idempotencyKey: 'sale_create_1234567890_abc123'`
     - `offlineTimestamp: new Date().toISOString()`

3. **Fixed imageCache.ts** (5 errors):
   - Added `indexes` definition to `ImageCacheSchema.images` store:
     ```typescript
     indexes: {
       cachedAt: number
       lastAccessed: number
       size: number
     }
     ```
   - Fixed metadata put call to include both `totalSize` and `lastCleanup`:
     ```typescript
     const metadata = await this.db!.get('metadata', 'cleanup')
     await this.db!.put('metadata', { 
       totalSize: metadata?.totalSize || 0,
       lastCleanup: now 
     }, 'cleanup')
     ```

4. **Cleaned up unused imports** (2 warnings):
   - Removed unused `EnhancedSyncProgress` from `sync.store.ts`
   - Removed unused `uuid` import from `enhancedSync.types.ts`, added `generateUUID()` using native `crypto.randomUUID()`

**Files Modified**:
- `src/api/offlineHandler.ts` - Added idempotency keys and offline timestamps
- `src/__tests__/services/sync.service.test.ts` - Updated mock factory
- `src/lib/cache/imageCache.ts` - Fixed IndexedDB schema types
- `src/stores/sync.store.ts` - Removed unused import
- `src/lib/db/types/enhancedSync.types.ts` - Replaced uuid with native crypto

**Build Status**: ✅ **All TypeScript errors fixed - Build successful!**

**Production Build Output**:
```
✓ 1784 modules transformed.
dist/index.html                    0.48 kB
dist/assets/index-CYrNsV_9.css    54.56 kB
dist/assets/index-Co7QymoM.js    617.61 kB
✓ built in 7.42s
✓ Electron app packaged successfully
```

---

#### Offline Image Caching & Dashboard Offline Support (December 3, 2025)

**Problems Identified**:
1. Product images not retained when offline - images were being fetched fresh each time instead of from cache
2. API requests being made while offline (dashboard, summary endpoints)

**Root Causes**:
1. `useImageCache` hook existed but wasn't being used in any component - images loaded via `<img src={url}>` directly
2. Dashboard page (`DashboardPage.tsx`) had no offline detection - made API calls regardless of connection status

**Solutions Implemented**:

1. **Created `CachedImage` Component** (`src/components/common/CachedImage.tsx`):
   ```typescript
   // Displays images with automatic offline caching
   // When online: Fetches image and caches to IndexedDB
   // When offline: Loads from IndexedDB cache
   <CachedImage
     src={getImageUrl(product.productPicture)}
     alt={product.productName}
     fallback={<Package className="h-5 w-5" />}
   />
   ```

2. **Updated ProductRow Component** (`src/pages/products/components/ProductRow.tsx`):
   - Replaced `<img>` with `<CachedImage>` component
   - Images now automatically cached when first loaded
   - Shows fallback icon when offline and no cache available

3. **Added Dashboard Offline Support** (`src/pages/dashboard/DashboardPage.tsx`):
   - Added `isOnline` check from `useSyncStore`
   - Skip API calls when offline, load from cache only
   - Cache dashboard data after successful API response
   - Show "(Cached data)" indicator when using cached data

4. **Added Dashboard Cache Keys** (`src/lib/cache/index.ts`):
   ```typescript
   CacheKeys = {
     // ... existing keys
     DASHBOARD_SUMMARY: 'cache:dashboard:summary',
     DASHBOARD_DATA: 'cache:dashboard:data',
   }
   ```

**Files Created**:
- `src/components/common/CachedImage.tsx` - Offline-aware image component

**Files Modified**:
- `src/pages/products/components/ProductRow.tsx` - Use CachedImage
- `src/pages/dashboard/DashboardPage.tsx` - Added offline handling
- `src/lib/cache/index.ts` - Added dashboard cache keys

**Behavior Changes**:
- Images are cached to IndexedDB on first load
- When offline, images load from IndexedDB cache
- Dashboard shows cached data with "(Cached data)" indicator when offline
- No unnecessary API requests when detected offline

**Note**: `navigator.onLine` can return `true` even without actual connectivity. The app may still attempt requests when WiFi is connected but has no internet. Requests will fail gracefully and fall back to cached data.

---


## Offline Support System

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   API Call  │────▶│   Success   │────▶│ Update Cache│
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼ (Failure)
┌─────────────┐     ┌─────────────┐
│ Load Cache  │────▶│ Return Data │
└─────────────┘     └─────────────┘
       │
       ▼ (No Cache)
┌─────────────┐
│ Show Error  │
└─────────────┘
```

### Cache Layers

| Data Type | Storage | TTL | Notes |
|-----------|---------|-----|-------|
| Products | IndexedDB | Sync-based | Full product data with stock |
| Categories | IndexedDB | Sync-based | Synced with products |
| Parties | IndexedDB | Sync-based | Customers/Suppliers |
| Sales (offline) | IndexedDB | Until synced | Queue for offline sales |
| Payment Types | localStorage | 24 hours | Rarely changes |
| VATs | localStorage | 24 hours | Rarely changes |
| Auth User | localStorage | 7 days | Cached profile data |
| Brands/Units | localStorage | 24 hours | Reference data |

### Sync Queue

```typescript
// Queue entry structure
interface SyncQueueEntry {
  id: string
  entityType: 'sale' | 'purchase' | 'expense' | ...
  action: 'create' | 'update' | 'delete'
  payload: Record<string, unknown>
  status: 'pending' | 'syncing' | 'failed' | 'synced'
  retryCount: number
  createdAt: string
  error?: string
}
```

---

## Best Practices Applied

### 1. Centralized Cache Utility
- Single implementation in `src/lib/cache/index.ts`
- TTL (Time-To-Live) for automatic expiration
- Version control for cache invalidation
- Type-safe with generics

### 2. Custom Hooks for Reusable Logic
- `useOnlineStatus` - Online/offline detection with callbacks
- `useSyncQueue` - Sync queue state and actions
- Feature hooks (`usePOSData`, `useProducts`, `useSales`)

### 3. Typed Error Classes
- Base `AppError` class with code and metadata
- Specific errors: `NetworkError`, `OfflineError`, `CacheError`
- Type guards: `isNetworkRelatedError()`, `isAppError()`
- Factory: `createAppError()` for consistent error creation

### 4. Non-Blocking Initialization
- Auth hydration loads cache immediately
- API calls run in background
- UI renders without waiting for network

### 5. Graceful Degradation
- Show cached data when offline
- Visual indicators for offline state
- Queue mutations for later sync

---

## Known Issues & Solutions

### Issue: Git Push Permission Denied
**Status**: Unresolved (external issue)  
**Error**: `Permission denied to itsmahran/posmate-client`  
**Cause**: GitHub repository permissions  
**Workaround**: Contact repo owner for write access or use fork

### Issue: Large Git History (Resolved)
**Problem**: 250MB+ of build artifacts committed  
**Solution**: 
1. Removed `release/` folder from git
2. Updated `.gitignore` to exclude:
   - `dist-electron/`
   - `release/`
   - `*.exe`, `*.dmg`, `*.AppImage`
   - `app.asar`

### Issue: Dev Mode Offline (Expected Behavior)
**Problem**: App shows blank when simulating offline in dev  
**Cause**: Vite dev server unreachable  
**Solution**: Added fallback HTML page in Electron's `did-fail-load`  
**Note**: Production builds work fully offline

---

## Testing

### Test Suite Location
```
src/__tests__/
├── offline/
│   ├── cart.store.test.ts      # Cart persistence tests
│   ├── repositories.test.ts    # IndexedDB repository tests
│   ├── sync.service.test.ts    # Sync queue tests
│   └── offline-sale.test.ts    # Offline sale flow tests
```

### Running Tests
```powershell
npm run test        # Run all tests
npm run test:watch  # Watch mode
npm run test:ui     # Vitest UI
```

### Test Coverage
- 83 tests across 4 files
- Covers: Cart store, Repositories, Sync service, Offline sales

---

## Build & Deployment

### Development
```powershell
npm run dev         # Start Vite + Electron
```

### Production Build
```powershell
npm run build       # Build for production
npm run preview     # Preview production build
```

### Package for Distribution
```powershell
npm run build:win   # Windows installer
npm run build:mac   # macOS DMG
npm run build:linux # Linux AppImage
```

### Output
- Windows: `release/[version]/POSMATE-Windows-[version]-Setup.exe`
- macOS: `release/[version]/POSMATE-Mac-[version]-Installer.dmg`
- Linux: `release/[version]/POSMATE-Linux-[version].AppImage`

### Environment Files
```
.env.development    # Development API (localhost or dev server)
.env.production     # Production API URL - MUST be set before building
```

**Important**: Always verify `.env.production` has the correct `VITE_API_BASE_URL` before running production builds.

---

## Quick Reference

### Cache Keys
```typescript
CacheKeys.AUTH_USER          // 'cache:auth:user'
CacheKeys.AUTH_BUSINESS      // 'cache:auth:business'
CacheKeys.AUTH_CURRENCY      // 'cache:auth:currency'
CacheKeys.POS_PAYMENT_TYPES  // 'cache:pos:payment-types'
CacheKeys.POS_VATS           // 'cache:pos:vats'
CacheKeys.PRODUCTS_BRANDS    // 'cache:products:brands'
CacheKeys.PRODUCTS_UNITS     // 'cache:products:units'
```

### IndexedDB Tables
```typescript
db.products     // LocalProduct[]
db.categories   // Category[]
db.parties      // Party[]
db.sales        // LocalSale[]
db.syncQueue    // SyncQueueEntry[]
db.metadata     // Key-value for lastSync times
```

### Important Stores
```typescript
useAuthStore()   // Auth state + actions
useCartStore()   // POS cart (persisted)
useSyncStore()   // Sync queue state
useUIStore()     // Theme, sidebar state
```

### Image URLs
```typescript
import { getImageUrl } from '@/lib/utils'

// Convert relative API paths to absolute URLs
const imageUrl = getImageUrl(product.productPicture)
// Input:  "/uploads/25/08/image.png"
// Output: "http://api.example.com/uploads/25/08/image.png"
```

---

## Notes for Future Development

1. **Adding New Cached Data**: Use `src/lib/cache/index.ts` with appropriate TTL
2. **New Offline Entities**: Add to IndexedDB schema, create repository, add to sync service
3. **New API Endpoints**: Create service in `src/api/services/`, add offline fallback in hook
4. **Testing Offline**: Use production build, not dev mode

---

## Storage Abstraction Layer (Added)

### December 2024

**Feature**: Created storage abstraction layer for future SQLite migration.

**Problem**: IndexedDB has limitations for POS applications:
- ~2GB storage limit
- No true ACID transactions
- Limited query capabilities
- No encryption support

**Solution**: Created adapter pattern for storage:

**Files Created**:
- `src/lib/storage/interface.ts` - TypeScript interfaces for all repositories
- `src/lib/storage/adapters/indexeddb.adapter.ts` - Current IndexedDB implementation
- `src/lib/storage/adapters/sqlite.adapter.ts` - SQLite placeholder for v2.0
- `src/lib/storage/index.ts` - Factory and main export
- `src/lib/storage/README.md` - Usage documentation

**Architecture**:
```
src/lib/storage/
├── index.ts           # Factory + default export
├── interface.ts       # StorageAdapter interface
└── adapters/
    ├── indexeddb.adapter.ts  # Wraps existing Dexie.js
    └── sqlite.adapter.ts     # Placeholder for v2.0
```

**Usage**:
```typescript
import { storage } from '@/lib/storage'

// All operations go through unified interface
const products = await storage.products.getAll()
await storage.sales.createOffline(saleData)
await storage.syncQueue.enqueue({ ... })
```

**Migration to SQLite (v2.0)**:
1. Install better-sqlite3
2. Complete sqlite.adapter.ts
3. Change export in index.ts
4. Run data migration

**Benefits**:
- Application code unchanged when switching databases
- Easier testing with mock adapters
- Type-safe operations
- Consistent API across adapters

---

*Last Updated: December 2024*
