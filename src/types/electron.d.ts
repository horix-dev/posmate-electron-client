// Electron API types exposed via contextBridge

import type {
  StockAdjustment,
  StockAdjustmentFilters,
  StockAdjustmentSummary,
} from '@/types/stockAdjustment.types'
import type { LocalCategory, LocalParty, LocalSale } from '@/lib/storage/interface'

type AsyncFn<Args extends unknown[] = unknown[], Result = unknown> = (
  ...args: Args
) => Promise<Result>

export interface RendererPrinterInfo {
  name: string
  displayName?: string
  description?: string
  status?: number
  isDefault?: boolean
  options?: Record<string, string>
}

export type PrintInvokeResult = {
  success: boolean
  error?: string
}

export interface WindowControls {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
}

export interface ElectronSQLiteAPI {
  initialize: AsyncFn<[], { success: boolean; error?: string }>
  close: AsyncFn
  product: {
    getById: AsyncFn<[number], unknown>
    getAll: AsyncFn<[], unknown[]>
    create: AsyncFn<[unknown], number>
    update: AsyncFn<[number, unknown], void>
    delete: AsyncFn<[number], void>
    count: AsyncFn<[], number>
    clear: AsyncFn
    search: AsyncFn<[string], unknown[]>
    getByBarcode: AsyncFn<[string], unknown>
    getByCategory: AsyncFn<[number], unknown[]>
    getLowStock: AsyncFn<[number | undefined], unknown[]>
    bulkUpsert: AsyncFn<[unknown[]], void>
  }

  // Categories
  category: {
    getById: AsyncFn<[number], unknown>
    getAll: AsyncFn<[], unknown[]>
    create: AsyncFn<[unknown], number>
    update: AsyncFn<[number, unknown], void>
    delete: AsyncFn<[number], void>
    count: AsyncFn<[], number>
    clear: AsyncFn
    getByName: AsyncFn<[string], unknown>
    bulkUpsert: AsyncFn<[unknown[]], void>
  }
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
  party: {
    getById: AsyncFn<[number], unknown>
    getAll: AsyncFn<[], unknown[]>
    create: AsyncFn<[unknown], number>
    update: AsyncFn<[number, unknown], void>
    delete: AsyncFn<[number], void>
    count: AsyncFn<[], number>
    clear: AsyncFn
    search: AsyncFn<[string], unknown[]>
    getByPhone: AsyncFn<[string], unknown>
    getCustomers: AsyncFn<[], unknown[]>
    getSuppliers: AsyncFn<[], unknown[]>
    getWithBalance: AsyncFn<[], unknown[]>
    bulkUpsert: AsyncFn<[unknown[]], void>
  }
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
  sale: {
    getById: AsyncFn<[number], unknown>
    getAll: AsyncFn<[], unknown[]>
    create: AsyncFn<[unknown], number>
    createOffline: AsyncFn<[unknown], number>
    update: AsyncFn<[number, unknown], void>
    delete: AsyncFn<[number], void>
    count: AsyncFn<[], number>
    clear: AsyncFn
    getOffline: AsyncFn<[], unknown[]>
    markAsSynced: AsyncFn<[number, number?], void>
    getByInvoiceNumber: AsyncFn<[string], unknown>
    getByDateRange: AsyncFn<[string, string], unknown[]>
    getToday: AsyncFn<[], unknown[]>
    getSummary: AsyncFn<[string, string], unknown>
  }
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
    getSummary: (
      start?: Date,
      end?: Date
    ) => Promise<{
      totalSales: number
      totalAmount: number
      totalPaid: number
      totalDue: number
    }>
  }

  // Sync Queue
  syncQueue: {
    getById: AsyncFn<[number], unknown>
    getAll: AsyncFn<[], unknown[]>
    create: AsyncFn<[unknown], number>
    update: AsyncFn<[number, unknown], void>
    delete: AsyncFn<[number], void>
    count: AsyncFn<[], number>
    clear: AsyncFn
    enqueue: AsyncFn<[unknown], number>
    getPending: AsyncFn<[number?], unknown[]>
    getFailed: AsyncFn<[], unknown[]>
    markAsProcessing: AsyncFn<[number], void>
    markAsCompleted: AsyncFn<[number], void>
    markAsFailed: AsyncFn<[number, string], void>
    clearCompleted: AsyncFn<[], void>
    getStats: AsyncFn<[], unknown>
  }
  getLastSyncTime: AsyncFn<[string], string | null>
  setLastSyncTime: AsyncFn<[string, string?], void>
  stockAdjustment: {
    create: AsyncFn<[Omit<StockAdjustment, 'id'>], number>
    getById: AsyncFn<[number], StockAdjustment | undefined>
    getAll: AsyncFn<[StockAdjustmentFilters?], StockAdjustment[]>
    getByProductId: AsyncFn<[number], StockAdjustment[]>
    getPending: AsyncFn<[], StockAdjustment[]>
    markAsSynced: AsyncFn<[number, number], void>
    markAsError: AsyncFn<[number, string], void>
    update: AsyncFn<[number, Partial<StockAdjustment>], void>
    delete: AsyncFn<[number], void>
    count: AsyncFn<[StockAdjustmentFilters?], number>
    clear: AsyncFn<[], void>
    getSummary: AsyncFn<[StockAdjustmentFilters?], StockAdjustmentSummary>
  }
  getDatabaseSize: AsyncFn<[], number>
  vacuum: AsyncFn
  exportData: AsyncFn<[], unknown>

  // General operations
  clearAll: () => Promise<void>
  getMetadata: (key: string) => Promise<string | null>
  setMetadata: (key: string, value: string) => Promise<void>
}

export interface ElectronAPI {
  windowControls?: WindowControls
  secureStore?: {
    get: <T = unknown>(key: string) => Promise<T | null>
    set: (key: string, value: unknown) => Promise<boolean>
    delete: (key: string) => Promise<boolean>
    clear: () => Promise<boolean>
  }
  sqlite?: ElectronSQLiteAPI
  print?: {
    receipt: (url: string, options?: { printerName?: string }) => Promise<PrintInvokeResult>
    receiptHTML: (
      htmlContent: string,
      options?: { printerName?: string }
    ) => Promise<PrintInvokeResult>
    receiptHTMLWithPageSize?: (
      htmlContent: string,
      pageSize: { width: number; height: number },
      options?: { printerName?: string }
    ) => Promise<PrintInvokeResult>
    getPrinters?: () => Promise<RendererPrinterInfo[]>
  }
  getDeviceId?: () => Promise<string>
  getAppInfo?: () => Promise<{
    name: string
    version: string
    platform: NodeJS.Platform
  }>
  onMainProcessMessage: (callback: (message: string) => void) => void
  removeAllListeners: (channel: string) => void

  // Auto-updater API (available in Electron)
  updater?: {
    checkForUpdates: () => Promise<unknown>
    downloadUpdate: () => Promise<unknown>
    quitAndInstall: () => Promise<unknown>
    onUpdateStatus: (
      callback: (payload: {
        status:
          | 'idle'
          | 'checking-for-update'
          | 'update-available'
          | 'update-not-available'
          | 'download-progress'
          | 'update-downloaded'
          | 'update-error'
        data: unknown
      }) => void
    ) => void
    removeUpdateListener?: () => void
  }

  // Image Fetch Proxy (Electron only)
  images?: {
    fetch: (
      url: string,
      headers?: Record<string, string>
    ) => Promise<{ mimeType: string; data: Uint8Array }>
  }
}

export interface PlatformInfo {
  isElectron: boolean
  isMac: boolean
  isWindows: boolean
  isLinux: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    platform?: PlatformInfo
  }
}

export {}
