import api, { ApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { DashboardSummary, DashboardData, DashboardDuration } from '@/types/api.types'

export const dashboardService = {
  /**
   * Get today's summary (sales, income, expense, purchase)
   */
  getSummary: async (date?: string): Promise<ApiResponse<DashboardSummary>> => {
    const params = date ? { date } : {}
    const { data } = await api.get<ApiResponse<DashboardSummary>>(API_ENDPOINTS.DASHBOARD.SUMMARY, {
      params,
    })
    return data
  },

  /**
   * Get comprehensive dashboard data with charts
   */
  getDashboard: async (
    duration: DashboardDuration,
    fromDate?: string,
    toDate?: string
  ): Promise<ApiResponse<DashboardData>> => {
    const params: Record<string, string> = { duration }
    if (duration === 'custom_date' && fromDate && toDate) {
      params.from_date = fromDate
      params.to_date = toDate
    }
    const { data } = await api.get<ApiResponse<DashboardData>>(API_ENDPOINTS.DASHBOARD.STATS, {
      params,
    })
    return data
  },
}

export default dashboardService
