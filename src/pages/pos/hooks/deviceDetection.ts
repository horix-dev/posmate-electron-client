/**
 * Device Detection Utilities for Barcode Scanners
 *
 * This module provides utilities to help identify the source of keyboard input,
 * particularly to distinguish between barcode scanner input and regular keyboard input.
 */

export interface DeviceInputPatterns {
  /** Typical keystroke delay for barcode scanners (1-50ms) */
  SCANNER_DELAY_MIN: number
  SCANNER_DELAY_MAX: number

  /** Typical keystroke delay for human typing (100-300ms) */
  HUMAN_DELAY_MIN: number
  HUMAN_DELAY_MAX: number

  /** Minimum characters for valid barcode */
  MIN_BARCODE_LENGTH: number
}

export const DEVICE_PATTERNS: DeviceInputPatterns = {
  SCANNER_DELAY_MIN: 1,
  SCANNER_DELAY_MAX: 50,
  HUMAN_DELAY_MIN: 100,
  HUMAN_DELAY_MAX: 300,
  MIN_BARCODE_LENGTH: 3,
}

export interface DeviceAnalysis {
  /** Input source (scanner, keyboard, or unknown) */
  source: 'scanner' | 'keyboard' | 'unknown'

  /** Confidence level (0-1) */
  confidence: number

  /** Detailed analysis */
  analysis: {
    avgDelay: number
    allDelaysUnderThreshold: boolean
    hasConsistentTiming: boolean
    lengthSufficient: boolean
  }

  /** Recommendations */
  recommendations: string[]
}

/**
 * Analyze keystroke patterns to determine if input came from a barcode scanner
 */
export function analyzeInputDevice(
  keystrokeDelays: number[],
  charCount: number,
  threshold: number = DEVICE_PATTERNS.SCANNER_DELAY_MAX
): DeviceAnalysis {
  if (keystrokeDelays.length === 0) {
    return {
      source: 'unknown',
      confidence: 0,
      analysis: {
        avgDelay: 0,
        allDelaysUnderThreshold: false,
        hasConsistentTiming: false,
        lengthSufficient: false,
      },
      recommendations: ['Not enough data to analyze'],
    }
  }

  const avgDelay = keystrokeDelays.reduce((a, b) => a + b, 0) / keystrokeDelays.length
  const allDelaysUnderThreshold = keystrokeDelays.every((delay) => delay <= threshold)

  // Calculate variance to check timing consistency
  const variance =
    keystrokeDelays.reduce((sum, delay) => {
      return sum + Math.pow(delay - avgDelay, 2)
    }, 0) / keystrokeDelays.length

  const standardDeviation = Math.sqrt(variance)
  const hasConsistentTiming = standardDeviation < 20 // Low variance = consistent timing

  const lengthSufficient = charCount >= DEVICE_PATTERNS.MIN_BARCODE_LENGTH

  // Determine confidence
  let confidence = 0
  const recommendations: string[] = []

  // Scanner characteristics:
  // 1. All keystrokes very fast (< 50ms)
  // 2. Consistent timing (low variance)
  // 3. Sufficient length

  if (allDelaysUnderThreshold) {
    confidence += 0.5
  } else {
    recommendations.push('Some keystrokes were slower than typical scanner speed')
  }

  if (hasConsistentTiming) {
    confidence += 0.3
  } else {
    recommendations.push('Timing variance suggests manual typing')
  }

  if (lengthSufficient) {
    confidence += 0.2
  } else {
    recommendations.push('Input too short for typical barcode')
  }

  // Determine source
  let source: 'scanner' | 'keyboard' | 'unknown' = 'unknown'

  if (confidence >= 0.7) {
    source = 'scanner'
    recommendations.push('High confidence: Input pattern matches barcode scanner')
  } else if (avgDelay > DEVICE_PATTERNS.HUMAN_DELAY_MIN) {
    source = 'keyboard'
    recommendations.push('Average delay suggests manual keyboard input')
  } else {
    recommendations.push('Unable to determine with high confidence')
  }

  return {
    source,
    confidence,
    analysis: {
      avgDelay,
      allDelaysUnderThreshold,
      hasConsistentTiming,
      lengthSufficient,
    },
    recommendations,
  }
}

/**
 * Format device analysis for console logging
 */
export function formatDeviceAnalysis(analysis: DeviceAnalysis): string {
  const lines = [
    `🔍 Device Analysis`,
    `   Source: ${analysis.source.toUpperCase()} (${Math.round(analysis.confidence * 100)}% confidence)`,
    `   Avg Delay: ${analysis.analysis.avgDelay.toFixed(2)}ms`,
    `   All delays < threshold: ${analysis.analysis.allDelaysUnderThreshold ? '✓' : '✗'}`,
    `   Consistent timing: ${analysis.analysis.hasConsistentTiming ? '✓' : '✗'}`,
    `   Length sufficient: ${analysis.analysis.lengthSufficient ? '✓' : '✗'}`,
  ]

  if (analysis.recommendations.length > 0) {
    lines.push(`   Recommendations:`)
    analysis.recommendations.forEach((rec) => {
      lines.push(`     • ${rec}`)
    })
  }

  return lines.join('\n')
}

/**
 * Get human-readable device type description
 */
export function getDeviceDescription(avgDelay: number, isScannerLikely: boolean): string {
  if (isScannerLikely && avgDelay < DEVICE_PATTERNS.SCANNER_DELAY_MAX) {
    return `Barcode Scanner (avg ${avgDelay.toFixed(0)}ms between keys)`
  } else if (avgDelay > DEVICE_PATTERNS.HUMAN_DELAY_MIN) {
    return `Manual Keyboard (avg ${avgDelay.toFixed(0)}ms between keys)`
  } else {
    return `Unknown Device (avg ${avgDelay.toFixed(0)}ms between keys)`
  }
}

/**
 * Check if browser supports Pointer Events API for better device detection
 */
export function checkPointerEventsSupport(): boolean {
  return typeof window !== 'undefined' && 'PointerEvent' in window
}

/**
 * Get available input device information from the browser
 * Note: This has limited support and may not distinguish between scanners and keyboards
 */
export async function getInputDevices(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    console.warn('[Device Detection] Media Devices API not supported')
    return []
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    // Note: Most barcode scanners appear as HID keyboards and won't show up here
    return devices.filter((device) => device.kind === 'audioinput' || device.kind === 'videoinput')
  } catch (error) {
    console.error('[Device Detection] Failed to enumerate devices:', error)
    return []
  }
}
