import { useEffect } from 'react'
import { toast } from 'sonner'
import { Download, RefreshCw, CheckCircle } from 'lucide-react'
import { useAppUpdater } from '@/hooks/useAppUpdater'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

export function UpdateNotification() {
  const {
    updateInfo,
    downloadProgress,
    error,
    isUpdateAvailable,
    isDownloading,
    isUpdateReady,
    hasError,
    downloadUpdate,
    quitAndInstall,
  } = useAppUpdater()

  // Show toast when update is available
  useEffect(() => {
    if (isUpdateAvailable && updateInfo) {
      toast.info(`Update Available: v${updateInfo.version}`, {
        description: 'A new version is available. Click the download button to update.',
        duration: 10000,
        action: {
          label: 'Download',
          onClick: downloadUpdate,
        },
      })
    }
  }, [isUpdateAvailable, updateInfo, downloadUpdate])

  // Show toast when update is ready
  useEffect(() => {
    if (isUpdateReady && updateInfo) {
      toast.success(`Update Ready: v${updateInfo.version}`, {
        description: 'Restart now to complete the update.',
        duration: Infinity,
        action: {
          label: 'Restart',
          onClick: quitAndInstall,
        },
      })
    }
  }, [isUpdateReady, updateInfo, quitAndInstall])

  // Show error toast
  useEffect(() => {
    if (hasError && error) {
      toast.error('Update Error', {
        description: error,
        duration: 5000,
      })
    }
  }, [hasError, error])

  // Show download progress indicator
  if (isDownloading && downloadProgress) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-background p-4 shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <Download className="h-4 w-4 animate-pulse text-primary" />
          <span className="font-medium">Downloading Update</span>
        </div>
        <Progress value={downloadProgress.percent} className="mb-2" />
        <p className="text-xs text-muted-foreground">
          {Math.round(downloadProgress.percent)}% -{' '}
          {Math.round(downloadProgress.bytesPerSecond / 1024)} KB/s
        </p>
      </div>
    )
  }

  // Show update ready indicator
  if (isUpdateReady && updateInfo) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-green-500/20 bg-green-500/10 p-4 shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="font-medium">Update Ready</span>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Version {updateInfo.version} is ready to install.
        </p>
        <Button size="sm" onClick={quitAndInstall} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Restart Now
        </Button>
      </div>
    )
  }

  return null
}

// Smaller badge-style indicator for use in header/navbar
export function UpdateBadge() {
  const { isUpdateAvailable, isUpdateReady, updateInfo, quitAndInstall, downloadUpdate } =
    useAppUpdater()

  if (isUpdateReady) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={quitAndInstall}
        className="h-8 gap-2 border-green-500/50 bg-green-500/10 text-green-600 hover:bg-green-500/20"
      >
        <RefreshCw className="h-3 w-3" />
        <span className="text-xs">Update Ready</span>
      </Button>
    )
  }

  if (isUpdateAvailable && updateInfo) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={downloadUpdate}
        className="h-8 gap-2 border-blue-500/50 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
      >
        <Download className="h-3 w-3" />
        <span className="text-xs">v{updateInfo.version}</span>
      </Button>
    )
  }

  return null
}
