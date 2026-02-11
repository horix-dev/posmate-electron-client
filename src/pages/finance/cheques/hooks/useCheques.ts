import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import chequesService from '@/api/services/cheques.service'
import type { Cheque, ChequeStatus, ChequeType } from '@/types/api.types'
import { getCache, setCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createAppError } from '@/lib/errors'

export interface ChequeFilters {
  status?: ChequeStatus | 'all'
  type?: ChequeType | 'all'
  bank_id?: number | 'all'
  party_id?: number | 'all'
  date_from?: string
  date_to?: string
}

export interface UseChequesReturn {
  cheques: Cheque[]
  isLoading: boolean
  error: string | null
  filters: ChequeFilters
  setFilters: (f: Partial<ChequeFilters>) => void
  refetch: () => Promise<void>
  isOffline: boolean
}

export function useCheques(controlledFilters: ChequeFilters = {}): UseChequesReturn {
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<ChequeFilters>({ status: 'all', type: 'all', ...controlledFilters })
  const { isOnline, isOffline } = useOnlineStatus()

  useEffect(() => {
    setFiltersState({ status: 'all', type: 'all', ...controlledFilters })
  }, [
    controlledFilters.status,
    controlledFilters.type,
    controlledFilters.bank_id,
    controlledFilters.party_id,
    controlledFilters.date_from,
    controlledFilters.date_to,
  ])

  const params = useMemo(() => {
    const p: Record<string, unknown> = { limit: 1000 }
    if (filters.status && filters.status !== 'all') p.status = filters.status
    if (filters.type && filters.type !== 'all') p.type = filters.type
    if (filters.bank_id && filters.bank_id !== 'all') p.bank_id = filters.bank_id
    if (filters.party_id && filters.party_id !== 'all') p.party_id = filters.party_id
    if (filters.date_from) p.date_from = filters.date_from
    if (filters.date_to) p.date_to = filters.date_to
    return p
  }, [filters])

  const cacheKey = useMemo(() => `cache:finance:cheques:list:${JSON.stringify(params)}`, [params])

  const setFilters = useCallback((partial: Partial<ChequeFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }))
  }, [])

  const fetchCheques = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!isOnline) {
        const cached = getCache<{ list: Cheque[] }>(cacheKey)
        if (cached) {
          setCheques(cached.list)
          return
        }
      }

      const res = await chequesService.getAll(params)
      const list = (res?.data || []) as Cheque[]
      setCheques(Array.isArray(list) ? list : [])
      setCache(cacheKey, { list }, { ttl: 10 * 60 * 1000 })
    } catch (err) {
      console.error(err)
      const appError = createAppError(err, 'Failed to load cheques')
      setError(appError.message)
      toast.error(appError.message)
    } finally {
      setIsLoading(false)
    }
  }, [isOnline, params, cacheKey])

  useEffect(() => {
    fetchCheques()
  }, [fetchCheques])

  return {
    cheques,
    isLoading,
    error,
    filters,
    setFilters,
    refetch: fetchCheques,
    isOffline,
  }
}

export default useCheques
