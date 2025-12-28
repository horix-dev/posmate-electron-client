import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { reportsService, type TransactionReportParams, type TransactionSummaryParams } from '@/api/services/reports.service'
import { getCache, setCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createAppError } from '@/lib/errors'
import type { SaleReturnsReportData } from '@/types/api.types'

const CACHE_PREFIX = 'cache:reports:sale-returns'
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

export function useSaleReturnsReport(params: TransactionReportParams) {
  const { isOnline } = useOnlineStatus()

  const cacheKey = useMemo(() => buildCacheKey(params), [params])

  const summaryParams = useMemo<TransactionSummaryParams>(() => ({
    period: params.period,
    from_date: params.from_date,
    to_date: params.to_date,
    branch_id: params.branch_id,
  }), [params.period, params.from_date, params.to_date, params.branch_id])

  const query = useQuery<SaleReturnsReportData>({
    queryKey: ['reports', 'sale-returns', params],
    queryFn: async () => {
      if (isOnline) {
        try {
          // Fetch summary (working endpoint)
          const summaryResponse = await reportsService.getSaleReturnsSummary(summaryParams)
          const data: SaleReturnsReportData = {
            summary: summaryResponse.data,
            sales: {
              current_page: 1,
              data: [],
              per_page: 20,
              total: 0,
              last_page: 1,
            },
          }

          // Optionally try to fetch detailed report, but don't fail if unavailable
          try {
            const detailedResponse = await reportsService.getSaleReturnsReport(params)
            data.sales = detailedResponse.data.sales
          } catch (detailError) {
            console.warn('[Sale Returns Report] Detailed report unavailable, showing summary only', detailError)
          }

          setCache(cacheKey, data, { ttl: REPORTS_TTL_MS })
          return data
        } catch (error) {
          console.error('[Sale Returns Report] Summary fetch failed:', error, 'Params:', summaryParams)
          throw error
        }
      }

      const cached = getCache<SaleReturnsReportData>(cacheKey, { ttl: REPORTS_TTL_MS })
      if (cached) return cached

      return {
        summary: {
          total_returns: 0,
          total_return_amount: 0,
          total_return_quantity: 0,
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
    toast.error(appError.message || 'Failed to load sale returns report')
  }, [query.isError, query.error])

  return {
    ...query,
    isOnline,
  }
}

export default useSaleReturnsReport
