/**
 * Storage Module
 * 
 * Provides a unified storage interface that abstracts the underlying database.
 * Uses SQLite (via better-sqlite3) in Electron for best performance and reliability.
 * Falls back to IndexedDB in non-Electron environments.
 * 
 * Usage:
 *   import { storage } from '@/lib/storage'
 *   
 *   // Fetch products
 *   const products = await storage.products.getAll()
 *   
 *   // Create offline sale
 *   const saleId = await storage.sales.createOffline(saleData)
 *   
 *   // Queue sync operation
 *   await storage.syncQueue.enqueue({...})
 */

import { IndexedDBAdapter } from './adapters/indexeddb.adapter'
import { SQLiteAdapter } from './adapters/sqlite.adapter'
import type { StorageAdapter, StorageConfig } from './interface'

// ============================================
// Environment Detection
// ============================================

/**
 * Check if we're running in Electron with SQLite support
 */
function isElectronWithSQLite(): boolean {
  return typeof window !== 'undefined' && 
         (window as any).electronAPI !== undefined && 
         (window as any).electronAPI.sqlite !== undefined
}

/**
 * Check if migration from IndexedDB to SQLite is needed
 */
export function needsMigration(): boolean {
  if (!isElectronWithSQLite()) return false
  const migrationDone = localStorage.getItem('sqlite_migration_complete')
  return migrationDone !== 'true'
}

/**
 * Mark migration as complete
 */
export function markMigrationComplete(): void {
  localStorage.setItem('sqlite_migration_complete', 'true')
}

// ============================================
// Storage Factory
// ============================================

/**
 * Create a storage adapter based on configuration
 */
export function createStorage(config?: Partial<StorageConfig>): StorageAdapter {
  const type = config?.type || 'auto'

  switch (type) {
    case 'indexeddb':
      return new IndexedDBAdapter(config)
    
    case 'sqlite':
      if (!isElectronWithSQLite()) {
        throw new Error('SQLite is only available in Electron environment')
      }
      return new SQLiteAdapter(config)

    case 'auto':
    default:
      // Auto-detect: use SQLite in Electron, IndexedDB otherwise
      if (isElectronWithSQLite()) {
        return new SQLiteAdapter(config)
      }
      return new IndexedDBAdapter(config)
  }
}

// ============================================
// Default Storage Instance
// ============================================

/**
 * Default storage instance
 * Uses SQLite in Electron (after migration), IndexedDB otherwise
 */
export const storage: StorageAdapter = createStorage()

// ============================================
// IndexedDB instance for migration
// ============================================

/**
 * Get IndexedDB adapter for reading during migration
 * This is used to read old data before migrating to SQLite
 */
export function getIndexedDBForMigration(): StorageAdapter {
  return new IndexedDBAdapter()
}

// ============================================
// Exports
// ============================================

// Re-export types for convenience
export type {
  StorageAdapter,
  StorageConfig,
  ProductRepository,
  CategoryRepository,
  PartyRepository,
  SaleRepository,
  SyncQueueRepository,
  ExportedData,
  SalesSummary,
  SyncQueueStats,
} from './interface'

// Export adapters for direct use if needed
export { IndexedDBAdapter } from './adapters/indexeddb.adapter'
export { SQLiteAdapter } from './adapters/sqlite.adapter'
