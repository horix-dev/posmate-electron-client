/**
 * Permission Types for Horix POS Pro
 *
 * Corresponds to Laravel backend permission system
 * Based on USER_PERMISSIONS_DOCUMENTATION.md
 */

// ============================================
// Permission Action Types
// ============================================

export type PermissionAction = 'r' | 'c' | 'u' | 'd' | 'price'

export type PermissionValue = '1' | '0' | true | false

// ============================================
// Module Permission Structure
// ============================================

export interface ModulePermissions {
  r?: PermissionValue // Read
  c?: PermissionValue // Create
  u?: PermissionValue // Update
  d?: PermissionValue // Delete
  price?: PermissionValue // Price visibility (special)
}

// ============================================
// Complete Visibility Structure
// ============================================

export interface UserVisibility {
  // Core POS Modules
  dashboard?: ModulePermissions
  sales?: ModulePermissions
  inventory?: ModulePermissions
  'sale-returns'?: ModulePermissions
  purchases?: ModulePermissions
  'purchase-returns'?: ModulePermissions

  // Product Management
  products?: ModulePermissions
  'products-expired'?: ModulePermissions
  barcodes?: ModulePermissions
  'bulk-uploads'?: ModulePermissions
  categories?: ModulePermissions
  brands?: ModulePermissions
  units?: ModulePermissions
  'product-models'?: ModulePermissions
  stocks?: ModulePermissions
  'expired-products'?: ModulePermissions

  // Customer/Supplier Management
  parties?: ModulePermissions
  dues?: ModulePermissions

  // Financial Modules
  incomes?: ModulePermissions
  'income-categories'?: ModulePermissions
  expenses?: ModulePermissions
  'expense-categories'?: ModulePermissions
  vats?: ModulePermissions
  'payment-types'?: ModulePermissions
  'loss-profits'?: ModulePermissions
  subscriptions?: ModulePermissions

  // Reports
  'sale-reports'?: ModulePermissions
  'sale-return-reports'?: ModulePermissions
  'purchase-reports'?: ModulePermissions
  'purchase-return-reports'?: ModulePermissions
  'vat-reports'?: ModulePermissions
  'income-reports'?: ModulePermissions
  'expense-reports'?: ModulePermissions
  'loss-profits-details'?: ModulePermissions
  'stock-reports'?: ModulePermissions
  'due-reports'?: ModulePermissions
  'supplier-due-reports'?: ModulePermissions
  'loss-profit-reports'?: ModulePermissions
  'transaction-history-reports'?: ModulePermissions
  'subscription-reports'?: ModulePermissions
  'expired-product-reports'?: ModulePermissions

  // Settings & Administration
  roles?: ModulePermissions
  'manage-settings'?: ModulePermissions
  'download-apk'?: ModulePermissions

  // HRM Addon
  department?: ModulePermissions
  designations?: ModulePermissions
  shifts?: ModulePermissions
  employees?: ModulePermissions
  'leave-types'?: ModulePermissions
  leaves?: ModulePermissions
  holidays?: ModulePermissions
  attendances?: ModulePermissions
  payrolls?: ModulePermissions
  'attendance-reports'?: ModulePermissions
  'payroll-reports'?: ModulePermissions
  'leave-reports'?: ModulePermissions

  // Warehouse Addon
  warehouses?: ModulePermissions
  transfers?: ModulePermissions
  racks?: ModulePermissions
  shelfs?: ModulePermissions

  // Multi-Branch Addon
  branches?: ModulePermissions

  // Custom Domain Addon
  domains?: ModulePermissions

  // Custom Reports Addon
  'custom-reports'?: ModulePermissions
}

// ============================================
// Permission String Format (module.action)
// ============================================

export type PermissionString =
  // Core POS
  | 'dashboard.r'
  | 'sales.r'
  | 'sales.c'
  | 'sales.u'
  | 'sales.d'
  | 'inventory.r'
  | 'inventory.c'
  | 'sale-returns.r'
  | 'sale-returns.c'
  | 'purchases.r'
  | 'purchases.c'
  | 'purchases.u'
  | 'purchases.d'
  | 'purchases.price'
  | 'purchase-returns.r'
  | 'purchase-returns.c'
  | 'purchase-returns.price'
  // Product Management
  | 'products.r'
  | 'products.c'
  | 'products.u'
  | 'products.d'
  | 'products.price'
  | 'categories.r'
  | 'categories.c'
  | 'categories.u'
  | 'categories.d'
  | 'brands.r'
  | 'brands.c'
  | 'brands.u'
  | 'brands.d'
  | 'units.r'
  | 'units.c'
  | 'units.u'
  | 'units.d'
  | 'stocks.r'
  | 'stocks.price'
  // Parties
  | 'parties.r'
  | 'parties.c'
  | 'parties.u'
  | 'parties.d'
  | 'dues.r'
  // Financial
  | 'incomes.r'
  | 'incomes.c'
  | 'incomes.u'
  | 'incomes.d'
  | 'expenses.r'
  | 'expenses.c'
  | 'expenses.u'
  | 'expenses.d'
  | 'vats.r'
  | 'vats.c'
  | 'vats.u'
  | 'vats.d'
  | 'payment-types.r'
  | 'payment-types.c'
  | 'payment-types.u'
  | 'payment-types.d'
  // Reports
  | 'sale-reports.r'
  | 'purchase-reports.r'
  | 'stock-reports.r'
  | 'loss-profit-reports.r'
  // Settings
  | 'roles.r'
  | 'roles.c'
  | 'roles.u'
  | 'roles.d'
  | 'manage-settings.r'
  | 'manage-settings.u'
  // Generic string for flexibility
  | string

// ============================================
// Permission Check Result
// ============================================

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
}

// ============================================
// Permission Helper Types
// ============================================

export interface PermissionHelpers {
  hasPermission: (permission: PermissionString) => boolean
  hasAnyPermission: (permissions: PermissionString[]) => boolean
  hasAllPermissions: (permissions: PermissionString[]) => boolean
  canRead: (module: string) => boolean
  canCreate: (module: string) => boolean
  canUpdate: (module: string) => boolean
  canDelete: (module: string) => boolean
  canViewPrice: (module: string) => boolean
  isShopOwner: () => boolean
}
