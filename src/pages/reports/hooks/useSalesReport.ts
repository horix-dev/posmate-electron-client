import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { reportsService, type TransactionReportParams } from '@/api/services/reports.service'
import { getCache, setCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createAppError } from '@/lib/errors'
import type { SalesReportData } from '@/types/api.types'

const CACHE_PREFIX = 'cache:reports:sales'
const REPORTS_TTL_MS = 1000 * 60 * 15 // 15 minutes

function buildCacheKey(params: TransactionReportParams | undefined): string {
  const sp = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      sp.set(key, String(value))
    })
  }
  const qs = sp.toString()
  return qs ? `${CACHE_PREFIX}?${qs}` : CACHE_PREFIX
}

export function useSalesReport(params: TransactionReportParams) {
  const { isOnline } = useOnlineStatus()

  const cacheKey = useMemo(() => buildCacheKey(params), [params])

  const query = useQuery<SalesReportData>({
    queryKey: ['reports', 'sales', params],
    queryFn: async () => {
      if (isOnline) {
        const response = await reportsService.getSalesReport(params)
        setCache(cacheKey, response.data, { ttl: REPORTS_TTL_MS })
        return response.data
      }

      const cached = getCache<SalesReportData>(cacheKey, { ttl: REPORTS_TTL_MS })
      if (cached) return cached

      return {
        summary: {
          total_sales: 0,
          total_amount: 0,
          total_paid: 0,
          total_due: 0,
          total_discount: 0,
          total_vat: 0,
          total_profit: 0,
          period: { from: params.from_date ?? '', to: params.to_date ?? '' },
        },
        sales: {
          current_page: 1,
          data: [],
          per_page: params.per_page ?? 20,
          total: 0,
          last_page: 1,
        },
      }
    },
    staleTime: 1000 * 30,
  })

  useEffect(() => {
    if (!query.isError) return
    const appError = createAppError(query.error)
    toast.error(appError.message || 'Failed to load sales report')
  }, [query.isError, query.error])

  return {
    ...query,
    isOnline,
  }
}

export default useSalesReport
