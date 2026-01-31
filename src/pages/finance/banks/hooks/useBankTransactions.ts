import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import banksService from '@/api/services/banks.service'
import type { BankTransaction } from '@/types/api.types'
import { getCache, setCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export interface TxnFilters {
  type?: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'all'
  from_date?: string | null
  to_date?: string | null
  search?: string
}

export interface UseBankTransactionsReturn {
  transactions: BankTransaction[]
  isLoading: boolean
  error: string | null
  filters: TxnFilters
  setFilters: (f: Partial<TxnFilters>) => void
  page: number
  perPage: number
  total: number
  setPage: (p: number) => void
  exportCSV: () => string
  refetch: () => Promise<void>
}

export function useBankTransactions(bankId: number, initial: TxnFilters = {}): UseBankTransactionsReturn {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<TxnFilters>({ type: 'all', ...initial })
  const [page, setPage] = useState(1)
  const [perPage] = useState(25)
  const [total, setTotal] = useState(0)
  const { isOnline } = useOnlineStatus()
  const CACHE_KEY = `cache:finance:banks:${bankId}:transactions`

  const params = useMemo(() => {
    const p: Record<string, unknown> = { page, per_page: perPage }
    if (filters.type && filters.type !== 'all') p.type = filters.type
    if (filters.from_date) p.from_date = filters.from_date
    if (filters.to_date) p.to_date = filters.to_date
    return p
  }, [filters, page, perPage])

  const setFilters = useCallback((partial: Partial<TxnFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }))
    setPage(1)
  }, [])

  const fetchTxns = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!isOnline) {
        const cached = getCache<{ list: BankTransaction[]; total: number }>(CACHE_KEY)
        if (cached) {
          setTransactions(cached.list)
          setTotal(cached.total)
          return
        }
      }
      const res = await banksService.getTransactions(bankId, params)
      const list = (res?.data || []) as BankTransaction[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalItems = ((res as any)?.meta?.total as number) ?? list.length
      setTransactions(Array.isArray(list) ? list : [])
      setTotal(totalItems)
      setCache(CACHE_KEY, { list, total: totalItems }, { ttl: 10 * 60 * 1000 })
    } catch (err) {
      console.error(err)
      setError('Failed to load transactions')
      toast.error('Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }, [isOnline, bankId, params, CACHE_KEY])

  useEffect(() => {
    fetchTxns()
  }, [fetchTxns])

  const exportCSV = useCallback((): string => {
    const headers = [
      'Date',
      'Type',
      'Amount',
      'Reference',
      'Balance Before',
      'Balance After',
      'Description',
    ]
    const rows = transactions.map((t) => [
      t.created_at ? new Date(t.created_at).toISOString() : '',
      t.type,
      String(t.amount ?? 0),
      t.reference ?? '',
      String(t.balance_before ?? 0),
      String(t.balance_after ?? 0),
      t.description ?? '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    return csv
  }, [transactions])

  return {
    transactions,
    isLoading,
    error,
    filters,
    setFilters,
    page,
    perPage,
    total,
    setPage,
    exportCSV,
    refetch: fetchTxns,
  }
}

export default useBankTransactions
