/**
 * useOnlineStatus Hook
 * 
 * A reusable hook for tracking online/offline status with:
 * - Real-time status updates
 * - Callback support for status changes
 * - Debounced reconnection detection
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseOnlineStatusOptions {
  /** Callback when going online */
  onOnline?: () => void
  /** Callback when going offline */
  onOffline?: () => void
  /** Debounce time for online detection (ms) */
  debounceMs?: number
}

interface UseOnlineStatusReturn {
  /** Current online status */
  isOnline: boolean
  /** Whether currently in offline mode */
  isOffline: boolean
  /** Manually check connection status */
  checkConnection: () => Promise<boolean>
}

/**
 * Hook to track browser online/offline status
 * 
 * @example
 * ```tsx
 * const { isOnline, isOffline } = useOnlineStatus({
 *   onOnline: () => refetchData(),
 *   onOffline: () => toast.warning('You are offline'),
 * })
 * ```
 */
export function useOnlineStatus(options: UseOnlineStatusOptions = {}): UseOnlineStatusReturn {
  const { onOnline, onOffline, debounceMs = 1000 } = options
  
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Clear debounce on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Handle online event with debounce
  const handleOnline = useCallback(() => {
    // Clear any existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce online detection to avoid flaky connections
    debounceRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      
      setIsOnline(true)
      onOnline?.()
    }, debounceMs)
  }, [onOnline, debounceMs])

  // Handle offline event immediately
  const handleOffline = useCallback(() => {
    // Clear any pending online debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setIsOnline(false)
    onOffline?.()
  }, [onOffline])

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  // Manual connection check (useful for verifying actual connectivity)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsOnline(false)
      return false
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      // Using a HEAD request to minimize data transfer
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      
      await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      })
      
      clearTimeout(timeout)
      setIsOnline(true)
      return true
    } catch {
      // If fetch fails, still rely on navigator.onLine as fallback
      const online = navigator.onLine
      setIsOnline(online)
      return online
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    checkConnection,
  }
}

export default useOnlineStatus
