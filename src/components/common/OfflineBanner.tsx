import { useState, useEffect } from 'react'
import { WifiOff, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OfflineBannerProps {
  className?: string
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setIsDismissed(false) // Reset dismiss when coming back online
    }
    
    const handleOffline = () => {
      setIsOffline(true)
      setIsDismissed(false) // Show banner again when going offline
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline || isDismissed) {
    return null
  }

  const handleRetry = () => {
    // Force a connection check by trying to reload
    window.location.reload()
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 bg-yellow-500/90 px-4 py-2 text-sm text-yellow-950',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span className="font-medium">You are offline</span>
        <span className="hidden sm:inline">
          — Working with cached data. Changes will sync when connection is restored.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-yellow-950 hover:bg-yellow-600/20 hover:text-yellow-950"
          onClick={handleRetry}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-yellow-950 hover:bg-yellow-600/20 hover:text-yellow-950"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  )
}

export default OfflineBanner
