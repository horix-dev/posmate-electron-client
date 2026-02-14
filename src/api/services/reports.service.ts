import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type {
  ReportPeriod,
  SalesReportData,
  SalesSummaryData,
  SalesTotalsData,
  PurchasesReportData,
  PurchasesSummaryData,
  SaleReturnsReportData,
  SaleReturnsSummaryData,
  PurchaseReturnsReportData,
  PurchaseReturnsSummaryData,
} from '@/types/api.types'

export interface TransactionReportParams {
  period?: ReportPeriod
  from_date?: string
  to_date?: string
  branch_id?: number
  party_id?: number
  payment_type_id?: number
  search?: string
  per_page?: number
  page?: number
}

export interface TransactionSummaryParams {
  period?: ReportPeriod
  from_date?: string
  to_date?: string
  branch_id?: number
}

export const reportsService = {
  getSalesReport: async (
    params?: TransactionReportParams
  ): Promise<ApiResponse<SalesReportData>> => {
    const { data } = await api.get<ApiResponse<SalesReportData>>(API_ENDPOINTS.REPORTS.SALES, {
      params,
    })
    return data
  },

  getSalesSummary: async (
    params?: TransactionSummaryParams
  ): Promise<ApiResponse<SalesSummaryData>> => {
    const { data } = await api.get<ApiResponse<SalesSummaryData>>(
      API_ENDPOINTS.REPORTS.SALES_SUMMARY,
      { params }
    )
    return data
  },

  getSalesTotals: async (
    params?: TransactionSummaryParams
  ): Promise<ApiResponse<SalesTotalsData>> => {
    const { data } = await api.get<ApiResponse<SalesTotalsData>>(
      API_ENDPOINTS.REPORTS.SALES_TOTALS,
      { params }
    )
    return data
  },

  getPurchasesReport: async (
    params?: TransactionReportParams
  ): Promise<ApiResponse<PurchasesReportData>> => {
    const { data } = await api.get<ApiResponse<PurchasesReportData>>(
      API_ENDPOINTS.REPORTS.PURCHASES,
      { params }
    )
    return data
  },

  getPurchasesSummary: async (
    params?: TransactionSummaryParams
  ): Promise<ApiResponse<PurchasesSummaryData>> => {
    const { data } = await api.get<ApiResponse<PurchasesSummaryData>>(
      API_ENDPOINTS.REPORTS.PURCHASES_SUMMARY,
      { params }
    )
    return data
  },

  getSaleReturnsReport: async (
    params?: TransactionReportParams
  ): Promise<ApiResponse<SaleReturnsReportData>> => {
    const { data } = await api.get<ApiResponse<SaleReturnsReportData>>(
      API_ENDPOINTS.REPORTS.SALE_RETURNS,
      { params }
    )
    return data
  },

  getSaleReturnsSummary: async (
    params?: TransactionSummaryParams
  ): Promise<ApiResponse<SaleReturnsSummaryData>> => {
    const { data } = await api.get<ApiResponse<SaleReturnsSummaryData>>(
      API_ENDPOINTS.REPORTS.SALE_RETURNS_SUMMARY,
      { params }
    )
    return data
  },

  getPurchaseReturnsReport: async (
    params?: TransactionReportParams
  ): Promise<ApiResponse<PurchaseReturnsReportData>> => {
    const { data } = await api.get<ApiResponse<PurchaseReturnsReportData>>(
      API_ENDPOINTS.REPORTS.PURCHASE_RETURNS,
      { params }
    )
    return data
  },

  getPurchaseReturnsSummary: async (
    params?: TransactionSummaryParams
  ): Promise<ApiResponse<PurchaseReturnsSummaryData>> => {
    const { data } = await api.get<ApiResponse<PurchaseReturnsSummaryData>>(
      API_ENDPOINTS.REPORTS.PURCHASE_RETURNS_SUMMARY,
      { params }
    )
    return data
  },
}

export default reportsService
