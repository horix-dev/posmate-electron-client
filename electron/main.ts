import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'fs'
import Store from 'electron-store'
import { sqliteService } from './sqlite.service'
import { initAutoUpdater, getAutoUpdater } from './autoUpdater'

type FetchImageRequest = {
  url: string
  headers?: Record<string, string>
}

type FetchImageResponse = {
  mimeType: string
  data: Uint8Array
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Initialize electron-store for secure settings
const store = new Store({
  name: 'horix-pos-settings',
  encryptionKey: 'horix-pos-secure-key-2024',
})

// Load environment variables from .env files at runtime
// This ensures locally built apps get the correct channel
function loadEnvFile(envFile: string, options?: { overrideExisting?: boolean }) {
  try {
    const overrideExisting = options?.overrideExisting ?? false

    // Resolve from APP_ROOT if provided; otherwise fall back to project root next to dist-electron
    const baseDir = process.env.APP_ROOT || path.join(__dirname, '..')
    const candidates = [path.join(baseDir, envFile), path.join(process.cwd(), envFile)]

    const envPath = candidates.find((candidate) => fs.existsSync(candidate))
    if (!envPath) return

    const content = fs.readFileSync(envPath, 'utf-8')
    content.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.trim().split('=')
      if (key && !key.startsWith('#')) {
        const value = valueParts.join('=').trim()
        if (!value) return

        if (overrideExisting || !process.env[key]) {
          process.env[key] = value
        }
      }
    })
  } catch (error) {
    // Silently fail if .env file doesn't exist
  }
}

// Establish APP_ROOT early so env loading resolves correctly
process.env.APP_ROOT = path.join(__dirname, '..')

// Configure update channel based on environment
// Priority: UPDATE_CHANNEL env var > .env.local > .env.development > .env.production > default
// .env.local - for local development on developer machines
// .env.development - for QA/testers (built dev releases from CI/CD)
// .env.production - for production releases

// Try .env.local first (local development override)
// NOTE: `.env.local` should override anything set earlier in dev runs.
loadEnvFile('.env.local', { overrideExisting: true })

// If not found, try environment-specific file
if (!process.env.UPDATE_CHANNEL) {
  loadEnvFile(process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development')
}

if (!process.env.UPDATE_CHANNEL) {
  // Fallback: set default based on build type
  process.env.UPDATE_CHANNEL = process.env.NODE_ENV === 'production' ? 'latest' : 'beta'
}

// Helpful startup log to confirm which channel is resolved at runtime
console.log(`[Main] Resolved UPDATE_CHANNEL=${process.env.UPDATE_CHANNEL || 'latest'} (isPackaged=${app.isPackaged})`)

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
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
    icon: path.join(process.env.VITE_PUBLIC, 'posmate.png'),
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
    if (url.startsWith('https:') || url.startsWith('http:')) {
      // Check if it's external (not our dev server or localhost)
      // For simplicity, let's assume all http/https are external for now unless it's a specific window we want
      // But standard window.open('', ...) uses 'about:blank' which doesn't start with http
      shell.openExternal(url)
      return { action: 'deny' }
    }
    // Allow other windows (like about:blank for printing)
    return { action: 'allow' }
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

// ============================================
// Image Fetch Proxy (Bypass Renderer CORS)
// ============================================

function getAllowedImageHosts(): Set<string> {
  const allowed = new Set<string>()

  const addHostFromUrl = (value: string | undefined) => {
    if (!value) return
    try {
      allowed.add(new URL(value).host)
    } catch {
      // ignore invalid URL
    }
  }

  // Primary API base (present in .env.* and loaded by loadEnvFile)
  addHostFromUrl(process.env.VITE_API_BASE_URL)

  // Fallback production host used in src/lib/utils.ts
  addHostFromUrl('https://api.posmate.app')

  return allowed
}

function resolveRequestedUrl(rawUrl: string): URL {
  // Support relative URLs by resolving against the API base.
  if (rawUrl.startsWith('/')) {
    const base = process.env.VITE_API_BASE_URL
    if (!base) {
      throw new Error('Cannot resolve relative URL: missing VITE_API_BASE_URL')
    }
    return new URL(rawUrl, base)
  }
  return new URL(rawUrl)
}

function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) return {}

  // Very small allowlist; expand only if necessary.
  const allowedKeys = new Set(['authorization', 'accept'])
  const out: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase().trim()
    if (!allowedKeys.has(normalizedKey)) continue
    if (typeof value !== 'string') continue
    // Basic size guard
    if (value.length > 8192) continue
    out[normalizedKey] = value
  }

  return out
}

async function fetchWithRedirectChecks(
  initialUrl: URL,
  init: RequestInit,
  allowedHosts: Set<string>,
  maxRedirects = 5
): Promise<Response> {
  let currentUrl = initialUrl

  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(currentUrl, { ...init, redirect: 'manual' })
    const location = res.headers.get('location')

    if (res.status >= 300 && res.status < 400 && location) {
      const nextUrl = new URL(location, currentUrl)
      if (!allowedHosts.has(nextUrl.host)) {
        throw new Error(`Redirect blocked to untrusted host: ${nextUrl.host}`)
      }
      currentUrl = nextUrl
      continue
    }

    return res
  }

  throw new Error('Too many redirects')
}

async function readBodyWithLimit(response: Response, maxBytes: number, onTooLarge: () => void): Promise<Uint8Array> {
  const contentLength = response.headers.get('content-length')
  if (contentLength) {
    const length = Number(contentLength)
    if (Number.isFinite(length) && length > maxBytes) {
      onTooLarge()
      throw new Error('Image too large')
    }
  }

  const body: any = response.body
  const reader = body?.getReader?.()
  if (!reader) {
    const ab = await response.arrayBuffer()
    const bytes = new Uint8Array(ab)
    if (bytes.byteLength > maxBytes) {
      onTooLarge()
      throw new Error('Image too large')
    }
    return bytes
  }

  const chunks: Uint8Array[] = []
  let received = 0
  let done = false

  while (!done) {
    const result = await reader.read()
    done = result.done
    const value = result.value
    if (done) break
    if (!(value instanceof Uint8Array)) continue

    received += value.byteLength
    if (received > maxBytes) {
      onTooLarge()
      throw new Error('Image too large')
    }

    chunks.push(value)
  }

  const out = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

ipcMain.handle('fetch-image', async (_event, request: FetchImageRequest): Promise<FetchImageResponse> => {
  const allowedHosts = getAllowedImageHosts()

  const requestedUrl = resolveRequestedUrl(request?.url)
  if (requestedUrl.protocol !== 'http:' && requestedUrl.protocol !== 'https:') {
    throw new Error('Only http/https URLs are allowed')
  }

  if (!allowedHosts.has(requestedUrl.host)) {
    throw new Error(`Blocked image host: ${requestedUrl.host}`)
  }

  const controller = new AbortController()
  const timeoutMs = 15000
  const maxBytes = 10 * 1024 * 1024 // 10MB
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers = sanitizeHeaders(request?.headers)

    const res = await fetchWithRedirectChecks(
      requestedUrl,
      {
        method: 'GET',
        headers,
        signal: controller.signal,
      },
      allowedHosts
    )

    if (!res.ok) {
      throw new Error(`Failed to fetch image (${res.status})`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new Error(`Unexpected content-type: ${contentType || 'unknown'}`)
    }

    const bytes = await readBodyWithLimit(res, maxBytes, () => controller.abort())
    return {
      mimeType: contentType || 'image/jpeg',
      data: bytes,
    }
  } finally {
    clearTimeout(timer)
  }
})

// Silent printing handler (URL-based)
ipcMain.handle('print-receipt', async (_event, invoiceUrl: string) => {
  try {
    // Create hidden window to load and print the invoice
    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false, // Hidden window
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Load the invoice URL
    await printWindow.loadURL(invoiceUrl)

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Silent print with default printer
    await printWindow.webContents.print(
      {
        silent: true, // No dialog
        printBackground: true,
        deviceName: '', // Use default printer
      },
      (success, errorType) => {
        if (!success) {
          console.error('[Print] Print failed:', errorType)
        }
        // Close the hidden window after printing
        printWindow.close()
      }
    )

    return { success: true }
  } catch (error) {
    console.error('[Print] Error printing receipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

// Silent printing handler (HTML-based) - EXACT copy of working hpos client
ipcMain.on('print-receipt-html', async (event, htmlContent: string) => {
  console.log('🖨️ Print receipt requested')
  
  const printWindow = new BrowserWindow({
    width: 800,
    height: 1200,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'print-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: false, // CRITICAL: Must be false
      sandbox: false,
    },
  })

  try {
    // Load HTML content
    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    )
    console.log('🖨️ Receipt HTML loaded')

    // Wait for content to render
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Get printers
    const printers = await printWindow.webContents.getPrintersAsync()
    const defaultPrinter = printers.find((p) => p.isDefault)
    
    if (!defaultPrinter) {
      console.error('🖨️ No default printer found')
      printWindow.close()
      event.reply('print-receipt-html-result', { success: false, error: 'No default printer found' })
      return
    }

    console.log('🖨️ Printing to:', defaultPrinter.name)
    console.log('🖨️ Available printers:', printers.map(p => `${p.name}${p.isDefault ? ' (default)' : ''}`).join(', '))

    // Print silently
    printWindow.webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: defaultPrinter.name,
        margins: { marginType: 'none' },
        pageSize: { width: 72000, height: 297000 },
        scaleFactor: 100,
      },
      (success, errorType) => {
        if (success) {
          console.log('🖨️ Print successful')
          event.reply('print-receipt-html-result', { success: true })
        } else {
          console.error('🖨️ Print failed:', errorType)
          event.reply('print-receipt-html-result', { success: false, error: errorType })
        }
        printWindow.close()
      }
    )
  } catch (error) {
    console.error('🖨️ Print receipt failed:', error)
    printWindow.close()
    event.reply('print-receipt-html-result', { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Silent printing handler with custom page size for labels
ipcMain.on('print-receipt-html-with-page-size', async (event, htmlContent: string, pageSize: { width: number; height: number }) => {
  console.log('🖨️ Print labels requested with custom page size:', pageSize)
  
  const printWindow = new BrowserWindow({
    width: 800,
    height: 1200,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'print-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: false,
      sandbox: false,
    },
  })

  try {
    // Load HTML content
    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    )
    console.log('🖨️ Label HTML loaded')

    // Wait for content to render
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Get printers
    const printers = await printWindow.webContents.getPrintersAsync()
    const defaultPrinter = printers.find((p) => p.isDefault)
    
    if (!defaultPrinter) {
      console.error('🖨️ No default printer found')
      printWindow.close()
      event.reply('print-receipt-html-result', { success: false, error: 'No default printer found' })
      return
    }

    console.log('🖨️ Printing to:', defaultPrinter.name)

    // Print silently with custom page size
    printWindow.webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: defaultPrinter.name,
        margins: { marginType: 'none' },
        pageSize: pageSize, // Use custom page size (width/height in microns)
        scaleFactor: 100,
      },
      (success, errorType) => {
        if (success) {
          console.log('🖨️ Label print successful')
          event.reply('print-receipt-html-result', { success: true })
        } else {
          console.error('🖨️ Label print failed:', errorType)
          event.reply('print-receipt-html-result', { success: false, error: errorType })
        }
        printWindow.close()
      }
    )
  } catch (error) {
    console.error('🖨️ Label print failed:', error)
    printWindow.close()
    event.reply('print-receipt-html-result', { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
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

app.whenReady().then(() => {
  // Initialize SQLite database
  const result = sqliteService.initialize()
  if (!result.success) {
    console.error('[Main] Failed to initialize SQLite:', result.error)
  }

  createWindow()

  // Initialize auto-updater (only in production)
  if (app.isPackaged && win) {
    initAutoUpdater(win)
  }
})

// Close database when app quits
app.on('before-quit', () => {
  // Cleanup auto-updater
  const updater = getAutoUpdater()
  if (updater) {
    updater.cleanup()
  }

  sqliteService.close()
})

// ============================================
// SQLite IPC Handlers
// ============================================

// Database lifecycle
ipcMain.handle('sqlite:initialize', () => sqliteService.initialize())
ipcMain.handle('sqlite:close', () => sqliteService.close())

// Products
ipcMain.handle('sqlite:product:getById', (_, id: number) => sqliteService.productGetById(id))
ipcMain.handle('sqlite:product:getAll', () => sqliteService.productGetAll())
ipcMain.handle('sqlite:product:create', (_, product) => sqliteService.productCreate(product))
ipcMain.handle('sqlite:product:update', (_, id: number, product) => sqliteService.productUpdate(id, product))
ipcMain.handle('sqlite:product:delete', (_, id: number) => sqliteService.productDelete(id))
ipcMain.handle('sqlite:product:count', () => sqliteService.productCount())
ipcMain.handle('sqlite:product:clear', () => sqliteService.productClear())
ipcMain.handle('sqlite:product:search', (_, query: string) => sqliteService.productSearch(query))
ipcMain.handle('sqlite:product:getByBarcode', (_, barcode: string) => sqliteService.productGetByBarcode(barcode))
ipcMain.handle('sqlite:product:getByCategory', (_, categoryId: number) => sqliteService.productGetByCategory(categoryId))
ipcMain.handle('sqlite:product:getLowStock', (_, threshold?: number) => sqliteService.productGetLowStock(threshold))
ipcMain.handle('sqlite:product:bulkUpsert', (_, products) => sqliteService.productBulkUpsert(products))

// Categories
ipcMain.handle('sqlite:category:getById', (_, id: number) => sqliteService.categoryGetById(id))
ipcMain.handle('sqlite:category:getAll', () => sqliteService.categoryGetAll())
ipcMain.handle('sqlite:category:create', (_, category) => sqliteService.categoryCreate(category))
ipcMain.handle('sqlite:category:update', (_, id: number, category) => sqliteService.categoryUpdate(id, category))
ipcMain.handle('sqlite:category:delete', (_, id: number) => sqliteService.categoryDelete(id))
ipcMain.handle('sqlite:category:count', () => sqliteService.categoryCount())
ipcMain.handle('sqlite:category:clear', () => sqliteService.categoryClear())
ipcMain.handle('sqlite:category:getByName', (_, name: string) => sqliteService.categoryGetByName(name))
ipcMain.handle('sqlite:category:bulkUpsert', (_, categories) => sqliteService.categoryBulkUpsert(categories))

// Parties
ipcMain.handle('sqlite:party:getById', (_, id: number) => sqliteService.partyGetById(id))
ipcMain.handle('sqlite:party:getAll', () => sqliteService.partyGetAll())
ipcMain.handle('sqlite:party:create', (_, party) => sqliteService.partyCreate(party))
ipcMain.handle('sqlite:party:update', (_, id: number, party) => sqliteService.partyUpdate(id, party))
ipcMain.handle('sqlite:party:delete', (_, id: number) => sqliteService.partyDelete(id))
ipcMain.handle('sqlite:party:count', () => sqliteService.partyCount())
ipcMain.handle('sqlite:party:clear', () => sqliteService.partyClear())
ipcMain.handle('sqlite:party:search', (_, query: string) => sqliteService.partySearch(query))
ipcMain.handle('sqlite:party:getByPhone', (_, phone: string) => sqliteService.partyGetByPhone(phone))
ipcMain.handle('sqlite:party:getCustomers', () => sqliteService.partyGetCustomers())
ipcMain.handle('sqlite:party:getSuppliers', () => sqliteService.partyGetSuppliers())
ipcMain.handle('sqlite:party:getWithBalance', () => sqliteService.partyGetWithBalance())
ipcMain.handle('sqlite:party:bulkUpsert', (_, parties) => sqliteService.partyBulkUpsert(parties))

// Sales
ipcMain.handle('sqlite:sale:getById', (_, id: number) => sqliteService.saleGetById(id))
ipcMain.handle('sqlite:sale:getAll', () => sqliteService.saleGetAll())
ipcMain.handle('sqlite:sale:create', (_, sale) => sqliteService.saleCreate(sale))
ipcMain.handle('sqlite:sale:createOffline', (_, sale) => sqliteService.saleCreateOffline(sale))
ipcMain.handle('sqlite:sale:update', (_, id: number, sale) => sqliteService.saleUpdate(id, sale))
ipcMain.handle('sqlite:sale:delete', (_, id: number) => sqliteService.saleDelete(id))
ipcMain.handle('sqlite:sale:count', () => sqliteService.saleCount())
ipcMain.handle('sqlite:sale:clear', () => sqliteService.saleClear())
ipcMain.handle('sqlite:sale:getOffline', () => sqliteService.saleGetOffline())
ipcMain.handle('sqlite:sale:markAsSynced', (_, id: number, serverId?: number) => sqliteService.saleMarkAsSynced(id, serverId))
ipcMain.handle('sqlite:sale:getByInvoiceNumber', (_, invoiceNo: string) => sqliteService.saleGetByInvoiceNumber(invoiceNo))
ipcMain.handle('sqlite:sale:getByDateRange', (_, startDate: string, endDate: string) => sqliteService.saleGetByDateRange(startDate, endDate))
ipcMain.handle('sqlite:sale:getToday', () => sqliteService.saleGetToday())
ipcMain.handle('sqlite:sale:getSummary', (_, startDate: string, endDate: string) => sqliteService.saleGetSummary(startDate, endDate))

// Sync Queue
ipcMain.handle('sqlite:syncQueue:getById', (_, id: number) => sqliteService.syncQueueGetById(id))
ipcMain.handle('sqlite:syncQueue:getAll', () => sqliteService.syncQueueGetAll())
ipcMain.handle('sqlite:syncQueue:create', (_, item) => sqliteService.syncQueueCreate(item))
ipcMain.handle('sqlite:syncQueue:update', (_, id: number, item) => sqliteService.syncQueueUpdate(id, item))
ipcMain.handle('sqlite:syncQueue:delete', (_, id: number) => sqliteService.syncQueueDelete(id))
ipcMain.handle('sqlite:syncQueue:count', () => sqliteService.syncQueueCount())
ipcMain.handle('sqlite:syncQueue:clear', () => sqliteService.syncQueueClear())
ipcMain.handle('sqlite:syncQueue:enqueue', (_, item) => sqliteService.syncQueueEnqueue(item))
ipcMain.handle('sqlite:syncQueue:getPending', (_, limit?: number) => sqliteService.syncQueueGetPending(limit))
ipcMain.handle('sqlite:syncQueue:getFailed', () => sqliteService.syncQueueGetFailed())
ipcMain.handle('sqlite:syncQueue:markAsProcessing', (_, id: number) => sqliteService.syncQueueMarkAsProcessing(id))
ipcMain.handle('sqlite:syncQueue:markAsCompleted', (_, id: number) => sqliteService.syncQueueMarkAsCompleted(id))
ipcMain.handle('sqlite:syncQueue:markAsFailed', (_, id: number, error: string) => sqliteService.syncQueueMarkAsFailed(id, error))
ipcMain.handle('sqlite:syncQueue:clearCompleted', () => sqliteService.syncQueueClearCompleted())
ipcMain.handle('sqlite:syncQueue:getStats', () => sqliteService.syncQueueGetStats())

// Sync Metadata
ipcMain.handle('sqlite:getLastSyncTime', (_, entity: string) => sqliteService.getLastSyncTime(entity))
ipcMain.handle('sqlite:setLastSyncTime', (_, entity: string, timestamp?: string) => sqliteService.setLastSyncTime(entity, timestamp))

// Stock Adjustments
ipcMain.handle('sqlite:stockAdjustment:create', (_, adjustment) => sqliteService.stockAdjustmentCreate(adjustment))
ipcMain.handle('sqlite:stockAdjustment:getById', (_, id: number) => sqliteService.stockAdjustmentGetById(id))
ipcMain.handle('sqlite:stockAdjustment:getAll', (_, filters) => sqliteService.stockAdjustmentGetAll(filters))
ipcMain.handle('sqlite:stockAdjustment:getByProductId', (_, productId: number) => sqliteService.stockAdjustmentGetByProductId(productId))
ipcMain.handle('sqlite:stockAdjustment:getPending', () => sqliteService.stockAdjustmentGetPending())
ipcMain.handle('sqlite:stockAdjustment:markAsSynced', (_, id: number, serverId: number) => sqliteService.stockAdjustmentMarkAsSynced(id, serverId))
ipcMain.handle('sqlite:stockAdjustment:markAsError', (_, id: number, error: string) => sqliteService.stockAdjustmentMarkAsError(id, error))
ipcMain.handle('sqlite:stockAdjustment:update', (_, id: number, adjustment) => sqliteService.stockAdjustmentUpdate(id, adjustment))
ipcMain.handle('sqlite:stockAdjustment:delete', (_, id: number) => sqliteService.stockAdjustmentDelete(id))
ipcMain.handle('sqlite:stockAdjustment:count', (_, filters) => sqliteService.stockAdjustmentCount(filters))
ipcMain.handle('sqlite:stockAdjustment:clear', () => sqliteService.stockAdjustmentClear())
ipcMain.handle('sqlite:stockAdjustment:getSummary', (_, filters) => sqliteService.stockAdjustmentGetSummary(filters))

// Database utilities
ipcMain.handle('sqlite:getDatabaseSize', () => sqliteService.getDatabaseSize())
ipcMain.handle('sqlite:vacuum', () => sqliteService.vacuum())
ipcMain.handle('sqlite:exportData', () => sqliteService.exportData())

// ============================================
// Auto-Update IPC Handlers
// ============================================

ipcMain.handle('updater:checkForUpdates', () => {
  const updater = getAutoUpdater()
  if (updater) {
    updater.checkForUpdatesManual()
  }
})

ipcMain.handle('updater:downloadUpdate', () => {
  const updater = getAutoUpdater()
  if (updater) {
    updater.downloadUpdate()
  }
})

ipcMain.handle('updater:quitAndInstall', () => {
  const updater = getAutoUpdater()
  if (updater) {
    updater.quitAndInstall()
  }
})
