# Silent Printing Solution - Bypassing Windows Print Dialog

## Problem Summary

Electron's `webContents.print({ silent: true })` was showing the Windows print dialog despite the `silent: true` flag. This violated the offline-first POS requirement for seamless receipt printing.

## Root Cause

The issue was caused by **IPC communication pattern** and **context isolation settings**, not the print API itself.

## The Solution

### Critical Changes That Made It Work

#### 1. **Use `ipcMain.on` Instead of `ipcMain.handle`**

**❌ What Didn't Work:**
```typescript
// electron/main.ts
ipcMain.handle('print-receipt-html', async (_event, htmlContent: string) => {
  // ... print logic
  return { success: true }
})

// electron/preload.ts
receiptHTML: (htmlContent: string) => ipcRenderer.invoke('print-receipt-html', htmlContent)
```

**✅ What Worked:**
```typescript
// electron/main.ts
ipcMain.on('print-receipt-html', async (event, htmlContent: string) => {
  // ... print logic
  event.reply('print-receipt-html-result', { success: true })
})

// electron/preload.ts
receiptHTML: (htmlContent: string) => {
  return new Promise((resolve) => {
    ipcRenderer.send('print-receipt-html', htmlContent)
    ipcRenderer.once('print-receipt-html-result', (_event, result) => {
      resolve(result)
    })
  })
}
```

**Why This Matters:**
- `ipcMain.handle` creates a synchronous request-response pattern that can block the print callback
- `ipcMain.on` + `event.reply` allows the print operation to complete asynchronously without blocking

#### 2. **Set `contextIsolation: false`**

**❌ What Didn't Work:**
```typescript
const printWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,  // ❌ Blocked silent printing
    sandbox: false,
  },
})
```

**✅ What Worked:**
```typescript
const printWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'print-preload.cjs'),
    nodeIntegration: false,
    contextIsolation: false,  // ✅ Required for silent printing
    sandbox: false,
  },
})
```

**Why This Matters:**
- With `contextIsolation: true`, Electron's print subsystem cannot properly suppress the system print dialog
- `contextIsolation: false` allows the preload script to directly modify the window context
- Security tradeoff acceptable for hidden print windows (never exposed to user)

#### 3. **Use Preload Script to Block `window.print()`**

**print-preload.js:**
```javascript
(function disableWindowPrint() {
  try {
    Object.defineProperty(window, 'print', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function () {
        console.log('window.print() blocked in hidden print worker');
      }
    });
  } catch (error) {
    console.warn('Unable to override window.print in print worker:', error);
  }
})();
```

**Why This Matters:**
- Prevents any JavaScript in the loaded HTML from triggering `window.print()`
- `window.print()` always shows the native OS dialog, regardless of Electron settings
- Must be blocked at preload stage before content loads

## Complete Working Implementation

### electron/main.ts
```typescript
ipcMain.on('print-receipt-html', async (event, htmlContent: string) => {
  console.log('🖨️ Print receipt requested')
  
  const printWindow = new BrowserWindow({
    width: 800,
    height: 1200,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'print-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: false, // CRITICAL
      sandbox: false,
    },
  })

  try {
    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    )
    
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const printers = await printWindow.webContents.getPrintersAsync()
    const defaultPrinter = printers.find((p) => p.isDefault)
    
    if (!defaultPrinter) {
      printWindow.close()
      event.reply('print-receipt-html-result', { 
        success: false, 
        error: 'No printer available' 
      })
      return
    }

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
        printWindow.close()
        event.reply('print-receipt-html-result', { 
          success, 
          error: errorType 
        })
      }
    )
  } catch (error) {
    printWindow.close()
    event.reply('print-receipt-html-result', { 
      success: false, 
      error: error.message 
    })
  }
})
```

### electron/preload.ts
```typescript
print: {
  receiptHTML: (htmlContent: string) => {
    return new Promise((resolve) => {
      ipcRenderer.send('print-receipt-html', htmlContent)
      ipcRenderer.once('print-receipt-html-result', (_event, result) => {
        resolve(result)
      })
    })
  },
}
```

### electron/print-preload.js
```javascript
(function disableWindowPrint() {
  try {
    Object.defineProperty(window, 'print', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function () {
        console.log('window.print() blocked in hidden print worker');
      }
    });
  } catch (error) {
    console.warn('Unable to override window.print in print worker:', error);
  }
})();
```

## What Didn't Work (Failed Attempts)

### ❌ Attempt 1: Using `contextIsolation: true` with `executeJavaScript`
```typescript
await printWindow.webContents.executeJavaScript(`
  window.print = function() { console.log('blocked'); };
`)
```
**Result:** Dialog still appeared. JavaScript injection too late.

### ❌ Attempt 2: PowerShell WMI Printer Configuration
```powershell
$printer.RawProperties["PrintDialogs"] = "0"
$printer.RawProperties["SuppressUI"] = "1"
```
**Result:** Properties not supported by thermal printer driver.

### ❌ Attempt 3: Registry Modifications
```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\...\POS-80C" -Name "PrintDialogs" -Value 0
```
**Result:** Required admin privileges, driver-specific, unreliable.

## Key Takeaways

1. **IPC Pattern Matters**: `ipcMain.on` + `event.reply` is required for async print operations
2. **Context Isolation Must Be Disabled**: `contextIsolation: false` for print windows only
3. **Preload Script Required**: Must block `window.print()` before content loads
4. **Hidden Window**: `show: false` prevents visual flash
5. **Timing**: 1500ms delay ensures content fully renders before printing

## Testing Verification

✅ **Confirmed Working:**
- No print dialog appears
- Receipt prints silently to thermal printer (POS-80C)
- Works on Windows 10/11
- No user interaction required
- Print callback returns success: true

## Security Note

`contextIsolation: false` is generally a security risk, but acceptable here because:
1. Print window is **never shown** to user
2. Only loads **trusted HTML content** (generated by our app)
3. Window is **immediately closed** after printing
4. No external URLs or user input

## References

- Working implementation: `D:\Projects\pos-pro-final\client\main.js` (hpos client)
- Electron Print Documentation: https://www.electronjs.org/docs/api/web-contents#contentsprintoptions-callback
- Context Isolation: https://www.electronjs.org/docs/tutorial/context-isolation

---

**Date:** January 11, 2026  
**Status:** ✅ Verified Working  
**Tested On:** Windows 11, POS-80C Thermal Printer
