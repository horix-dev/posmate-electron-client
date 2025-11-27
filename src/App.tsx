import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { AppRouter } from '@/routes'
import { useAuthStore, useUIStore } from '@/stores'
import { useSyncStore } from '@/stores/sync.store'

function App() {
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage)
  const theme = useUIStore((state) => state.theme)
  const { checkNeedsInitialSync, startDataSync, startQueueSync, updatePendingSyncCount } = useSyncStore()

  // Hydrate auth state from secure storage on app load
  useEffect(() => {
    hydrateFromStorage()
  }, [hydrateFromStorage])

  // Initialize offline support
  useEffect(() => {
    const initializeOffline = async () => {
      // Update pending sync count
      await updatePendingSyncCount()

      // Check if initial data sync is needed
      const needsSync = await checkNeedsInitialSync()
      if (needsSync) {
        console.log('[App] Performing initial data sync...')
        await startDataSync()
      }

      // Trigger sync when coming back online
      const handleOnline = () => {
        console.log('[App] Connection restored, starting sync...')
        startQueueSync()
      }

      window.addEventListener('online', handleOnline)
      return () => window.removeEventListener('online', handleOnline)
    }

    initializeOffline()
  }, [checkNeedsInitialSync, startDataSync, startQueueSync, updatePendingSyncCount])

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
    <>
      <AppRouter />
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}

export default App
