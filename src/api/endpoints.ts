// API Endpoints constants

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/sign-in',
    SIGN_UP: '/sign-up',
    SIGN_OUT: '/sign-out',
    SUBMIT_OTP: '/submit-otp',
    RESEND_OTP: '/resend-otp',
    REFRESH_TOKEN: '/refresh-token',
    MODULE_CHECK: '/module-check',
  },

  // Business & Profile
  BUSINESS: {
    GET: '/business',
    CREATE: '/business',
    UPDATE: (id: number) => `/business/${id}`,
    DELETE: '/business/delete',
    CATEGORIES: '/business-categories',
  },
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile',
    CHANGE_PASSWORD: '/profile/change-password',
  },

  // Products
  PRODUCTS: {
    LIST: '/products',
    GET: (id: number) => `/products/${id}`,
    CREATE: '/products',
    UPDATE: (id: number) => `/products/${id}`,
    DELETE: (id: number) => `/products/${id}`,
  },

  // Categories
  CATEGORIES: {
    LIST: '/categories',
    CREATE: '/categories',
    UPDATE: (id: number) => `/categories/${id}`,
    DELETE: (id: number) => `/categories/${id}`,
  },

  // Brands
  BRANDS: {
    LIST: '/brands',
    CREATE: '/brands',
    UPDATE: (id: number) => `/brands/${id}`,
    DELETE: (id: number) => `/brands/${id}`,
  },

  // Units
  UNITS: {
    LIST: '/units',
    CREATE: '/units',
    UPDATE: (id: number) => `/units/${id}`,
    DELETE: (id: number) => `/units/${id}`,
  },

  // Racks
  RACKS: {
    LIST: '/racks',
    CREATE: '/racks',
    UPDATE: (id: number) => `/racks/${id}`,
    DELETE: (id: number) => `/racks/${id}`,
  },

  // Shelves
  SHELVES: {
    LIST: '/shelves',
    CREATE: '/shelves',
    UPDATE: (id: number) => `/shelves/${id}`,
    DELETE: (id: number) => `/shelves/${id}`,
  },

  // Product Models
  PRODUCT_MODELS: {
    LIST: '/product-models',
    CREATE: '/product-models',
    UPDATE: (id: number) => `/product-models/${id}`,
    DELETE: (id: number) => `/product-models/${id}`,
  },

  // Parties (Customers/Suppliers)
  PARTIES: {
    LIST: '/parties',
    GET: (id: number) => `/parties/${id}`,
    CREATE: '/parties',
    UPDATE: (id: number) => `/parties/${id}`,
    DELETE: (id: number) => `/parties/${id}`,
  },

  // Sales
  SALES: {
    LIST: '/sales',
    GET: (id: number) => `/sales/${id}`,
    CREATE: '/sales',
    UPDATE: (id: number) => `/sales/${id}`,
    DELETE: (id: number) => `/sales/${id}`,
  },

  // Purchases
  PURCHASES: {
    LIST: '/purchase',
    GET: (id: number) => `/purchase/${id}`,
    CREATE: '/purchase',
    UPDATE: (id: number) => `/purchase/${id}`,
    DELETE: (id: number) => `/purchase/${id}`,
  },

  // Sale Returns
  SALE_RETURNS: {
    LIST: '/sale-returns',
    GET: (id: number) => `/sale-returns/${id}`,
    CREATE: '/sale-returns',
  },

  // Purchase Returns
  PURCHASE_RETURNS: {
    LIST: '/purchase-returns',
    GET: (id: number) => `/purchase-returns/${id}`,
    CREATE: '/purchase-returns',
  },

  // Due Collection
  DUES: {
    LIST: '/dues',
    CREATE: '/dues',
  },

  // Expenses
  EXPENSES: {
    LIST: '/expenses',
    CREATE: '/expenses',
    UPDATE: (id: number) => `/expenses/${id}`,
    DELETE: (id: number) => `/expenses/${id}`,
  },

  // Incomes
  INCOMES: {
    LIST: '/incomes',
    CREATE: '/incomes',
    UPDATE: (id: number) => `/incomes/${id}`,
    DELETE: (id: number) => `/incomes/${id}`,
  },

  // Expense Categories
  EXPENSE_CATEGORIES: {
    LIST: '/expense-categories',
    CREATE: '/expense-categories',
    UPDATE: (id: number) => `/expense-categories/${id}`,
    DELETE: (id: number) => `/expense-categories/${id}`,
  },

  // Income Categories
  INCOME_CATEGORIES: {
    LIST: '/income-categories',
    CREATE: '/income-categories',
    UPDATE: (id: number) => `/income-categories/${id}`,
    DELETE: (id: number) => `/income-categories/${id}`,
  },

  // VAT/Tax
  VATS: {
    LIST: '/vats',
    CREATE: '/vats',
    UPDATE: (id: number) => `/vats/${id}`,
    DELETE: (id: number) => `/vats/${id}`,
  },

  // Payment Types
  PAYMENT_TYPES: {
    LIST: '/payment-types',
    CREATE: '/payment-types',
    UPDATE: (id: number) => `/payment-types/${id}`,
    DELETE: (id: number) => `/payment-types/${id}`,
  },

  // Print Labels
  PRINT_LABELS: {
    LIST: '/print-labels',
    GET: (id: number) => `/print-labels/${id}`,
    CREATE: '/print-labels',
    UPDATE: (id: number) => `/print-labels/${id}`,
    DELETE: (id: number) => `/print-labels/${id}`,
    TOGGLE_STATUS: (id: number) => `/print-labels/${id}/status`,
    BULK_DELETE: '/print-labels/delete-all',
    CONFIG: '/print-labels/config',
    PRODUCTS: '/print-labels/products',
    GENERATE: '/print-labels/generate',
  },

  // Stocks
  STOCKS: {
    ADD: '/stocks',
    UPDATE: (id: number) => `/stocks/${id}`,
    DELETE: (id: number) => `/stocks/${id}`,
  },

  // Warehouses
  WAREHOUSES: {
    LIST: '/warehouses',
    CREATE: '/warehouses',
    UPDATE: (id: number) => `/warehouses/${id}`,
    DELETE: (id: number) => `/warehouses/${id}`,
  },

  // Currencies
  CURRENCIES: {
    LIST: '/currencies',
    CHANGE: (id: number) => `/currencies/${id}`,
  },

  // Invoices
  INVOICES: {
    GET_PARTY_INVOICES: '/invoices',
    NEW_INVOICE_NUMBER: '/new-invoice',
  },

  // Dashboard
  DASHBOARD: {
    SUMMARY: '/summary',
    STATS: '/dashboard',
  },

  // Users
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    UPDATE: (id: number) => `/users/${id}`,
    DELETE: (id: number) => `/users/${id}`,
  },

  // Settings
  SETTINGS: {
    PRODUCT: '/product-settings',
    INVOICE: '/invoice-settings',
    BUSINESS: '/business-settings',
  },

  // Bulk Upload
  BULK_UPLOAD: '/bulk-upload',

  // Attributes (Variant System)
  ATTRIBUTES: {
    LIST: '/attributes',
    GET: (id: number) => `/attributes/${id}`,
    CREATE: '/attributes',
    UPDATE: (id: number) => `/attributes/${id}`,
    DELETE: (id: number) => `/attributes/${id}`,
    ADD_VALUE: (id: number) => `/attributes/${id}/values`,
  },

  // Attribute Values
  ATTRIBUTE_VALUES: {
    UPDATE: (id: number) => `/attribute-values/${id}`,
    DELETE: (id: number) => `/attribute-values/${id}`,
  },

  // Product Variants
  VARIANTS: {
    LIST: (productId: number) => `/products/${productId}/variants`,
    CREATE: (productId: number) => `/products/${productId}/variants`,
    GENERATE: (productId: number) => `/products/${productId}/variants/generate`,
    FIND_BY_ATTRIBUTES: (productId: number) => `/products/${productId}/variants/find`,
    GET: (id: number) => `/variants/${id}`,
    UPDATE: (id: number) => `/variants/${id}`,
    DELETE: (id: number) => `/variants/${id}`,
    UPDATE_STOCK: (id: number) => `/variants/${id}/stock`,
    // Bulk operations
    BULK_UPDATE: (productId: number) => `/products/${productId}/variants/bulk`,
    // Utility endpoints
    DUPLICATE: (productId: number) => `/products/${productId}/variants/duplicate`,
    TOGGLE_ACTIVE: (id: number) => `/variants/${id}/toggle-active`,
    BY_BARCODE: (barcode: string) => `/variants/by-barcode/${barcode}`,
    STOCK_SUMMARY: (productId: number) => `/products/${productId}/variants/stock-summary`,
  },

  // Barcode Lookup (universal)
  BARCODE: {
    LOOKUP: (barcode: string) => `/products/by-barcode/${barcode}`,
  },

  // Variant Reports
  VARIANT_REPORTS: {
    SALES_SUMMARY: '/reports/variants/sales-summary',
    TOP_SELLING: '/reports/variants/top-selling',
    SLOW_MOVING: '/reports/variants/slow-moving',
  },
} as const
