import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import Store from 'electron-store'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Initialize electron-store for secure settings
const store = new Store({
  name: 'horix-pos-settings',
  encryptionKey: 'horix-pos-secure-key-2024',
})

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    title: 'POSMATE',
    show: false, // Show when ready to prevent visual flash
    frame: false, // Hide native title bar and frame
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Disable sandbox for -webkit-app-region to work
    },
  })

  // Show window when ready
  win.once('ready-to-show', () => {
    win?.show()
    win?.focus()
  })

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open DevTools in development
    win.webContents.openDevTools()
    
    // Handle load failure in development (e.g., simulated offline)
    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.warn(`[Electron] Failed to load: ${errorCode} - ${errorDescription}`)
      
      // Show offline fallback page
      const offlineHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Offline - Horix POS</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                text-align: center;
                padding: 2rem;
                max-width: 500px;
              }
              .icon {
                font-size: 4rem;
                margin-bottom: 1.5rem;
                opacity: 0.8;
              }
              h1 {
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 1rem;
              }
              p {
                color: #a0aec0;
                margin-bottom: 2rem;
                line-height: 1.6;
              }
              button {
                background: #4f46e5;
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 0.5rem;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.2s;
              }
              button:hover {
                background: #4338ca;
              }
              .dev-note {
                margin-top: 2rem;
                padding: 1rem;
                background: rgba(255,255,255,0.1);
                border-radius: 0.5rem;
                font-size: 0.85rem;
                color: #94a3b8;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">📡</div>
              <h1>You're Offline</h1>
              <p>
                Unable to connect to the application server. 
                Please check your internet connection and try again.
              </p>
              <button onclick="location.reload()">Try Again</button>
              <div class="dev-note">
                <strong>Development Mode:</strong><br>
                The Vite dev server at ${VITE_DEV_SERVER_URL} is not reachable.<br>
                In production builds, the app works fully offline.
              </div>
            </div>
          </body>
        </html>
      `
      win?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(offlineHtml)}`)
    })
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus the existing window when trying to open a second instance
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// ============================================
// IPC Handlers
// ============================================

// Window control handlers
ipcMain.on('window-minimize', () => {
  win?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.on('window-close', () => {
  win?.close()
})

ipcMain.handle('window-is-maximized', () => {
  return win?.isMaximized() ?? false
})

// Secure store handlers
ipcMain.handle('secure-store-get', (_event, key: string) => {
  return store.get(key)
})

ipcMain.handle('secure-store-set', (_event, key: string, value: unknown) => {
  store.set(key, value)
  return true
})

ipcMain.handle('secure-store-delete', (_event, key: string) => {
  store.delete(key)
  return true
})

ipcMain.handle('secure-store-clear', () => {
  store.clear()
  return true
})

// Device ID - unique identifier for this installation
ipcMain.handle('get-device-id', () => {
  let deviceId = store.get('deviceId') as string | undefined
  if (!deviceId) {
    deviceId = `D${Date.now().toString(36).toUpperCase()}`
    store.set('deviceId', deviceId)
  }
  return deviceId
})

// App info
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  }
})

// ============================================
// App Ready
// ============================================

app.whenReady().then(createWindow)
