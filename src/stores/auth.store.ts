import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Business, Currency } from '@/types/api.types'
import { authService } from '@/api/services'
import { setAuthToken, clearAuthToken } from '@/api/axios'
import { setCache, getCache, removeCache, CacheKeys } from '@/lib/cache'

interface AuthState {
  // State
  user: User | null
  business: Business | null
  currency: Currency | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isSetupComplete: boolean
  isOfflineMode: boolean
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

// Helper to cache auth data locally (using the shared cache utility)
function cacheAuthData(user: User | null, business: Business | null, currency: Currency | null) {
  if (user) setCache(CacheKeys.AUTH_USER, user, { ttl: 7 * 24 * 60 * 60 * 1000 }) // 7 days
  if (business) setCache(CacheKeys.AUTH_BUSINESS, business, { ttl: 7 * 24 * 60 * 60 * 1000 })
  if (currency) setCache(CacheKeys.AUTH_CURRENCY, currency, { ttl: 7 * 24 * 60 * 60 * 1000 })
}

// Helper to load cached auth data
function loadCachedAuthData(): { user: User | null; business: Business | null; currency: Currency | null } {
  return {
    user: getCache<User>(CacheKeys.AUTH_USER, { ttl: 7 * 24 * 60 * 60 * 1000 }),
    business: getCache<Business>(CacheKeys.AUTH_BUSINESS, { ttl: 7 * 24 * 60 * 60 * 1000 }),
    currency: getCache<Currency>(CacheKeys.AUTH_CURRENCY, { ttl: 7 * 24 * 60 * 60 * 1000 }),
  }
}

// Helper to clear cached auth data
function clearCachedAuthData() {
  removeCache(CacheKeys.AUTH_USER)
  removeCache(CacheKeys.AUTH_BUSINESS)
  removeCache(CacheKeys.AUTH_CURRENCY)
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
      isOfflineMode: false,
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
            isOfflineMode: false,
          })

          // Fetch user profile after login
          await get().fetchProfile()

          // Cache auth data for offline use
          cacheAuthData(get().user, get().business, currency)

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
            // Cache user data
            cacheAuthData(data, null, null)
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

          // Cache auth data
          cacheAuthData(get().user, get().business, get().currency)

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
          clearCachedAuthData()
          set({
            user: null,
            business: null,
            currency: null,
            token: null,
            isAuthenticated: false,
            isSetupComplete: false,
            isOfflineMode: false,
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
          const user = response.data
          set({ user, isOfflineMode: false })
          // Cache for offline use
          cacheAuthData(user, get().business, get().currency)
        } catch {
          // Profile fetch failed - use cached data if available
          console.warn('[AuthStore] Failed to fetch profile, using cached data')
          const cached = loadCachedAuthData()
          if (cached.user) {
            set({ 
              user: cached.user, 
              business: cached.business,
              currency: cached.currency,
              isOfflineMode: true 
            })
          }
        }
      },

      setUser: (user) => {
        set({ user })
        cacheAuthData(user, get().business, get().currency)
      },
      setBusiness: (business) => {
        set({ business })
        cacheAuthData(get().user, business, get().currency)
      },
      setCurrency: (currency) => {
        set({ currency })
        cacheAuthData(get().user, get().business, currency)
      },
      setToken: (token) => {
        setAuthToken(token)
        set({ token, isAuthenticated: !!token })
      },
      setIsSetupComplete: (isSetup) => set({ isSetupComplete: isSetup }),
      clearError: () => set({ error: null }),

      hydrateFromStorage: async () => {
        // First, immediately load cached auth data (non-blocking)
        const cached = loadCachedAuthData()
        
        // Check for stored token
        let storedToken: string | null = null
        if (window.electronAPI) {
          storedToken = await window.electronAPI.secureStore.get<string>('authToken') ?? null
        }

        if (storedToken) {
          setAuthToken(storedToken)
          
          // Immediately set auth state with cached data (UI can render)
          set({ 
            token: storedToken, 
            isAuthenticated: true,
            user: cached.user,
            business: cached.business,
            currency: cached.currency,
            isOfflineMode: !navigator.onLine,
          })

          // Fetch fresh profile in background (non-blocking)
          if (navigator.onLine) {
            get().fetchProfile().catch(() => {
              // Already handled in fetchProfile
            })
          }
        } else if (cached.user) {
          // No token but have cached user - might be stale session
          // Don't authenticate, let user login again
          console.log('[AuthStore] Found cached data but no token, session expired')
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
