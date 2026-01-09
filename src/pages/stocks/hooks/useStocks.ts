import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { stocksListService, type GetStocksParams } from '@/api/services/stocksList.service'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createAppError } from '@/lib/errors'
import type { Stock } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface StocksFilters {
  search: string
  warehouseId?: number
  branchId?: number
}

interface UseStocksReturn {
  // Data
  allStocks: Stock[]
  lowStocks: Stock[]
  expiredStocks: Stock[]

  // Loading & Error States
  isLoading: boolean
  isLoadingLow: boolean
  isLoadingExpired: boolean
  isOffline: boolean
  error: Error | null

  // Pagination
  currentPage: number
  perPage: number
  totalItems: number

  // Filtered data
  filteredAllStocks: Stock[]
  filteredLowStocks: Stock[]
  filteredExpiredStocks: Stock[]

  // Actions
  refetch: () => Promise<void>
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
}

// ============================================
// Hook Implementation
// ============================================

export function useStocks(filters: StocksFilters): UseStocksReturn {
  // State
  const [allStocks, setAllStocks] = useState<Stock[]>([])
  const [lowStocks, setLowStocks] = useState<Stock[]>([])
  const [expiredStocks, setExpiredStocks] = useState<Stock[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingLow, setIsLoadingLow] = useState(true)
  const [isLoadingExpired, setIsLoadingExpired] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  // Online status
  const { isOnline } = useOnlineStatus()

  // Debounced search
  const debouncedSearch = filters.search.trim()

  // Fetch all stocks
  const fetchAllStocks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!isOnline) {
        setAllStocks([])
        setIsLoading(false)
        return
      }

      const params: GetStocksParams = {
        limit: 100,
      }

      if (debouncedSearch) {
        params.search = debouncedSearch
      }

      if (filters.warehouseId) {
        params.warehouse_id = filters.warehouseId
      }

      if (filters.branchId) {
        params.branch_id = filters.branchId
      }

      const response = await stocksListService.getAll(params)

      if (response.data && Array.isArray(response.data)) {
        setAllStocks(response.data)
        // For limit mode, we just count the rows we got
        setTotalItems(response.data.length)
      } else {
        setAllStocks([])
        setTotalItems(0)
      }
    } catch (err) {
      console.error('[useStocks] Failed to fetch all stocks:', err)
      const appError = createAppError(err, 'Failed to load stocks')
      setError(appError)
      toast.error(appError.message)
    } finally {
      setIsLoading(false)
    }
  }, [isOnline, debouncedSearch, filters.warehouseId, filters.branchId]) // Removed currentPage/perPage dependencies

  // Fetch low stocks
  const fetchLowStocks = useCallback(async () => {
    setIsLoadingLow(true)

    try {
      if (!isOnline) {
        setLowStocks([])
        setIsLoadingLow(false)
        return
      }

      const params: GetStocksParams = {
        limit: 1000,
      }

      if (debouncedSearch) {
        params.search = debouncedSearch
      }

      if (filters.warehouseId) {
        params.warehouse_id = filters.warehouseId
      }

      if (filters.branchId) {
        params.branch_id = filters.branchId
      }

      const response = await stocksListService.getLowStocks(params)

      if (response.data && Array.isArray(response.data)) {
        setLowStocks(response.data)
      } else {
        setLowStocks([])
      }
    } catch (err) {
      console.error('[useStocks] Failed to fetch low stocks:', err)
    } finally {
      setIsLoadingLow(false)
    }
  }, [isOnline, debouncedSearch, filters.warehouseId, filters.branchId])

  // Fetch expired stocks
  const fetchExpiredStocks = useCallback(async () => {
    setIsLoadingExpired(true)

    try {
      if (!isOnline) {
        setExpiredStocks([])
        setIsLoadingExpired(false)
        return
      }

      const params: GetStocksParams = {
        limit: 1000,
      }

      if (debouncedSearch) {
        params.search = debouncedSearch
      }

      if (filters.warehouseId) {
        params.warehouse_id = filters.warehouseId
      }

      if (filters.branchId) {
        params.branch_id = filters.branchId
      }

      const response = await stocksListService.getExpiredStocks(params)

      if (response.data && Array.isArray(response.data)) {
        setExpiredStocks(response.data)
      } else {
        setExpiredStocks([])
      }
    } catch (err) {
      console.error('[useStocks] Failed to fetch expired stocks:', err)
    } finally {
      setIsLoadingExpired(false)
    }
  }, [isOnline, debouncedSearch, filters.warehouseId, filters.branchId])

  // Initial fetch
  useEffect(() => {
    fetchAllStocks()
  }, [fetchAllStocks])

  useEffect(() => {
    fetchLowStocks()
  }, [fetchLowStocks])

  useEffect(() => {
    fetchExpiredStocks()
  }, [fetchExpiredStocks])

  // Filtered products with memoization
  const filteredAllStocks = useMemo(() => {
    return allStocks
  }, [allStocks])

  const filteredLowStocks = useMemo(() => {
    return lowStocks
  }, [lowStocks])

  const filteredExpiredStocks = useMemo(() => {
    return expiredStocks
  }, [expiredStocks])

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([fetchAllStocks(), fetchLowStocks(), fetchExpiredStocks()])
  }, [fetchAllStocks, fetchLowStocks, fetchExpiredStocks])

  return {
    allStocks,
    lowStocks,
    expiredStocks,
    isLoading,
    isLoadingLow,
    isLoadingExpired,
    isOffline: !isOnline,
    error,
    currentPage,
    perPage,
    totalItems,
    filteredAllStocks,
    filteredLowStocks,
    filteredExpiredStocks,
    refetch,
    setPage: setCurrentPage,
    setPerPage,
  }
}

export default useStocks
