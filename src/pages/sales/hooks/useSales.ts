import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { salesService } from '@/api/services'
import { saleRepository } from '@/lib/db/repositories'
import { useSyncStore } from '@/stores/sync.store'
import type { Sale } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface SalesFilters {
  search: string
  dateFrom: string
  dateTo: string
  customerId: string
  paymentStatus: 'all' | 'paid' | 'partial' | 'unpaid'
  syncStatus: 'all' | 'synced' | 'pending'
}

export interface SalesStats {
  total: number
  totalAmount: number
  totalPaid: number
  totalDue: number
  paidCount: number
  partialCount: number
  unpaidCount: number
  pendingSyncCount: number
}

export interface PaymentStatus {
  status: 'paid' | 'partial' | 'unpaid'
  label: string
  variant: 'default' | 'destructive' | 'warning' | 'success'
}

interface UseSalesReturn {
  // Data
  sales: Sale[]
  offlineSales: Sale[]

  // Loading & Error States
  isLoading: boolean
  error: Error | null

  // Filtered data
  filteredSales: Sale[]

  // Stats
  stats: SalesStats

  // Actions
  refetch: () => Promise<void>
  deleteSale: (id: number) => Promise<void>

  // Sync
  syncPending: () => Promise<void>
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get payment status for a sale
 */
export function getPaymentStatus(sale: Sale): PaymentStatus {
  const paidAmount = sale.paidAmount ?? 0
  const totalAmount = sale.totalAmount ?? 0
  const dueAmount = sale.dueAmount ?? 0

  if (dueAmount <= 0 || paidAmount >= totalAmount) {
    return { status: 'paid', label: 'Paid', variant: 'success' }
  }
  if (paidAmount > 0) {
    return { status: 'partial', label: 'Partial', variant: 'warning' }
  }
  return { status: 'unpaid', label: 'Unpaid', variant: 'destructive' }
}

/**
 * Check if sale is synced (not offline)
 */
export function isSaleSynced(sale: Sale & { isOffline?: boolean; isSynced?: boolean }): boolean {
  // If it has isOffline/isSynced flags (from IndexedDB)
  if ('isOffline' in sale || 'isSynced' in sale) {
    return sale.isSynced === true || sale.isOffline === false
  }
  // If it came from API, it's synced
  return !sale.invoiceNumber?.startsWith('OFFLINE-')
}

/**
 * Format sale date for display
 */
export function formatSaleDate(dateString: string): string {
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
 * Get items count from sale details
 */
export function getSaleItemsCount(sale: Sale): number {
  return sale.details?.length ?? 0
}

function extractDateKey(value: string): string | null {
  const trimmed = value.trim()
  const match = /^\d{4}-\d{2}-\d{2}/.exec(trimmed)
  return match ? match[0] : null
}

export function filterSales(allSales: Sale[], filters: SalesFilters): Sale[] {
  return allSales.filter((sale) => {
    // Search filter (invoice number or customer name)
    if (filters.search) {
      const query = filters.search.toLowerCase().trim()
      const matchesInvoice = sale.invoiceNumber?.toLowerCase().includes(query)
      const matchesCustomer = sale.party?.name?.toLowerCase().includes(query)
      if (!matchesInvoice && !matchesCustomer) return false
    }

    // Date range filter
    if (filters.dateFrom) {
      const saleKey = extractDateKey(sale.saleDate)
      const fromKey = extractDateKey(filters.dateFrom) ?? filters.dateFrom
      if (saleKey) {
        if (saleKey < fromKey) return false
      } else {
        const saleDate = new Date(sale.saleDate)
        const fromDate = new Date(filters.dateFrom)
        if (saleDate < fromDate) return false
      }
    }
    if (filters.dateTo) {
      const saleKey = extractDateKey(sale.saleDate)
      const toKey = extractDateKey(filters.dateTo) ?? filters.dateTo
      if (saleKey) {
        if (saleKey > toKey) return false
      } else {
        const saleDate = new Date(sale.saleDate)
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999) // End of day
        if (saleDate > toDate) return false
      }
    }

    // Customer filter
    if (filters.customerId && filters.customerId !== 'all') {
      if (sale.party?.id?.toString() !== filters.customerId) return false
    }

    // Payment status filter
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      const status = getPaymentStatus(sale).status
      if (status !== filters.paymentStatus) return false
    }

    // Sync status filter
    if (filters.syncStatus && filters.syncStatus !== 'all') {
      const synced = isSaleSynced(sale as Sale & { isOffline?: boolean })
      if (filters.syncStatus === 'synced' && !synced) return false
      if (filters.syncStatus === 'pending' && synced) return false
    }

    return true
  })
}

export function calculateSalesStats(allSales: Sale[]): SalesStats {
  return allSales.reduce(
    (acc, sale) => {
      const status = getPaymentStatus(sale).status
      const synced = isSaleSynced(sale as Sale & { isOffline?: boolean })

      acc.total += 1
      acc.totalAmount += sale.totalAmount ?? 0
      acc.totalPaid += sale.paidAmount ?? 0
      acc.totalDue += sale.dueAmount ?? 0

      if (status === 'paid') acc.paidCount += 1
      else if (status === 'partial') acc.partialCount += 1
      else if (status === 'unpaid') acc.unpaidCount += 1

      if (!synced) acc.pendingSyncCount += 1

      return acc
    },
    {
      total: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0,
      paidCount: 0,
      partialCount: 0,
      unpaidCount: 0,
      pendingSyncCount: 0,
    }
  )
}

// ============================================
// Default Filter State
// ============================================

export const DEFAULT_FILTERS: SalesFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
  customerId: '',
  paymentStatus: 'all',
  syncStatus: 'all',
}

// ============================================
// Hook Implementation
// ============================================

export function useSales(filters: SalesFilters): UseSalesReturn {
  // State
  const [sales, setSales] = useState<Sale[]>([])
  const [offlineSales, setOfflineSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Sync store
  const isOnline = useSyncStore((state) => state.isOnline)

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch from API (if online)
      let apiSales: Sale[] = []
      if (isOnline) {
        try {
          const response = await salesService.getAll()
          apiSales = response.data || []
        } catch (err) {
          console.warn('Failed to fetch from API, using local data:', err)
        }
      }

      // Fetch offline/pending sales from IndexedDB
      let localSales: Sale[] = []
      try {
        const pending = await saleRepository.getOfflineSales()
        localSales = pending as unknown as Sale[]
      } catch (err) {
        console.warn('Failed to fetch local sales:', err)
      }

      // Merge: API sales + pending offline sales (avoid duplicates)
      const apiIds = new Set(apiSales.map((s) => s.id))
      const pendingOffline = localSales.filter((s) => !apiIds.has(s.id))

      setSales(apiSales)
      setOfflineSales(pendingOffline)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch sales')
      setError(error)
      toast.error('Failed to load sales. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [isOnline])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Combine sales for display
  const allSales = useMemo(() => {
    return [...offlineSales, ...sales]
  }, [sales, offlineSales])

  // Filtered sales with memoization
  const filteredSales = useMemo(() => {
    return filterSales(allSales, filters)
  }, [allSales, filters])

  // Calculate stats
  const stats = useMemo<SalesStats>(() => {
    return calculateSalesStats(allSales)
  }, [allSales])

  // Delete sale
  const deleteSale = useCallback(async (id: number): Promise<void> => {
    await salesService.delete(id)
    setSales((prev) => prev.filter((s) => s.id !== id))
    toast.success('Sale deleted successfully')
  }, [])

  // Sync pending sales
  const syncPending = useCallback(async () => {
    // This would trigger the sync service
    toast.info('Syncing pending sales...')
    await fetchData()
  }, [fetchData])

  return {
    sales,
    offlineSales,
    isLoading,
    error,
    filteredSales,
    stats,
    refetch: fetchData,
    deleteSale,
    syncPending,
  }
}

export default useSales
