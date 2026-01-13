// API Response Types based on API_DOCUMENTATION.md

// ============================================
// Base Types
// ============================================

export interface ApiResponse<T = unknown> {
  message: string
  data: T
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// ============================================
// Reporting Types (Transaction Reports)
// ============================================

export type ReportPeriod =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'current_month'
  | 'last_month'
  | 'current_year'

export interface ReportPeriodRange {
  from: string
  to: string
}

export interface ReportPagination<T> {
  current_page: number
  data: T[]
  per_page: number
  total: number
  last_page: number
}

export interface SalesReportSummary {
  total_sales: number
  total_amount: number
  total_paid: number
  total_due: number
  total_discount: number
  total_vat: number
  total_profit: number
  period: ReportPeriodRange
}

export interface SalesReportUser {
  id: number
  name: string
}

export interface SalesReportParty {
  id: number
  name: string
  email?: string
  phone?: string
  type?: string
}

export interface SalesReportBranch {
  id: number
  name: string
}

export interface SalesReportPaymentType {
  id: number
  name: string
}

export interface SalesReportItem {
  id: number
  invoiceNumber: string
  saleDate: string
  totalAmount: number
  discountAmount: number
  paidAmount: number
  dueAmount: number
  vat_amount?: number
  lossProfit?: number
  isPaid: boolean
  paymentType?: string
  user?: SalesReportUser
  party?: SalesReportParty
  branch?: SalesReportBranch
  payment_type?: SalesReportPaymentType
}

export interface SalesReportData {
  summary: SalesReportSummary
  sales: ReportPagination<SalesReportItem>
}

export interface SalesSummaryData {
  total_sales: number
  total_amount: number
  total_paid: number
  total_due: number
  total_discount: number
  total_vat: number
  total_profit: number
  average_sale_amount: number
  fully_paid_count: number
  partially_paid_count: number
  period: ReportPeriodRange
}

export interface PurchasesReportSummary {
  total_purchases: number
  total_amount: number
  total_paid: number
  total_due: number
  total_discount: number
  total_vat: number
  period: ReportPeriodRange
}

export interface PurchasesReportItem {
  id: number
  invoiceNumber: string
  purchaseDate: string
  totalAmount: number
  discountAmount: number
  paidAmount: number
  dueAmount: number
  vat_amount?: number
  isPaid: boolean
  paymentType?: string
  user?: SalesReportUser
  party?: SalesReportParty
  branch?: SalesReportBranch
  payment_type?: SalesReportPaymentType
}

export interface PurchasesReportData {
  summary: PurchasesReportSummary
  purchases: ReportPagination<PurchasesReportItem>
}

export interface PurchasesSummaryData {
  total_purchases: number
  total_amount: number
  total_paid: number
  total_due: number
  total_discount: number
  total_vat: number
  average_purchase_amount: number
  fully_paid_count: number
  partially_paid_count: number
  period: ReportPeriodRange
}

export interface ReturnsReportSummary {
  total_returns: number
  total_return_amount: number
  total_return_quantity: number
  period: ReportPeriodRange
}

export interface ReturnsSummaryData extends ReturnsReportSummary {
  average_return_amount: number
}

export interface ReturnDetailProduct {
  id: number
  productName?: string
  product_name?: string
}

export interface ReturnDetail {
  product?: ReturnDetailProduct
  return_qty: number
  return_amount: number
}

export interface SaleReturnItem {
  id: number
  return_date: string
  total_return_amount: number
  branch?: SalesReportBranch
  details?: ReturnDetail[]
}

export interface SaleReturnsReportSaleItem {
  id: number
  invoiceNumber: string
  saleDate: string
  totalAmount: number
  user?: SalesReportUser
  party?: SalesReportParty
  branch?: SalesReportBranch
  saleReturns: SaleReturnItem[]
}

export interface SaleReturnsReportData {
  summary: ReturnsReportSummary
  sales: ReportPagination<SaleReturnsReportSaleItem>
}

export type SaleReturnsSummaryData = ReturnsSummaryData

export interface PurchaseReturnItem {
  id: number
  return_date: string
  total_return_amount: number
  branch?: SalesReportBranch
  details?: ReturnDetail[]
}

export interface PurchaseReturnsReportPurchaseItem {
  id: number
  invoiceNumber: string
  purchaseDate: string
  totalAmount: number
  user?: SalesReportUser
  party?: SalesReportParty
  branch?: SalesReportBranch
  purchaseReturns: PurchaseReturnItem[]
}

export interface PurchaseReturnsReportData {
  summary: ReturnsReportSummary
  purchases: ReportPagination<PurchaseReturnsReportPurchaseItem>
}

export type PurchaseReturnsSummaryData = ReturnsSummaryData

// ============================================
// Auth Types
// ============================================

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  is_setup: boolean
  token: string
  currency: Currency | null
}

export interface SignUpRequest {
  name: string
  email: string
  password: string
}

export interface SignUpResponse {
  token: string | null
  data: User
}

export interface OtpRequest {
  email: string
  otp: string
}

// ============================================
// User Types
// ============================================

export interface User {
  id: number
  name: string
  email: string
  phone?: string
  role: 'shop-owner' | 'staff'
  business_id?: number
  branch_id?: number
  active_branch_id?: number
  visibility?: string
  image?: string
  is_verified?: number
}

// ============================================
// Business Types
// ============================================

export interface Business {
  id: number
  companyName: string
  phoneNumber?: string
  address?: string
  pictureUrl?: string
  shopOpeningBalance?: number
  user?: User
  business_currency?: Currency
  invoice_logo?: string
  sale_rounding_option?: RoundingOption
  invoice_size?: InvoiceSize
  branch_count?: number
  addons?: BusinessAddons
}

export interface BusinessAddons {
  AffiliateAddon: boolean
  MultiBranchAddon: boolean
  WarehouseAddon: boolean
  ThermalPrinterAddon: boolean
  HrmAddon: boolean
  CustomDomainAddon: boolean
}

export type RoundingOption =
  | 'none'
  | 'round_up'
  | 'nearest_whole_number'
  | 'nearest_0.05'
  | 'nearest_0.1'
  | 'nearest_0.5'

export type InvoiceSize = 'a4' | '3_inch_80mm' | '2_inch_58mm'

export interface BusinessCategory {
  id: number
  name: string
  status: number
}

// ============================================
// Currency Types
// ============================================

export interface Currency {
  id: number
  name: string
  code: string
  symbol: string
  position: 'before' | 'after'
  rate?: number
  is_default?: number | boolean
  status?: number | boolean
  active?: number | boolean
  country_name?: string
}

// ============================================
// Product Types
// ============================================

// Import variant types
import type { ProductVariant, ProductAttribute } from './variant.types'

export interface Product {
  id: number
  productName: string
  productCode?: string
  productPurchasePrice?: number
  productStock?: number
  alert_qty?: number
  // Backend uses 'variant' for legacy batch products (batch/lot tracked by batch_no)
  product_type: 'simple' | 'variable' | 'variant'
  productPicture?: string
  stocks_sum_product_stock?: number
  category_id?: number
  brand_id?: number
  unit_id?: number
  model_id?: number
  vat_id?: number
  vat_type?: string
  unit?: Unit
  vat?: Vat
  brand?: Brand
  category?: Category
  product_model?: ProductModel
  stocks?: Stock[]
  // Variant product fields
  has_variants?: boolean
  variant_sku_format?: string
  variants?: ProductVariant[]
  attributes?: ProductAttribute[]
  variants_total_stock?: number
}

export interface Stock {
  id: number
  product_id: number
  variant_id?: number | null // For variable products
  batch_no?: string
  productStock: number
  productPurchasePrice: number
  productSalePrice: number
  productDealerPrice?: number
  productWholeSalePrice?: number
  profit_percent?: number
  mfg_date?: string
  expire_date?: string
  warehouse_id?: number
  branch_id?: number
  // Relations
  product?: Product
  variant?: ProductVariant
  category?: Category
  // Flattened fields possibly returned by API
  product_name?: string
  product_code?: string
  category_name?: string
  variant_name?: string
}

export interface CreateProductRequest {
  productName: string
  productCode?: string
  category_id?: number
  brand_id?: number
  unit_id?: number
  model_id?: number
  vat_id?: number
  vat_type?: string
  alert_qty?: number
  product_type: 'simple' | 'variable' | 'variant'
  productPurchasePrice?: number
  productSalePrice?: number
  productDealerPrice?: number
  productWholeSalePrice?: number
  productStock?: number
  profit_percent?: number
  mfg_date?: string
  expire_date?: string
  productPicture?: File
  // For variant products
  'batch_no[]'?: string[]
  'productPurchasePrice[]'?: number[]
  'productSalePrice[]'?: number[]
  'productDealerPrice[]'?: number[]
  'productWholeSalePrice[]'?: number[]
  'productStock[]'?: number[]
  'profit_percent[]'?: number[]
  'mfg_date[]'?: string[]
  'expire_date[]'?: string[]
}

// ============================================
// Category Types
// ============================================

export interface Category {
  id: number
  categoryName: string
  variationCapacity?: number
  variationColor?: number
  variationSize?: number
  variationType?: number
  variationWeight?: number
  icon?: string
  status?: number
  parentId?: number
  version?: number
}

export interface CreateCategoryRequest {
  categoryName: string
  variationCapacity?: boolean
  variationColor?: boolean
  variationSize?: boolean
  variationType?: boolean
  variationWeight?: boolean
  icon?: File
}

// ============================================
// Brand Types
// ============================================

export interface Brand {
  id: number
  brandName: string
  description?: string
  icon?: string
  status?: number
}

export interface CreateBrandRequest {
  brandName: string
  description?: string
  icon?: File
}

// ============================================
// Unit Types
// ============================================

export interface Unit {
  id: number
  unitName: string
  status?: number
}

export interface CreateUnitRequest {
  unitName: string
  status?: boolean
}

// ============================================
// Product Model Types
// ============================================

export interface ProductModel {
  id: number
  name: string
  status?: number
}

export interface CreateProductModelRequest {
  name: string
  status?: boolean
}

// ============================================
// Rack & Shelf Types
// ============================================

export interface Rack {
  id: number
  name: string
  status?: number
}

export interface CreateRackRequest {
  name: string
  status?: boolean
  shelf_id?: number[]
}

export interface Shelf {
  id: number
  name: string
  status?: number
}

export interface CreateShelfRequest {
  name: string
  status?: boolean
}

// ============================================
// Party Types
// ============================================

export type PartyType = 'Retailer' | 'Dealer' | 'Wholesaler' | 'Supplier'

export interface Party {
  id: number
  business_id: number
  name: string
  email?: string
  phone?: string
  address?: string
  type: PartyType
  due: number
  wallet: number
  credit_limit?: number
  opening_balance: number
  opening_balance_type: 'due' | 'advance'
  image?: string
  version: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface CreatePartyRequest {
  name: string
  type: PartyType
  phone?: string
  email?: string
  address?: string
  credit_limit?: number
  opening_balance?: number
  opening_balance_type: 'due' | 'advance'
  image?: File
}

// ============================================
// VAT/Tax Types
// ============================================

export interface Vat {
  id: number
  name: string
  rate: number
  status?: number
  sub_vat?: Vat[]
}

export interface CreateVatRequest {
  name: string
  rate?: number
  vat_ids?: number[]
}

// ============================================
// Payment Type Types
// ============================================

export interface PaymentType {
  id: number
  name: string
  is_credit?: boolean
  status?: number
  business_id?: number
  created_at?: string
  updated_at?: string
}

export interface CreatePaymentTypeRequest {
  name: string
}

// ============================================
// Sale Types
// ============================================

export interface Sale {
  id: number
  invoiceNumber: string
  saleDate: string
  totalAmount: number
  discountAmount?: number

  // Old fields (kept for backward compatibility)
  paidAmount: number // ⚠️ Deprecated, use initial_paidAmount or total_paid_amount
  dueAmount?: number // ⚠️ Deprecated, use initial_dueAmount or remaining_due_amount
  isPaid?: number // ⚠️ Now calculated, use is_fully_paid

  // New fields - Due Collection Tracking
  initial_paidAmount?: number // Payment at sale time
  initial_dueAmount?: number // Due at sale time
  total_paid_amount?: number // Initial + due collections
  remaining_due_amount?: number // Actual remaining due
  is_fully_paid?: boolean // Accurate payment status
  due_collections_count?: number // Number of collection payments
  due_collections_total?: number // Total from collections

  change_amount?: number
  lossProfit?: number
  rounding_option?: RoundingOption
  vat_amount?: number
  note?: string
  invoice_url?: string // URL for viewing/printing invoice
  user?: User
  party?: Party
  details?: SaleDetail[]
  vat?: Vat
  payment_type?: PaymentType
  branch?: Branch
  saleReturns?: SaleReturn[]
}

export interface SaleDetail {
  id: number
  product_id: number
  stock_id: number
  variant_id?: number | null
  variant_name?: string | null
  quantities: number
  price: number
  subTotal?: number
  lossProfit?: number
  mfg_date?: string
  expire_date?: string
  // product?: Product
  product?: {
    id: number
    productName: string
    productCode?: string
    productPicture?: string
  }
  stock?: Stock
  variant?: ProductVariant
}

export interface CreateSaleRequest {
  products: SaleProductItem[] // Array of product items (not JSON string)
  saleDate?: string
  invoiceNumber?: string
  party_id?: number
  payment_type_id?: number
  vat_id?: number
  vat_amount?: number
  totalAmount: number
  discountAmount?: number
  paidAmount: number
  dueAmount?: number
  change_amount?: number
  isPaid?: boolean
  rounding_option?: RoundingOption
  note?: string
  customer_phone?: string
  image?: File
}

export interface SaleProductItem {
  stock_id: number
  product_name: string
  quantities: number
  price: number
  lossProfit: number
  variant_id?: number
  variant_name?: string
}

// ============================================
// Purchase Types
// ============================================

export interface Purchase {
  id: number
  invoiceNumber: string
  purchaseDate: string
  totalAmount: number
  discountAmount?: number
  discount_percent?: number
  discount_type?: string
  shipping_charge?: number
  vat_amount?: number
  vat_percent?: number
  paidAmount: number
  dueAmount?: number
  change_amount?: number
  isPaid?: boolean
  paymentType?: string
  created_at?: string
  updated_at?: string
  user?: {
    id: number
    name: string
    role?: string
  }
  branch?: {
    id: number
    name: string
    phone?: string
    address?: string
  }
  party?: Party
  details?: PurchaseDetail[]
  vat?: Vat
  payment_type?: PaymentType
  purchaseReturns?: PurchaseReturn[]
}

export interface PurchaseDetail {
  id: number
  product_id: number
  variant_id?: number | null
  stock_id: number
  quantities: number
  productPurchasePrice: number
  productSalePrice: number
  productDealerPrice?: number
  productWholeSalePrice?: number
  profit_percent?: number
  subTotal?: number
  mfg_date?: string
  expire_date?: string
  product?: {
    id: number
    productName: string
    productCode?: string
    productPicture?: string
    image?: string
    product_type?: string
    category?: {
      id: number
      categoryName: string
    }
  }
  variant?: {
    id: number
    variant_name: string
  } | null
  stock?: {
    id: number
    batch_no?: string
    expire_date?: string
    mfg_date?: string
  }
}

export interface CreatePurchaseRequest {
  party_id: number
  invoiceNumber?: string
  purchaseDate?: string
  payment_type_id?: number
  vat_id?: number
  vat_amount?: number
  totalAmount: number
  discountAmount?: number
  discount_percent?: number
  discount_type?: string
  shipping_charge?: number
  paidAmount: number
  dueAmount?: number
  change_amount?: number
  products: PurchaseProductItem[]
}

export interface PurchaseProductItem {
  product_id: number
  variant_id?: number // For variable products - identifies which variant is being purchased
  batch_no?: string
  quantities: number
  productPurchasePrice: number
  productSalePrice: number
  productDealerPrice?: number
  productWholeSalePrice?: number
  profit_percent?: number
  mfg_date?: string
  expire_date?: string
}

// ============================================
// Return Types
// ============================================

export interface SaleReturn {
  id: number
  business_id?: number
  sale_id: number
  invoice_no?: string
  return_date: string
  created_at?: string
  updated_at?: string
  sale?: Sale
  branch?: {
    id: number
    name: string
  }
  details?: SaleReturnDetail[]
  total_return_amount?: number
  total_return_qty?: number
}

export interface SaleReturnDetail {
  id: number
  sale_detail_id: number
  return_qty: number
  return_amount: number
  product?: {
    id: number
    productName: string
    productCode?: string
    image?: string
    productPicture?: string
  }
  batch_no?: string
}

export interface PurchaseReturn {
  id: number
  business_id?: number
  branch_id?: number
  purchase_id: number
  invoice_no?: string
  return_date: string
  created_at?: string
  updated_at?: string
  purchase?: Purchase
  branch?: {
    id: number
    name: string
  }
  details?: PurchaseReturnDetail[]
  total_return_amount?: number
  total_return_qty?: number
}

export interface PurchaseReturnDetail {
  id: number
  purchase_detail_id: number
  return_qty: number
  return_amount: number
  product?: {
    id: number
    productName: string
    productCode?: string
  }
  batch_no?: string
}

// ============================================
// Due Collection Types
// ============================================

export interface DueCollection {
  id: number
  party_id: number
  payDueAmount: number
  totalDue: number
  dueAmountAfterPay: number
  paymentDate: string
  invoiceNumber?: string
  party?: Party
  payment_type?: PaymentType
}

export interface CreateDueCollectionRequest {
  party_id: number
  payment_type_id: number
  paymentDate: string
  payDueAmount: number
  invoiceNumber?: string
}

// ============================================
// Expense & Income Types
// ============================================

export interface Expense {
  id: number
  amount: number
  // Note: Backend uses 'expanseFor' (typo with 'a' instead of 'e')
  expanseFor?: string
  expenseFor?: string
  referenceNo?: string
  note?: string
  expenseDate?: string
  expense_category_id: number
  payment_type_id?: number
  created_at: string
  category?: ExpenseCategory
  payment_type?: PaymentType
  // Legacy/Fallback/SnakeCase support
  expense_for?: string
  reference_no?: string
  expense_date?: string
  description?: string
}

export interface ExpenseCategory {
  id: number
  categoryName: string
  status?: number
}

export interface Income {
  id: number
  amount: number
  incomeFor?: string
  referenceNo?: string
  note?: string
  incomeDate?: string
  income_category_id: number
  payment_type_id?: number
  created_at: string
  category?: IncomeCategory
  payment_type?: PaymentType
  // Legacy/Fallback/SnakeCase support
  income_for?: string
  reference_no?: string
  income_date?: string
  description?: string
}

export interface IncomeCategory {
  id: number
  categoryName: string
  status?: number
}

// ============================================
// Warehouse Types
// ============================================

export interface Warehouse {
  id: number
  name: string
  phone?: string
  email?: string
  address?: string
  total_quantity?: number
  total_value?: number
}

export interface CreateWarehouseRequest {
  name: string
  phone?: string
  email?: string
  address?: string
}

// ============================================
// Branch Types
// ============================================

export interface Branch {
  id: number
  name: string
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardSummary {
  sales: number
  income: number
  expense: number
  purchase: number
}

export type DashboardDuration =
  | 'today'
  | 'yesterday'
  | 'last_seven_days'
  | 'last_thirty_days'
  | 'current_month'
  | 'last_month'
  | 'current_year'
  | 'custom_date'

export interface DashboardData {
  total_expense: number
  total_income: number
  total_items: number
  total_categories: number
  stock_value: number
  total_due: number
  total_profit: number
  total_loss: number
  sales: ChartDataPoint[]
  purchases: ChartDataPoint[]
}

export interface ChartDataPoint {
  date: string
  amount: number
}

// ============================================
// Settings Types
// ============================================

export interface ProductSettings {
  business_id: number
  modules: ProductSettingsModules
}

export interface ProductSettingsModules {
  show_product_type_single: string
  show_product_category: string
  show_alert_qty: string
  show_product_unit: string
  show_product_code: string
  show_product_brand: string
  show_batch_no: string
  show_expire_date: string
  show_mfg_date: string
}

// ============================================
// Print Labels Types
// ============================================

export interface PrintLabel {
  id: number
  name: string
  description?: string
  barcode_type: string
  label_format: string
  template_data?: Record<string, unknown>
  status?: number
  created_at?: string
  updated_at?: string
  business_id?: number
}

export interface CreatePrintLabelRequest {
  name: string
  description?: string
  barcode_type: string
  label_format: string
  template_data?: Record<string, unknown>
  status?: boolean
}
