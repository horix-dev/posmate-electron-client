import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { purchasesService } from '@/api/services'
import { useSyncStore } from '@/stores/sync.store'
import type { Purchase } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface PurchasesFilters {
  search: string
  dateFrom: string
  dateTo: string
  supplierId: string
  paymentStatus: 'all' | 'paid' | 'partial' | 'unpaid'
}

export interface PurchasesStats {
  total: number
  totalAmount: number
  totalPaid: number
  totalDue: number
  paidCount: number
  partialCount: number
  unpaidCount: number
}

export interface PaymentStatus {
  status: 'paid' | 'partial' | 'unpaid'
  label: string
  variant: 'default' | 'destructive' | 'warning' | 'success'
}

export function buildPurchasesQueryParams(
  filters: PurchasesFilters,
  currentPage: number,
  perPage: number
): Parameters<typeof purchasesService.getAll>[0] {
  const params: Record<string, unknown> = {
    page: currentPage,
    per_page: perPage,
  }

  if (filters.search) {
    params.search = filters.search
  }
  if (filters.dateFrom) {
    params.start_date = filters.dateFrom
  }
  if (filters.dateTo) {
    params.end_date = filters.dateTo
  }
  if (filters.supplierId) {
    params.party_id = Number(filters.supplierId)
  }

  return params as Parameters<typeof purchasesService.getAll>[0]
}

export function calculatePurchasesStats(purchases: Purchase[], totalItems: number): PurchasesStats {
  let totalAmount = 0
  let totalPaid = 0
  let totalDue = 0
  let paidCount = 0
  let partialCount = 0
  let unpaidCount = 0

  purchases.forEach((purchase) => {
    totalAmount += purchase.totalAmount ?? 0
    totalPaid += purchase.paidAmount ?? 0
    totalDue += purchase.dueAmount ?? 0

    const status = getPaymentStatus(purchase)
    if (status.status === 'paid') paidCount++
    else if (status.status === 'partial') partialCount++
    else unpaidCount++
  })

  return {
    total: totalItems,
    totalAmount,
    totalPaid,
    totalDue,
    paidCount,
    partialCount,
    unpaidCount,
  }
}

interface UsePurchasesReturn {
  // Data
  purchases: Purchase[]

  // Pagination
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number

  // Loading & Error States
  isLoading: boolean
  error: Error | null

  // Filtered data
  filteredPurchases: Purchase[]

  // Stats
  stats: PurchasesStats

  // Actions
  refetch: () => Promise<void>
  deletePurchase: (id: number) => Promise<void>
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get payment status for a purchase
 */
export function getPaymentStatus(purchase: Purchase): PaymentStatus {
  const paidAmount = purchase.paidAmount ?? 0
  const totalAmount = purchase.totalAmount ?? 0
  const dueAmount = purchase.dueAmount ?? 0

  if (dueAmount <= 0 || paidAmount >= totalAmount) {
    return { status: 'paid', label: 'Paid', variant: 'success' }
  }
  if (paidAmount > 0) {
    return { status: 'partial', label: 'Partial', variant: 'warning' }
  }
  return { status: 'unpaid', label: 'Unpaid', variant: 'destructive' }
}

/**
 * Format purchase date for display
 */
export function formatPurchaseDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

/**
 * Get items count from purchase details
 */
export function getPurchaseItemsCount(purchase: Purchase): number {
  return purchase.details?.length ?? 0
}

/**
 * Get total quantity from purchase details
 */
export function getPurchaseTotalQuantity(purchase: Purchase): number {
  return purchase.details?.reduce((sum, detail) => sum + detail.quantities, 0) ?? 0
}

// ============================================
// Default Filter State
// ============================================

export const DEFAULT_FILTERS: PurchasesFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
  supplierId: '',
  paymentStatus: 'all',
}

// ============================================
// Hook Implementation
// ============================================

export function usePurchases(filters: PurchasesFilters): UsePurchasesReturn {
  // State
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [perPage, setPerPage] = useState(10)

  // Sync store
  const isOnline = useSyncStore((state) => state.isOnline)

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await purchasesService.getAll(
        buildPurchasesQueryParams(filters, currentPage, perPage)
      )

      // Handle paginated response
      if (response.data && typeof response.data === 'object') {
        const paginatedData = response.data as unknown as {
          data?: Purchase[]
          current_page?: number
          last_page?: number
          total?: number
          per_page?: number
        }

        if (Array.isArray(paginatedData.data)) {
          setPurchases(paginatedData.data)
          setCurrentPage(paginatedData.current_page ?? 1)
          setTotalPages(paginatedData.last_page ?? 1)
          setTotalItems(paginatedData.total ?? paginatedData.data.length)
        } else if (Array.isArray(response.data)) {
          setPurchases(response.data)
          setTotalItems(response.data.length)
          setTotalPages(Math.ceil(response.data.length / perPage))
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch purchases')
      setError(error)
      if (isOnline) {
        toast.error('Failed to load purchases. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, perPage, filters, isOnline])

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters.search, filters.dateFrom, filters.dateTo, filters.supplierId, filters.paymentStatus])

  // Filtered purchases (client-side filtering for payment status)
  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      // Payment status filter (client-side since API might not support it)
      if (filters.paymentStatus !== 'all') {
        const status = getPaymentStatus(purchase)
        if (status.status !== filters.paymentStatus) {
          return false
        }
      }
      return true
    })
  }, [purchases, filters.paymentStatus])

  // Calculate stats
  const stats = useMemo<PurchasesStats>(() => {
    return calculatePurchasesStats(purchases, totalItems)
  }, [purchases, totalItems])

  // Delete purchase
  const deletePurchase = useCallback(
    async (id: number) => {
      try {
        await purchasesService.delete(id)
        toast.success('Purchase deleted successfully')
        await fetchData()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete purchase')
        toast.error(error.message)
        throw error
      }
    },
    [fetchData]
  )

  // Set page
  const setPage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // Set per page
  const handleSetPerPage = useCallback((newPerPage: number) => {
    setPerPage(newPerPage)
    setCurrentPage(1) // Reset to first page when changing page size
  }, [])

  return {
    purchases,
    currentPage,
    totalPages,
    totalItems,
    perPage,
    isLoading,
    error,
    filteredPurchases,
    stats,
    refetch: fetchData,
    deletePurchase,
    setPage,
    setPerPage: handleSetPerPage,
  }
}
