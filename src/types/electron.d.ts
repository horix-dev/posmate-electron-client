// Electron API types exposed via contextBridge

import type { LocalProduct, LocalCategory, LocalParty, LocalSale, SyncQueueItem } from '@/lib/storage/interface'

export interface WindowControls {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
}

// SQLite API exposed from Electron main process
export interface SQLiteAPI {
  // Products
  products: {
    getAll: () => Promise<LocalProduct[]>
    getById: (id: number) => Promise<LocalProduct | null>
    getByServerId: (serverId: number) => Promise<LocalProduct | null>
    create: (product: Omit<LocalProduct, 'id'>) => Promise<number>
    update: (id: number, updates: Partial<LocalProduct>) => Promise<void>
    delete: (id: number) => Promise<void>
    bulkCreate: (products: Omit<LocalProduct, 'id'>[]) => Promise<number[]>
    search: (query: string) => Promise<LocalProduct[]>
    getByCategory: (categoryId: number) => Promise<LocalProduct[]>
    getLowStock: (threshold?: number) => Promise<LocalProduct[]>
    updateStock: (id: number, quantity: number) => Promise<void>
    getCount: () => Promise<number>
  }
  
  // Categories
  categories: {
    getAll: () => Promise<LocalCategory[]>
    getById: (id: number) => Promise<LocalCategory | null>
    getByServerId: (serverId: number) => Promise<LocalCategory | null>
    create: (category: Omit<LocalCategory, 'id'>) => Promise<number>
    update: (id: number, updates: Partial<LocalCategory>) => Promise<void>
    delete: (id: number) => Promise<void>
    bulkCreate: (categories: Omit<LocalCategory, 'id'>[]) => Promise<number[]>
    getChildren: (parentId: number | null) => Promise<LocalCategory[]>
  }
  
  // Parties
  parties: {
    getAll: () => Promise<LocalParty[]>
    getById: (id: number) => Promise<LocalParty | null>
    getByServerId: (serverId: number) => Promise<LocalParty | null>
    create: (party: Omit<LocalParty, 'id'>) => Promise<number>
    update: (id: number, updates: Partial<LocalParty>) => Promise<void>
    delete: (id: number) => Promise<void>
    bulkCreate: (parties: Omit<LocalParty, 'id'>[]) => Promise<number[]>
    search: (query: string) => Promise<LocalParty[]>
    getByType: (type: 'customer' | 'supplier') => Promise<LocalParty[]>
    updateBalance: (id: number, due: number, wallet: number) => Promise<void>
  }
  
  // Sales
  sales: {
    getAll: () => Promise<LocalSale[]>
    getById: (id: number) => Promise<LocalSale | null>
    getByServerId: (serverId: number) => Promise<LocalSale | null>
    getByTempId: (tempId: string) => Promise<LocalSale | null>
    create: (sale: Omit<LocalSale, 'id'>) => Promise<number>
    update: (id: number, updates: Partial<LocalSale>) => Promise<void>
    delete: (id: number) => Promise<void>
    getUnsynced: () => Promise<LocalSale[]>
    markSynced: (id: number, serverId: number) => Promise<void>
    getByDateRange: (start: Date, end: Date) => Promise<LocalSale[]>
    getByParty: (partyId: number) => Promise<LocalSale[]>
    getSummary: (start?: Date, end?: Date) => Promise<{
      totalSales: number
      totalAmount: number
      totalPaid: number
      totalDue: number
    }>
  }
  
  // Sync Queue
  syncQueue: {
    getAll: () => Promise<SyncQueueItem[]>
    getById: (id: number) => Promise<SyncQueueItem | null>
    create: (item: Omit<SyncQueueItem, 'id'>) => Promise<number>
    update: (id: number, updates: Partial<SyncQueueItem>) => Promise<void>
    delete: (id: number) => Promise<void>
    getPending: () => Promise<SyncQueueItem[]>
    getFailed: () => Promise<SyncQueueItem[]>
    markCompleted: (id: number) => Promise<void>
    markFailed: (id: number, error: string) => Promise<void>
    incrementAttempt: (id: number) => Promise<void>
    clear: () => Promise<void>
    getStats: () => Promise<{
      pending: number
      processing: number
      failed: number
      completed: number
    }>
  }
  
  // General operations
  clearAll: () => Promise<void>
  getMetadata: (key: string) => Promise<string | null>
  setMetadata: (key: string, value: string) => Promise<void>
}

export interface ElectronAPI {
  windowControls: WindowControls
  secureStore: {
    get: <T = unknown>(key: string) => Promise<T | undefined>
    set: (key: string, value: unknown) => Promise<boolean>
    delete: (key: string) => Promise<boolean>
    clear: () => Promise<boolean>
  }
  getDeviceId: () => Promise<string>
  getAppInfo: () => Promise<{
    name: string
    version: string
    platform: NodeJS.Platform
  }>
  onMainProcessMessage: (callback: (message: string) => void) => void
  removeAllListeners: (channel: string) => void
  
  // SQLite database API (available in Electron)
  sqlite?: SQLiteAPI
}

export interface PlatformInfo {
  isElectron: boolean
  isMac: boolean
  isWindows: boolean
  isLinux: boolean
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    platform: PlatformInfo
  }
}

export {}
