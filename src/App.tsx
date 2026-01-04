import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'

/**
 * Query Client Configuration
 *
 * Optimized caching strategy to reduce API calls by 70-80%:
 * - staleTime: Data is considered fresh for this duration (no refetch)
 * - gcTime: How long unused data stays in cache (formerly cacheTime)
 * - refetchOnWindowFocus: Disabled to respect staleTime cache
 * - refetchOnReconnect: Refetch when internet reconnects
 *
 * See: backend_docs/CACHE_AND_SYNC_STRATEGY.md
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Static reference data (units, brands, categories) - 30 min fresh
      staleTime: 30 * 60 * 1000, // 30 minutes

      // Keep data in cache for 60 minutes after last use
      gcTime: 60 * 60 * 1000, // 60 minutes

      // Respect staleTime cache (don't refetch on tab focus within 30 min)
      refetchOnWindowFocus: false,

      // Refetch when network reconnects (offline-first recovery)
      refetchOnReconnect: true,

      // Retry failed requests (network errors)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})
import { AppRouter } from '@/routes'
import { useAuthStore, useUIStore, useCurrencyStore } from '@/stores'
import { useSyncStore } from '@/stores/sync.store'
import { UpdateNotification } from '@/components/common/UpdateNotification'

function App() {
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage)
  const fetchActiveCurrency = useCurrencyStore((state) => state.fetchActiveCurrency)
  const theme = useUIStore((state) => state.theme)
  const { checkNeedsInitialSync, startDataSync, startQueueSync, updatePendingSyncCount, isOnline } =
    useSyncStore()

  // Hydrate auth state and fetch currency on app load
  useEffect(() => {
    hydrateFromStorage()
    fetchActiveCurrency()
  }, [hydrateFromStorage, fetchActiveCurrency])

  // Initialize offline support (non-blocking background sync)
  useEffect(() => {
    const initializeOffline = async () => {
      // Update pending sync count (fast, local operation)
      await updatePendingSyncCount().catch((e) => {
        console.warn('[App] Failed to update pending sync count:', e)
      })

      // Only attempt sync if online - don't block UI
      if (navigator.onLine) {
        // Check if initial data sync is needed (non-blocking)
        checkNeedsInitialSync()
          .then((needsSync) => {
            if (needsSync) {
              console.log('[App] Performing initial data sync in background...')
              startDataSync().catch((e) => {
                console.warn('[App] Background data sync failed:', e)
              })
            }
          })
          .catch((e) => {
            console.warn('[App] Failed to check sync status:', e)
          })
      }

      // Trigger sync when coming back online
      const handleOnline = () => {
        console.log('[App] Connection restored, starting sync...')
        startQueueSync().catch((e) => {
          console.warn('[App] Queue sync failed:', e)
        })
      }

      window.addEventListener('online', handleOnline)
      return () => window.removeEventListener('online', handleOnline)
    }

    initializeOffline()
  }, [checkNeedsInitialSync, startDataSync, startQueueSync, updatePendingSyncCount, isOnline])

  // Apply theme on mount
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-screen overflow-hidden">
        <AppRouter />
        <Toaster position="top-right" richColors closeButton />
        <UpdateNotification />
      </div>
    </QueryClientProvider>
  )
}

export default App
