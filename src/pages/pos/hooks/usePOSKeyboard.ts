import { useEffect, useCallback } from 'react'

// ============================================
// Types
// ============================================

export interface KeyboardShortcut {
  /** Key to trigger (e.g., 'F1', 'Escape', 'p') */
  key: string
  /** Whether Ctrl key must be pressed */
  ctrlKey?: boolean
  /** Whether Alt key must be pressed */
  altKey?: boolean
  /** Whether Shift key must be pressed */
  shiftKey?: boolean
  /** Whether Meta (Cmd) key must be pressed */
  metaKey?: boolean
  /** Callback when shortcut is triggered */
  action: () => void
  /** Description for help display */
  description?: string
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean
}

export interface UsePOSKeyboardOptions {
  /** Array of keyboard shortcuts */
  shortcuts: KeyboardShortcut[]
  /** Whether shortcuts are enabled */
  enabled?: boolean
}

// ============================================
// Default POS Shortcuts
// ============================================

export const POS_SHORTCUT_KEYS = {
  PAY: 'F12',
  HOLD: 'F9',
  RECALL: 'F10',
  CLEAR: 'Escape',
  CUSTOMER: 'F4',
  DISCOUNT: 'F5',
  NEW_SALE: 'F2',
  SEARCH_FOCUS: 'F3',
} as const

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook to handle POS keyboard shortcuts.
 * Provides common shortcuts for POS operations.
 */
export function usePOSKeyboard({
  shortcuts,
  enabled = true,
}: UsePOSKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs (except function keys)
      const target = event.target as HTMLElement
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      const isFunctionKey = event.key.startsWith('F') && event.key.length <= 3

      if (isInputElement && !isFunctionKey && event.key !== 'Escape') {
        return
      }

      // Find matching shortcut
      const matchedShortcut = shortcuts.find((shortcut) => {
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase()
        const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey
        const altMatch = !!shortcut.altKey === event.altKey
        const shiftMatch = !!shortcut.shiftKey === event.shiftKey
        const metaMatch = !!shortcut.metaKey === event.metaKey

        return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch
      })

      if (matchedShortcut) {
        if (matchedShortcut.preventDefault !== false) {
          event.preventDefault()
        }
        matchedShortcut.action()
      }
    },
    [enabled, shortcuts]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

/**
 * Get formatted shortcut key display
 */
export function formatShortcutKey(shortcut: KeyboardShortcut): string {
  const parts: string[] = []

  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.shiftKey) parts.push('Shift')
  if (shortcut.metaKey) parts.push('⌘')

  parts.push(shortcut.key.toUpperCase())

  return parts.join('+')
}

export default usePOSKeyboard
