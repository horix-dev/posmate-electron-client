/**
 * Enhanced Sync Queue Item with Idempotency
 * 
 * Backend Requirements for Full Offline Support:
 * 
 * 1. IDEMPOTENCY KEYS
 *    - Store idempotency_key in Redis/DB with 24h TTL
 *    - On duplicate request, return existing result
 *    - Header: X-Idempotency-Key
 * 
 * 2. VERSIONING (Optimistic Locking)
 *    - Add `version` field to all entities
 *    - Increment on each update
 *    - Return 409 Conflict if version mismatch
 * 
 * 3. INCREMENTAL SYNC
 *    GET /sync/changes?since=2025-12-01T00:00:00Z
 *    Returns only created/updated/deleted since timestamp
 * 
 * 4. BATCH SYNC ENDPOINT
 *    POST /sync/batch
 *    Process multiple operations in single request
 *    Return individual results per operation
 * 
 * 5. SERVER TIMESTAMP
 *    Include X-Server-Time header in all responses
 *    Client uses to detect clock drift
 */

/**
 * Generate idempotency key for offline operations
 * Format: {entity}_{operation}_{timestamp}_{random}
 */
export function generateIdempotencyKey(
  entity: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${entity}_${operation.toLowerCase()}_${timestamp}_${random}`
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Enhanced sync queue item schema
 */
export interface EnhancedSyncQueueItem {
  id?: number
  
  // Idempotency
  idempotencyKey: string  // Unique key for this operation
  
  // Operation details
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: string
  entityId: number | string
  
  // Versioning (for updates)
  expectedVersion?: number
  
  // Request details
  endpoint: string
  method: 'POST' | 'PUT' | 'DELETE'
  data: unknown
  
  // Retry logic
  attempts: number
  maxAttempts: number
  lastAttemptAt?: string
  nextRetryAt?: string
  
  // Status tracking
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict'
  error?: string
  conflictData?: unknown  // Server data on conflict
  
  // Timestamps
  createdAt: string
  clientTimestamp: string  // Client's time when created
  
  // Result tracking
  serverResponse?: unknown
  serverId?: number  // Server-assigned ID after sync
}

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy = 
  | 'client_wins'      // Overwrite server with client data
  | 'server_wins'      // Discard client changes
  | 'merge'            // Merge non-conflicting fields
  | 'manual'           // Flag for manual resolution

/**
 * Conflict resolution helper
 */
export interface ConflictResolution {
  itemId: number
  strategy: ConflictStrategy
  resolvedData?: unknown
}

/**
 * Batch sync request format (for backend)
 */
export interface BatchSyncRequest {
  operations: Array<{
    idempotencyKey: string
    entity: string
    action: 'create' | 'update' | 'delete'
    data: unknown
    expectedVersion?: number
  }>
  clientTimestamp: string
}

/**
 * Batch sync response format (from backend)
 */
export interface BatchSyncResponse {
  results: Array<{
    idempotencyKey: string
    status: 'created' | 'updated' | 'deleted' | 'conflict' | 'error'
    id?: number
    version?: number
    error?: string
    conflictData?: unknown
  }>
  serverTimestamp: string
  successCount: number
  errorCount: number
  conflictCount: number
}

/**
 * Incremental sync response format (from backend)
 */
export interface IncrementalSyncResponse {
  products: {
    created: unknown[]
    updated: unknown[]
    deleted: number[]
  }
  categories: {
    created: unknown[]
    updated: unknown[]
    deleted: number[]
  }
  parties: {
    created: unknown[]
    updated: unknown[]
    deleted: number[]
  }
  syncToken: string
  serverTimestamp: string
}
