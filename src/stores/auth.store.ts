import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Business, Currency } from '@/types/api.types'
import { authService } from '@/api/services'
import { setAuthToken, clearAuthToken } from '@/api/axios'

interface AuthState {
  // State
  user: User | null
  business: Business | null
  currency: Currency | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isSetupComplete: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; requiresSetup?: boolean }>
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; requiresOtp?: boolean }>
  submitOtp: (email: string, otp: string) => Promise<{ success: boolean }>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  fetchProfile: () => Promise<void>
  setUser: (user: User | null) => void
  setBusiness: (business: Business | null) => void
  setCurrency: (currency: Currency | null) => void
  setToken: (token: string | null) => void
  setIsSetupComplete: (isSetup: boolean) => void
  clearError: () => void
  hydrateFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      business: null,
      currency: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isSetupComplete: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.login({ email, password })
          const { token, is_setup, currency } = response.data

          // Store token securely
          setAuthToken(token)

          set({
            token,
            currency,
            isAuthenticated: true,
            isSetupComplete: is_setup,
            isLoading: false,
          })

          // Fetch user profile after login
          await get().fetchProfile()

          return { success: true, requiresSetup: !is_setup }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Login failed'
          set({ error: message, isLoading: false })
          return { success: false }
        }
      },

      signUp: async (name: string, email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.signUp({ name, email, password })
          const { data, token } = response.data

          if (token) {
            setAuthToken(token)
            set({
              user: data,
              token,
              isAuthenticated: true,
              isLoading: false,
            })
            return { success: true }
          }

          // If no token, OTP verification is required
          set({ isLoading: false })
          return { success: true, requiresOtp: true }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Sign up failed'
          set({ error: message, isLoading: false })
          return { success: false }
        }
      },

      submitOtp: async (email: string, otp: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.submitOtp({ email, otp })
          const { token } = response

          setAuthToken(token)
          set({
            token,
            isAuthenticated: true,
            isLoading: false,
          })

          // Fetch user profile after OTP verification
          await get().fetchProfile()

          return { success: true }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'OTP verification failed'
          set({ error: message, isLoading: false })
          return { success: false }
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await authService.signOut()
        } catch {
          // Ignore errors, we're logging out anyway
        } finally {
          clearAuthToken()
          set({
            user: null,
            business: null,
            currency: null,
            token: null,
            isAuthenticated: false,
            isSetupComplete: false,
            isLoading: false,
            error: null,
          })
        }
      },

      refreshToken: async () => {
        try {
          const token = await authService.refreshToken()

          if (token) {
            setAuthToken(token)
            set({ token })
            return true
          }

          // Token refresh failed, logout
          await get().logout()
          return false
        } catch {
          // Token refresh failed, logout
          await get().logout()
          return false
        }
      },

      fetchProfile: async () => {
        try {
          const response = await authService.getProfile()
          set({ user: response.data })
        } catch {
          // Profile fetch failed, don't do anything dramatic
          console.error('Failed to fetch profile')
        }
      },

      setUser: (user) => set({ user }),
      setBusiness: (business) => set({ business }),
      setCurrency: (currency) => set({ currency }),
      setToken: (token) => {
        setAuthToken(token)
        set({ token, isAuthenticated: !!token })
      },
      setIsSetupComplete: (isSetup) => set({ isSetupComplete: isSetup }),
      clearError: () => set({ error: null }),

      hydrateFromStorage: async () => {
        // Hydrate token from electron secure store
        if (window.electronAPI) {
          const storedToken = await window.electronAPI.secureStore.get<string>('authToken')
          if (storedToken) {
            setAuthToken(storedToken)
            set({ token: storedToken, isAuthenticated: true })
            // Fetch user profile
            await get().fetchProfile()
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist non-sensitive data
        isSetupComplete: state.isSetupComplete,
        // Token is stored in electron secure store, not here
      }),
    }
  )
)

export default useAuthStore
