import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import api from '@/api/axios'
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
  const [allSaleReturns, setAllSaleReturns] = useState<SaleReturn[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const fetchSaleReturns = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params: Record<string, string | number> = {
        limit: 1000,
      }

      if (filters.search) params.search = filters.search
      if (filters.dateFrom) params.date_from = filters.dateFrom
      if (filters.dateTo) params.date_to = filters.dateTo

      const { data } = await api.get<unknown>(
        API_ENDPOINTS.SALE_RETURNS.LIST,
        { params }
      )

      // Handle flexible response format - can be direct array or wrapped in data
      const returns = Array.isArray(data) ? data : ((data as { data?: SaleReturn[] })?.data || [])
      setAllSaleReturns(returns)
    } catch (err) {
      const appError = createAppError(err, 'Failed to load sale returns')
      setError(appError)
      toast.error(appError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters.search, filters.dateFrom, filters.dateTo])

  useEffect(() => {
    fetchSaleReturns()
  }, [fetchSaleReturns])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters.search, filters.dateFrom, filters.dateTo])

  // Client-side pagination
  const totalItems = allSaleReturns.length
  const totalPages = Math.ceil(totalItems / perPage)
  const startIndex = (currentPage - 1) * perPage
  const paginatedReturns = allSaleReturns.slice(startIndex, startIndex + perPage)

  const stats = useMemo(() => {
    let totalAmount = 0
    let totalQty = 0
    
    allSaleReturns.forEach((returnItem) => {
      // Try to use pre-calculated totals from backend (snake_case)
      if (returnItem.total_return_amount != null) {
        totalAmount += returnItem.total_return_amount
      } 
      // Try camelCase (backend sometimes sends this)
      else if ((returnItem as unknown as { returnAmount?: number }).returnAmount != null) {
        totalAmount += (returnItem as unknown as { returnAmount: number }).returnAmount
      }
      // Fallback: calculate from details array
      else if (returnItem.details && Array.isArray(returnItem.details)) {
        returnItem.details.forEach((detail) => {
          totalAmount += detail.return_amount || 0
        })
      }

      // Same logic for quantity
      if (returnItem.total_return_qty != null) {
        totalQty += returnItem.total_return_qty
      }
      else if ((returnItem as unknown as { returnQty?: number }).returnQty != null) {
        totalQty += (returnItem as unknown as { returnQty: number }).returnQty
      }
      else if (returnItem.details && Array.isArray(returnItem.details)) {
        returnItem.details.forEach((detail) => {
          totalQty += detail.return_qty || 0
        })
      }
    })

    return { total: totalItems, totalAmount, totalQty }
  }, [allSaleReturns, totalItems])

  return {
    saleReturns: paginatedReturns,
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
