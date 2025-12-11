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
  is_default?: number
  status?: number
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
  product_type: 'simple' | 'variable'
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
  product_type: 'simple' | 'variable'
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
}

export interface CreateCategoryRequest {
  categoryName: string
  variationCapacity?: boolean
  variationColor?: boolean
  variationSize?: boolean
  variationType?: boolean
  variationWeight?: boolean
}

// ============================================
// Brand Types
// ============================================

export interface Brand {
  id: number
  brandName: string
}

export interface CreateBrandRequest {
  brandName: string
}

// ============================================
// Unit Types
// ============================================

export interface Unit {
  id: number
  unitName: string
}

export interface CreateUnitRequest {
  unitName: string
}

// ============================================
// Product Model Types
// ============================================

export interface ProductModel {
  id: number
  name: string
}

export interface CreateProductModelRequest {
  name: string
}

// ============================================
// Party Types
// ============================================

export type PartyType = 'Retailer' | 'Dealer' | 'Wholesaler' | 'Supplier'

export interface Party {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
  type: PartyType
  due: number
  wallet?: number
  credit_limit?: number
  opening_balance?: number
  opening_balance_type?: 'due' | 'advance'
  image?: string
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
  paidAmount: number
  dueAmount?: number
  change_amount?: number
  lossProfit?: number
  isPaid?: number
  rounding_option?: RoundingOption
  vat_amount?: number
  note?: string
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
  lossProfit?: number
  product?: Product
  stock?: Stock
  variant?: ProductVariant
}

export interface CreateSaleRequest {
  products: string // JSON string of SaleProductItem[]
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
  paidAmount: number
  dueAmount?: number
  party?: Party
  details?: PurchaseDetail[]
  vat?: Vat
  payment_type?: PaymentType
}

export interface PurchaseDetail {
  id: number
  product_id: number
  stock_id: number
  quantities: number
  productPurchasePrice: number
  productSalePrice: number
  productDealerPrice?: number
  productWholeSalePrice?: number
  profit_percent?: number
  mfg_date?: string
  expire_date?: string
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
  paidAmount: number
  dueAmount?: number
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
  sale_id: number
  return_date: string
  sale?: Sale
  details?: SaleReturnDetail[]
}

export interface SaleReturnDetail {
  id: number
  sale_detail_id: number
  return_qty: number
  return_amount: number
}

export interface PurchaseReturn {
  id: number
  purchase_id: number
  return_date: string
  purchase?: Purchase
  details?: PurchaseReturnDetail[]
}

export interface PurchaseReturnDetail {
  id: number
  purchase_detail_id: number
  return_qty: number
  return_amount: number
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
  description?: string
  expense_category_id: number
  payment_type_id?: number
  created_at: string
  category?: ExpenseCategory
  payment_type?: PaymentType
}

export interface ExpenseCategory {
  id: number
  categoryName: string
  status?: number
}

export interface Income {
  id: number
  amount: number
  description?: string
  income_category_id: number
  payment_type_id?: number
  created_at: string
  category?: IncomeCategory
  payment_type?: PaymentType
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
