/**
 * POS Barcode Scanner Hook
 *
 * Specialized hook for barcode scanning in POS workflow
 * Handles cart integration and product/variant/batch detection
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useBarcodeScanner } from './useProductSearch'
import type { QuickBarcodeResult } from '@/types/product-search.types'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

export interface ScannedItem {
  id: number
  type: 'product' | 'variant' | 'batch'
  name: string
  code?: string
  sku?: string
  barcode?: string
  price: number
  stock: number
  image?: string
  // For variants
  variant_name?: string
  product_id?: number
  product_name?: string
  // For batches
  batch_no?: string
  expire_date?: string
  is_expired?: boolean
}

export interface UsePOSBarcodeScannerOptions {
  onItemScanned?: (item: ScannedItem) => void
  onError?: (error: string) => void
  onNotFound?: (barcode: string) => void
  playSound?: boolean
  autoFocus?: boolean
}

// ============================================
// POS Barcode Scanner Hook
// ============================================

/**
 * Hook for POS barcode scanning with cart integration
 *
 * @example
 * const { scanBarcode, isScanning, lastScannedItem, inputRef } = usePOSBarcodeScanner({
 *   onItemScanned: (item) => {
 *     addToCart(item)
 *   }
 * })
 *
 * // In your component
 * <input
 *   ref={inputRef}
 *   onKeyDown={(e) => {
 *     if (e.key === 'Enter') {
 *       scanBarcode(e.currentTarget.value)
 *       e.currentTarget.value = ''
 *     }
 *   }}
 * />
 */
export function usePOSBarcodeScanner(options: UsePOSBarcodeScannerOptions = {}) {
  const { onItemScanned, onError, onNotFound, playSound = true, autoFocus = true } = options

  const [lastScannedItem, setLastScannedItem] = useState<ScannedItem | null>(null)
  const [scanHistory, setScanHistory] = useState<ScannedItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio for beep sound
  useEffect(() => {
    if (playSound && typeof window !== 'undefined') {
      // Web Audio API will be used in playSuccessSound/playErrorSound
      audioRef.current = null // Placeholder for future audio implementation
    }
  }, [playSound])

  // Auto-focus input on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const { scan, isScanning, error } = useBarcodeScanner({
    onSuccess: (result) => {
      const scannedItem = transformBarcodeResult(result)
      setLastScannedItem(scannedItem)
      setScanHistory((prev) => [scannedItem, ...prev.slice(0, 9)]) // Keep last 10

      // Play success sound
      if (playSound) {
        playSuccessSound()
      }

      // Call callback
      onItemScanned?.(scannedItem)

      // Show success toast
      toast.success(`Scanned: ${scannedItem.name}`, {
        description: `Price: ${scannedItem.price} | Stock: ${scannedItem.stock}`,
      })
    },
    onNotFound: (barcode) => {
      // Play error sound
      if (playSound) {
        playErrorSound()
      }

      // Call callback
      onNotFound?.(barcode)

      // Show error toast
      toast.error('Product not found', {
        description: `No product found with barcode: ${barcode}`,
      })
    },
    onError: (err) => {
      // Play error sound
      if (playSound) {
        playErrorSound()
      }

      // Call callback
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      onError?.(errorMessage)

      // Show error toast
      toast.error('Scan failed', {
        description: errorMessage,
      })
    },
  })

  const scanBarcode = useCallback(
    async (barcode: string) => {
      if (!barcode || barcode.trim().length === 0) {
        return
      }

      await scan(barcode.trim())

      // Re-focus input after scan
      if (inputRef.current) {
        inputRef.current.focus()
      }
    },
    [scan]
  )

  const clearHistory = useCallback(() => {
    setScanHistory([])
  }, [])

  return {
    scanBarcode,
    isScanning,
    error,
    lastScannedItem,
    scanHistory,
    clearHistory,
    inputRef,
  }
}

// ============================================
// Helper Functions
// ============================================

function transformBarcodeResult(result: QuickBarcodeResult): ScannedItem {
  if (result.type === 'product') {
    return {
      id: result.data.id,
      type: 'product',
      name: result.data.name,
      code: result.data.code,
      barcode: result.data.barcode,
      price: result.data.sale_price || 0,
      stock: result.data.total_stock || 0,
      image: result.data.image,
    }
  }

  if (result.type === 'variant') {
    return {
      id: result.data.id,
      type: 'variant',
      name: result.data.product_name,
      sku: result.data.sku,
      barcode: result.data.barcode,
      price: result.data.price || 0,
      stock: result.data.total_stock || 0,
      image: result.data.image || result.data.product_image,
      variant_name: result.data.variant_name,
      product_id: result.data.product_id,
      product_name: result.data.product_name,
    }
  }

  // Batch
  return {
    id: result.data.id,
    type: 'batch',
    name: result.data.product_name,
    code: result.data.product_code,
    price: result.data.sale_price || 0,
    stock: result.data.quantity || 0,
    image: result.data.product_image,
    batch_no: result.data.batch_no,
    expire_date: result.data.expire_date,
    is_expired: result.data.is_expired,
    variant_name: result.data.variant_name || undefined,
  }
}

function playSuccessSound() {
  // Simple success beep
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800 // Higher pitch for success
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  } catch (error) {
    // Silently fail if audio context is not available
  }
}

function playErrorSound() {
  // Simple error beep (lower pitch)
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 200 // Lower pitch for error
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  } catch (error) {
    // Silently fail if audio context is not available
  }
}
