import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Currency } from '@/types/api.types'
import { currenciesService } from '@/api/services'

// ============================================
// Types
// ============================================

interface CurrencyState {
  // State
  activeCurrency: Currency | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null

  // Actions
  fetchActiveCurrency: () => Promise<void>
  setActiveCurrency: (currency: Currency | null) => void
  clearError: () => void
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000

// ============================================
// Store
// ============================================

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      // Initial State
      activeCurrency: null,
      isLoading: false,
      error: null,
      lastFetched: null,

      // Actions
      fetchActiveCurrency: async () => {
        const state = get()

        // Check if we have cached data that's still fresh
        if (
          state.activeCurrency &&
          state.lastFetched &&
          Date.now() - state.lastFetched < CACHE_DURATION
        ) {
          console.log('[CurrencyStore] Using cached currency (cache still valid)')
          return
        }

        set({ isLoading: true, error: null })
        try {
          const response = await currenciesService.getActive()
          set({
            activeCurrency: response.data,
            isLoading: false,
            lastFetched: Date.now(),
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to fetch active currency'
          set({ error: message, isLoading: false })
          // Don't clear existing currency on error - keep the cached value
        }
      },

      setActiveCurrency: (currency) =>
        set({
          activeCurrency: currency,
          lastFetched: Date.now(),
        }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'currency-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeCurrency: state.activeCurrency,
        lastFetched: state.lastFetched,
      }),
    }
  )
)

export default useCurrencyStore
