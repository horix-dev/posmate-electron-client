import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import api, { PaginatedApiResponse } from '@/api/axios'
import { API_ENDPOINTS } from '@/api/endpoints'
import { createAppError } from '@/lib/errors'
import type { SaleReturn } from '@/types/api.types'

export interface SaleReturnsFilters {
  search: string
  dateFrom: string
  dateTo: string
}

export const DEFAULT_RETURN_FILTERS: SaleReturnsFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
}

export function useSaleReturns(filters: SaleReturnsFilters = DEFAULT_RETURN_FILTERS) {
  const [saleReturns, setSaleReturns] = useState<SaleReturn[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  const fetchSaleReturns = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: perPage,
      }

      if (filters.search) params.search = filters.search
      if (filters.dateFrom) params.date_from = filters.dateFrom
      if (filters.dateTo) params.date_to = filters.dateTo

      const { data } = await api.get<PaginatedApiResponse<SaleReturn[]>>(
        API_ENDPOINTS.SALE_RETURNS.LIST,
        { params }
      )

      setSaleReturns(data.data || [])
      setTotalPages(data.last_page || 0)
      setTotalItems(data.total || 0)
    } catch (err) {
      const appError = createAppError(err, 'Failed to load sale returns')
      setError(appError)
      toast.error(appError.message)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, perPage, filters.search, filters.dateFrom, filters.dateTo])

  useEffect(() => {
    fetchSaleReturns()
  }, [fetchSaleReturns])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters.search, filters.dateFrom, filters.dateTo])

  const stats = useMemo(() => {
    let totalAmount = 0
    let totalQty = 0
    
    saleReturns.forEach((returnItem) => {
      returnItem.details?.forEach((detail) => {
        totalAmount += detail.return_amount || 0
        totalQty += detail.return_qty || 0
      })
    })

    return { total: totalItems, totalAmount, totalQty }
  }, [saleReturns, totalItems])

  return {
    saleReturns,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    perPage,
    stats,
    setPage: setCurrentPage,
    setPerPage,
    refetch: fetchSaleReturns,
  }
}
