import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { unitsService } from '@/api/services/units.service'
import { setCache, getCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createAppError } from '@/lib/errors'
import type { Unit, ApiResponse } from '@/types/api.types'
import type { PaginatedApiResponse } from '@/api/axios'

const CACHE_KEY = 'cache:units:list'

interface UseUnitsOptions {
  page?: number
  perPage?: number
  search?: string
}

/**
 * Hook for managing units with React Query
 * Provides automatic caching, refetching, and offline support
 */
export function useUnits(options: UseUnitsOptions = {}) {
  const { page = 1, perPage = 10, search } = options
  const { isOnline } = useOnlineStatus()
  const queryClient = useQueryClient()

  const unitsQuery = useQuery<PaginatedApiResponse<Unit[]>>({
    queryKey: ['units', page, perPage, search],
    queryFn: async () => {
      if (isOnline) {
        const data = search
          ? await unitsService.filter({ search, page, per_page: perPage })
          : await unitsService.getAll({ page, per_page: perPage })

        // Cache for offline viewing (cache the current page)
        try {
          const cacheKey = `${CACHE_KEY}:${page}:${perPage}:${search || 'all'}`
          setCache<PaginatedApiResponse<Unit[]>>(cacheKey, data)
        } catch (error) {
          console.debug('[useUnits] Failed to cache units:', error)
        }
        return data
      }

      // Offline: return cached units or empty response
      const cacheKey = `${CACHE_KEY}:${page}:${perPage}:${search || 'all'}`
      const cached = getCache<PaginatedApiResponse<Unit[]>>(cacheKey)
      return (
        cached ?? {
          data: [],
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: 0,
          message: 'Offline mode - no cached data available',
        }
      )
    },
    staleTime: 1000 * 60 * 30, // 30 minutes (uses global default from App.tsx)
    gcTime: 1000 * 60 * 60, // 60 minutes (uses global default from App.tsx)
  })

  const createMutation = useMutation<
    ApiResponse<Unit>,
    unknown,
    { unitName: string; status?: boolean }
  >({
    mutationFn: (payload) => unitsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Unit created successfully')
    },
    onError: (error) => {
      console.error('[useUnits] Create error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to create unit')
    },
  })

  const updateMutation = useMutation<
    ApiResponse<Unit>,
    unknown,
    { id: number; payload: { unitName: string; status?: boolean } }
  >({
    mutationFn: ({ id, payload }) => unitsService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Unit updated successfully')
    },
    onError: (error) => {
      console.error('[useUnits] Update error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to update unit')
    },
  })

  const deleteMutation = useMutation<ApiResponse<null>, unknown, number>({
    mutationFn: (id: number) => unitsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Unit deleted successfully')
    },
    onError: (error) => {
      console.error('[useUnits] Delete error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to delete unit')
    },
  })

  const bulkDeleteMutation = useMutation<ApiResponse<null>, unknown, number[]>({
    mutationFn: (ids: number[]) => unitsService.deleteMultiple(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Units deleted successfully')
    },
    onError: (error) => {
      console.error('[useUnits] Bulk delete error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to delete units')
    },
  })

  const toggleStatusMutation = useMutation<
    ApiResponse<Unit>,
    unknown,
    { id: number; status: boolean }
  >({
    mutationFn: ({ id, status }) => unitsService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Status updated successfully')
    },
    onError: (error) => {
      console.error('[useUnits] Toggle status error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to update status')
    },
  })

  return {
    // Query data - Handle flexible response structures
    units: Array.isArray(unitsQuery.data?.data) ? unitsQuery.data.data : Array.isArray(unitsQuery.data) ? unitsQuery.data : [],
    total: unitsQuery.data?.total ?? 0,
    lastPage: unitsQuery.data?.last_page ?? 1,
    currentPage: page,
    perPage,

    // Query states
    isLoading: unitsQuery.isLoading,
    isError: unitsQuery.isError,
    error: unitsQuery.error,
    isOffline: !isOnline,

    // Mutations
    createUnit: createMutation.mutateAsync,
    updateUnit: updateMutation.mutateAsync,
    deleteUnit: deleteMutation.mutateAsync,
    bulkDeleteUnits: bulkDeleteMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isToggling: toggleStatusMutation.isPending,

    // Refetch
    refetch: unitsQuery.refetch,
  }
}
