import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { app, dialog, BrowserWindow } from 'electron'
import log from 'electron-log'

// Configure logging
autoUpdater.logger = log
log.transports.file.level = 'info'

// Configure update channel based on environment
const updateChannel = process.env.UPDATE_CHANNEL || 'latest'
if (process.env.UPDATE_CHANNEL) {
  log.info(`Setting update channel to: ${updateChannel}`)
  autoUpdater.channel = updateChannel
}

log.info(`Auto-updater initialized with channel: ${autoUpdater.channel || 'latest'}`)


export class AutoUpdateManager {
  private mainWindow: BrowserWindow | null
  private updateCheckInterval: NodeJS.Timeout | null = null

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow

    // Configure auto-updater
    autoUpdater.autoDownload = false // Don't download automatically
    autoUpdater.autoInstallOnAppQuit = true // Install when app closes

    this.setupListeners()
    this.startUpdateChecks()
  }

  private startUpdateChecks() {
    // Wait 30 seconds after app starts before first check (give app time to initialize)
    setTimeout(() => this.checkForUpdates(), 30000)

    // Check every 4 hours
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates()
    }, 4 * 60 * 60 * 1000)
  }

  private setupListeners() {
    // Update available
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      log.info('Update available:', info.version)
      this.sendStatusToWindow('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      })

      // Ask user if they want to download
      if (this.mainWindow) {
        dialog
          .showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available!`,
            detail:
              'Would you like to download it now? The update will be installed when you close the app.',
            buttons: ['Download', 'Later'],
            defaultId: 0,
            cancelId: 1,
          })
          .then((result) => {
            if (result.response === 0) {
              autoUpdater.downloadUpdate()
            }
          })
      }
    })

    // No update available
    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      log.info('Update not available. Current version is latest.')
      this.sendStatusToWindow('update-not-available', { version: info.version })
    })

    // Update error
    autoUpdater.on('error', (err: Error) => {
      log.error('Update error:', err.message)
      
      // Handle common error cases gracefully
      const errorMessage = err.message.toLowerCase()
      
      // No published versions on channel (common for beta/new releases)
      if (errorMessage.includes('no published versions')) {
        log.info('No releases available on current channel yet. This is normal for new builds.')
        this.sendStatusToWindow('update-not-available', { 
          version: app.getVersion(),
          message: 'No updates available yet on this channel'
        })
      } 
      // GitHub API 406 error or other API issues (no production release exists)
      else if (errorMessage.includes('406') || errorMessage.includes('unable to find latest version')) {
        log.info('No releases found on GitHub for this channel. App will continue to work offline.')
        this.sendStatusToWindow('update-not-available', { 
          version: app.getVersion(),
          message: 'Update server not yet available'
        })
      }
      // Network errors (offline, firewall, etc)
      else if (errorMessage.includes('enotfound') || errorMessage.includes('econnrefused')) {
        log.info('Network error checking for updates. Will retry later.')
        // Don't send error to window for network issues - user will see offline indicator
      }
      // Other errors - log but don't show to user unless they manually check
      else {
        log.error('Update check failed:', err.message)
        // Only send to window if user manually triggered the check
        // Automatic checks will just log silently
      }
    })

    // Download progress
    autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
      const message = `Download speed: ${Math.round(progressObj.bytesPerSecond / 1024)} KB/s - Downloaded ${Math.round(progressObj.percent)}%`
      log.info(message)
      this.sendStatusToWindow('download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      })
    })

    // Update downloaded
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      log.info('Update downloaded:', info.version)
      this.sendStatusToWindow('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
      })

      // Notify user
      if (this.mainWindow) {
        dialog
          .showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Update Ready',
            message: 'Update has been downloaded.',
            detail: 'The update will be installed when you close the application. Restart now?',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1,
          })
          .then((result) => {
            if (result.response === 0) {
              autoUpdater.quitAndInstall(false, true)
            }
          })
      }
    })

    // Checking for update
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...')
      this.sendStatusToWindow('checking-for-update', {})
    })
  }

  public checkForUpdates() {
    log.info('Checking for updates...')
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Error checking for updates:', err)
    })
  }

  // Manual check triggered by user from settings
  public checkForUpdatesManual() {
    log.info('Manual update check requested')
    autoUpdater.checkForUpdates().then((result) => {
      if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
        if (this.mainWindow) {
          dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'No Updates Available',
            message: 'You are using the latest version.',
            detail: `Current version: ${app.getVersion()}`,
            buttons: ['OK'],
          })
        }
      }
    }).catch((err: Error) => {
      log.error('Manual update check failed:', err.message)
      
      // Show user-friendly error messages for manual checks
      const errorMessage = err.message.toLowerCase()
      let userMessage = 'Please check your internet connection and try again.'
      
      if (errorMessage.includes('406') || errorMessage.includes('unable to find latest version')) {
        userMessage = 'No release versions are available yet. Please try again later.'
      } else if (errorMessage.includes('enotfound') || errorMessage.includes('econnrefused')) {
        userMessage = 'Could not reach update server. Please check your internet connection.'
      }
      
      if (this.mainWindow) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Unable to Check for Updates',
          message: 'Could not check for updates right now.',
          detail: userMessage,
          buttons: ['OK'],
        })
      }
    })
  }

  public downloadUpdate() {
    autoUpdater.downloadUpdate()
  }

  public quitAndInstall() {
    autoUpdater.quitAndInstall(false, true)
  }

  private sendStatusToWindow(status: string, data: Record<string, unknown>) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('update-status', { status, data })
    }
  }

  public cleanup() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
      this.updateCheckInterval = null
    }
  }

  public setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window
  }
}

// Export singleton instance holder
let autoUpdateManager: AutoUpdateManager | null = null

export function initAutoUpdater(mainWindow: BrowserWindow | null): AutoUpdateManager {
  if (!autoUpdateManager) {
    autoUpdateManager = new AutoUpdateManager(mainWindow)
  }
  return autoUpdateManager
}

export function getAutoUpdater(): AutoUpdateManager | null {
  return autoUpdateManager
}
