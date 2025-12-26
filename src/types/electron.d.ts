// Electron API types exposed via contextBridge

import type {
  StockAdjustment,
  StockAdjustmentFilters,
  StockAdjustmentSummary,
} from '@/types/stockAdjustment.types'

type AsyncFn<Args extends unknown[] = unknown[], Result = unknown> = (
  ...args: Args
) => Promise<Result>

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
}

export interface ElectronAPI {
  windowControls?: WindowControls
  secureStore?: {
    get: <T = unknown>(key: string) => Promise<T | null>
    set: (key: string, value: unknown) => Promise<boolean>
    delete: (key: string) => Promise<boolean>
    clear: () => Promise<boolean>
  }
  print?: {
    receipt: AsyncFn<[string], { success: boolean }>
  }
  sqlite?: ElectronSQLiteAPI
  getDeviceId?: () => Promise<string>
  getAppInfo?: () => Promise<{ name: string; version: string; platform: NodeJS.Platform }>
  updater?: {
    checkForUpdates: AsyncFn
    downloadUpdate: AsyncFn
    quitAndInstall: AsyncFn
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
    removeUpdateListener: () => void
  }
  onMainProcessMessage?: (callback: (message: string) => void) => void
  removeAllListeners?: (channel: string) => void
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
