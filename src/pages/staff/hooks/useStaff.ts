import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { staffService } from '@/api/services/staff.service'
import { setCache, getCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createAppError } from '@/lib/errors'
import type { StaffMember, CreateStaffRequest, ApiResponse } from '@/types/api.types'

const CACHE_KEY = 'cache:staff:list'

export function useStaff() {
  const { isOnline } = useOnlineStatus()
  const queryClient = useQueryClient()

  const staffQuery = useQuery<StaffMember[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      if (isOnline) {
        const data = await staffService.getAll()
        try {
          setCache<StaffMember[]>(CACHE_KEY, data)
        } catch (error) {
          console.debug('[useStaff] Failed to cache staff:', error)
        }
        return data
      }

      const cached = getCache<StaffMember[]>(CACHE_KEY)
      return cached ?? []
    },
    staleTime: 1000 * 60 * 5,
  })

  const createMutation = useMutation<ApiResponse<StaffMember>, unknown, CreateStaffRequest>({
    mutationFn: (payload) => staffService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff member created successfully')
    },
    onError: (error) => {
      console.error('[useStaff] Create error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to create staff member')
    },
  })

  const updateMutation = useMutation<
    ApiResponse<StaffMember>,
    unknown,
    { id: number; payload: Partial<CreateStaffRequest> }
  >({
    mutationFn: ({ id, payload }) => staffService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff member updated successfully')
    },
    onError: (error) => {
      console.error('[useStaff] Update error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to update staff member')
    },
  })

  const deleteMutation = useMutation<void, unknown, number>({
    mutationFn: (id) => staffService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff member deleted successfully')
    },
    onError: (error) => {
      console.error('[useStaff] Delete error:', error)
      const appError = createAppError(error)
      toast.error(appError.message || 'Failed to delete staff member')
    },
  })

  const staff = staffQuery.data ?? []

  const searchStaff = (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return staff
    return staff.filter((s) =>
      [s.name, s.email, s.branch?.name].some((field) => (field || '').toLowerCase().includes(q))
    )
  }

  return {
    staff,
    isLoading: staffQuery.isLoading,
    isFetching: staffQuery.isFetching,
    isOnline,
    createStaff: (payload: CreateStaffRequest) => createMutation.mutateAsync(payload),
    updateStaff: (id: number, payload: Partial<CreateStaffRequest>) =>
      updateMutation.mutateAsync({ id, payload }),
    deleteStaff: (id: number) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    searchStaff,
    refetch: staffQuery.refetch,
  }
}
