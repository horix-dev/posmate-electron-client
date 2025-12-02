/**
 * Device Registration Hook
 * 
 * Registers the device with the backend on first run.
 * Should be called once on app startup.
 */

import { useEffect, useState } from 'react'
import { syncApiService } from '@/api/services/sync.service'
import { useAuthStore } from '@/stores/auth.store'

interface DeviceRegistrationState {
  isRegistered: boolean
  isRegistering: boolean
  error: string | null
  deviceId: string | null
}

export function useDeviceRegistration() {
  const [state, setState] = useState<DeviceRegistrationState>({
    isRegistered: syncApiService.isDeviceRegistered(),
    isRegistering: false,
    error: null,
    deviceId: null,
  })

  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    async function registerDevice() {
      // Only register if authenticated and not already registered
      if (!isAuthenticated || state.isRegistered || state.isRegistering) {
        return
      }

      setState(prev => ({ ...prev, isRegistering: true, error: null }))

      try {
        await syncApiService.initialize()
        const deviceId = syncApiService.getDeviceId()
        
        // Try to register
        const response = await syncApiService.registerDevice()
        
        if (response.success) {
          syncApiService.markDeviceRegistered()
          setState({
            isRegistered: true,
            isRegistering: false,
            error: null,
            deviceId,
          })
          console.log('[DeviceRegistration] Device registered:', deviceId)
        }
      } catch (error) {
        // Registration failed - might be already registered or network issue
        const errorMessage = error instanceof Error ? error.message : 'Registration failed'
        console.warn('[DeviceRegistration] Failed:', errorMessage)
        
        // Don't block on registration failure - just log it
        // The device can still sync, server will handle unknown devices
        setState(prev => ({
          ...prev,
          isRegistering: false,
          error: errorMessage,
          deviceId: syncApiService.getDeviceId(),
        }))
      }
    }

    registerDevice()
  }, [isAuthenticated, state.isRegistered, state.isRegistering])

  return state
}

/**
 * Initialize sync service on app startup
 * Call this in App.tsx or main layout
 */
export async function initializeSyncService(): Promise<void> {
  try {
    await syncApiService.initialize()
    console.log('[SyncService] Initialized with device ID:', syncApiService.getDeviceId())
  } catch (error) {
    console.error('[SyncService] Initialization failed:', error)
  }
}
