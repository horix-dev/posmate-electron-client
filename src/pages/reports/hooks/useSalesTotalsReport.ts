import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { reportsService, type TransactionSummaryParams } from '@/api/services/reports.service'
import { getCache, setCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createAppError } from '@/lib/errors'
import type { SalesTotalsData } from '@/types/api.types'

const CACHE_PREFIX = 'cache:reports:sales-totals'
const REPORTS_TTL_MS = 1000 * 60 * 15 // 15 minutes

function buildCacheKey(params: TransactionSummaryParams | undefined): string {
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

export function useSalesTotalsReport(params: TransactionSummaryParams) {
  const { isOnline } = useOnlineStatus()

  const cacheKey = useMemo(() => buildCacheKey(params), [params])

  const query = useQuery<SalesTotalsData>({
    queryKey: ['reports', 'sales-totals', params],
    queryFn: async () => {
      if (isOnline) {
        const response = await reportsService.getSalesTotals(params)
        setCache(cacheKey, response.data, { ttl: REPORTS_TTL_MS })
        return response.data
      }

      const cached = getCache<SalesTotalsData>(cacheKey, { ttl: REPORTS_TTL_MS })
      if (cached) return cached

      return {
        period: { from: params.from_date ?? '', to: params.to_date ?? '' },
        totals: {
          total_cost: 0,
          gross_sales: 0,
          total_discount: 0,
          total_sale_price: 0,
          total_returns: 0,
          net_sales: 0,
          total_profit: 0,
          profit_margin: 0,
          total_transactions: 0,
          total_items_sold: 0,
        },
        products: [],
        summary_by_type: {},
      }
    },
    staleTime: 1000 * 30,
  })

  useEffect(() => {
    if (!query.isError) return
    const appError = createAppError(query.error)
    toast.error(appError.message || 'Failed to load sales totals report')
  }, [query.isError, query.error])

  return {
    ...query,
    isOnline,
  }
}

export default useSalesTotalsReport
