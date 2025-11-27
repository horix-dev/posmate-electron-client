/**
 * Offline Handler for API Requests
 * Intercepts API calls and handles offline scenarios
 */

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import api from './axios'
import { useSyncStore } from '@/stores/sync.store'
import { syncQueueRepository } from '@/lib/db/repositories'

// Check if request is a mutation (creates/updates/deletes data)
function isMutationRequest(config: InternalAxiosRequestConfig): boolean {
  const method = config.method?.toUpperCase()
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

// Check if request should be queued for offline sync
function shouldQueueRequest(config: InternalAxiosRequestConfig): boolean {
  // Only queue mutations
  if (!isMutationRequest(config)) return false

  // Add specific endpoints that should be queued
  const queueableEndpoints = [
    '/sales',
    '/purchases',
    '/expenses',
    '/incomes',
    '/due-collections',
  ]

  return queueableEndpoints.some((endpoint) => config.url?.includes(endpoint))
}

// Extract entity type from URL
function getEntityType(url: string): 'sale' | 'purchase' | 'expense' | 'income' | 'due_collection' | 'product' | 'customer' | 'party' | 'stock' {
  if (url.includes('/sales')) return 'sale'
  if (url.includes('/purchases')) return 'purchase'
  if (url.includes('/expenses')) return 'expense'
  if (url.includes('/incomes')) return 'income'
  if (url.includes('/due-collections')) return 'due_collection'
  if (url.includes('/products')) return 'product'
  if (url.includes('/customers') || url.includes('/parties')) return 'party'
  if (url.includes('/stocks')) return 'stock'
  return 'sale' // default
}

// Extract operation type from method and URL
function getOperationType(config: InternalAxiosRequestConfig): 'CREATE' | 'UPDATE' | 'DELETE' {
  const method = config.method?.toUpperCase()
  if (method === 'POST') return 'CREATE'
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE'
  if (method === 'DELETE') return 'DELETE'
  return 'CREATE'
}

/**
 * Initialize offline handling interceptor
 */
export function initializeOfflineHandling() {
  // Request interceptor - Check online status before making request
  api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const syncStore = useSyncStore.getState()
      const isOnline = syncStore.isOnline

      // If offline and it's a mutation request that should be queued
      if (!isOnline && shouldQueueRequest(config)) {
        // Queue the request for later sync
        try {
          const entityType = getEntityType(config.url || '')
          const operation = getOperationType(config)

          await syncQueueRepository.enqueue({
            operation,
            entity: entityType,
            entityId: 0, // Will be set after local save
            data: config.data,
            endpoint: config.url || '',
            method: config.method?.toUpperCase() as 'POST' | 'PUT' | 'DELETE',
            maxAttempts: 5,
            attempts: 0,
            createdAt: new Date().toISOString(),
            status: 'pending',
          })

          // Update pending sync count
          await syncStore.updatePendingSyncCount()

          console.log(`[Offline] Request queued for sync: ${config.method} ${config.url}`)

          // Throw a custom error to prevent the actual API call
          const error = new Error('Request queued for offline sync') as AxiosError
          error.config = config
          error.code = 'OFFLINE_QUEUED'
          return Promise.reject(error)
        } catch (queueError) {
          console.error('[Offline] Failed to queue request:', queueError)
        }
      }

      // For read requests when offline, we'll let them fail naturally
      // and handle with fallback in specific services

      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor - Handle network errors
  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig

      // Check if it's a network error (offline)
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        const syncStore = useSyncStore.getState()

        // Update online status
        if (syncStore.isOnline) {
          syncStore.setOnline(false)
        }

        // If it's a mutation request, queue it
        if (config && shouldQueueRequest(config)) {
          try {
            const entityType = getEntityType(config.url || '')
            const operation = getOperationType(config)

            await syncQueueRepository.enqueue({
              operation,
              entity: entityType,
              entityId: 0,
              data: config.data,
              endpoint: config.url || '',
              method: config.method?.toUpperCase() as 'POST' | 'PUT' | 'DELETE',
              maxAttempts: 5,
              attempts: 0,
              createdAt: new Date().toISOString(),
              status: 'pending',
            })

            await syncStore.updatePendingSyncCount()

            console.log(`[Network Error] Request queued for sync: ${config.method} ${config.url}`)

            // Return a special error code
            error.code = 'OFFLINE_QUEUED'
          } catch (queueError) {
            console.error('[Network Error] Failed to queue request:', queueError)
          }
        }
      }

      return Promise.reject(error)
    }
  )

  console.log('[Offline Handler] Initialized')
}

/**
 * Check if error is due to offline queueing
 */
export function isOfflineQueuedError(error: unknown): boolean {
  return (error as AxiosError)?.code === 'OFFLINE_QUEUED'
}
