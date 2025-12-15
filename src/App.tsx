import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a single QueryClient for the app
const queryClient = new QueryClient()
import { Toaster } from '@/components/ui/sonner'
import { AppRouter } from '@/routes'
import { useAuthStore, useUIStore } from '@/stores'
import { useSyncStore } from '@/stores/sync.store'
import { UpdateNotification } from '@/components/common/UpdateNotification'

function App() {
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage)
  const theme = useUIStore((state) => state.theme)
  const { checkNeedsInitialSync, startDataSync, startQueueSync, updatePendingSyncCount, isOnline } = useSyncStore()

  // Hydrate auth state from secure storage on app load
  useEffect(() => {
    hydrateFromStorage()
  }, [hydrateFromStorage])

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
