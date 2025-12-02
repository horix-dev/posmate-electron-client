/**
 * Storage Adapter Interface
 * 
 * Abstraction layer for database operations.
 * Allows swapping between IndexedDB (current) and SQLite (future) without changing app code.
 * 
 * Usage:
 *   import { storage } from '@/lib/storage'
 *   const products = await storage.products.getAll()
 *   await storage.sales.create(saleData)
 * 
 * To switch to SQLite in the future:
 *   1. Implement SQLiteAdapter
 *   2. Change the export in index.ts
 *   3. Run migration script
 */

import type { LocalProduct, LocalCategory, LocalParty, LocalSale, SyncQueueItem } from '@/lib/db/schema'

// ============================================
// Core Interfaces
// ============================================

/**
 * Base repository interface with common CRUD operations
 */
export interface BaseRepository<T, ID = number> {
  getById(id: ID): Promise<T | undefined>
  getAll(): Promise<T[]>
  create(item: Omit<T, 'id'>): Promise<ID>
  update(id: ID, item: Partial<T>): Promise<void>
  delete(id: ID): Promise<void>
  count(): Promise<number>
  clear(): Promise<void>
}

/**
 * Product repository with search capabilities
 */
export interface ProductRepository extends BaseRepository<LocalProduct> {
  search(query: string): Promise<LocalProduct[]>
  getByBarcode(barcode: string): Promise<LocalProduct | undefined>
  getByCategory(categoryId: number): Promise<LocalProduct[]>
  getLowStock(threshold?: number): Promise<LocalProduct[]>
  bulkUpsert(products: LocalProduct[]): Promise<void>
  getChangedSince(timestamp: string): Promise<LocalProduct[]>
}

/**
 * Category repository
 */
export interface CategoryRepository extends BaseRepository<LocalCategory> {
  getByName(name: string): Promise<LocalCategory | undefined>
  bulkUpsert(categories: LocalCategory[]): Promise<void>
}

/**
 * Party (customer/supplier) repository
 */
export interface PartyRepository extends BaseRepository<LocalParty> {
  search(query: string): Promise<LocalParty[]>
  getByPhone(phone: string): Promise<LocalParty | undefined>
  getCustomers(): Promise<LocalParty[]>
  getSuppliers(): Promise<LocalParty[]>
  getWithBalance(): Promise<LocalParty[]>
  bulkUpsert(parties: LocalParty[]): Promise<void>
}

/**
 * Sale repository with offline support
 */
export interface SaleRepository extends BaseRepository<LocalSale> {
  createOffline(sale: Omit<LocalSale, 'id' | 'isOffline' | 'isSynced'>): Promise<number>
  getOfflineSales(): Promise<LocalSale[]>
  markAsSynced(id: number, serverId?: number): Promise<void>
  getByInvoiceNumber(invoiceNo: string): Promise<LocalSale | undefined>
  getByDateRange(startDate: string, endDate: string): Promise<LocalSale[]>
  getTodaySales(): Promise<LocalSale[]>
  getSalesSummary(startDate: string, endDate: string): Promise<SalesSummary>
}

/**
 * Sync queue repository for offline operations
 */
export interface SyncQueueRepository extends BaseRepository<SyncQueueItem> {
  enqueue(item: Omit<SyncQueueItem, 'id'>): Promise<number>
  getPending(limit?: number): Promise<SyncQueueItem[]>
  getFailed(): Promise<SyncQueueItem[]>
  markAsProcessing(id: number): Promise<void>
  markAsCompleted(id: number): Promise<void>
  markAsFailed(id: number, error: string): Promise<void>
  clearCompleted(): Promise<void>
  getStats(): Promise<SyncQueueStats>
}

// ============================================
// Aggregate Types
// ============================================

export interface SalesSummary {
  totalSales: number
  totalAmount: number
  totalPaid: number
  totalDue: number
  averageTicket: number
}

export interface SyncQueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
}

// ============================================
// Storage Adapter Interface
// ============================================

/**
 * Main storage interface
 * Provides access to all repositories
 */
export interface StorageAdapter {
  // Repositories
  products: ProductRepository
  categories: CategoryRepository
  parties: PartyRepository
  sales: SaleRepository
  syncQueue: SyncQueueRepository

  // Database operations
  initialize(): Promise<void>
  close(): Promise<void>
  
  // Sync helpers
  getLastSyncTime(entity: string): Promise<string | null>
  setLastSyncTime(entity: string, timestamp?: string): Promise<void>
  
  // Transactions (for SQLite - IndexedDB handles differently)
  transaction<T>(fn: () => Promise<T>): Promise<T>
  
  // Utilities
  exportData(): Promise<ExportedData>
  importData(data: ExportedData): Promise<void>
  getDatabaseSize(): Promise<number>
  vacuum(): Promise<void> // Cleanup/optimize
}

/**
 * Exported data format for backup/restore
 */
export interface ExportedData {
  version: number
  exportedAt: string
  products: LocalProduct[]
  categories: LocalCategory[]
  parties: LocalParty[]
  sales: LocalSale[]
  syncQueue: SyncQueueItem[]
  metadata: Record<string, unknown>
}

// ============================================
// Configuration
// ============================================

export interface StorageConfig {
  type: 'indexeddb' | 'sqlite'
  dbName: string
  version: number
  encryptionKey?: string // For SQLite encryption
  debug?: boolean
}

export const DEFAULT_CONFIG: StorageConfig = {
  type: 'indexeddb', // Current implementation
  dbName: 'POSDatabase',
  version: 1,
  debug: process.env.NODE_ENV === 'development',
}
