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
  const lastKeyTime = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const reset = useCallback(() => {
    setBuffer('')
    setIsScanning(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

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

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // If it's Enter key
      if (event.key === 'Enter') {
        if (buffer.length >= minLength) {
          event.preventDefault()
          event.stopPropagation() // Stop propagation to prevent triggering other Enter handlers
          onScan(buffer)
        }
        reset()
        return
      }

      // Only accept printable characters
      if (event.key.length !== 1) return

      // If time between keys is short, it's likely a scanner
      if (timeDiff < maxDelay || buffer.length === 0) {
        setBuffer((prev) => prev + event.key)
        setIsScanning(true)

        // Set timeout to reset if no more input
        timeoutRef.current = setTimeout(() => {
          if (buffer.length >= minLength) {
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
  }
}

export default useBarcodeScanner
