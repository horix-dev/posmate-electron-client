import { memo } from 'react'
import { Keyboard, Scan, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { InputMetadata } from '../hooks/useBarcodeScanner'
import { getDeviceDescription, DEVICE_PATTERNS } from '../hooks/deviceDetection'

// ============================================
// Types
// ============================================

export interface DeviceDetectionDebugProps {
  /** Last input metadata from barcode scanner */
  metadata: InputMetadata | null
  /** Current buffer content */
  buffer: string
  /** Whether scanning is in progress */
  isScanning: boolean
}

// ============================================
// Component
// ============================================

/**
 * Debug component to visualize device detection information
 * Useful for troubleshooting barcode scanner issues
 */
export const DeviceDetectionDebug = memo(function DeviceDetectionDebug({
  metadata,
  buffer,
  isScanning,
}: DeviceDetectionDebugProps) {
  if (!metadata && !isScanning) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            Device Detection Debug
          </CardTitle>
          <CardDescription className="text-xs">
            Start scanning to see device detection information
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const deviceDescription = metadata
    ? getDeviceDescription(metadata.avgKeystrokeDelay, metadata.isScannerLikely)
    : 'Scanning...'

  const getDelayColor = (delay: number) => {
    if (delay <= DEVICE_PATTERNS.SCANNER_DELAY_MAX) {
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
    } else if (delay <= DEVICE_PATTERNS.HUMAN_DELAY_MIN) {
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950'
    } else {
      return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950'
    }
  }

  return (
    <Card className={isScanning ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            {metadata?.isScannerLikely ? (
              <Scan className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Keyboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
            Device Detection
          </span>
          {isScanning && (
            <Badge variant="outline" className="animate-pulse">
              Scanning...
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">{deviceDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Current Buffer */}
        {(isScanning || buffer) && (
          <div>
            <div className="mb-1 font-medium text-muted-foreground">Current Buffer:</div>
            <div className="rounded bg-muted p-2 font-mono">
              {buffer || '(empty)'}
              {isScanning && <span className="animate-pulse">|</span>}
            </div>
          </div>
        )}

        {/* Metadata */}
        {metadata && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 font-medium text-muted-foreground">Avg Delay:</div>
                <Badge className={getDelayColor(metadata.avgKeystrokeDelay)}>
                  {metadata.avgKeystrokeDelay.toFixed(1)}ms
                </Badge>
              </div>
              <div>
                <div className="mb-1 font-medium text-muted-foreground">Char Count:</div>
                <Badge variant="outline">{metadata.charCount}</Badge>
              </div>
            </div>

            <div>
              <div className="mb-1 font-medium text-muted-foreground">Device Type:</div>
              <Badge variant="secondary" className="font-mono">
                {metadata.deviceType || 'unknown'}
              </Badge>
            </div>

            <div>
              <div className="mb-1 font-medium text-muted-foreground">Scanner Likely:</div>
              <Badge
                variant={metadata.isScannerLikely ? 'default' : 'outline'}
                className={
                  metadata.isScannerLikely ? 'bg-green-600 text-white dark:bg-green-500' : ''
                }
              >
                {metadata.isScannerLikely ? 'Yes' : 'No'}
              </Badge>
            </div>

            <div>
              <div className="mb-1 font-medium text-muted-foreground">Timestamp:</div>
              <div className="text-muted-foreground">
                {new Date(metadata.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="rounded border border-dashed p-2">
          <div className="mb-1 font-medium">Detection Thresholds:</div>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-600"></div>
              <span>Scanner: ≤{DEVICE_PATTERNS.SCANNER_DELAY_MAX}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-600"></div>
              <span>
                Uncertain: {DEVICE_PATTERNS.SCANNER_DELAY_MAX + 1}-{DEVICE_PATTERNS.HUMAN_DELAY_MIN}
                ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <span>Keyboard: &gt;{DEVICE_PATTERNS.HUMAN_DELAY_MIN}ms</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default DeviceDetectionDebug
