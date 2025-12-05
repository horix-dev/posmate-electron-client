# Production Deployment & Auto-Update Strategy

This document covers how to deploy your Horix POS Pro application to production and roll out updates to customers automatically.

---

## Table of Contents

1. [Overview](#overview)
2. [Electron Auto-Update Setup](#electron-auto-update-setup)
3. [Deployment Pipeline](#deployment-pipeline)
4. [Update Distribution](#update-distribution)
5. [Version Management](#version-management)
6. [Rollback Strategy](#rollback-strategy)
7. [Testing Updates](#testing-updates)

---

## Overview

### Auto-Update Architecture

```
Your Build Server                     Customer's PC
     ↓                                     ↓
Build new version                    App checks for updates
     ↓                                     ↓
Sign the build                       Downloads update
     ↓                                     ↓
Upload to release server             Verifies signature
     ↓                                     ↓
Update metadata file                 Installs update
     ↓                                     ↓
                                     Restarts app
                                          ↓
                                     New version running! ✅
```

### Supported Update Strategies

1. **Auto-update (Recommended)** - Users get updates automatically
2. **Manual download** - Users download from website
3. **Hybrid** - Auto-update with manual option

---

## Electron Auto-Update Setup

### Step 1: Install Dependencies

```powershell
npm install electron-updater --save
```

### Step 2: Configure package.json

```json
{
  "name": "horix-pos-pro",
  "version": "1.0.0",
  "main": "electron/main.js",
  "build": {
    "appId": "com.horix.pos-pro",
    "productName": "Horix POS Pro",
    "publish": [
      {
        "provider": "github",
        "owner": "itsmahran",
        "repo": "posmate-electron-client",
        "private": true
      }
    ],
    "win": {
      "target": ["nsis"],
      "icon": "public/icon.ico",
      "publisherName": "Horix"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "mac": {
      "category": "public.app-category.business",
      "icon": "public/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "public/icon.png",
      "category": "Office"
    }
  }
}
```

### Step 3: Create Auto-Update Module

Create `electron/autoUpdater.js`:

```javascript
const { autoUpdater } = require('electron-updater')
const { app, dialog, BrowserWindow } = require('electron')
const log = require('electron-log')

// Configure logging
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'
log.info('App starting...')

class AutoUpdateManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow
    this.updateCheckInterval = null
    
    // Configure auto-updater
    autoUpdater.autoDownload = false // Don't download automatically
    autoUpdater.autoInstallOnAppQuit = true // Install when app closes
    
    this.setupListeners()
  }

  setupListeners() {
    // Check for updates when app starts
    app.on('ready', () => {
      // Wait 3 seconds before first check
      setTimeout(() => this.checkForUpdates(), 3000)
      
      // Check every 4 hours
      this.updateCheckInterval = setInterval(() => {
        this.checkForUpdates()
      }, 4 * 60 * 60 * 1000)
    })

    // Update available
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info.version)
      this.sendStatusToWindow('update-available', info)
      
      // Ask user if they want to download
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available!`,
        detail: 'Would you like to download it now? The update will be installed when you close the app.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
    })

    // No update available
    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available')
      this.sendStatusToWindow('update-not-available', info)
    })

    // Update error
    autoUpdater.on('error', (err) => {
      log.error('Update error:', err)
      this.sendStatusToWindow('update-error', err)
    })

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      let message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`
      log.info(message)
      this.sendStatusToWindow('download-progress', progressObj)
    })

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded')
      this.sendStatusToWindow('update-downloaded', info)
      
      // Notify user
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update has been downloaded.',
        detail: 'The update will be installed when you close the application.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      })
    })
  }

  checkForUpdates() {
    autoUpdater.checkForUpdates()
  }

  sendStatusToWindow(status, data) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('update-status', { status, data })
    }
  }

  cleanup() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
    }
  }
}

module.exports = AutoUpdateManager
```

### Step 4: Update Main Process

Update `electron/main.js`:

```javascript
const { app, BrowserWindow } = require('electron')
const path = require('path')
const AutoUpdateManager = require('./autoUpdater')

let mainWindow
let autoUpdateManager

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Initialize auto-updater (only in production)
  if (app.isPackaged) {
    autoUpdateManager = new AutoUpdateManager(mainWindow)
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (autoUpdateManager) {
    autoUpdateManager.cleanup()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

### Step 5: Frontend Integration

Create `src/hooks/useAppUpdater.ts`:

```typescript
import { useState, useEffect } from 'react'

interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export function useAppUpdater() {
  const [updateStatus, setUpdateStatus] = useState<string>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<UpdateProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if running in Electron
    if (!(window as any).electronAPI?.onUpdateStatus) {
      return
    }

    const handleUpdateStatus = (event: any, { status, data }: any) => {
      setUpdateStatus(status)

      switch (status) {
        case 'update-available':
          setUpdateInfo(data)
          break
        case 'update-not-available':
          // Silently handle
          break
        case 'download-progress':
          setDownloadProgress(data)
          break
        case 'update-downloaded':
          setUpdateInfo(data)
          break
        case 'update-error':
          setError(data.message || 'Update failed')
          break
      }
    }

    // Listen for update status
    ;(window as any).electronAPI.onUpdateStatus(handleUpdateStatus)

    return () => {
      // Cleanup listener if possible
    }
  }, [])

  const checkForUpdates = () => {
    if ((window as any).electronAPI?.checkForUpdates) {
      ;(window as any).electronAPI.checkForUpdates()
    }
  }

  return {
    updateStatus,
    updateInfo,
    downloadProgress,
    error,
    checkForUpdates,
    isUpdateAvailable: updateStatus === 'update-available',
    isDownloading: updateStatus === 'download-progress',
    isUpdateReady: updateStatus === 'update-downloaded',
  }
}
```

Create update notification component `src/components/common/UpdateNotification.tsx`:

```typescript
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Download, CheckCircle } from 'lucide-react'
import { useAppUpdater } from '@/hooks/useAppUpdater'
import { Progress } from '@/components/ui/progress'

export function UpdateNotification() {
  const {
    updateStatus,
    updateInfo,
    downloadProgress,
    isUpdateAvailable,
    isDownloading,
    isUpdateReady,
  } = useAppUpdater()

  useEffect(() => {
    if (isUpdateAvailable && updateInfo) {
      toast.info(`Update Available: v${updateInfo.version}`, {
        description: 'A new version is available. Check the notification for details.',
        duration: 10000,
      })
    }
  }, [isUpdateAvailable, updateInfo])

  useEffect(() => {
    if (isUpdateReady && updateInfo) {
      toast.success(`Update Ready: v${updateInfo.version}`, {
        description: 'The update will be installed when you close the app.',
        duration: Infinity,
      })
    }
  }, [isUpdateReady, updateInfo])

  if (isDownloading && downloadProgress) {
    return (
      <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg w-80">
        <div className="flex items-center gap-2 mb-2">
          <Download className="h-4 w-4 animate-pulse" />
          <span className="font-medium">Downloading Update</span>
        </div>
        <Progress value={downloadProgress.percent} className="mb-2" />
        <p className="text-xs text-muted-foreground">
          {Math.round(downloadProgress.percent)}% - {Math.round(downloadProgress.bytesPerSecond / 1024)} KB/s
        </p>
      </div>
    )
  }

  return null
}
```

Add to `App.tsx`:

```typescript
import { UpdateNotification } from '@/components/common/UpdateNotification'

export function App() {
  return (
    <>
      {/* Your app content */}
      <UpdateNotification />
    </>
  )
}
```

---

## Deployment Pipeline

### Option 1: GitHub Releases (Free, Recommended)

#### Step 1: Configure GitHub Secrets

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Add secret: `GH_TOKEN` (Personal Access Token with repo access)

#### Step 2: Create Release Workflow

`.github/workflows/release.yml`:

```yaml
name: Build & Release

on:
  push:
    tags:
      - 'v*.*.*'  # Trigger on version tags like v1.0.0

jobs:
  release:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Build Electron app & release
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: npm run electron:build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: release-${{ matrix.os }}
          path: |
            dist-electron/*.exe
            dist-electron/*.dmg
            dist-electron/*.AppImage
            dist-electron/*.deb
```

#### Step 3: Release Process

```powershell
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Commit and tag
git add .
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin main --tags

# 3. GitHub Actions will automatically:
#    - Build for Windows, Mac, Linux
#    - Create GitHub release
#    - Upload installers
#    - Generate update manifest
```

### Option 2: Self-Hosted Server

If you want more control:

```javascript
// In package.json
{
  "build": {
    "publish": [
      {
        "provider": "generic",
        "url": "https://updates.yourcompany.com/releases"
      }
    ]
  }
}
```

Create update server:

```javascript
// server.js
const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 3000

// Serve latest.yml or latest-mac.yml
app.get('/releases/latest.yml', (req, res) => {
  res.sendFile(path.join(__dirname, 'releases/latest.yml'))
})

// Serve update files
app.use('/releases', express.static('releases'))

app.listen(PORT, () => {
  console.log(`Update server running on port ${PORT}`)
})
```

---

## Update Distribution

### Version Manifest (auto-generated)

When you build with `electron-builder`, it creates `latest.yml`:

```yaml
version: 1.0.1
files:
  - url: Horix-POS-Pro-Setup-1.0.1.exe
    sha512: [hash]
    size: 85000000
path: Horix-POS-Pro-Setup-1.0.1.exe
sha512: [hash]
releaseDate: '2025-12-04T10:30:00.000Z'
```

### Update Flow

```
1. App starts → Check for updates
2. Compare local version vs server version
3. If new version available → Notify user
4. User clicks "Download" → Download update
5. Download complete → Show "Update Ready"
6. User closes app → Install update automatically
7. App restarts with new version ✅
```

---

## Version Management

### Semantic Versioning

Use semantic versioning: `MAJOR.MINOR.PATCH`

```
1.0.0 → Initial release
1.0.1 → Bug fixes (patch)
1.1.0 → New features (minor)
2.0.0 → Breaking changes (major)
```

### Update package.json

```powershell
# Patch (1.0.0 → 1.0.1)
npm version patch

# Minor (1.0.0 → 1.1.0)
npm version minor

# Major (1.0.0 → 2.0.0)
npm version major
```

### Release Notes

Create `CHANGELOG.md`:

```markdown
# Changelog

## [1.0.1] - 2025-12-04

### Fixed
- Fixed product image caching issue
- Resolved offline sync bug

### Improved
- Faster startup time
- Better error messages

## [1.0.0] - 2025-12-01

### Added
- Initial release
- POS functionality
- Product management
- Offline support
```

---

## Rollback Strategy

### If Update Has Issues

#### Option 1: Release Hotfix

```powershell
# Fix the bug
git checkout main
# Make fixes...
git commit -m "fix: critical bug in 1.0.1"

# Release hotfix
npm version patch  # 1.0.1 → 1.0.2
git push origin main --tags
```

#### Option 2: Revert to Previous Version

```powershell
# Delete bad release from GitHub
gh release delete v1.0.1

# Users on v1.0.0 won't see the bad update
# Users on v1.0.1 can manually download v1.0.0
```

#### Option 3: Emergency Rollback

In your update server, change `latest.yml` to point to previous version:

```yaml
version: 1.0.0  # Roll back to stable version
files:
  - url: Horix-POS-Pro-Setup-1.0.0.exe
```

---

## Testing Updates

### Test Environment Setup

```powershell
# 1. Build test version
npm version prerelease --preid=beta
# Version becomes: 1.0.1-beta.0

# 2. Build and release
npm run electron:build

# 3. Test on clean machine
# Install beta version
# Verify update mechanism works
```

### Beta Channel

Configure different channels:

```javascript
// In autoUpdater.js
if (process.env.UPDATE_CHANNEL === 'beta') {
  autoUpdater.channel = 'beta'
} else {
  autoUpdater.channel = 'latest'
}
```

In `package.json`:

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "itsmahran",
        "repo": "posmate-electron-client",
        "channel": "latest"
      }
    ]
  }
}
```

### Testing Checklist

```
☐ Build new version locally
☐ Test on Windows
☐ Test on Mac (if supported)
☐ Test on Linux (if supported)
☐ Verify update downloads
☐ Verify update installs
☐ Verify app restarts successfully
☐ Test rollback scenario
☐ Verify offline mode still works
☐ Check database migrations
☐ Verify API compatibility
```

---

## Best Practices

### 1. Gradual Rollout

Release to small group first:

```javascript
// Only update if random check passes (10% of users)
if (Math.random() < 0.1) {
  autoUpdater.checkForUpdates()
}
```

### 2. Forced Updates

For critical security fixes:

```javascript
autoUpdater.on('update-available', (info) => {
  if (info.criticalUpdate) {
    // Force update, no "Later" button
    dialog.showMessageBox({
      type: 'warning',
      title: 'Critical Update Required',
      message: 'A critical security update must be installed.',
      buttons: ['Update Now']
    }).then(() => {
      autoUpdater.downloadUpdate()
    })
  }
})
```

### 3. Database Migrations

```typescript
// In src/lib/migrations/index.ts
export async function runMigrations(fromVersion: string, toVersion: string) {
  const currentVersion = fromVersion.split('.').map(Number)
  const targetVersion = toVersion.split('.').map(Number)

  // Run migrations in order
  if (currentVersion[0] < 1 || currentVersion[1] < 1) {
    await migration_1_0_to_1_1()
  }
  
  if (currentVersion[0] < 1 || currentVersion[1] < 2) {
    await migration_1_1_to_1_2()
  }
  
  // Save new version
  await storage.settings.set('app_version', toVersion)
}
```

### 4. Backup Before Update

```javascript
autoUpdater.on('update-downloaded', async () => {
  // Backup database before update
  await backupDatabase()
  
  // Then proceed with update
  dialog.showMessageBox({...})
})
```

---

## Monitoring & Analytics

Track update success rate:

```typescript
// src/lib/analytics/updateTracking.ts
export function trackUpdateEvent(event: string, data?: any) {
  // Send to your analytics service
  fetch('https://api.yourcompany.com/analytics/update', {
    method: 'POST',
    body: JSON.stringify({
      event,
      version: app.getVersion(),
      platform: process.platform,
      data,
      timestamp: new Date().toISOString()
    })
  })
}

// Use in autoUpdater.js
autoUpdater.on('update-available', (info) => {
  trackUpdateEvent('update_available', { version: info.version })
})

autoUpdater.on('update-downloaded', (info) => {
  trackUpdateEvent('update_downloaded', { version: info.version })
})

autoUpdater.on('error', (err) => {
  trackUpdateEvent('update_error', { error: err.message })
})
```

---

## Summary

✅ **Auto-updates configured** - Users get updates automatically  
✅ **GitHub Releases** - Free hosting for your installers  
✅ **Version management** - Semantic versioning with git tags  
✅ **Rollback strategy** - Can revert to previous version  
✅ **Testing process** - Beta channel for testing  
✅ **Monitoring** - Track update success rates  

Your customers will receive updates automatically without needing to manually download and install! 🚀

---

**Next Steps:**
1. Implement auto-updater code above
2. Set up GitHub Actions for releases
3. Test update process locally
4. Release v1.0.0 to production
5. Test auto-update with v1.0.1

