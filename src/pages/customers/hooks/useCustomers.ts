import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { partiesService } from '@/api/services/parties.service'
import { setCache, getCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createAppError } from '@/lib/errors'
import type { Party, CreatePartyRequest, ApiResponse } from '@/types/api.types'

const CACHE_KEY = 'cache:customers:list'

/**
 * Hook for managing customers
 * Provides CRUD operations with caching and offline support
 */
export function useCustomers() {
  const { isOnline } = useOnlineStatus()
  const queryClient = useQueryClient()

  const customersQuery = useQuery<Party[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      if (isOnline) {
        const data = await partiesService.getCustomers()
        try {
          setCache<Party[]>(CACHE_KEY, data)
        } catch (error) {
          console.debug('[useCustomers] Failed to cache customers:', error)
        }
        return data
      }

      const cached = getCache<Party[]>(CACHE_KEY)
      return cached ?? []
    },
    staleTime: 1000 * 60 * 5,
  })

  const createMutation = useMutation<ApiResponse<Party>, unknown, CreatePartyRequest>({
    mutationFn: (payload: CreatePartyRequest) => partiesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer created successfully')
    },
    onError: (error) => {
      console.error('[useCustomers] Create error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to create customer')
    },
  })

  const updateMutation = useMutation<
    ApiResponse<Party>,
    unknown,
    { id: number; payload: Partial<CreatePartyRequest> }
  >({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreatePartyRequest> }) =>
      partiesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer updated successfully')
    },
    onError: (error) => {
      console.error('[useCustomers] Update error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to update customer')
    },
  })

  const deleteMutation = useMutation<void, unknown, number>({
    mutationFn: (id: number) => partiesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer deleted successfully')
    },
    onError: (error) => {
      console.error('[useCustomers] Delete error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to delete customer')
    },
  })

  const customers = customersQuery.data ?? []

  const searchCustomers = (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((s) => {
      return [s.name, s.email, s.phone, s.address].some((field) => (field || '').toString().toLowerCase().includes(q))
    })
  }

  return {
    customers,
    isLoading: customersQuery.isLoading,
    isFetching: customersQuery.isFetching,
    isOnline,
    createCustomer: createMutation.mutateAsync,
    updateCustomer: (id: number, payload: Partial<CreatePartyRequest>) => updateMutation.mutateAsync({ id, payload }),
    deleteCustomer: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    searchCustomers,
  }
}

export default useCustomers
