import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import banksService from '@/api/services/banks.service'
import type { Bank } from '@/types/api.types'
import { getCache, setCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export interface BankFilters {
  status?: 'active' | 'inactive' | 'closed' | 'all'
  search?: string
  branch_id?: number | 'all'
  min_balance?: number | null
  max_balance?: number | null
}

export interface UseBanksReturn {
  banks: Bank[]
  isLoading: boolean
  error: string | null
  filters: BankFilters
  setFilters: (f: Partial<BankFilters>) => void
  page: number
  perPage: number
  total: number
  setPage: (p: number) => void
  refetch: () => Promise<void>
}

const CACHE_KEY = 'cache:finance:banks:list'

export function useBanks(initialFilters: BankFilters = {}): UseBanksReturn {
  const [banks, setBanks] = useState<Bank[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<BankFilters>({ status: 'all', ...initialFilters })
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [total, setTotal] = useState(0)
  const { isOnline } = useOnlineStatus()

  const params = useMemo(() => {
    const p: Record<string, unknown> = {
      page,
      per_page: perPage,
    }
    if (filters.status && filters.status !== 'all') p.status = filters.status
    if (filters.search) p.search = filters.search
    if (filters.branch_id && filters.branch_id !== 'all') p.branch_id = filters.branch_id
    if (filters.min_balance != null) p.min_balance = filters.min_balance
    if (filters.max_balance != null) p.max_balance = filters.max_balance
    return p
  }, [filters, page, perPage])

  const setFilters = useCallback((partial: Partial<BankFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }))
    // Reset to first page on filters change
    setPage(1)
  }, [])

  const fetchBanks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!isOnline) {
        const cached = getCache<{ list: Bank[]; total: number }>(CACHE_KEY)
        if (cached) {
          setBanks(cached.list)
          setTotal(cached.total)
          return
        }
      }
      const res = await banksService.getAll(params)
      const list = (res?.data || []) as Bank[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalItems = ((res as any)?.meta?.total as number) ?? list.length
      setBanks(Array.isArray(list) ? list : [])
      setTotal(totalItems)
      setCache(CACHE_KEY, { list, total: totalItems }, { ttl: 10 * 60 * 1000 })
    } catch (err) {
      console.error(err)
      setError('Failed to load banks')
      toast.error('Failed to load banks')
    } finally {
      setIsLoading(false)
    }
  }, [isOnline, params])

  useEffect(() => {
    fetchBanks()
  }, [fetchBanks])

  return {
    banks,
    isLoading,
    error,
    filters,
    setFilters,
    page,
    perPage,
    total,
    setPage,
    refetch: fetchBanks,
  }
}

export default useBanks
