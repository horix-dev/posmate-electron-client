import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Business } from '@/types/api.types'
import { businessService, settingsService } from '@/api/services'

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
          // Fetch business settings to get gratitude_message and other settings
          try {
            const settingsResponse = await settingsService.getBusinessSettings()
            // Merge business data with settings data
            set({
              business: {
                ...response.data,
                gratitude_message: settingsResponse.data.gratitude_message || '',
                sale_rounding_option: settingsResponse.data.sale_rounding_option,
                invoice_logo: settingsResponse.data.invoice_logo || '',
              },
              isLoading: false,
            })
          } catch {
            // If settings fetch fails, just use business data
            set({ business: response.data, isLoading: false })
          }
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
