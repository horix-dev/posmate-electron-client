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
  const [allPurchaseReturns, setAllPurchaseReturns] = useState<PurchaseReturn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const fetchPurchaseReturns = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params: Record<string, unknown> = {
        limit: 1000,
      }

      if (filters.search) params.search = filters.search
      if (filters.dateFrom) params.date_from = filters.dateFrom
      if (filters.dateTo) params.date_to = filters.dateTo

      const response = await purchasesService.getReturns(params)

      let data: PurchaseReturn[] = []

      if (response.data) {
        if (Array.isArray(response.data)) {
          data = response.data
        } else if (typeof response.data === 'object' && 'data' in response.data) {
          const nested = response.data as { data: PurchaseReturn[] }
          data = nested.data || []
        }
      }

      setAllPurchaseReturns(data)
    } catch (err) {
      const appError = createAppError(err, 'Failed to fetch purchase returns')
      setError(appError)
      toast.error(appError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchPurchaseReturns()
  }, [fetchPurchaseReturns])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters.search, filters.dateFrom, filters.dateTo])

  // Client-side pagination
  const totalItems = allPurchaseReturns.length
  const totalPages = Math.ceil(totalItems / perPage)
  const startIndex = (currentPage - 1) * perPage
  const paginatedReturns = allPurchaseReturns.slice(startIndex, startIndex + perPage)

  const stats = useMemo(() => {
    let totalAmount = 0
    let totalQty = 0
    
    allPurchaseReturns.forEach((returnItem) => {
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
  }, [allPurchaseReturns, totalItems])

  return {
    purchaseReturns: paginatedReturns,
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
