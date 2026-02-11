/**
 * IndexedDB Schema using Dexie.js
 * Stores local copies of master data and queued operations for offline support
 */

import Dexie, { type Table } from 'dexie'
import type { Product, Category, Party, PaymentType, Vat, Stock, Sale } from '@/types/api.types'

// ============================================
// Local Storage Types
// ============================================

/**
 * Sync queue item for operations that need to be synced to server
 * Enhanced with idempotency and version support for backend sync API
 */
export interface SyncQueueItem {
  id?: number

  // Idempotency key - unique identifier for this operation (prevents duplicates)
  idempotencyKey: string

  // Operation details
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  entity:
    | 'sale'
    | 'purchase'
    | 'expense'
    | 'income'
    | 'due_collection'
    | 'product'
    | 'customer'
    | 'party'
    | 'stock'
    | 'cheque'
  entityId: string | number // Local ID (may be temporary for creates)

  // Version for optimistic locking (for updates)
  expectedVersion?: number

  // Request payload
  data: unknown // The actual payload to send
  endpoint: string // API endpoint to call
  method: 'POST' | 'PUT' | 'DELETE'

  // Retry logic
  attempts: number
  maxAttempts: number
  lastAttemptAt?: string
  nextRetryAt?: string

  // Timestamps
  createdAt: string
  offlineTimestamp: string // When operation was created offline

  // Status tracking
  status: 'pending' | 'processing' | 'failed' | 'completed' | 'conflict'
  error?: string
  errorCode?: string

  // Conflict resolution
  conflictData?: unknown // Server data on conflict

  // Result tracking
  serverId?: number // Server-assigned ID after sync
  serverResponse?: unknown
}

/**
 * Local product with stock information
 */
export interface LocalProduct extends Product {
  stock: Stock
  lastSyncedAt: string
  version?: number // For optimistic locking
}

/**
 * Local category
 */
export interface LocalCategory extends Category {
  serverId?: number // Server-assigned ID (separate from local ID)
  lastSyncedAt: string
  version?: number // For optimistic locking
}

/**
 * Local party (customer/supplier)
 */
export interface LocalParty extends Party {
  serverId?: number // Server-assigned ID (separate from local ID)
  lastSyncedAt: string
  version: number // For optimistic locking
}

/**
 * Local payment type
 */
export interface LocalPaymentType extends PaymentType {
  lastSyncedAt: string
  version?: number
}

/**
 * Local VAT/tax configuration
 */
export interface LocalVat extends Vat {
  lastSyncedAt: string
}

/**
 * Local sale record (may include offline sales pending sync)
 */
export interface LocalSale extends Sale {
  isOffline: boolean // True if created while offline
  isSynced: boolean // True if synced to server
  tempId?: string // Temporary ID for offline sales
  serverId?: number // Server-assigned ID (separate from local ID)
  lastSyncedAt?: string
  syncError?: string
}

/**
 * Held cart (cart saved for later)
 */
export interface HeldCart {
  id?: number
  cartId: string
  items: Array<{
    productId: number
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }>
  customerId?: number
  customerName?: string
  paymentTypeId?: number
  paymentTypeName?: string
  subtotal: number
  tax: number
  total: number
  createdAt: string
  note?: string
}

/**
 * App metadata for tracking sync state
 */
export interface AppMetadata {
  key: string
  value: string | number | boolean
  updatedAt: string
}

// ============================================
// Dexie Database Class
// ============================================

export class POSDatabase extends Dexie {
  // Master Data Tables
  products!: Table<LocalProduct, number>
  categories!: Table<LocalCategory, number>
  parties!: Table<LocalParty, number>
  paymentTypes!: Table<LocalPaymentType, number>
  vats!: Table<LocalVat, number>

  // Transaction Tables
  sales!: Table<LocalSale, number>
  heldCarts!: Table<HeldCart, number>

  // Sync Infrastructure
  syncQueue!: Table<SyncQueueItem, number>
  metadata!: Table<AppMetadata, string>

  constructor() {
    super('POSDatabase')

    // Define schema version 1
    this.version(1).stores({
      // Master data with indexes for efficient querying
      products:
        '++id, productCode, productName, categoryId, lastSyncedAt, [categoryId+productName]',
      categories: '++id, categoryName, lastSyncedAt',
      parties: '++id, partyType, partyName, phoneNo, lastSyncedAt',
      paymentTypes: '++id, name, lastSyncedAt',
      vats: '++id, vatName, lastSyncedAt',

      // Transaction tables
      sales: '++id, invoiceNo, tempId, customerId, isOffline, isSynced, createdAt, lastSyncedAt',
      heldCarts: '++id, cartId, customerId, createdAt',

      // Sync infrastructure
      syncQueue: '++id, entity, status, createdAt, lastAttemptAt, [status+createdAt]',
      metadata: 'key, updatedAt',
    })
  }

  /**
   * Clear all master data (useful for logout or re-sync)
   */
  async clearMasterData() {
    await Promise.all([
      this.products.clear(),
      this.categories.clear(),
      this.parties.clear(),
      this.paymentTypes.clear(),
      this.vats.clear(),
    ])
  }

  /**
   * Clear all transaction data
   */
  async clearTransactionData() {
    await Promise.all([this.sales.clear(), this.heldCarts.clear()])
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    await this.syncQueue.clear()
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<string | number | boolean | null> {
    const item = await this.metadata.get(key)
    return item?.value ?? null
  }

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: string | number | boolean): Promise<void> {
    await this.metadata.put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * Get last sync timestamp for an entity type
   */
  async getLastSyncTime(entity: string): Promise<string | null> {
    const value = await this.getMetadata(`lastSync_${entity}`)
    return typeof value === 'string' ? value : null
  }

  /**
   * Update last sync timestamp for an entity type
   */
  async setLastSyncTime(entity: string): Promise<void> {
    await this.setMetadata(`lastSync_${entity}`, new Date().toISOString())
  }
}

// ============================================
// Database Instance (Singleton)
// ============================================

export const db = new POSDatabase()

// ============================================
// Database Helper Functions
// ============================================

/**
 * Check if database is ready
 */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    await db.open()
    return db.isOpen()
  } catch (error) {
    console.error('Database not ready:', error)
    return false
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const [productsCount, categoriesCount, partiesCount, salesCount, heldCartsCount, syncQueueCount] =
    await Promise.all([
      db.products.count(),
      db.categories.count(),
      db.parties.count(),
      db.sales.count(),
      db.heldCarts.count(),
      db.syncQueue.where('status').equals('pending').count(),
    ])

  return {
    products: productsCount,
    categories: categoriesCount,
    parties: partiesCount,
    sales: salesCount,
    heldCarts: heldCartsCount,
    pendingSyncItems: syncQueueCount,
  }
}

/**
 * Export database for debugging
 */
export async function exportDatabase() {
  const data = {
    products: await db.products.toArray(),
    categories: await db.categories.toArray(),
    parties: await db.parties.toArray(),
    paymentTypes: await db.paymentTypes.toArray(),
    vats: await db.vats.toArray(),
    sales: await db.sales.toArray(),
    heldCarts: await db.heldCarts.toArray(),
    syncQueue: await db.syncQueue.toArray(),
    metadata: await db.metadata.toArray(),
  }
  return data
}
