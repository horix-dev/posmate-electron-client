# Horix POS Pro - Desktop Client Application Plan

## Project Overview

**Application Name:** Horix POS Pro Desktop Client  
**Tech Stack:** Electron.js + React + TypeScript  
**UI Framework:** shadcn/ui + Tailwind CSS  
**API Client:** Axios  
**Target Platforms:** Windows, macOS, Linux

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Feature Modules](#4-feature-modules)
5. [Offline-First Strategy](#5-offline-first-strategy)
6. [State Management](#6-state-management)
7. [Database & Storage](#7-database--storage)
8. [Security Considerations](#8-security-considerations)
9. [API Integration Layer](#9-api-integration-layer)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Print & Hardware Integration](#11-print--hardware-integration)
12. [Build & Distribution](#12-build--distribution)
13. [Development Phases](#13-development-phases)
14. [Testing Strategy](#14-testing-strategy)

---

## 1. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Electron Main Process                        │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │  IPC Handler  │  │  Auto Update  │  │  Native APIs        │  │
│  │               │  │  Module       │  │  (Print, FS, etc.)  │  │
│  └───────────────┘  └───────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │ IPC Bridge
┌─────────────────────────────────────────────────────────────────┐
│                   Electron Renderer Process                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React Application                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │   Pages/    │  │ Components  │  │   Contexts/     │   │  │
│  │  │   Views     │  │   (UI)      │  │   Providers     │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │   Hooks     │  │  Services   │  │   Zustand       │   │  │
│  │  │             │  │  (API)      │  │   Store         │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              IndexedDB (Dexie.js) - Offline Storage      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Laravel Backend API                        │
│                      (Base URL: /api/v1)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Process Communication

- **Main Process:** Handles system-level operations (file system, printing, auto-updates, native menus)
- **Renderer Process:** Runs the React application with full UI
- **IPC (Inter-Process Communication):** Secure bridge between main and renderer

---

## 2. Technology Stack

### Core Technologies

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | Electron 33+ | Desktop application wrapper |
| UI Framework | React 18+ | Component-based UI |
| Language | TypeScript 5+ | Type safety |
| Build Tool | Vite | Fast HMR, optimized builds |
| Electron Builder | electron-builder | Package & distribute |

### UI & Styling

| Package | Purpose |
|---------|---------|
| shadcn/ui | Pre-built accessible components |
| Tailwind CSS | Utility-first CSS |
| Radix UI | Headless UI primitives (via shadcn) |
| Lucide React | Icon library |
| class-variance-authority | Component variants |
| clsx + tailwind-merge | Class name utilities |

### State & Data Management

| Package | Purpose |
|---------|---------|
| Zustand | Lightweight global state management |
| TanStack Query (React Query) | Server state, caching, sync |
| Dexie.js | IndexedDB wrapper for offline storage |
| Immer | Immutable state updates |

### API & Networking

| Package | Purpose |
|---------|---------|
| Axios | HTTP client with interceptors |
| axios-retry | Automatic retry for failed requests |

### Forms & Validation

| Package | Purpose |
|---------|---------|
| React Hook Form | Performant form management |
| Zod | Schema validation |
| @hookform/resolvers | Zod integration with RHF |

### Tables & Data Display

| Package | Purpose |
|---------|---------|
| TanStack Table | Headless table with sorting, filtering, pagination |

### Date & Time

| Package | Purpose |
|---------|---------|
| date-fns | Date manipulation |
| react-day-picker | Date picker component |

### Printing

| Package | Purpose |
|---------|---------|
| electron-pos-printer | Thermal printer support |
| html2pdf.js | PDF generation for A4 invoices |

### Utilities

| Package | Purpose |
|---------|---------|
| uuid | Generate unique IDs for offline records |
| lodash-es | Utility functions (debounce, throttle, etc.) |
| numeral | Number formatting |

### Development & Testing

| Package | Purpose |
|---------|---------|
| Vitest | Unit testing |
| React Testing Library | Component testing |
| Playwright | E2E testing |
| ESLint + Prettier | Code quality |
| Husky + lint-staged | Pre-commit hooks |

---

## 3. Project Structure

```
posmate-custom-frontend/
├── electron/                          # Electron main process
│   ├── main.ts                        # Main entry point
│   ├── preload.ts                     # Preload script (context bridge)
│   ├── ipc/                           # IPC handlers
│   │   ├── index.ts
│   │   ├── print.handler.ts           # Printing IPC
│   │   ├── storage.handler.ts         # Secure storage IPC
│   │   └── update.handler.ts          # Auto-update IPC
│   ├── services/                      # Main process services
│   │   ├── printer.service.ts
│   │   ├── updater.service.ts
│   │   └── store.service.ts           # electron-store for settings
│   └── utils/
│       └── paths.ts
│
├── src/                               # React application (renderer)
│   ├── main.tsx                       # React entry point
│   ├── App.tsx                        # Root component
│   ├── vite-env.d.ts
│   │
│   ├── api/                           # API layer
│   │   ├── axios.ts                   # Axios instance & interceptors
│   │   ├── endpoints.ts               # API endpoint constants
│   │   └── services/                  # API service modules
│   │       ├── auth.service.ts
│   │       ├── products.service.ts
│   │       ├── sales.service.ts
│   │       ├── purchases.service.ts
│   │       ├── parties.service.ts
│   │       ├── categories.service.ts
│   │       ├── brands.service.ts
│   │       ├── units.service.ts
│   │       ├── stocks.service.ts
│   │       ├── expenses.service.ts
│   │       ├── incomes.service.ts
│   │       ├── dashboard.service.ts
│   │       ├── settings.service.ts
│   │       └── index.ts
│   │
│   ├── components/                    # Reusable components
│   │   ├── ui/                        # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── table.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── ... (other shadcn components)
│   │   │   └── index.ts
│   │   ├── common/                    # Shared components
│   │   │   ├── AppShell.tsx           # Main layout wrapper
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── OfflineIndicator.tsx
│   │   │   ├── SyncStatus.tsx
│   │   │   ├── DataTable.tsx          # Reusable table component
│   │   │   ├── SearchInput.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── CurrencyDisplay.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── forms/                     # Form components
│   │   │   ├── ProductForm.tsx
│   │   │   ├── PartyForm.tsx
│   │   │   ├── CategoryForm.tsx
│   │   │   └── ...
│   │   └── pos/                       # POS-specific components
│   │       ├── ProductGrid.tsx
│   │       ├── CartPanel.tsx
│   │       ├── CartItem.tsx
│   │       ├── PaymentDialog.tsx
│   │       ├── CustomerSelect.tsx
│   │       ├── BarcodeScanner.tsx
│   │       └── ReceiptPreview.tsx
│   │
│   ├── contexts/                      # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── BusinessContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── db/                            # IndexedDB (Dexie)
│   │   ├── database.ts                # Dexie database definition
│   │   ├── schemas/                   # Table schemas
│   │   │   ├── products.schema.ts
│   │   │   ├── sales.schema.ts
│   │   │   ├── parties.schema.ts
│   │   │   └── sync-queue.schema.ts
│   │   ├── repositories/              # Data access layer
│   │   │   ├── products.repository.ts
│   │   │   ├── sales.repository.ts
│   │   │   └── sync.repository.ts
│   │   └── migrations/                # DB version migrations
│   │
│   ├── features/                      # Feature-based modules
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── SignUpPage.tsx
│   │   │   │   └── OtpPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   └── components/
│   │   │       └── LoginForm.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── pages/
│   │   │   │   └── DashboardPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── SummaryCards.tsx
│   │   │   │   ├── SalesChart.tsx
│   │   │   │   └── RecentTransactions.tsx
│   │   │   └── hooks/
│   │   │       └── useDashboard.ts
│   │   │
│   │   ├── pos/                       # Point of Sale module
│   │   │   ├── pages/
│   │   │   │   └── POSPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── POSLayout.tsx
│   │   │   │   ├── ProductSearch.tsx
│   │   │   │   ├── CategoryFilter.tsx
│   │   │   │   └── QuickActions.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCart.ts
│   │   │   │   ├── usePOS.ts
│   │   │   │   └── useBarcode.ts
│   │   │   └── store/
│   │   │       └── cart.store.ts
│   │   │
│   │   ├── products/
│   │   │   ├── pages/
│   │   │   │   ├── ProductsListPage.tsx
│   │   │   │   ├── ProductDetailPage.tsx
│   │   │   │   └── ProductFormPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ProductsTable.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   └── StockBadge.tsx
│   │   │   └── hooks/
│   │   │       ├── useProducts.ts
│   │   │       └── useProductMutations.ts
│   │   │
│   │   ├── sales/
│   │   │   ├── pages/
│   │   │   │   ├── SalesListPage.tsx
│   │   │   │   └── SaleDetailPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── SalesTable.tsx
│   │   │   │   └── SaleInvoice.tsx
│   │   │   └── hooks/
│   │   │       └── useSales.ts
│   │   │
│   │   ├── purchases/
│   │   │   ├── pages/
│   │   │   │   ├── PurchasesListPage.tsx
│   │   │   │   ├── PurchaseDetailPage.tsx
│   │   │   │   └── PurchaseFormPage.tsx
│   │   │   └── hooks/
│   │   │       └── usePurchases.ts
│   │   │
│   │   ├── parties/
│   │   │   ├── pages/
│   │   │   │   ├── PartiesListPage.tsx
│   │   │   │   └── PartyDetailPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── PartiesTable.tsx
│   │   │   │   └── DueBadge.tsx
│   │   │   └── hooks/
│   │   │       └── useParties.ts
│   │   │
│   │   ├── inventory/
│   │   │   ├── pages/
│   │   │   │   ├── StocksPage.tsx
│   │   │   │   ├── CategoriesPage.tsx
│   │   │   │   ├── BrandsPage.tsx
│   │   │   │   ├── UnitsPage.tsx
│   │   │   │   └── WarehousesPage.tsx
│   │   │   └── hooks/
│   │   │       └── useInventory.ts
│   │   │
│   │   ├── finance/
│   │   │   ├── pages/
│   │   │   │   ├── ExpensesPage.tsx
│   │   │   │   ├── IncomesPage.tsx
│   │   │   │   └── DueCollectionPage.tsx
│   │   │   └── hooks/
│   │   │       └── useFinance.ts
│   │   │
│   │   ├── returns/
│   │   │   ├── pages/
│   │   │   │   ├── SaleReturnsPage.tsx
│   │   │   │   └── PurchaseReturnsPage.tsx
│   │   │   └── hooks/
│   │   │       └── useReturns.ts
│   │   │
│   │   ├── reports/
│   │   │   ├── pages/
│   │   │   │   └── ReportsPage.tsx
│   │   │   └── components/
│   │   │       ├── SalesReport.tsx
│   │   │       ├── PurchaseReport.tsx
│   │   │       └── ProfitLossReport.tsx
│   │   │
│   │   └── settings/
│   │       ├── pages/
│   │       │   ├── SettingsPage.tsx
│   │       │   ├── ProfilePage.tsx
│   │       │   ├── BusinessSettingsPage.tsx
│   │       │   ├── InvoiceSettingsPage.tsx
│   │       │   └── UsersPage.tsx
│   │       └── hooks/
│   │           └── useSettings.ts
│   │
│   ├── hooks/                         # Global hooks
│   │   ├── useApi.ts                  # API wrapper hook
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useOnlineStatus.ts
│   │   ├── useSync.ts                 # Sync management
│   │   └── usePrint.ts                # Printing hook
│   │
│   ├── lib/                           # Utility libraries
│   │   ├── utils.ts                   # shadcn utils (cn function)
│   │   ├── constants.ts
│   │   ├── formatters.ts              # Currency, date formatters
│   │   ├── validators.ts              # Zod schemas
│   │   └── calculations.ts            # Price, tax calculations
│   │
│   ├── routes/                        # Routing
│   │   ├── index.tsx                  # Route definitions
│   │   ├── ProtectedRoute.tsx
│   │   └── routes.ts                  # Route constants
│   │
│   ├── store/                         # Zustand stores
│   │   ├── auth.store.ts
│   │   ├── business.store.ts
│   │   ├── cart.store.ts
│   │   ├── sync.store.ts
│   │   ├── ui.store.ts
│   │   └── index.ts
│   │
│   ├── styles/                        # Global styles
│   │   ├── globals.css                # Tailwind + custom CSS
│   │   └── print.css                  # Print-specific styles
│   │
│   └── types/                         # TypeScript types
│       ├── api.types.ts               # API response types
│       ├── models/                    # Domain models
│       │   ├── product.model.ts
│       │   ├── sale.model.ts
│       │   ├── party.model.ts
│       │   ├── purchase.model.ts
│       │   └── ...
│       ├── store.types.ts
│       └── electron.d.ts              # Electron IPC types
│
├── public/                            # Static assets
│   ├── icons/                         # App icons
│   └── images/
│
├── resources/                         # Electron resources
│   ├── icon.ico                       # Windows icon
│   ├── icon.icns                      # macOS icon
│   └── icon.png                       # Linux icon
│
├── tests/                             # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example                       # Environment template
├── .env.development
├── .env.production
├── .eslintrc.cjs
├── .prettierrc
├── components.json                    # shadcn config
├── electron-builder.yml               # Build configuration
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 4. Feature Modules

### 4.1 Authentication Module

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Login | Email/password authentication | `POST /login` |
| Sign Up | New user registration | `POST /sign-up` |
| OTP Verification | Email verification | `POST /submit-otp`, `POST /resend-otp` |
| Sign Out | Token invalidation | `POST /sign-out` |
| Token Refresh | Auto token renewal | `POST /refresh-token` |
| Session Persistence | Remember me functionality | Local secure storage |

### 4.2 Dashboard Module

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Today's Summary | Sales, income, expense, purchase totals | `GET /summary` |
| Charts | Sales & purchase trends | `GET /dashboard` |
| Quick Stats | Stock value, total due, profit/loss | `GET /dashboard` |
| Recent Transactions | Latest sales/purchases | Combined from sales/purchases APIs |

### 4.3 Point of Sale (POS) Module

| Feature | Description |
|---------|-------------|
| Product Grid | Visual product selection with images |
| Category Filtering | Quick filter by category |
| Product Search | Real-time search by name/code |
| Barcode Scanning | USB/camera barcode input |
| Cart Management | Add, remove, update quantities |
| Price Types | Retail, dealer, wholesale switching |
| Discount Application | Per-item and total discounts |
| Tax Calculation | Automatic VAT computation |
| Customer Selection | Quick customer lookup/creation |
| Multiple Payment Types | Cash, card, split payments |
| Change Calculation | Automatic change computation |
| Receipt Printing | Thermal & A4 invoice printing |
| Offline Sales | Queue sales when offline |
| Hold & Recall | Save and retrieve pending sales |

### 4.4 Products Module

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Product List | Paginated, searchable list | `GET /products` |
| Product CRUD | Create, read, update, delete | `POST/PUT/DELETE /products` |
| Variant Support | Multiple SKUs per product | Product variants |
| Stock Management | View and adjust stock levels | `GET/PUT /stocks` |
| Low Stock Alerts | Visual indicators for low stock | Alert qty logic |
| Bulk Upload | Excel/CSV import | `POST /bulk-upload` |
| Image Management | Product image upload | Multipart form |

### 4.5 Inventory Module

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Categories | Category CRUD | `/categories` |
| Brands | Brand CRUD | `/brands` |
| Units | Unit CRUD | `/units` |
| Product Models | Model CRUD | `/product-models` |
| Warehouses | Warehouse management | `/warehouses` |
| Stock Adjustments | Manual stock corrections | `/stocks` |

### 4.6 Sales Module

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Sales List | Filterable sales history | `GET /sales` |
| Sale Details | Full sale information | `GET /sales/{id}` |
| Sale Edit | Modify non-returned sales | `PUT /sales/{id}` |
| Sale Delete | Remove sales (stock restored) | `DELETE /sales/{id}` |
| Invoice Print | Print/reprint invoices | N/A (local) |
| Sale Returns | Process returns | `/sale-returns` |

### 4.7 Purchases Module

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Purchase List | Purchase history | `GET /purchases` |
| Create Purchase | New purchase entry | `POST /purchases` |
| Stock Updates | Auto stock increment | Via purchase creation |
| Purchase Returns | Return to supplier | `/purchase-returns` |
| Supplier Management | Via parties module | `/parties` |

### 4.8 Parties Module

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Customer List | All customers (Retailer/Dealer/Wholesaler) | `GET /parties` |
| Supplier List | All suppliers | `GET /parties` |
| Party CRUD | Create, update, delete | `POST/PUT/DELETE /parties` |
| Due Tracking | Outstanding balances | Via party data |
| Credit Limits | Enforce credit limits | Credit limit field |
| Due Collection | Record payments | `/dues` |

### 4.9 Finance Module

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Expenses | Record business expenses | `/expenses` |
| Incomes | Record other income | `/incomes` |
| Expense Categories | Categorize expenses | `/expense-categories` |
| Income Categories | Categorize income | `/income-categories` |
| Due Collection | Collect outstanding dues | `/dues` |

### 4.10 Settings Module

| Feature | Description | API Endpoints |
|---------|-------------|---------------|
| Business Profile | Update business info | `PUT /business/{id}` |
| User Profile | Personal settings | `/profile` |
| Invoice Settings | Invoice size, logo, notes | `/invoice-settings` |
| Product Settings | Toggle field visibility | `/product-settings` |
| VAT/Tax Setup | Tax rate configuration | `/vats` |
| Payment Types | Payment method setup | `/payment-types` |
| Staff Management | User CRUD | `/users` |
| Currency | Change business currency | `/currencies` |

---

## 5. Offline-First Strategy

### 5.1 Data Classification

| Data Type | Sync Strategy | Storage |
|-----------|---------------|---------|
| Master Data | Sync on login + periodic | IndexedDB |
| Products | Full sync + incremental | IndexedDB |
| Parties | Full sync + incremental | IndexedDB |
| Categories/Brands/Units | Full sync | IndexedDB |
| Payment Types | Full sync | IndexedDB |
| VAT Rates | Full sync | IndexedDB |
| Sales | Offline queue → sync | IndexedDB |
| Purchases | Online only | N/A |
| Settings | Sync on change | IndexedDB |

### 5.2 Sync Queue Structure

```typescript
interface SyncQueueItem {
  id: string;                              // UUID
  type: 'sale' | 'party' | 'product';      // Entity type
  action: 'create' | 'update' | 'delete';  // Action
  payload: object;                         // Full data
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  retryCount: number;
  createdAt: Date;
  lastAttemptAt: Date | null;
  errorMessage: string | null;
  serverId: number | null;                 // Assigned after sync
}
```

### 5.3 Offline Sale Flow

```
┌──────────────────┐
│  Create Sale     │
│  (POS Screen)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Check Online    │─No──│  Save to         │
│  Status          │     │  IndexedDB       │
└────────┬─────────┘     │  + Sync Queue    │
         │Yes            └────────┬─────────┘
         ▼                        │
┌──────────────────┐              │
│  POST to API     │              │
└────────┬─────────┘              │
         │                        │
    Success/Fail                  │
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│  Save to         │     │  Show Pending    │
│  IndexedDB       │     │  Sync Indicator  │
└──────────────────┘     └──────────────────┘
```

### 5.4 Invoice Number Generation (Offline)

```typescript
// Format: {DEVICE_ID}-{TYPE}-{TIMESTAMP}-{SEQUENCE}
// Example: D1-S-20250126-001

interface InvoiceNumberConfig {
  deviceId: string;       // Unique per device installation
  prefix: string;         // S for sale, P for purchase
  date: string;          // YYYYMMDD
  sequence: number;       // Daily sequence counter
}
```

### 5.5 Conflict Resolution

- **Strategy:** Server-wins with local backup
- **Conflicts detected by:** Comparing `updated_at` timestamps
- **User notification:** Toast with option to review conflicts

---

## 6. State Management

### 6.1 Zustand Store Architecture

```typescript
// Store slices
├── authStore          // User, token, permissions
├── businessStore      // Business info, settings, currency
├── cartStore          // POS cart state
├── syncStore          // Sync queue, online status
├── uiStore            // Sidebar, modals, toasts
└── settingsStore      // App preferences
```

### 6.2 Auth Store

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
}
```

### 6.3 Cart Store

```typescript
interface CartState {
  items: CartItem[];
  customer: Party | null;
  paymentType: PaymentType | null;
  discount: number;
  discountType: 'fixed' | 'percentage';
  vat: Vat | null;
  note: string;
  
  // Computed
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  
  // Actions
  addItem: (product: Product, stock: Stock, priceType: PriceType) => void;
  removeItem: (stockId: number) => void;
  updateQuantity: (stockId: number, quantity: number) => void;
  setCustomer: (customer: Party | null) => void;
  setDiscount: (amount: number, type: 'fixed' | 'percentage') => void;
  clearCart: () => void;
  holdCart: () => void;
  recallCart: (cartId: string) => void;
}
```

### 6.4 React Query Integration

- **Queries:** Fetch and cache API data
- **Mutations:** Create/update/delete with optimistic updates
- **Invalidation:** Smart cache invalidation on mutations
- **Offline support:** Persist query cache to IndexedDB

---

## 7. Database & Storage

### 7.1 IndexedDB Schema (Dexie.js)

```typescript
class PosDatabase extends Dexie {
  products!: Table<Product>;
  stocks!: Table<Stock>;
  categories!: Table<Category>;
  brands!: Table<Brand>;
  units!: Table<Unit>;
  parties!: Table<Party>;
  sales!: Table<Sale>;
  saleDetails!: Table<SaleDetail>;
  paymentTypes!: Table<PaymentType>;
  vats!: Table<Vat>;
  syncQueue!: Table<SyncQueueItem>;
  heldCarts!: Table<HeldCart>;
  settings!: Table<Setting>;
  
  constructor() {
    super('HorixPOS');
    this.version(1).stores({
      products: 'id, productCode, productName, category_id, brand_id',
      stocks: 'id, product_id, batch_no, warehouse_id',
      categories: 'id, categoryName',
      brands: 'id, brandName',
      units: 'id, unitName',
      parties: 'id, name, phone, type',
      sales: 'id, invoiceNumber, saleDate, party_id, syncStatus',
      saleDetails: 'id, sale_id, product_id, stock_id',
      paymentTypes: 'id, name',
      vats: 'id, name, rate',
      syncQueue: 'id, type, status, createdAt',
      heldCarts: 'id, createdAt',
      settings: 'key',
    });
  }
}
```

### 7.2 Electron Store (Secure Settings)

```typescript
// Stored in encrypted electron-store
interface SecureSettings {
  apiBaseUrl: string;
  authToken: string;
  refreshToken: string;
  deviceId: string;
  lastSyncTimestamp: string;
  printerConfig: PrinterConfig;
}
```

---

## 8. Security Considerations

### 8.1 Token Management

- Store tokens in electron-store (encrypted)
- Auto-refresh before expiration
- Clear tokens on logout
- Secure IPC for token access

### 8.2 Context Isolation

```typescript
// preload.ts - Expose only necessary APIs
contextBridge.exposeInMainWorld('electronAPI', {
  print: (data: PrintData) => ipcRenderer.invoke('print', data),
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  secureStore: {
    get: (key: string) => ipcRenderer.invoke('secure-store-get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('secure-store-set', key, value),
  },
  onUpdateAvailable: (callback: Function) => ipcRenderer.on('update-available', callback),
});
```

### 8.3 API Security

- HTTPS only in production
- Request signing for sensitive operations
- Rate limiting awareness
- Input sanitization

---

## 9. API Integration Layer

### 9.1 Axios Configuration

```typescript
// axios.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors, token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await authStore.getState().refreshToken();
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### 9.2 Service Pattern

```typescript
// products.service.ts
export const productsService = {
  getAll: async (): Promise<ApiResponse<Product[]>> => {
    const { data } = await api.get('/products');
    return data;
  },
  
  getById: async (id: number): Promise<ApiResponse<Product>> => {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },
  
  create: async (product: CreateProductDto): Promise<ApiResponse<Product>> => {
    const formData = new FormData();
    // ... build form data
    const { data } = await api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  
  update: async (id: number, product: UpdateProductDto): Promise<ApiResponse<Product>> => {
    const { data } = await api.put(`/products/${id}`, product);
    return data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};
```

### 9.3 React Query Hooks

```typescript
// useProducts.ts
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productsService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
  });
}
```

---

## 10. UI/UX Design System

### 10.1 shadcn Components to Install

```bash
# Core components
npx shadcn@latest add button input label textarea
npx shadcn@latest add card dialog sheet
npx shadcn@latest add dropdown-menu menubar context-menu
npx shadcn@latest add table tabs accordion
npx shadcn@latest add select combobox checkbox radio-group switch
npx shadcn@latest add toast sonner alert alert-dialog
npx shadcn@latest add avatar badge separator skeleton
npx shadcn@latest add form calendar popover
npx shadcn@latest add scroll-area resizable
npx shadcn@latest add command # For search/command palette
npx shadcn@latest add navigation-menu breadcrumb
npx shadcn@latest add tooltip hover-card
npx shadcn@latest add progress spinner
```

### 10.2 Theme Configuration

```typescript
// tailwind.config.js - Extended for POS
{
  theme: {
    extend: {
      colors: {
        // Custom POS colors
        pos: {
          primary: 'hsl(var(--pos-primary))',
          success: 'hsl(var(--pos-success))',
          warning: 'hsl(var(--pos-warning))',
          danger: 'hsl(var(--pos-danger))',
        },
      },
      // Touch-friendly sizing
      spacing: {
        'touch': '44px', // Minimum touch target
      },
    },
  },
}
```

### 10.3 Layout Patterns

**Main Application Shell:**
```
┌────────────────────────────────────────────────────────────┐
│  Header (Business name, user, sync status, offline badge) │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                 │
│ Sidebar  │              Main Content Area                  │
│ (Nav)    │                                                 │
│          │                                                 │
│          │                                                 │
│          │                                                 │
│          │                                                 │
└──────────┴─────────────────────────────────────────────────┘
```

**POS Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  POS Header (Search, Category filters, View toggle)        │
├───────────────────────────────────┬────────────────────────┤
│                                   │                        │
│  Product Grid / List              │  Cart Panel            │
│  (Scrollable)                     │  - Customer            │
│                                   │  - Items               │
│                                   │  - Subtotal            │
│                                   │  - Discount            │
│                                   │  - VAT                 │
│                                   │  - Total               │
│                                   │  - Payment Buttons     │
├───────────────────────────────────┴────────────────────────┤
│  Quick Actions Bar (Hold, Recall, Clear, etc.)             │
└────────────────────────────────────────────────────────────┘
```

### 10.4 Responsive Considerations

- **Desktop-first:** Primary target is desktop/laptop
- **Touch support:** Large touch targets for touchscreen POS
- **Keyboard shortcuts:** Power-user efficiency
- **High contrast:** Readable in various lighting conditions

---

## 11. Print & Hardware Integration

### 11.1 Thermal Printer Support

```typescript
// Print service via Electron IPC
interface PrintOptions {
  type: 'thermal' | 'a4';
  copies: number;
  printerName?: string;
  silent: boolean;
}

interface ThermalReceiptData {
  businessName: string;
  businessAddress: string;
  invoiceNumber: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paid: number;
  change: number;
  customerName?: string;
  note?: string;
  footer?: string;
}
```

### 11.2 Barcode Scanner

- USB HID barcode scanners (keyboard mode)
- Camera-based scanning (optional)
- Keyboard event listeners for input capture

### 11.3 Cash Drawer

- Trigger via ESC/POS commands
- Connected through thermal printer

---

## 12. Build & Distribution

### 12.1 Electron Builder Configuration

```yaml
# electron-builder.yml
appId: com.horix.pospro
productName: Horix POS Pro
directories:
  output: dist-electron
  
files:
  - dist/**/*
  - electron/**/*
  - package.json

win:
  target:
    - nsis
    - portable
  icon: resources/icon.ico

mac:
  target:
    - dmg
    - zip
  icon: resources/icon.icns
  category: public.app-category.business

linux:
  target:
    - AppImage
    - deb
  icon: resources/icon.png
  category: Office

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: resources/icon.ico

publish:
  provider: github
  releaseType: release
```

### 12.2 Auto-Update

- GitHub Releases as update source
- Differential updates when possible
- User notification before update
- Rollback capability

---

## 13. Development Phases

### Phase 1: Foundation (Week 1-2) ✅ COMPLETED

- [x] Project setup (Vite + Electron + React + TypeScript)
- [x] Configure Tailwind CSS + shadcn/ui
- [x] Setup ESLint, Prettier, Husky
- [x] Implement Electron main process structure
- [x] Setup IPC communication
- [x] Configure Axios with interceptors
- [x] Implement authentication flow
- [x] Create base layout components (Shell, Sidebar, Header)
- [x] Setup routing with protected routes

### Phase 2: Core Data Layer (Week 2-3) ✅ COMPLETED

- [x] Setup Dexie.js database schema (`src/lib/db/schema.ts`)
- [x] Implement React Query configuration
- [x] Create API services for all endpoints (`src/api/services/`)
- [x] Build data repositories for offline storage (`src/lib/db/repositories/`)
- [x] Implement sync queue mechanism (`src/lib/db/services/sync.service.ts`)
- [x] Create online/offline status detection (`src/stores/sync.store.ts`)
- [x] Build sync management system (`src/lib/db/services/dataSync.service.ts`)
- [x] Offline request handler with auto-queueing (`src/api/offlineHandler.ts`)

### Phase 3: Dashboard & Settings (Week 3-4)

- [x] Dashboard page with summary cards
- [ ] Dashboard charts (sales/purchase trends)
- [ ] Business settings page
- [ ] Profile settings
- [ ] Invoice settings
- [ ] User management (staff CRUD)
- [ ] VAT/Tax configuration
- [ ] Payment types management

### Phase 4: Inventory Management (Week 4-5)

- [ ] Products list with search/filter
- [ ] Product create/edit forms
- [ ] Product variants support
- [ ] Categories CRUD
- [ ] Brands CRUD
- [ ] Units CRUD
- [ ] Stock management
- [ ] Bulk upload feature
- [ ] Low stock alerts

### Phase 5: Parties Module (Week 5-6)

- [ ] Customers list (Retailer/Dealer/Wholesaler)
- [ ] Suppliers list
- [ ] Party create/edit forms
- [ ] Party detail view with transaction history
- [ ] Due tracking display
- [ ] Credit limit enforcement
- [ ] Due collection feature

### Phase 6: Point of Sale (Week 6-8) ✅ MOSTLY COMPLETED

- [x] POS layout implementation (responsive flex layout)
- [x] Product grid/list views with toggle
- [x] Category filtering (combobox dropdown)
- [x] Real-time search
- [x] Cart management (Zustand store)
- [x] Price type switching
- [x] Discount application (per-item and total)
- [x] VAT calculation
- [x] Customer selection in cart
- [x] Payment dialog (multiple payment types)
- [x] Change calculation
- [x] Hold/Recall cart feature (with IndexedDB persistence)
- [x] Keyboard shortcuts (with help dialog)
- [x] Barcode scanner integration
- [x] Offline sale creation (IndexedDB + sync queue)
- [x] Sale success flow
- [ ] Receipt printing (thermal & A4)

### Phase 7: Sales & Purchases (Week 8-9)

- [x] Sales history list
- [x] Sale detail view
- [x] Sale filters (date range, payment status, sync status)
- [x] Sale delete with confirmation
- [x] Offline sales display and sync status
- [ ] Sale edit (non-returned)
- [ ] Sale returns
- [ ] Purchase list
- [ ] Purchase create form
- [ ] Purchase returns

### Phase 8: Finance Module (Week 9-10)

- [ ] Expenses list & create
- [ ] Expense categories
- [ ] Incomes list & create
- [ ] Income categories
- [ ] Due collection workflow

### Phase 9: Printing & Reports (Week 10-11)

- [ ] Thermal receipt template
- [ ] A4 invoice template
- [ ] Print preview
- [ ] Printer configuration
- [ ] Cash drawer trigger
- [ ] Basic reports
  - Sales report
  - Purchase report
  - Profit/Loss report
  - Stock report

### Phase 10: Polish & Testing (Week 11-12)

- [ ] Unit tests for critical functions
- [ ] Integration tests for API layer
- [ ] E2E tests for critical flows
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Loading states refinement
- [ ] Offline mode testing
- [ ] Cross-platform testing
- [ ] Bug fixes
- [ ] **Hybrid file backup for offline sales** (JSON backup in addition to IndexedDB)

### Phase 11: Deployment (Week 12)

- [ ] Production build optimization
- [ ] Code signing (Windows/macOS)
- [ ] Auto-update configuration
- [ ] Installer customization
- [ ] Documentation
- [ ] Release process

---

## 14. Testing Strategy

### 14.1 Unit Tests (Vitest)

- Utility functions (formatters, calculations)
- Zustand store actions
- React Query hooks (mocked)
- Form validation schemas

### 14.2 Integration Tests

- API service functions
- Database operations (Dexie)
- Sync queue processing

### 14.3 E2E Tests (Playwright)

- Authentication flow
- POS sale creation
- Product CRUD
- Offline sale → sync flow

### 14.4 Manual Testing Checklist

- [ ] Thermal printer printing
- [ ] A4 invoice printing
- [ ] Barcode scanner input
- [ ] Offline mode behavior
- [ ] Sync after reconnection
- [ ] Multi-window prevention
- [ ] Auto-update flow

---

## Appendix: Key Commands

```bash
# Development
npm run dev              # Start Vite + Electron in dev mode
npm run dev:react        # Start only React (browser)

# Build
npm run build            # Build for production
npm run build:win        # Build Windows installer
npm run build:mac        # Build macOS DMG
npm run build:linux      # Build Linux AppImage

# Test
npm run test             # Run unit tests
npm run test:e2e         # Run E2E tests
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format
npm run typecheck        # TypeScript check

# shadcn
npx shadcn@latest add [component]  # Add component
```

---

## Notes & Decisions Log

| Decision | Rationale |
|----------|-----------|
| Zustand over Redux | Simpler API, less boilerplate, sufficient for app scale |
| Dexie.js over raw IndexedDB | Better DX, query building, migrations |
| React Query for server state | Caching, sync, offline support built-in |
| Vite over CRA/Webpack | Faster HMR, better Electron integration |
| Feature-based structure | Scalability, co-location of related code |
| electron-builder | Comprehensive cross-platform building |

---

*Document Version: 1.0*  
*Last Updated: November 26, 2025*

---

## Implementation Status Log

### ✅ Completed Features

#### Core Data Layer (Phase 2)
| Component | File | Status |
|-----------|------|--------|
| IndexedDB Schema | `src/lib/db/schema.ts` | ✅ Complete |
| Base Repository | `src/lib/db/repositories/base.repository.ts` | ✅ Complete |
| Product Repository | `src/lib/db/repositories/product.repository.ts` | ✅ Complete |
| Sale Repository | `src/lib/db/repositories/sale.repository.ts` | ✅ Complete |
| SyncQueue Repository | `src/lib/db/repositories/syncQueue.repository.ts` | ✅ Complete |
| HeldCart Repository | `src/lib/db/repositories/heldCart.repository.ts` | ✅ Complete |
| Sync Service | `src/lib/db/services/sync.service.ts` | ✅ Complete |
| Data Sync Service | `src/lib/db/services/dataSync.service.ts` | ✅ Complete |
| Offline Handler | `src/api/offlineHandler.ts` | ✅ Complete |
| Sync Store | `src/stores/sync.store.ts` | ✅ Enhanced |

#### Point of Sale (Phase 6)
| Component | File | Status |
|-----------|------|--------|
| POS Page | `src/pages/pos/POSPage.tsx` | ✅ Complete |
| Product Grid | `src/pages/pos/components/ProductGrid.tsx` | ✅ Complete |
| Cart Panel | `src/pages/pos/components/CartPanel.tsx` | ✅ Complete |
| POS Header | `src/pages/pos/components/POSHeader.tsx` | ✅ Complete |
| Payment Dialog | `src/pages/pos/components/PaymentDialog.tsx` | ✅ Complete |
| Keyboard Help | `src/pages/pos/components/KeyboardShortcutsHelp.tsx` | ✅ Complete |
| usePOSData Hook | `src/pages/pos/hooks/usePOSData.ts` | ✅ Complete |
| useBarcodeScanner Hook | `src/pages/pos/hooks/useBarcodeScanner.ts` | ✅ Complete |
| usePOSKeyboard Hook | `src/pages/pos/hooks/usePOSKeyboard.ts` | ✅ Complete |
| Cart Store | `src/stores/cart.store.ts` | ✅ Enhanced with IndexedDB |
| Offline Sales Service | `src/api/services/offlineSales.service.ts` | ✅ Complete |

#### Sales Module (Phase 7)
| Component | File | Status |
|-----------|------|--------|
| Sales Page | `src/pages/sales/SalesPage.tsx` | ✅ Complete |
| useSales Hook | `src/pages/sales/hooks/useSales.ts` | ✅ Complete |
| Sales Stats Cards | `src/pages/sales/components/SalesStatsCards.tsx` | ✅ Complete |
| Sales Filters Bar | `src/pages/sales/components/SalesFiltersBar.tsx` | ✅ Complete |
| Sales Table | `src/pages/sales/components/SalesTable.tsx` | ✅ Complete |
| Sale Details Dialog | `src/pages/sales/components/SaleDetailsDialog.tsx` | ✅ Complete |
| Delete Sale Dialog | `src/pages/sales/components/DeleteSaleDialog.tsx` | ✅ Complete |

#### Offline Support Features
- ✅ IndexedDB storage with Dexie.js
- ✅ Offline detection (navigator.onLine)
- ✅ Automatic request interception when offline
- ✅ Sync queue with exponential backoff retry
- ✅ Held carts persisted to IndexedDB
- ✅ Offline sale creation with temp invoice numbers
- ✅ Auto-sync on reconnection
- ✅ Initial data sync on app start

### 📋 Documentation Created
| Document | Purpose |
|----------|---------|
| `OFFLINE_IMPLEMENTATION.md` | Detailed offline architecture documentation |
| `TESTING_OFFLINE.md` | Guide for testing offline functionality |

### 🔧 Key Architectural Decisions Made
1. **Repository Pattern**: Clean separation of data access from business logic
2. **Service Layer**: Sync services handle retry logic with exponential backoff
3. **Store Enhancement**: Zustand stores enhanced with IndexedDB persistence
4. **Offline-First**: Request interceptor queues mutations when offline
5. **Dual Storage**: Critical data (held carts) stored in both localStorage and IndexedDB

*Last Implementation Update: Current Session*
