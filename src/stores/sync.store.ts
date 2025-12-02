import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dataSyncService, enhancedSyncService } from '@/lib/db/services'
import { syncQueueRepository } from '@/lib/db/repositories'
import type { SyncProgress } from '@/lib/db/services/sync.service'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface PendingAction {
  id: string
  type: 'sale' | 'purchase' | 'expense' | 'income' | 'due_collection'
  action: 'create' | 'update' | 'delete'
  data: Record<string, unknown>
  timestamp: number
  retryCount: number
}

interface SyncState {
  // Connection status
  isOnline: boolean
  lastSyncTime: number | null
  syncStatus: SyncStatus

  // Pending actions queue
  pendingActions: PendingAction[]

  // Sync error
  syncError: string | null

  // Sync progress (for IndexedDB queue)
  syncProgress: SyncProgress | null
  pendingSyncCount: number

  // Data sync status
  lastDataSync: number | null
  isDataSyncing: boolean

  // Actions
  setOnline: (online: boolean) => void
  setSyncStatus: (status: SyncStatus) => void
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => void
  removePendingAction: (id: string) => void
  updatePendingActionRetry: (id: string) => void
  clearPendingActions: () => void
  setSyncError: (error: string | null) => void
  updateLastSyncTime: () => void
  syncPendingActions: () => Promise<void>

  // New IndexedDB sync actions
  setSyncProgress: (progress: SyncProgress | null) => void
  setPendingSyncCount: (count: number) => void
  startQueueSync: () => Promise<void>
  startDataSync: () => Promise<void>
  checkNeedsInitialSync: () => Promise<boolean>
  updatePendingSyncCount: () => Promise<void>
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      // Initial State
      isOnline: navigator.onLine,
      lastSyncTime: null,
      syncStatus: 'idle',
      pendingActions: [],
      syncError: null,
      syncProgress: null,
      pendingSyncCount: 0,
      lastDataSync: null,
      isDataSyncing: false,

      // Actions
      setOnline: (online) => {
        set({ isOnline: online })
        // Trigger sync when coming back online
        if (online && get().pendingActions.length > 0) {
          get().syncPendingActions()
        }
      },

      setSyncStatus: (status) => set({ syncStatus: status }),

      addPendingAction: (action) => {
        const newAction: PendingAction = {
          ...action,
          id: `${action.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          retryCount: 0,
        }
        set({ pendingActions: [...get().pendingActions, newAction] })
      },

      removePendingAction: (id) => {
        set({ pendingActions: get().pendingActions.filter((a) => a.id !== id) })
      },

      updatePendingActionRetry: (id) => {
        set({
          pendingActions: get().pendingActions.map((a) =>
            a.id === id ? { ...a, retryCount: a.retryCount + 1 } : a
          ),
        })
      },

      clearPendingActions: () => set({ pendingActions: [] }),

      setSyncError: (error) => set({ syncError: error }),

      updateLastSyncTime: () => set({ lastSyncTime: Date.now() }),

      syncPendingActions: async () => {
        const state = get()

        if (!state.isOnline || state.syncStatus === 'syncing') {
          return
        }

        if (state.pendingActions.length === 0) {
          set({ syncStatus: 'idle' })
          return
        }

        set({ syncStatus: 'syncing', syncError: null })

        const maxRetries = 3
        const actionsToProcess = [...state.pendingActions]

        for (const action of actionsToProcess) {
          if (action.retryCount >= maxRetries) {
            // Move to failed actions or log
            console.error('Max retries reached for action:', action)
            get().removePendingAction(action.id)
            continue
          }

          try {
            // Dynamically import and call the appropriate service
            const { salesService, purchasesService, expensesService, incomesService, duesService } =
              await import('@/api/services')

            switch (action.type) {
              case 'sale':
                if (action.action === 'create') {
                  await salesService.create(
                    action.data as unknown as Parameters<typeof salesService.create>[0]
                  )
                }
                break
              case 'purchase':
                if (action.action === 'create') {
                  await purchasesService.create(
                    action.data as unknown as Parameters<typeof purchasesService.create>[0]
                  )
                }
                break
              case 'expense':
                if (action.action === 'create') {
                  await expensesService.create(
                    action.data as unknown as Parameters<typeof expensesService.create>[0]
                  )
                }
                break
              case 'income':
                if (action.action === 'create') {
                  await incomesService.create(
                    action.data as unknown as Parameters<typeof incomesService.create>[0]
                  )
                }
                break
              case 'due_collection':
                if (action.action === 'create') {
                  await duesService.create(
                    action.data as unknown as Parameters<typeof duesService.create>[0]
                  )
                }
                break
            }

            // Success - remove from pending
            get().removePendingAction(action.id)
          } catch (error) {
            console.error('Sync failed for action:', action, error)
            get().updatePendingActionRetry(action.id)

            if (action.retryCount + 1 >= maxRetries) {
              set({
                syncError: `Failed to sync ${action.type} after ${maxRetries} attempts`,
                syncStatus: 'error',
              })
            }
          }
        }

        // Update status based on remaining actions
        const remainingActions = get().pendingActions
        if (remainingActions.length === 0) {
          set({ syncStatus: 'idle' })
          get().updateLastSyncTime()
        } else if (remainingActions.some((a) => a.retryCount >= maxRetries)) {
          set({ syncStatus: 'error' })
        } else {
          set({ syncStatus: 'idle' })
        }
      },

      // New IndexedDB sync methods
      setSyncProgress: (progress) => set({ syncProgress: progress }),

      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

      startQueueSync: async () => {
        const state = get()
        if (!state.isOnline || state.syncStatus === 'syncing') {
          return
        }

        set({ syncStatus: 'syncing', syncError: null })

        // Subscribe to progress updates from enhanced sync service
        const unsubscribe = enhancedSyncService.onProgress((progress) => {
          // Convert EnhancedSyncProgress to SyncProgress format
          get().setSyncProgress({
            total: progress.total,
            completed: progress.completed,
            failed: progress.failed,
            inProgress: progress.phase !== 'complete' && progress.phase !== 'error',
          })
          get().setPendingSyncCount(progress.total - progress.completed)
        })

        try {
          // Use enhanced sync service with batch sync
          const result = await enhancedSyncService.fullSync()
          
          if (result.success) {
            set({ syncStatus: 'idle', syncError: null })
            get().updateLastSyncTime()
            
            // Log sync results
            console.log('[SyncStore] Sync completed:', {
              uploaded: result.upload.success,
              failed: result.upload.failed,
              conflicts: result.upload.conflicts,
              downloaded: result.download,
            })
          } else {
            const errorMsg = result.upload.errors.map((e) => e.error).join(', ')
            set({ syncStatus: 'error', syncError: errorMsg || 'Sync failed' })
          }

          // Update pending count
          await get().updatePendingSyncCount()
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Sync failed'
          set({ syncStatus: 'error', syncError: errorMsg })
        } finally {
          unsubscribe()
          set({ syncProgress: null })
        }
      },

      startDataSync: async () => {
        const state = get()
        if (!state.isOnline || state.isDataSyncing) {
          return
        }

        set({ isDataSyncing: true, syncError: null })

        try {
          const result = await dataSyncService.syncAll()
          
          if (result.success) {
            set({ lastDataSync: Date.now() })
          } else {
            set({ syncError: result.errors.join(', ') })
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Data sync failed'
          set({ syncError: errorMsg })
        } finally {
          set({ isDataSyncing: false })
        }
      },

      checkNeedsInitialSync: async () => {
        return await dataSyncService.needsInitialSync()
      },

      updatePendingSyncCount: async () => {
        const count = await syncQueueRepository.countByStatus('pending')
        set({ pendingSyncCount: count })
      },
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pendingActions: state.pendingActions,
        lastSyncTime: state.lastSyncTime,
        lastDataSync: state.lastDataSync,
      }),
    }
  )
)

// Initialize online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStore.getState().setOnline(true)
  })

  window.addEventListener('offline', () => {
    useSyncStore.getState().setOnline(false)
  })
}

export default useSyncStore
