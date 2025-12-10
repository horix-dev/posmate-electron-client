import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { partiesService } from '@/api/services/parties.service'
import { setCache, getCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { Party, CreatePartyRequest, ApiResponse } from '@/types/api.types'

const CACHE_KEY = 'cache:suppliers:list'

export function useSuppliers() {
  const { isOnline } = useOnlineStatus()
  const queryClient = useQueryClient()

  const suppliersQuery = useQuery<Party[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      if (isOnline) {
        const data = await partiesService.getSuppliers()
        // Cache for offline viewing
        try {
          setCache<Party[]>(CACHE_KEY, data)
        } catch (error) {
          // Silent fail: if caching fails, we still have fresh data to return
          console.debug('[useSuppliers] Failed to cache suppliers:', error)
        }
        return data
      }

      // Offline: return cached suppliers or empty array
      const cached = getCache<Party[]>(CACHE_KEY)
      return cached ?? []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const createMutation = useMutation<ApiResponse<Party>, unknown, CreatePartyRequest>({
    mutationFn: (payload: CreatePartyRequest) => partiesService.create({ ...payload, type: 'Supplier' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  const updateMutation = useMutation<
    ApiResponse<Party>,
    unknown,
    { id: number; payload: Partial<CreatePartyRequest> }
  >({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreatePartyRequest> }) =>
      partiesService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  const deleteMutation = useMutation<void, unknown, number>({
    mutationFn: (id: number) => partiesService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  const suppliers = suppliersQuery.data ?? []

  const searchSuppliers = (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter((s) => {
      return [s.name, s.email, s.phone, s.address].some((field) => (field || '').toString().toLowerCase().includes(q))
    })
  }

  return {
    suppliers,
    isLoading: suppliersQuery.isLoading,
    isFetching: suppliersQuery.isFetching,
    isOnline,
    createSupplier: createMutation.mutateAsync,
    updateSupplier: (id: number, payload: Partial<CreatePartyRequest>) => updateMutation.mutateAsync({ id, payload }),
    deleteSupplier: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    searchSuppliers,
  }
}

export default useSuppliers
