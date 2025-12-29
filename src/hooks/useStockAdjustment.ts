/**
 * useStockAdjustment Hook
 * Provides offline-first stock adjustment operations with sync capabilities
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { stockAdjustmentRepository } from '@/lib/db/repositories/stockAdjustment.repository'
import { syncQueueRepository } from '@/lib/db/repositories/syncQueue.repository'
import { stockAdjustmentService } from '@/api/services/stockAdjustment.service'
import { stocksService } from '@/api/services/stocks.service'
import { variantsService } from '@/api/services/variants.service'
import { productsService } from '@/api/services/products.service'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncStore } from '@/stores/sync.store'
import { toast } from 'sonner'
import axios from 'axios'
import { getApiErrorMessage } from '@/api/axios'
import { AppError, createAppError } from '@/lib/errors'
import type {
  StockAdjustment,
  StockAdjustmentFilters,
  StockAdjustmentSummary,
  Batch,
} from '@/types/stockAdjustment.types'

// ============================================
// Types
// ============================================

interface CreateAdjustmentParams {
  productId: number
  variantId?: number
  batchId?: number
  batchNo?: string | null
  stockId?: number
  type: 'in' | 'out'
  quantity: number
  reason: string
  referenceNumber?: string
  notes?: string
  adjustedBy: number
  adjustmentDate?: string
  currentStock: number // Required for validation and tracking
}

interface UseStockAdjustmentReturn {
  // Create adjustment
  createAdjustment: (params: CreateAdjustmentParams) => Promise<void>
  isCreating: boolean

  // Retry sync
  retrySync: (adjustment: StockAdjustment) => Promise<void>
  isRetrying: boolean

  // Query adjustments
  useAdjustments: (filters?: StockAdjustmentFilters) => {
    data: StockAdjustment[]
    isLoading: boolean
    error: Error | null
    refetch: () => void
  }

  // Query adjustments for a specific product
  useProductAdjustments: (productId: number) => {
    data: StockAdjustment[]
    isLoading: boolean
    error: Error | null
    refetch: () => void
  }

  // Query pending adjustments (for sync display)
  usePendingAdjustments: () => {
    data: StockAdjustment[]
    count: number
    isLoading: boolean
    refetch: () => void
  }

  // Query summary statistics
  useSummary: (filters?: { startDate?: string; endDate?: string; productId?: number }) => {
    data: StockAdjustmentSummary | null
    isLoading: boolean
    refetch: () => void
  }

  // Batch management (for variant products)
  useProductBatches: (
    productId: number,
    enabled?: boolean
  ) => {
    data: Batch[] | null
    isLoading: boolean
    error: Error | null
  }
}

// ============================================
// Hook Implementation
// ============================================

export function useStockAdjustment(): UseStockAdjustmentReturn {
  const isOnline = useOnlineStatus()
  const queryClient = useQueryClient()
  const updatePendingSyncCount = useSyncStore((state) => state.updatePendingSyncCount)

  const isNonRetryableClientError = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) return false
    const status = error.response?.status
    // Don't queue offline for validation/auth errors; these won't succeed later.
    return typeof status === 'number' && status >= 400 && status < 500 && status !== 429
  }

  const toUserFacingError = (error: unknown, context?: string): Error => {
    const message = getApiErrorMessage(error)
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      return new AppError(message, 'VALIDATION_ERROR')
    }
    return createAppError(error, context)
  }

  // ========== Create Adjustment ==========

  const createMutation = useMutation({
    mutationFn: async (params: CreateAdjustmentParams) => {
      const { currentStock, ...adjustmentData } = params

      // Validation: prevent negative stock
      if (adjustmentData.type === 'out' && currentStock < adjustmentData.quantity) {
        throw new Error(
          `Insufficient stock. Available: ${currentStock}, Requested: ${adjustmentData.quantity}`
        )
      }

      // Calculate new quantities
      const oldQuantity = currentStock
      const newQuantity =
        adjustmentData.type === 'in'
          ? currentStock + adjustmentData.quantity
          : currentStock - adjustmentData.quantity

      const adjustment: Omit<StockAdjustment, 'id'> = {
        productId: adjustmentData.productId,
        variantId: adjustmentData.variantId,
        batchId: adjustmentData.batchId,
        type: adjustmentData.type,
        quantity: adjustmentData.quantity,
        reason: adjustmentData.reason,
        referenceNumber: adjustmentData.referenceNumber,
        notes: adjustmentData.notes,
        adjustedBy: adjustmentData.adjustedBy,
        adjustmentDate: adjustmentData.adjustmentDate || new Date().toISOString(),
        oldQuantity,
        newQuantity,
        syncStatus: 'pending',
      }

      // If online, try to sync immediately
      if (isOnline.isOnline) {
        try {
          // Backend alignment:
          // - Simple products: update the stock record via /stocks/:id (productStock)
          // - Variant products: update variant stock via /variants/:id/stock (quantity + operation)
          let serverId: number | undefined

          if (adjustment.variantId) {
            const operation = adjustment.type === 'in' ? 'increment' : 'decrement'
            // If backend tracks stock per-warehouse/batch, include the existing record's location
            // so we mutate the same bucket that the UI totals come from.
            const productResponse = await productsService.getById(adjustment.productId)
            const stockRecord = productResponse.data.stocks?.find(
              (s) => s.variant_id === adjustment.variantId
            )

            const response = await variantsService.updateStock(adjustment.variantId, {
              quantity: adjustment.quantity,
              operation,
              warehouse_id: stockRecord?.warehouse_id,
              batch_no: adjustmentData.batchNo ?? stockRecord?.batch_no ?? null,
            })

            serverId = response.data.stock_record?.id
          } else {
            let stockId = adjustmentData.stockId

            // If a batch was selected but stockId wasn't resolved, fetch the product and
            // pick the matching stock record by batch_no.
            if (!stockId && adjustmentData.batchNo) {
              const productResponse = await productsService.getById(adjustment.productId)
              stockId = productResponse.data.stocks?.find(
                (s) => s.variant_id == null && s.batch_no === adjustmentData.batchNo
              )?.id
            }

            if (!stockId) {
              throw new Error('Stock record not found for selected product')
            }
            const response = await stocksService.update(stockId, {
              productStock: newQuantity,
            })
            serverId = response.data.id
          }

          // Save to local DB with synced status
          if (typeof serverId === 'number') {
            adjustment.serverId = serverId
          }
          adjustment.syncStatus = 'synced'
          await stockAdjustmentRepository.create(adjustment)

          return { mode: 'synced' as const }
        } catch (error) {
          // Validation/auth/client errors should not be queued offline.
          if (isNonRetryableClientError(error)) {
            throw toUserFacingError(error, 'Failed to create stock adjustment')
          }

          // If online sync fails for retryable reasons, save locally + queue for later.
          console.error('Failed to sync stock adjustment online, saving locally:', error)
        }
      }

      // Offline mode or online sync failed: save locally
      const localId = await stockAdjustmentRepository.create(adjustment)

      // Add to sync queue for later synchronization
      const nowIso = new Date().toISOString()

      if (adjustment.variantId) {
        const operation = adjustment.type === 'in' ? 'increment' : 'decrement'
        await syncQueueRepository.enqueue({
          idempotencyKey: crypto.randomUUID ? crypto.randomUUID() : `stock-${Date.now()}`,
          entity: 'stock' as const,
          operation: 'UPDATE',
          entityId: localId,
          endpoint: `/variants/${adjustment.variantId}/stock`,
          method: 'PUT',
          data: JSON.stringify({
            quantity: adjustment.quantity,
            operation,
            batch_no: adjustmentData.batchNo ?? undefined,
          }),
          attempts: 0,
          maxAttempts: 5,
          offlineTimestamp: nowIso,
          status: 'pending',
          createdAt: nowIso,
        })

        await updatePendingSyncCount()
        return { mode: 'queued' as const }
      }

      const stockId = adjustmentData.stockId
      if (!stockId) {
        throw new Error('Stock record not found for selected product')
      }

      await syncQueueRepository.enqueue({
        idempotencyKey: crypto.randomUUID ? crypto.randomUUID() : `stock-${Date.now()}`,
        entity: 'stock' as const,
        operation: 'UPDATE',
        entityId: localId,
        endpoint: `/stocks/${stockId}`,
        method: 'POST',
        data: JSON.stringify({
          productStock: newQuantity,
          _method: 'PUT',
        }),
        attempts: 0,
        maxAttempts: 5,
        offlineTimestamp: nowIso,
        status: 'pending',
        createdAt: nowIso,
      })

      // Update pending sync count
      await updatePendingSyncCount()

      return { mode: 'queued' as const }
    },
    onSuccess: (result) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment-summary'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })

      if (result?.mode === 'queued') {
        toast.info('Saved offline. Will sync when online.')
      } else {
        toast.success('Stock updated successfully')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create stock adjustment')
    },
  })

  // ========== Query All Adjustments ==========

  function useAdjustments(filters?: StockAdjustmentFilters) {
    const query = useQuery({
      queryKey: ['stock-adjustments', filters],
      queryFn: async () => {
        return await stockAdjustmentRepository.getAll(filters)
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
    })

    return {
      data: query.data || [],
      isLoading: query.isLoading,
      error: query.error,
      refetch: query.refetch,
    }
  }

  // ========== Query Product Adjustments ==========

  function useProductAdjustments(productId: number) {
    const query = useQuery({
      queryKey: ['stock-adjustments', 'product', productId],
      queryFn: async () => {
        return await stockAdjustmentRepository.getByProductId(productId)
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
    })

    return {
      data: query.data || [],
      isLoading: query.isLoading,
      error: query.error,
      refetch: query.refetch,
    }
  }

  // ========== Query Pending Adjustments ==========

  function usePendingAdjustments() {
    const query = useQuery({
      queryKey: ['stock-adjustments', 'pending'],
      queryFn: async () => {
        return await stockAdjustmentRepository.getPending()
      },
      staleTime: 1000 * 30, // 30 seconds (more frequent for sync display)
      refetchInterval: 1000 * 30, // Poll every 30 seconds
    })

    return {
      data: query.data || [],
      count: query.data?.length || 0,
      isLoading: query.isLoading,
      refetch: query.refetch,
    }
  }

  // ========== Query Summary ==========

  function useSummary(filters?: { startDate?: string; endDate?: string; productId?: number }) {
    const query = useQuery({
      queryKey: ['stock-adjustment-summary', filters],
      queryFn: async () => {
        return await stockAdjustmentRepository.getSummary(filters)
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    })

    return {
      data: query.data || null,
      isLoading: query.isLoading,
      refetch: query.refetch,
    }
  }

  // ========== Query Product Batches ==========

  function useProductBatches(productId: number, enabled = true) {
    const query = useQuery({
      queryKey: ['product-batches', productId],
      queryFn: async () => {
        if (!isOnline.isOnline) {
          throw new Error('Batch data requires online connection')
        }
        const response = await stockAdjustmentService.getProductBatches(productId)
        return response.batches
      },
      enabled: enabled && isOnline.isOnline,
      staleTime: 1000 * 60 * 2, // 2 minutes
    })

    return {
      data: query.data || null,
      isLoading: query.isLoading,
      error: query.error,
    }
  }

  // ========== Retry Sync ==========

  const retrySyncMutation = useMutation({
    mutationFn: async (adjustment: StockAdjustment) => {
      if (!adjustment.id) {
        throw new Error('Adjustment ID is required')
      }

      if (adjustment.syncStatus === 'synced') {
        throw new Error('Adjustment already synced')
      }

      if (!isOnline.isOnline) {
        throw new Error('Cannot retry sync while offline')
      }

      // Try to sync with backend-aligned endpoints.
      try {
        let serverId: number | undefined

        if (adjustment.variantId) {
          const operation = adjustment.type === 'in' ? 'increment' : 'decrement'

          let selectedBatchNo: string | null | undefined
          if (typeof adjustment.batchId === 'number') {
            try {
              const batchResponse = await stockAdjustmentService.getBatchById(adjustment.batchId)
              const batch = batchResponse.batch ?? batchResponse.data
              selectedBatchNo = batch?.batch_no ?? batch?.batch_number
            } catch {
              // Non-fatal; fall back to stockRecord batch
            }
          }

          const productResponse = await productsService.getById(adjustment.productId)
          const stockRecord = productResponse.data.stocks?.find(
            (s) => s.variant_id === adjustment.variantId
          )
          const response = await variantsService.updateStock(adjustment.variantId, {
            quantity: adjustment.quantity,
            operation,
            warehouse_id: stockRecord?.warehouse_id,
            batch_no: selectedBatchNo ?? stockRecord?.batch_no ?? null,
          })
          serverId = response.data.stock_record?.id
        } else {
          if (typeof adjustment.newQuantity !== 'number') {
            throw new Error('Missing new stock quantity for retry')
          }

          let selectedBatchNo: string | null | undefined
          if (typeof adjustment.batchId === 'number') {
            try {
              const batchResponse = await stockAdjustmentService.getBatchById(adjustment.batchId)
              const batch = batchResponse.batch ?? batchResponse.data
              selectedBatchNo = batch?.batch_no ?? batch?.batch_number
            } catch {
              // Non-fatal; fall back to first stock
            }
          }

          const productResponse = await productsService.getById(adjustment.productId)
          const stockId = selectedBatchNo
            ? productResponse.data.stocks?.find(
                (s) => s.variant_id == null && s.batch_no === selectedBatchNo
              )?.id
            : productResponse.data.stocks?.[0]?.id
          if (!stockId) {
            throw new Error('Stock record not found for product')
          }
          const response = await stocksService.update(stockId, {
            productStock: adjustment.newQuantity,
          })
          serverId = response.data.id
        }

        if (typeof serverId !== 'number') {
          throw new Error('Server did not return an ID')
        }

        await stockAdjustmentRepository.markAsSynced(adjustment.id, serverId)
        return { id: serverId }
      } catch (error) {
        if (isNonRetryableClientError(error)) {
          throw toUserFacingError(error, 'Failed to sync stock adjustment')
        }
        throw toUserFacingError(error, 'Failed to sync stock adjustment')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment-summary'] })
      updatePendingSyncCount()
      toast.success('Stock adjustment synced successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync stock adjustment')
    },
  })

  // ========== Return Hook Interface ==========

  return {
    createAdjustment: async (params: CreateAdjustmentParams) => {
      await createMutation.mutateAsync(params)
    },
    isCreating: createMutation.isPending,
    retrySync: async (adjustment: StockAdjustment) => {
      await retrySyncMutation.mutateAsync(adjustment)
    },
    isRetrying: retrySyncMutation.isPending,
    useAdjustments,
    useProductAdjustments,
    usePendingAdjustments,
    useSummary,
    useProductBatches,
  }
}
