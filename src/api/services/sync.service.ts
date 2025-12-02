/**
 * Sync API Service
 * Handles all synchronization with backend /sync/* endpoints
 * 
 * Endpoints:
 * - POST /sync/register - Register device
 * - GET /sync/health - Health check
 * - GET /sync/full - Full initial sync
 * - GET /sync/changes - Incremental sync
 * - POST /sync/batch - Batch upload offline operations
 */

import api from '@/api/axios'
import type { 
  Product, 
  Category, 
  Brand, 
  Unit, 
  Party, 
  Vat, 
  PaymentType,
  Warehouse 
} from '@/types/api.types'

// ============================================
// Types
// ============================================

/** Device registration request */
export interface DeviceRegistrationRequest {
  device_id: string
  device_name: string
  os: string
  app_version: string
}

/** Device registration response */
export interface DeviceRegistrationResponse {
  success: boolean
  message: string
  data: {
    device_id: string
    registered_at: string
  }
}

/** Health check response */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  _server_timestamp: string
}

/** Full sync response */
export interface FullSyncResponse {
  success: boolean
  data: {
    products?: Product[]
    categories?: Category[]
    brands?: Brand[]
    units?: Unit[]
    parties?: Party[]
    vats?: Vat[]
    payment_types?: PaymentType[]
    warehouses?: Warehouse[]
    settings?: {
      currency: string
      currency_position: 'left' | 'right'
      vat_enabled: boolean
      invoice_prefix: string
      company_name: string
    }
  }
  sync_token: string
  server_timestamp: string
}

/** Entity change set for incremental sync */
export interface EntityChanges<T> {
  created: T[]
  updated: T[]
  deleted: number[]
}

/** Incremental sync response */
export interface IncrementalSyncResponse {
  success: boolean
  data: {
    products?: EntityChanges<Product>
    categories?: EntityChanges<Category>
    brands?: EntityChanges<Brand>
    units?: EntityChanges<Unit>
    parties?: EntityChanges<Party>
    vats?: EntityChanges<Vat>
    payment_types?: EntityChanges<PaymentType>
    warehouses?: EntityChanges<Warehouse>
  }
  sync_token: string
  server_timestamp: string
  has_more: boolean
  total_records: number
}

/** Batch operation for upload */
export interface BatchOperation {
  idempotency_key: string
  entity: 'sale' | 'party' | 'due_collection'
  action: 'create' | 'update' | 'delete'
  data: Record<string, unknown>
  offline_timestamp: string
}

/** Batch sync request */
export interface BatchSyncRequest {
  operations: BatchOperation[]
  client_timestamp: string
  device_id: string
}

/** Stock discrepancy warning */
export interface StockDiscrepancyWarning {
  type: 'stock_discrepancy'
  product_id: number
  expected: number
  available: number
  discrepancy: number
  action: 'allowed_negative' | 'partial' | 'rejected'
}

/** Individual batch result */
export interface BatchOperationResult {
  idempotency_key: string
  status: 'created' | 'updated' | 'deleted' | 'skipped' | 'error' | 'conflict'
  server_id?: number
  local_id?: number | string
  invoice_number?: string
  version?: number
  created_at?: string
  error?: string
  error_code?: string
  warnings?: StockDiscrepancyWarning[]
  conflict_data?: Record<string, unknown>
}

/** Batch sync response */
export interface BatchSyncResponse {
  success: boolean
  results: BatchOperationResult[]
  server_timestamp: string
  summary: {
    total: number
    success_count: number
    error_count: number
    conflict_count?: number
  }
}

/** Conflict details from 409 response */
export interface VersionConflict {
  entity_type: string
  entity_id: number
  client_version: number
  server_version: number
  server_data: Record<string, unknown>
}

/** 409 Conflict response */
export interface ConflictResponse {
  success: false
  error: 'version_conflict'
  message: string
  conflict: VersionConflict
  resolution_options: {
    force_update: string
    merge: string
    discard: string
  }
}

// ============================================
// Sync Service
// ============================================

class SyncApiService {
  private deviceId: string | null = null
  private syncToken: string | null = null
  private lastServerTimestamp: string | null = null

  /**
   * Initialize sync service with device ID
   */
  async initialize(): Promise<void> {
    // Get device ID from Electron
    if (window.electronAPI?.getDeviceId) {
      this.deviceId = await window.electronAPI.getDeviceId()
    } else {
      // Fallback for browser/dev
      this.deviceId = localStorage.getItem('device_id') || this.generateDeviceId()
      localStorage.setItem('device_id', this.deviceId)
    }

    // Load sync token from storage
    this.syncToken = localStorage.getItem('sync_token')
    this.lastServerTimestamp = localStorage.getItem('last_server_timestamp')
  }

  /**
   * Generate a device ID for browser fallback
   */
  private generateDeviceId(): string {
    return `WEB-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return this.deviceId || 'unknown'
  }

  /**
   * Get sync token
   */
  getSyncToken(): string | null {
    return this.syncToken
  }

  /**
   * Get last server timestamp
   */
  getLastServerTimestamp(): string | null {
    return this.lastServerTimestamp
  }

  /**
   * Store sync token and timestamp
   */
  private storeSyncState(syncToken: string, serverTimestamp: string): void {
    this.syncToken = syncToken
    this.lastServerTimestamp = serverTimestamp
    localStorage.setItem('sync_token', syncToken)
    localStorage.setItem('last_server_timestamp', serverTimestamp)
  }

  // ============================================
  // API Methods
  // ============================================

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await api.get<HealthCheckResponse>('/sync/health')
    return response.data
  }

  /**
   * Register device with server
   */
  async registerDevice(deviceName?: string): Promise<DeviceRegistrationResponse> {
    await this.initialize()

    const appInfo = window.electronAPI?.getAppInfo 
      ? await window.electronAPI.getAppInfo()
      : { name: 'POSMATE', version: '1.0.0', platform: 'web' as NodeJS.Platform }

    const request: DeviceRegistrationRequest = {
      device_id: this.getDeviceId(),
      device_name: deviceName || `${appInfo.name} - ${appInfo.platform}`,
      os: appInfo.platform,
      app_version: appInfo.version,
    }

    const response = await api.post<DeviceRegistrationResponse>('/sync/register', request, {
      headers: {
        'X-Device-ID': this.getDeviceId(),
      },
    })

    return response.data
  }

  /**
   * Full sync - Initial download of all data
   */
  async fullSync(entities?: string[]): Promise<FullSyncResponse> {
    await this.initialize()

    const params: Record<string, string> = {}
    if (entities && entities.length > 0) {
      params.entities = entities.join(',')
    }

    const response = await api.get<FullSyncResponse>('/sync/full', {
      params,
      headers: {
        'X-Device-ID': this.getDeviceId(),
      },
    })

    // Store sync state
    if (response.data.sync_token) {
      this.storeSyncState(response.data.sync_token, response.data.server_timestamp)
    }

    return response.data
  }

  /**
   * Incremental sync - Get changes since last sync
   */
  async getChanges(since?: string, entities?: string[]): Promise<IncrementalSyncResponse> {
    await this.initialize()

    const sinceTimestamp = since || this.lastServerTimestamp
    if (!sinceTimestamp) {
      throw new Error('No timestamp provided and no previous sync found. Use fullSync first.')
    }

    const params: Record<string, string> = {
      since: sinceTimestamp,
    }
    if (entities && entities.length > 0) {
      params.entities = entities.join(',')
    }

    const response = await api.get<IncrementalSyncResponse>('/sync/changes', {
      params,
      headers: {
        'X-Device-ID': this.getDeviceId(),
      },
    })

    // Store sync state
    if (response.data.sync_token) {
      this.storeSyncState(response.data.sync_token, response.data.server_timestamp)
    }

    return response.data
  }

  /**
   * Batch sync - Upload multiple offline operations
   */
  async batchSync(operations: BatchOperation[]): Promise<BatchSyncResponse> {
    await this.initialize()

    const request: BatchSyncRequest = {
      operations,
      client_timestamp: new Date().toISOString(),
      device_id: this.getDeviceId(),
    }

    // Generate batch idempotency key
    const batchIdempotencyKey = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    const response = await api.post<BatchSyncResponse>('/sync/batch', request, {
      headers: {
        'X-Device-ID': this.getDeviceId(),
        'X-Idempotency-Key': batchIdempotencyKey,
      },
    })

    return response.data
  }

  /**
   * Generate offline invoice number in backend-expected format
   */
  generateOfflineInvoiceNo(): string {
    return `OFF-${this.getDeviceId()}-${Date.now()}`
  }

  /**
   * Generate idempotency key for an operation
   */
  generateIdempotencyKey(entity: string, action: string): string {
    return `${entity}_${action}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }

  /**
   * Check if response is a version conflict
   */
  isVersionConflict(error: unknown): error is { response: { status: 409; data: ConflictResponse } } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      (error as any).response?.status === 409
    )
  }

  /**
   * Check if needs full sync (first run or stale data)
   */
  needsFullSync(): boolean {
    if (!this.lastServerTimestamp) return true
    
    // Consider stale after 1 hour
    const lastSync = new Date(this.lastServerTimestamp)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return lastSync < hourAgo
  }

  /**
   * Check if device is registered
   */
  isDeviceRegistered(): boolean {
    return localStorage.getItem('device_registered') === 'true'
  }

  /**
   * Mark device as registered
   */
  markDeviceRegistered(): void {
    localStorage.setItem('device_registered', 'true')
  }
}

// Export singleton
export const syncApiService = new SyncApiService()
