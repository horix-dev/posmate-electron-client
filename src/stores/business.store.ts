import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Business } from '@/types/api.types'
import { businessService } from '@/api/services'

interface BusinessState {
  // State
  business: Business | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchBusiness: () => Promise<void>
  createBusiness: (data: FormData) => Promise<{ success: boolean }>
  updateBusiness: (id: number, data: FormData) => Promise<{ success: boolean }>
  setBusiness: (business: Business | null) => void
  clearError: () => void
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      // Initial State
      business: null,
      isLoading: false,
      error: null,

      // Actions
      fetchBusiness: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await businessService.getBusiness()
          set({ business: response.data, isLoading: false })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch business'
          set({ error: message, isLoading: false })
        }
      },

      createBusiness: async (data: FormData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await businessService.createBusiness(data)
          set({ business: response.data, isLoading: false })
          return { success: true }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to create business'
          set({ error: message, isLoading: false })
          return { success: false }
        }
      },

      updateBusiness: async (id: number, data: FormData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await businessService.updateBusiness(id, data)
          set({ business: response.data, isLoading: false })
          return { success: true }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to update business'
          set({ error: message, isLoading: false })
          return { success: false }
        }
      },

      setBusiness: (business) => set({ business }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'business-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        business: state.business,
      }),
    }
  )
)

export default useBusinessStore
