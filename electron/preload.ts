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

  // Device Info
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

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
