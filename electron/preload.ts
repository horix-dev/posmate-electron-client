import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose Electron API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  // Window Controls
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  },

  // Secure Store
  secureStore: {
    get: (key: string) => ipcRenderer.invoke('secure-store-get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('secure-store-set', key, value),
    delete: (key: string) => ipcRenderer.invoke('secure-store-delete', key),
    clear: () => ipcRenderer.invoke('secure-store-clear'),
  },

  // Receipt Printing
  print: {
    receipt: (invoiceUrl: string) => ipcRenderer.invoke('print-receipt', invoiceUrl),
    receiptHTML: (htmlContent: string) => {
      return new Promise((resolve) => {
        // Send print request
        ipcRenderer.send('print-receipt-html', htmlContent)
        
        // Listen for reply (one-time)
        ipcRenderer.once('print-receipt-html-result', (_event, result) => {
          resolve(result)
        })
      })
    },
  },

  // SQLite Database
  sqlite: {
    // Database lifecycle
    initialize: () => ipcRenderer.invoke('sqlite:initialize'),
    close: () => ipcRenderer.invoke('sqlite:close'),

    // Products
    product: {
      getById: (id: number) => ipcRenderer.invoke('sqlite:product:getById', id),
      getAll: () => ipcRenderer.invoke('sqlite:product:getAll'),
      create: (product: any) => ipcRenderer.invoke('sqlite:product:create', product),
      update: (id: number, product: any) => ipcRenderer.invoke('sqlite:product:update', id, product),
      delete: (id: number) => ipcRenderer.invoke('sqlite:product:delete', id),
      count: () => ipcRenderer.invoke('sqlite:product:count'),
      clear: () => ipcRenderer.invoke('sqlite:product:clear'),
      search: (query: string) => ipcRenderer.invoke('sqlite:product:search', query),
      getByBarcode: (barcode: string) => ipcRenderer.invoke('sqlite:product:getByBarcode', barcode),
      getByCategory: (categoryId: number) => ipcRenderer.invoke('sqlite:product:getByCategory', categoryId),
      getLowStock: (threshold?: number) => ipcRenderer.invoke('sqlite:product:getLowStock', threshold),
      bulkUpsert: (products: any[]) => ipcRenderer.invoke('sqlite:product:bulkUpsert', products),
    },

    // Categories
    category: {
      getById: (id: number) => ipcRenderer.invoke('sqlite:category:getById', id),
      getAll: () => ipcRenderer.invoke('sqlite:category:getAll'),
      create: (category: any) => ipcRenderer.invoke('sqlite:category:create', category),
      update: (id: number, category: any) => ipcRenderer.invoke('sqlite:category:update', id, category),
      delete: (id: number) => ipcRenderer.invoke('sqlite:category:delete', id),
      count: () => ipcRenderer.invoke('sqlite:category:count'),
      clear: () => ipcRenderer.invoke('sqlite:category:clear'),
      getByName: (name: string) => ipcRenderer.invoke('sqlite:category:getByName', name),
      bulkUpsert: (categories: any[]) => ipcRenderer.invoke('sqlite:category:bulkUpsert', categories),
    },

    // Parties
    party: {
      getById: (id: number) => ipcRenderer.invoke('sqlite:party:getById', id),
      getAll: () => ipcRenderer.invoke('sqlite:party:getAll'),
      create: (party: any) => ipcRenderer.invoke('sqlite:party:create', party),
      update: (id: number, party: any) => ipcRenderer.invoke('sqlite:party:update', id, party),
      delete: (id: number) => ipcRenderer.invoke('sqlite:party:delete', id),
      count: () => ipcRenderer.invoke('sqlite:party:count'),
      clear: () => ipcRenderer.invoke('sqlite:party:clear'),
      search: (query: string) => ipcRenderer.invoke('sqlite:party:search', query),
      getByPhone: (phone: string) => ipcRenderer.invoke('sqlite:party:getByPhone', phone),
      getCustomers: () => ipcRenderer.invoke('sqlite:party:getCustomers'),
      getSuppliers: () => ipcRenderer.invoke('sqlite:party:getSuppliers'),
      getWithBalance: () => ipcRenderer.invoke('sqlite:party:getWithBalance'),
      bulkUpsert: (parties: any[]) => ipcRenderer.invoke('sqlite:party:bulkUpsert', parties),
    },

    // Sales
    sale: {
      getById: (id: number) => ipcRenderer.invoke('sqlite:sale:getById', id),
      getAll: () => ipcRenderer.invoke('sqlite:sale:getAll'),
      create: (sale: any) => ipcRenderer.invoke('sqlite:sale:create', sale),
      createOffline: (sale: any) => ipcRenderer.invoke('sqlite:sale:createOffline', sale),
      update: (id: number, sale: any) => ipcRenderer.invoke('sqlite:sale:update', id, sale),
      delete: (id: number) => ipcRenderer.invoke('sqlite:sale:delete', id),
      count: () => ipcRenderer.invoke('sqlite:sale:count'),
      clear: () => ipcRenderer.invoke('sqlite:sale:clear'),
      getOffline: () => ipcRenderer.invoke('sqlite:sale:getOffline'),
      markAsSynced: (id: number, serverId?: number) => ipcRenderer.invoke('sqlite:sale:markAsSynced', id, serverId),
      getByInvoiceNumber: (invoiceNo: string) => ipcRenderer.invoke('sqlite:sale:getByInvoiceNumber', invoiceNo),
      getByDateRange: (startDate: string, endDate: string) => ipcRenderer.invoke('sqlite:sale:getByDateRange', startDate, endDate),
      getToday: () => ipcRenderer.invoke('sqlite:sale:getToday'),
      getSummary: (startDate: string, endDate: string) => ipcRenderer.invoke('sqlite:sale:getSummary', startDate, endDate),
    },

    // Sync Queue
    syncQueue: {
      getById: (id: number) => ipcRenderer.invoke('sqlite:syncQueue:getById', id),
      getAll: () => ipcRenderer.invoke('sqlite:syncQueue:getAll'),
      create: (item: any) => ipcRenderer.invoke('sqlite:syncQueue:create', item),
      update: (id: number, item: any) => ipcRenderer.invoke('sqlite:syncQueue:update', id, item),
      delete: (id: number) => ipcRenderer.invoke('sqlite:syncQueue:delete', id),
      count: () => ipcRenderer.invoke('sqlite:syncQueue:count'),
      clear: () => ipcRenderer.invoke('sqlite:syncQueue:clear'),
      enqueue: (item: any) => ipcRenderer.invoke('sqlite:syncQueue:enqueue', item),
      getPending: (limit?: number) => ipcRenderer.invoke('sqlite:syncQueue:getPending', limit),
      getFailed: () => ipcRenderer.invoke('sqlite:syncQueue:getFailed'),
      markAsProcessing: (id: number) => ipcRenderer.invoke('sqlite:syncQueue:markAsProcessing', id),
      markAsCompleted: (id: number) => ipcRenderer.invoke('sqlite:syncQueue:markAsCompleted', id),
      markAsFailed: (id: number, error: string) => ipcRenderer.invoke('sqlite:syncQueue:markAsFailed', id, error),
      clearCompleted: () => ipcRenderer.invoke('sqlite:syncQueue:clearCompleted'),
      getStats: () => ipcRenderer.invoke('sqlite:syncQueue:getStats'),
    },

    // Sync Metadata
    getLastSyncTime: (entity: string) => ipcRenderer.invoke('sqlite:getLastSyncTime', entity),
    setLastSyncTime: (entity: string, timestamp?: string) => ipcRenderer.invoke('sqlite:setLastSyncTime', entity, timestamp),

    // Stock Adjustments
    stockAdjustment: {
      create: (adjustment: any) => ipcRenderer.invoke('sqlite:stockAdjustment:create', adjustment),
      getById: (id: number) => ipcRenderer.invoke('sqlite:stockAdjustment:getById', id),
      getAll: (filters?: any) => ipcRenderer.invoke('sqlite:stockAdjustment:getAll', filters),
      getByProductId: (productId: number) => ipcRenderer.invoke('sqlite:stockAdjustment:getByProductId', productId),
      getPending: () => ipcRenderer.invoke('sqlite:stockAdjustment:getPending'),
      markAsSynced: (id: number, serverId: number) => ipcRenderer.invoke('sqlite:stockAdjustment:markAsSynced', id, serverId),
      markAsError: (id: number, error: string) => ipcRenderer.invoke('sqlite:stockAdjustment:markAsError', id, error),
      update: (id: number, adjustment: any) => ipcRenderer.invoke('sqlite:stockAdjustment:update', id, adjustment),
      delete: (id: number) => ipcRenderer.invoke('sqlite:stockAdjustment:delete', id),
      count: (filters?: any) => ipcRenderer.invoke('sqlite:stockAdjustment:count', filters),
      clear: () => ipcRenderer.invoke('sqlite:stockAdjustment:clear'),
      getSummary: (filters?: any) => ipcRenderer.invoke('sqlite:stockAdjustment:getSummary', filters),
    },

    // Database utilities
    getDatabaseSize: () => ipcRenderer.invoke('sqlite:getDatabaseSize'),
    vacuum: () => ipcRenderer.invoke('sqlite:vacuum'),
    exportData: () => ipcRenderer.invoke('sqlite:exportData'),
  },

  // Device Info
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Auto-Update
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    onUpdateStatus: (callback: (data: { status: string; data: unknown }) => void) => {
      ipcRenderer.on('update-status', (_event, data) => callback(data))
    },
    removeUpdateListener: () => {
      ipcRenderer.removeAllListeners('update-status')
    },
  },

  // Event listeners
  onMainProcessMessage: (callback: (message: string) => void) => {
    ipcRenderer.on('main-process-message', (_event, message) => callback(message))
  },

  // Cleanup listener
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
})

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  isElectron: true,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
})
