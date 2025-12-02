/**
 * IndexedDB Adapter
 * 
 * Wraps existing Dexie.js implementation to conform to StorageAdapter interface.
 * This allows swapping to SQLite in the future without changing application code.
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
import { db, type LocalProduct, type LocalCategory, type LocalParty, type LocalSale, type SyncQueueItem } from '@/lib/db/schema'
import {
  productRepository,
  saleRepository,
  syncQueueRepository,
} from '@/lib/db/repositories'

// ============================================
// IndexedDB Product Repository Adapter
// ============================================

class IndexedDBProductRepository implements ProductRepository {
  async getById(id: number) {
    return productRepository.getById(id)
  }

  async getAll() {
    return productRepository.getAll()
  }

  async create(item: Omit<LocalProduct, 'id'>) {
    return productRepository.create(item as LocalProduct)
  }

  async update(id: number, item: Partial<LocalProduct>): Promise<void> {
    await productRepository.update(id, item)
  }

  async delete(id: number) {
    return productRepository.delete(id)
  }

  async count() {
    return db.products.count()
  }

  async clear() {
    return db.products.clear()
  }

  async search(query: string) {
    return productRepository.search(query)
  }

  async getByBarcode(barcode: string) {
    return productRepository.getByBarcode(barcode)
  }

  async getByCategory(categoryId: number) {
    return productRepository.getByCategory(categoryId)
  }

  async getLowStock(threshold = 10) {
    return productRepository.getLowStock(threshold)
  }

  async bulkUpsert(products: LocalProduct[]) {
    const now = new Date().toISOString()
    const productsWithTimestamp = products.map((p) => ({
      ...p,
      lastSyncedAt: now,
    }))
    await productRepository.upsertMany(productsWithTimestamp)
  }

  async getChangedSince(timestamp: string) {
    return db.products
      .filter(p => p.lastSyncedAt ? p.lastSyncedAt > timestamp : true)
      .toArray()
  }
}

// ============================================
// IndexedDB Category Repository Adapter
// ============================================

class IndexedDBCategoryRepository implements CategoryRepository {
  async getById(id: number) {
    return db.categories.get(id)
  }

  async getAll() {
    return db.categories.toArray()
  }

  async create(item: Omit<LocalCategory, 'id'>) {
    return db.categories.add(item as LocalCategory)
  }

  async update(id: number, item: Partial<LocalCategory>): Promise<void> {
    await db.categories.update(id, item)
  }

  async delete(id: number) {
    return db.categories.delete(id)
  }

  async count() {
    return db.categories.count()
  }

  async clear() {
    return db.categories.clear()
  }

  async getByName(name: string) {
    return db.categories.where('categoryName').equalsIgnoreCase(name).first()
  }

  async bulkUpsert(categories: LocalCategory[]) {
    const now = new Date().toISOString()
    const categoriesWithTimestamp = categories.map((c) => ({
      ...c,
      lastSyncedAt: now,
    }))
    await db.categories.bulkPut(categoriesWithTimestamp)
  }
}

// ============================================
// IndexedDB Party Repository Adapter
// ============================================

class IndexedDBPartyRepository implements PartyRepository {
  async getById(id: number) {
    return db.parties.get(id)
  }

  async getAll() {
    return db.parties.toArray()
  }

  async create(item: Omit<LocalParty, 'id'>) {
    return db.parties.add(item as LocalParty)
  }

  async update(id: number, item: Partial<LocalParty>): Promise<void> {
    await db.parties.update(id, item)
  }

  async delete(id: number) {
    return db.parties.delete(id)
  }

  async count() {
    return db.parties.count()
  }

  async clear() {
    return db.parties.clear()
  }

  async search(query: string) {
    const lowerQuery = query.toLowerCase()
    return db.parties
      .filter(party => 
        party.name?.toLowerCase().includes(lowerQuery) ||
        party.phone?.toLowerCase().includes(lowerQuery) ||
        false
      )
      .toArray()
  }

  async getByPhone(phone: string) {
    return db.parties.where('phoneNo').equals(phone).first()
  }

  async getCustomers() {
    return db.parties.where('partyType').equals('customer').toArray()
  }

  async getSuppliers() {
    return db.parties.where('partyType').equals('supplier').toArray()
  }

  async getWithBalance() {
    return db.parties
      .filter(party => (party.due ?? 0) !== 0)
      .toArray()
  }

  async bulkUpsert(parties: LocalParty[]) {
    const now = new Date().toISOString()
    const partiesWithTimestamp = parties.map((p) => ({
      ...p,
      lastSyncedAt: now,
    }))
    await db.parties.bulkPut(partiesWithTimestamp)
  }
}

// ============================================
// IndexedDB Sale Repository Adapter
// ============================================

class IndexedDBSaleRepository implements SaleRepository {
  async getById(id: number) {
    return saleRepository.getById(id)
  }

  async getAll() {
    return saleRepository.getAll()
  }

  async create(item: Omit<LocalSale, 'id'>) {
    return saleRepository.create(item as LocalSale)
  }

  async update(id: number, item: Partial<LocalSale>): Promise<void> {
    await saleRepository.update(id, item)
  }

  async delete(id: number) {
    return saleRepository.delete(id)
  }

  async count() {
    return db.sales.count()
  }

  async clear() {
    return db.sales.clear()
  }

  async createOffline(sale: Omit<LocalSale, 'id' | 'isOffline' | 'isSynced'>) {
    return saleRepository.createOffline(sale)
  }

  async getOfflineSales() {
    return saleRepository.getOfflineSales()
  }

  async markAsSynced(id: number, serverId?: number) {
    return saleRepository.markAsSynced(id, serverId)
  }

  async getByInvoiceNumber(invoiceNo: string) {
    return db.sales.where('invoiceNumber').equals(invoiceNo).first()
  }

  async getByDateRange(startDate: string, endDate: string) {
    return db.sales
      .where('saleDate')
      .between(startDate, endDate, true, true)
      .toArray()
  }

  async getTodaySales() {
    const today = new Date().toISOString().split('T')[0]
    return db.sales
      .filter(s => s.saleDate?.startsWith(today))
      .toArray()
  }

  async getSalesSummary(startDate: string, endDate: string): Promise<SalesSummary> {
    const sales = await this.getByDateRange(startDate, endDate)
    
    const totalSales = sales.length
    const totalAmount = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
    const totalPaid = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0)
    const totalDue = sales.reduce((sum, s) => sum + (s.dueAmount || 0), 0)
    const averageTicket = totalSales > 0 ? totalAmount / totalSales : 0

    return {
      totalSales,
      totalAmount,
      totalPaid,
      totalDue,
      averageTicket,
    }
  }
}

// ============================================
// IndexedDB Sync Queue Repository Adapter
// ============================================

class IndexedDBSyncQueueRepository implements SyncQueueRepository {
  async getById(id: number) {
    return syncQueueRepository.getById(id)
  }

  async getAll() {
    return syncQueueRepository.getAll()
  }

  async create(item: Omit<SyncQueueItem, 'id'>) {
    return syncQueueRepository.create(item as SyncQueueItem)
  }

  async update(id: number, item: Partial<SyncQueueItem>): Promise<void> {
    await syncQueueRepository.update(id, item)
  }

  async delete(id: number) {
    return syncQueueRepository.delete(id)
  }

  async count() {
    return db.syncQueue.count()
  }

  async clear() {
    return db.syncQueue.clear()
  }

  async enqueue(item: Omit<SyncQueueItem, 'id'>) {
    return syncQueueRepository.enqueue(item)
  }

  async getPending(limit?: number) {
    return syncQueueRepository.getPending(limit)
  }

  async getFailed() {
    return syncQueueRepository.getFailed()
  }

  async markAsProcessing(id: number) {
    return syncQueueRepository.markAsProcessing(id)
  }

  async markAsCompleted(id: number) {
    return syncQueueRepository.markAsCompleted(id)
  }

  async markAsFailed(id: number, error: string) {
    return syncQueueRepository.markAsFailed(id, error)
  }

  async clearCompleted() {
    return syncQueueRepository.clearCompleted()
  }

  async getStats(): Promise<SyncQueueStats> {
    const all = await this.getAll()
    return {
      pending: all.filter(i => i.status === 'pending').length,
      processing: all.filter(i => i.status === 'processing').length,
      completed: all.filter(i => i.status === 'completed').length,
      failed: all.filter(i => i.status === 'failed').length,
      total: all.length,
    }
  }
}

// ============================================
// IndexedDB Storage Adapter
// ============================================

export class IndexedDBAdapter implements StorageAdapter {
  products: ProductRepository
  categories: CategoryRepository
  parties: PartyRepository
  sales: SaleRepository
  syncQueue: SyncQueueRepository

  private config: StorageConfig

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      type: 'indexeddb',
      dbName: 'POSDatabase',
      version: 1,
      ...config,
    }

    // Initialize repositories
    this.products = new IndexedDBProductRepository()
    this.categories = new IndexedDBCategoryRepository()
    this.parties = new IndexedDBPartyRepository()
    this.sales = new IndexedDBSaleRepository()
    this.syncQueue = new IndexedDBSyncQueueRepository()
  }

  async initialize(): Promise<void> {
    // Dexie initializes automatically
    await db.open()
    if (this.config.debug) {
      console.log('[IndexedDBAdapter] Database initialized')
    }
  }

  async close(): Promise<void> {
    db.close()
    if (this.config.debug) {
      console.log('[IndexedDBAdapter] Database closed')
    }
  }

  async getLastSyncTime(entity: string): Promise<string | null> {
    return db.getLastSyncTime(entity)
  }

  async setLastSyncTime(entity: string, timestamp?: string): Promise<void> {
    // The db.setLastSyncTime only takes entity (sets current time)
    // If custom timestamp needed, use setMetadata directly
    if (timestamp) {
      await db.setMetadata(`lastSync_${entity}`, timestamp)
    } else {
      await db.setLastSyncTime(entity)
    }
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // Dexie handles transactions internally
    // For explicit transactions, use db.transaction()
    return fn()
  }

  async exportData(): Promise<ExportedData> {
    const [products, categories, parties, sales, syncQueue] = await Promise.all([
      this.products.getAll(),
      this.categories.getAll(),
      this.parties.getAll(),
      this.sales.getAll(),
      this.syncQueue.getAll(),
    ])

    return {
      version: this.config.version,
      exportedAt: new Date().toISOString(),
      products,
      categories,
      parties,
      sales,
      syncQueue,
      metadata: {
        dbName: this.config.dbName,
        type: 'indexeddb',
      },
    }
  }

  async importData(data: ExportedData): Promise<void> {
    await db.transaction('rw', [db.products, db.categories, db.parties, db.sales, db.syncQueue], async () => {
      // Clear existing data
      await Promise.all([
        db.products.clear(),
        db.categories.clear(),
        db.parties.clear(),
        db.sales.clear(),
        db.syncQueue.clear(),
      ])

      // Import new data
      await Promise.all([
        db.products.bulkAdd(data.products),
        db.categories.bulkAdd(data.categories),
        db.parties.bulkAdd(data.parties),
        db.sales.bulkAdd(data.sales),
        db.syncQueue.bulkAdd(data.syncQueue),
      ])
    })
  }

  async getDatabaseSize(): Promise<number> {
    // Estimate size based on record count (rough approximation)
    const [products, categories, parties, sales, syncQueue] = await Promise.all([
      this.products.count(),
      this.categories.count(),
      this.parties.count(),
      this.sales.count(),
      this.syncQueue.count(),
    ])

    // Rough estimate: avg 1KB per product, 200B per category, 500B per party, 2KB per sale
    return (products * 1024) + (categories * 200) + (parties * 500) + (sales * 2048) + (syncQueue * 500)
  }

  async vacuum(): Promise<void> {
    // IndexedDB doesn't have vacuum, but we can clean up completed sync items
    await this.syncQueue.clearCompleted()
    if (this.config.debug) {
      console.log('[IndexedDBAdapter] Cleanup completed')
    }
  }
}
