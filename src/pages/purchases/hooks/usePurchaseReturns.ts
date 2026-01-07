import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { purchasesService } from '@/api/services'
import type { PurchaseReturn } from '@/types/api.types'
import { createAppError, AppError } from '@/lib/errors'

export interface PurchaseReturnsFilters {
  search: string
  dateFrom: string
  dateTo: string
}

export const DEFAULT_RETURN_FILTERS: PurchaseReturnsFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
}

export function usePurchaseReturns(filters: PurchaseReturnsFilters) {
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const fetchPurchaseReturns = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: perPage,
      }

      if (filters.search) params.search = filters.search
      if (filters.dateFrom) params.date_from = filters.dateFrom
      if (filters.dateTo) params.date_to = filters.dateTo

      const response = await purchasesService.getReturns(params)

      let data: PurchaseReturn[] = []
      let total = 0
      let lastPage = 1

      if (response.data) {
        if (Array.isArray(response.data)) {
          data = response.data
          total = response.total || data.length
          lastPage = response.last_page || Math.ceil(total / perPage)
        } else if (typeof response.data === 'object' && 'data' in response.data) {
          const nested = response.data as { data: PurchaseReturn[]; total?: number; last_page?: number }
          data = nested.data || []
          total = nested.total || data.length
          lastPage = nested.last_page || Math.ceil(total / perPage)
        }
      }

      setPurchaseReturns(data)
      setTotalItems(total)
      setTotalPages(lastPage)
    } catch (err) {
      const appError = createAppError(err, 'Failed to fetch purchase returns')
      setError(appError)
      toast.error(appError.message)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, perPage, filters])

  useEffect(() => {
    fetchPurchaseReturns()
  }, [fetchPurchaseReturns])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters.search, filters.dateFrom, filters.dateTo])

  const stats = useMemo(() => {
    let totalAmount = 0
    let totalQty = 0
    
    purchaseReturns.forEach((returnItem) => {
      returnItem.details?.forEach((detail) => {
        totalAmount += detail.return_amount || 0
        totalQty += detail.return_qty || 0
      })
    })

    return { total: totalItems, totalAmount, totalQty }
  }, [purchaseReturns, totalItems])

  return {
    purchaseReturns,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    perPage,
    stats,
    setPage: setCurrentPage,
    setPerPage,
    refetch: fetchPurchaseReturns,
  }
}
