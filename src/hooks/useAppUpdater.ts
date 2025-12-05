import { useState, useEffect, useCallback } from 'react'

interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
}

interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

type UpdateStatus =
  | 'idle'
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'update-error'

interface UpdateStatusPayload {
  status: UpdateStatus
  data: UpdateInfo | UpdateProgress | { message: string } | Record<string, unknown>
}

export function useAppUpdater() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<UpdateProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if running in Electron with updater API
    const electronAPI = (window as any).electronAPI
    if (!electronAPI?.updater?.onUpdateStatus) {
      return
    }

    const handleUpdateStatus = (payload: UpdateStatusPayload) => {
      const { status, data } = payload
      setUpdateStatus(status)

      switch (status) {
        case 'checking-for-update':
          setError(null)
          break
        case 'update-available':
          setUpdateInfo(data as UpdateInfo)
          setError(null)
          break
        case 'update-not-available':
          setError(null)
          break
        case 'download-progress':
          setDownloadProgress(data as UpdateProgress)
          break
        case 'update-downloaded':
          setUpdateInfo(data as UpdateInfo)
          setDownloadProgress(null)
          break
        case 'update-error':
          setError((data as { message: string }).message || 'Update failed')
          break
      }
    }

    // Listen for update status from main process
    electronAPI.updater.onUpdateStatus(handleUpdateStatus)

    return () => {
      // Cleanup listener
      electronAPI.updater.removeUpdateListener?.()
    }
  }, [])

  const checkForUpdates = useCallback(() => {
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.updater?.checkForUpdates) {
      setUpdateStatus('checking-for-update')
      electronAPI.updater.checkForUpdates()
    }
  }, [])

  const downloadUpdate = useCallback(() => {
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.updater?.downloadUpdate) {
      electronAPI.updater.downloadUpdate()
    }
  }, [])

  const quitAndInstall = useCallback(() => {
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.updater?.quitAndInstall) {
      electronAPI.updater.quitAndInstall()
    }
  }, [])

  return {
    // Status
    updateStatus,
    updateInfo,
    downloadProgress,
    error,

    // Computed states
    isChecking: updateStatus === 'checking-for-update',
    isUpdateAvailable: updateStatus === 'update-available',
    isDownloading: updateStatus === 'download-progress',
    isUpdateReady: updateStatus === 'update-downloaded',
    hasError: updateStatus === 'update-error',

    // Actions
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
  }
}
