/**
 * SQLite Adapter
 * 
 * Uses IPC bridge to communicate with SQLite running in Electron main process.
 * Implements StorageAdapter interface for seamless swapping with IndexedDB.
 */

import type {
  StorageAdapter,
  ProductRepository,
  CategoryRepository,
  PartyRepository,
  SaleRepository,
  SyncQueueRepository,
  ExportedData,
  SalesSummary,
  SyncQueueStats,
  StorageConfig,
} from '../interface'
import type { LocalProduct, LocalCategory, LocalParty, LocalSale, SyncQueueItem } from '@/lib/db/schema'

// ============================================
// Type for window.electronAPI.sqlite (internal use)
// ============================================

// Internal SQLite API interface matching the Electron main process service
interface InternalSQLiteAPI {
  initialize: () => Promise<{ success: boolean; error?: string }>
  close: () => Promise<void>
  product: {
    getById: (id: number) => Promise<any>
    getAll: () => Promise<any[]>
    create: (product: any) => Promise<number>
    update: (id: number, product: any) => Promise<void>
    delete: (id: number) => Promise<void>
    count: () => Promise<number>
    clear: () => Promise<void>
    search: (query: string) => Promise<any[]>
    getByBarcode: (barcode: string) => Promise<any>
    getByCategory: (categoryId: number) => Promise<any[]>
    getLowStock: (threshold?: number) => Promise<any[]>
    bulkUpsert: (products: any[]) => Promise<void>
  }
  category: {
    getById: (id: number) => Promise<any>
    getAll: () => Promise<any[]>
    create: (category: any) => Promise<number>
    update: (id: number, category: any) => Promise<void>
    delete: (id: number) => Promise<void>
    count: () => Promise<number>
    clear: () => Promise<void>
    getByName: (name: string) => Promise<any>
    bulkUpsert: (categories: any[]) => Promise<void>
  }
  party: {
    getById: (id: number) => Promise<any>
    getAll: () => Promise<any[]>
    create: (party: any) => Promise<number>
    update: (id: number, party: any) => Promise<void>
    delete: (id: number) => Promise<void>
    count: () => Promise<number>
    clear: () => Promise<void>
    search: (query: string) => Promise<any[]>
    getByPhone: (phone: string) => Promise<any>
    getCustomers: () => Promise<any[]>
    getSuppliers: () => Promise<any[]>
    getWithBalance: () => Promise<any[]>
    bulkUpsert: (parties: any[]) => Promise<void>
  }
  sale: {
    getById: (id: number) => Promise<any>
    getAll: () => Promise<any[]>
    create: (sale: any) => Promise<number>
    createOffline: (sale: any) => Promise<number>
    update: (id: number, sale: any) => Promise<void>
    delete: (id: number) => Promise<void>
    count: () => Promise<number>
    clear: () => Promise<void>
    getOffline: () => Promise<any[]>
    markAsSynced: (id: number, serverId?: number) => Promise<void>
    getByInvoiceNumber: (invoiceNo: string) => Promise<any>
    getByDateRange: (startDate: string, endDate: string) => Promise<any[]>
    getToday: () => Promise<any[]>
    getSummary: (startDate: string, endDate: string) => Promise<SalesSummary>
  }
  syncQueue: {
    getById: (id: number) => Promise<any>
    getAll: () => Promise<any[]>
    create: (item: any) => Promise<number>
    update: (id: number, item: any) => Promise<void>
    delete: (id: number) => Promise<void>
    count: () => Promise<number>
    clear: () => Promise<void>
    enqueue: (item: any) => Promise<number>
    getPending: (limit?: number) => Promise<any[]>
    getFailed: () => Promise<any[]>
    markAsProcessing: (id: number) => Promise<void>
    markAsCompleted: (id: number) => Promise<void>
    markAsFailed: (id: number, error: string) => Promise<void>
    clearCompleted: () => Promise<void>
    getStats: () => Promise<SyncQueueStats>
  }
  getLastSyncTime: (entity: string) => Promise<string | null>
  setLastSyncTime: (entity: string, timestamp?: string) => Promise<void>
  getDatabaseSize: () => Promise<number>
  vacuum: () => Promise<void>
  exportData: () => Promise<any>
}

// Helper to get the SQLite API from the window object
function getSQLiteAPI(): InternalSQLiteAPI {
  // Access sqlite from electronAPI - this is set up by preload.ts
  const api = (window as any).electronAPI?.sqlite as InternalSQLiteAPI | undefined
  if (!api) {
    throw new Error('SQLite API not available. Are you running in Electron?')
  }
  return api
}

// ============================================
// SQLite Product Repository
// ============================================

class SQLiteProductRepository implements ProductRepository {
  async getById(id: number): Promise<LocalProduct | undefined> {
    return getSQLiteAPI().product.getById(id)
  }

  async getAll(): Promise<LocalProduct[]> {
    return getSQLiteAPI().product.getAll()
  }

  async create(item: Omit<LocalProduct, 'id'>): Promise<number> {
    return getSQLiteAPI().product.create(item)
  }

  async update(id: number, item: Partial<LocalProduct>): Promise<void> {
    return getSQLiteAPI().product.update(id, item)
  }

  async delete(id: number): Promise<void> {
    return getSQLiteAPI().product.delete(id)
  }

  async count(): Promise<number> {
    return getSQLiteAPI().product.count()
  }

  async clear(): Promise<void> {
    return getSQLiteAPI().product.clear()
  }

  async search(query: string): Promise<LocalProduct[]> {
    return getSQLiteAPI().product.search(query)
  }

  async getByBarcode(barcode: string): Promise<LocalProduct | undefined> {
    return getSQLiteAPI().product.getByBarcode(barcode)
  }

  async getByCategory(categoryId: number): Promise<LocalProduct[]> {
    return getSQLiteAPI().product.getByCategory(categoryId)
  }

  async getLowStock(threshold = 10): Promise<LocalProduct[]> {
    return getSQLiteAPI().product.getLowStock(threshold)
  }

  async bulkUpsert(products: LocalProduct[]): Promise<void> {
    return getSQLiteAPI().product.bulkUpsert(products)
  }

  async getChangedSince(): Promise<LocalProduct[]> {
    // SQLite doesn't track changes like this by default
    // Return all products for now
    return this.getAll()
  }
}

// ============================================
// SQLite Category Repository
// ============================================

class SQLiteCategoryRepository implements CategoryRepository {
  async getById(id: number): Promise<LocalCategory | undefined> {
    return getSQLiteAPI().category.getById(id)
  }

  async getAll(): Promise<LocalCategory[]> {
    return getSQLiteAPI().category.getAll()
  }

  async create(item: Omit<LocalCategory, 'id'>): Promise<number> {
    return getSQLiteAPI().category.create(item)
  }

  async update(id: number, item: Partial<LocalCategory>): Promise<void> {
    return getSQLiteAPI().category.update(id, item)
  }

  async delete(id: number): Promise<void> {
    return getSQLiteAPI().category.delete(id)
  }

  async count(): Promise<number> {
    return getSQLiteAPI().category.count()
  }

  async clear(): Promise<void> {
    return getSQLiteAPI().category.clear()
  }

  async getByName(name: string): Promise<LocalCategory | undefined> {
    return getSQLiteAPI().category.getByName(name)
  }

  async bulkUpsert(categories: LocalCategory[]): Promise<void> {
    return getSQLiteAPI().category.bulkUpsert(categories)
  }
}

// ============================================
// SQLite Party Repository
// ============================================

class SQLitePartyRepository implements PartyRepository {
  async getById(id: number): Promise<LocalParty | undefined> {
    return getSQLiteAPI().party.getById(id)
  }

  async getAll(): Promise<LocalParty[]> {
    return getSQLiteAPI().party.getAll()
  }

  async create(item: Omit<LocalParty, 'id'>): Promise<number> {
    return getSQLiteAPI().party.create(item)
  }

  async update(id: number, item: Partial<LocalParty>): Promise<void> {
    return getSQLiteAPI().party.update(id, item)
  }

  async delete(id: number): Promise<void> {
    return getSQLiteAPI().party.delete(id)
  }

  async count(): Promise<number> {
    return getSQLiteAPI().party.count()
  }

  async clear(): Promise<void> {
    return getSQLiteAPI().party.clear()
  }

  async search(query: string): Promise<LocalParty[]> {
    return getSQLiteAPI().party.search(query)
  }

  async getByPhone(phone: string): Promise<LocalParty | undefined> {
    return getSQLiteAPI().party.getByPhone(phone)
  }

  async getCustomers(): Promise<LocalParty[]> {
    return getSQLiteAPI().party.getCustomers()
  }

  async getSuppliers(): Promise<LocalParty[]> {
    return getSQLiteAPI().party.getSuppliers()
  }

  async getWithBalance(): Promise<LocalParty[]> {
    return getSQLiteAPI().party.getWithBalance()
  }

  async bulkUpsert(parties: LocalParty[]): Promise<void> {
    return getSQLiteAPI().party.bulkUpsert(parties)
  }
}

// ============================================
// SQLite Sale Repository
// ============================================

class SQLiteSaleRepository implements SaleRepository {
  async getById(id: number): Promise<LocalSale | undefined> {
    return getSQLiteAPI().sale.getById(id)
  }

  async getAll(): Promise<LocalSale[]> {
    return getSQLiteAPI().sale.getAll()
  }

  async create(item: Omit<LocalSale, 'id'>): Promise<number> {
    return getSQLiteAPI().sale.create(item)
  }

  async update(id: number, item: Partial<LocalSale>): Promise<void> {
    return getSQLiteAPI().sale.update(id, item)
  }

  async delete(id: number): Promise<void> {
    return getSQLiteAPI().sale.delete(id)
  }

  async count(): Promise<number> {
    return getSQLiteAPI().sale.count()
  }

  async clear(): Promise<void> {
    return getSQLiteAPI().sale.clear()
  }

  async createOffline(sale: Omit<LocalSale, 'id' | 'isOffline' | 'isSynced'>): Promise<number> {
    return getSQLiteAPI().sale.createOffline(sale)
  }

  async getOfflineSales(): Promise<LocalSale[]> {
    return getSQLiteAPI().sale.getOffline()
  }

  async markAsSynced(id: number, serverId?: number): Promise<void> {
    return getSQLiteAPI().sale.markAsSynced(id, serverId)
  }

  async getByInvoiceNumber(invoiceNo: string): Promise<LocalSale | undefined> {
    return getSQLiteAPI().sale.getByInvoiceNumber(invoiceNo)
  }

  async getByDateRange(startDate: string, endDate: string): Promise<LocalSale[]> {
    return getSQLiteAPI().sale.getByDateRange(startDate, endDate)
  }

  async getTodaySales(): Promise<LocalSale[]> {
    return getSQLiteAPI().sale.getToday()
  }

  async getSalesSummary(startDate: string, endDate: string): Promise<SalesSummary> {
    return getSQLiteAPI().sale.getSummary(startDate, endDate)
  }
}

// ============================================
// SQLite Sync Queue Repository
// ============================================

class SQLiteSyncQueueRepository implements SyncQueueRepository {
  async getById(id: number): Promise<SyncQueueItem | undefined> {
    return getSQLiteAPI().syncQueue.getById(id)
  }

  async getAll(): Promise<SyncQueueItem[]> {
    return getSQLiteAPI().syncQueue.getAll()
  }

  async create(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
    return getSQLiteAPI().syncQueue.create(item)
  }

  async update(id: number, item: Partial<SyncQueueItem>): Promise<void> {
    return getSQLiteAPI().syncQueue.update(id, item)
  }

  async delete(id: number): Promise<void> {
    return getSQLiteAPI().syncQueue.delete(id)
  }

  async count(): Promise<number> {
    return getSQLiteAPI().syncQueue.count()
  }

  async clear(): Promise<void> {
    return getSQLiteAPI().syncQueue.clear()
  }

  async enqueue(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
    return getSQLiteAPI().syncQueue.enqueue(item)
  }

  async getPending(limit?: number): Promise<SyncQueueItem[]> {
    return getSQLiteAPI().syncQueue.getPending(limit)
  }

  async getFailed(): Promise<SyncQueueItem[]> {
    return getSQLiteAPI().syncQueue.getFailed()
  }

  async markAsProcessing(id: number): Promise<void> {
    return getSQLiteAPI().syncQueue.markAsProcessing(id)
  }

  async markAsCompleted(id: number): Promise<void> {
    return getSQLiteAPI().syncQueue.markAsCompleted(id)
  }

  async markAsFailed(id: number, error: string): Promise<void> {
    return getSQLiteAPI().syncQueue.markAsFailed(id, error)
  }

  async clearCompleted(): Promise<void> {
    return getSQLiteAPI().syncQueue.clearCompleted()
  }

  async getStats(): Promise<SyncQueueStats> {
    return getSQLiteAPI().syncQueue.getStats()
  }
}

// ============================================
// SQLite Storage Adapter
// ============================================

export class SQLiteAdapter implements StorageAdapter {
  products: ProductRepository
  categories: CategoryRepository
  parties: PartyRepository
  sales: SaleRepository
  syncQueue: SyncQueueRepository

  private config: StorageConfig

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      type: 'sqlite',
      dbName: 'posmate.db',
      version: 1,
      ...config,
    }

    // Initialize repositories
    this.products = new SQLiteProductRepository()
    this.categories = new SQLiteCategoryRepository()
    this.parties = new SQLitePartyRepository()
    this.sales = new SQLiteSaleRepository()
    this.syncQueue = new SQLiteSyncQueueRepository()
  }

  async initialize(): Promise<void> {
    const result = await getSQLiteAPI().initialize()
    if (!result.success) {
      throw new Error(`Failed to initialize SQLite: ${result.error}`)
    }
    if (this.config.debug) {
      console.log('[SQLiteAdapter] Database initialized')
    }
  }

  async close(): Promise<void> {
    await getSQLiteAPI().close()
    if (this.config.debug) {
      console.log('[SQLiteAdapter] Database closed')
    }
  }

  async getLastSyncTime(entity: string): Promise<string | null> {
    return getSQLiteAPI().getLastSyncTime(entity)
  }

  async setLastSyncTime(entity: string, timestamp?: string): Promise<void> {
    return getSQLiteAPI().setLastSyncTime(entity, timestamp)
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // SQLite transactions are handled synchronously in main process
    // For renderer, we just execute the function
    return fn()
  }

  async exportData(): Promise<ExportedData> {
    const data = await getSQLiteAPI().exportData()
    return {
      version: this.config.version,
      exportedAt: new Date().toISOString(),
      products: data.products,
      categories: data.categories,
      parties: data.parties,
      sales: data.sales,
      syncQueue: data.syncQueue,
      metadata: {
        dbName: this.config.dbName,
        type: 'sqlite',
      },
    }
  }

  async importData(data: ExportedData): Promise<void> {
    // Clear existing data
    await this.products.clear()
    await this.categories.clear()
    await this.parties.clear()
    await this.sales.clear()
    await this.syncQueue.clear()

    // Import new data (bulk operations)
    if (data.products.length) {
      await (this.products as SQLiteProductRepository).bulkUpsert(data.products)
    }
    if (data.categories.length) {
      await (this.categories as SQLiteCategoryRepository).bulkUpsert(data.categories)
    }
    if (data.parties.length) {
      await (this.parties as SQLitePartyRepository).bulkUpsert(data.parties)
    }
    // Sales and sync queue would need individual inserts
    for (const sale of data.sales) {
      await this.sales.create(sale)
    }
    for (const item of data.syncQueue) {
      await this.syncQueue.create(item)
    }
  }

  async getDatabaseSize(): Promise<number> {
    return getSQLiteAPI().getDatabaseSize()
  }

  async vacuum(): Promise<void> {
    await getSQLiteAPI().vacuum()
    if (this.config.debug) {
      console.log('[SQLiteAdapter] Database vacuumed')
    }
  }
}

// ============================================
// Check if SQLite is available
// ============================================

export function isSQLiteAvailable(): boolean {
  return !!((window as any).electronAPI?.sqlite)
}
