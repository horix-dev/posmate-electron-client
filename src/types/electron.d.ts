// Electron API types exposed via contextBridge

export interface ElectronAPI {
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
