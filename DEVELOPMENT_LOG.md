# Horix POS Pro - Development Log

> This document tracks development progress, architectural decisions, and implementation details for future reference.

---

## Project Overview

**Project**: Horix POS Pro - Desktop POS Client  
**Stack**: Electron 30+ | React 18 | TypeScript 5 | Vite | Tailwind CSS | shadcn/ui  
**Backend**: Laravel API (external)  
**Offline Storage**: IndexedDB (Dexie.js)  
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

### November 27, 2025

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
- Windows: `release/[version]/Horix POS Pro Setup.exe`
- macOS: `release/[version]/Horix POS Pro.dmg`
- Linux: `release/[version]/Horix POS Pro.AppImage`

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

---

## Notes for Future Development

1. **Adding New Cached Data**: Use `src/lib/cache/index.ts` with appropriate TTL
2. **New Offline Entities**: Add to IndexedDB schema, create repository, add to sync service
3. **New API Endpoints**: Create service in `src/api/services/`, add offline fallback in hook
4. **Testing Offline**: Use production build, not dev mode

---

*Last Updated: November 27, 2025*
