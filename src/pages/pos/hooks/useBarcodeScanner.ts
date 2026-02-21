import { useEffect, useCallback, useRef, useState } from 'react'

// ============================================
// Types
// ============================================

export interface UseBarcodeInputOptions {
  /** Callback when a barcode is scanned */
  onScan: (barcode: string) => void
  /** Minimum length for a valid barcode */
  minLength?: number
  /** Maximum time between keystrokes in ms */
  maxDelay?: number
  /** Whether the scanner is enabled */
  enabled?: boolean
}

export interface UseBarcodeInputReturn {
  /** Whether a scan is in progress */
  isScanning: boolean
  /** The current buffer of scanned characters */
  buffer: string
  /** Reset the scanner buffer */
  reset: () => void
  /** Last detected input metadata (for debugging) */
  lastInputMetadata: InputMetadata | null
}

export interface InputMetadata {
  /** Average time between keystrokes in milliseconds */
  avgKeystrokeDelay: number
  /** Total characters received */
  charCount: number
  /** Whether input pattern matches typical scanner behavior */
  isScannerLikely: boolean
  /** Input device type from browser API (if available) */
  deviceType?: string
  /** Timestamp of the scan */
  timestamp: number
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook to detect barcode scanner input.
 * Barcode scanners typically input characters very quickly followed by Enter.
 * This hook distinguishes between manual keyboard input and scanner input.
 */
export function useBarcodeScanner({
  onScan,
  minLength = 3,
  maxDelay = 50,
  enabled = true,
}: UseBarcodeInputOptions): UseBarcodeInputReturn {
  const [buffer, setBuffer] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [lastInputMetadata, setLastInputMetadata] = useState<InputMetadata | null>(null)
  const lastKeyTime = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const keystrokeTimings = useRef<number[]>([])
  const scanStartTime = useRef<number>(0)

  const reset = useCallback(() => {
    setBuffer('')
    setIsScanning(false)
    keystrokeTimings.current = []
    scanStartTime.current = 0
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if focus is on an input element (unless it's specifically for barcode)
      const target = event.target as HTMLElement
      const isInputElement =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Allow barcode scanning even in search input with data-barcode-scan attribute
      const allowBarcode = target.getAttribute('data-barcode-scan') === 'true'

      if (isInputElement && !allowBarcode) return

      const now = Date.now()
      const timeDiff = now - lastKeyTime.current
      lastKeyTime.current = now

      // Track scan start time
      if (buffer.length === 0) {
        scanStartTime.current = now
      }

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // If it's Enter key
      if (event.key === 'Enter' || event.key === ' ') {
        // ALWAYS prevent Enter key propagation if we have a buffer from rapid typing
        // This prevents barcode scanner Enter keys from triggering other handlers
        if (buffer.length >= minLength) {
          event.preventDefault()
          event.stopPropagation() // Stop propagation to prevent triggering other Enter handlers

          // Calculate metadata
          const avgDelay =
            keystrokeTimings.current.length > 0
              ? keystrokeTimings.current.reduce((a, b) => a + b, 0) /
                keystrokeTimings.current.length
              : 0

          const metadata: InputMetadata = {
            avgKeystrokeDelay: avgDelay,
            charCount: buffer.length,
            isScannerLikely: avgDelay <= maxDelay && buffer.length >= minLength,
            deviceType:
              'pointerType' in event
                ? (event as unknown as { pointerType?: string }).pointerType || 'unknown'
                : 'unknown',
            timestamp: now,
          }

          setLastInputMetadata(metadata)

          // Log device detection info (can be disabled in production)
          if (process.env.NODE_ENV === 'development') {
            console.log('[Barcode Scanner] Input detected:', {
              buffer,
              metadata,
              keyboardEvent: {
                repeat: event.repeat,
                isTrusted: event.isTrusted,
                location: event.location,
              },
            })
          }

          // Only process the scan if the scanner is enabled
          if (enabled) {
            onScan(buffer)
          }
        }
        reset()
        return
      }

      // Only accept printable characters
      if (event.key.length !== 1) return

      // Track keystroke timing
      if (buffer.length > 0) {
        keystrokeTimings.current.push(timeDiff)
      }

      // If time between keys is short, it's likely a scanner
      if (timeDiff < maxDelay || buffer.length === 0) {
        if (timeDiff < maxDelay && buffer.length > 0) {
          event.preventDefault()
          event.stopPropagation()
        }
        setBuffer((prev) => prev + event.key)
        setIsScanning(true)

        // Set timeout to reset if no more input
        timeoutRef.current = setTimeout(() => {
          // Only process the scan if enabled
          if (enabled && buffer.length >= minLength) {
            const avgDelay =
              keystrokeTimings.current.length > 0
                ? keystrokeTimings.current.reduce((a, b) => a + b, 0) /
                  keystrokeTimings.current.length
                : 0

            const metadata: InputMetadata = {
              avgKeystrokeDelay: avgDelay,
              charCount: buffer.length + 1,
              isScannerLikely: avgDelay <= maxDelay && buffer.length + 1 >= minLength,
              deviceType: 'timeout-triggered',
              timestamp: Date.now(),
            }

            setLastInputMetadata(metadata)

            if (process.env.NODE_ENV === 'development') {
              console.log('[Barcode Scanner] Timeout scan:', {
                buffer: buffer + event.key,
                metadata,
              })
            }

            onScan(buffer + event.key)
          }
          reset()
        }, maxDelay * 2)
      } else {
        // Too slow, reset and start fresh
        setBuffer(event.key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, buffer, minLength, maxDelay, onScan, reset])

  return {
    isScanning,
    buffer,
    reset,
    lastInputMetadata,
  }
}

export default useBarcodeScanner
