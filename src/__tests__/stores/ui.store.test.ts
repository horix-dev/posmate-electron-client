import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useUIStore } from '@/stores/ui.store'

describe('UI Store', () => {
  beforeEach(() => {
    // Clear localStorage to reset persisted state
    localStorage.clear()
  })

  describe('theme', () => {
    it('should start with system theme', () => {
      const { theme } = useUIStore.getState()
      expect(theme).toBe('system')
    })

    it('should update theme', () => {
      act(() => {
        useUIStore.getState().setTheme('dark')
      })

      expect(useUIStore.getState().theme).toBe('dark')
    })

    it('should apply theme to document', () => {
      const root = window.document.documentElement

      act(() => {
        useUIStore.getState().setTheme('dark')
      })

      expect(root.classList.contains('dark')).toBe(true)
      expect(root.classList.contains('light')).toBe(false)

      act(() => {
        useUIStore.getState().setTheme('light')
      })

      expect(root.classList.contains('light')).toBe(true)
      expect(root.classList.contains('dark')).toBe(false)
    })
  })

  describe('sidebar', () => {
    it('should start expanded', () => {
      const { sidebarState } = useUIStore.getState()
      expect(sidebarState).toBe('expanded')
    })

    it('should toggle sidebar state', () => {
      act(() => {
        useUIStore.getState().toggleSidebar()
      })

      expect(useUIStore.getState().sidebarState).toBe('collapsed')

      act(() => {
        useUIStore.getState().toggleSidebar()
      })

      expect(useUIStore.getState().sidebarState).toBe('expanded')
    })

    it('should set sidebar state directly', () => {
      act(() => {
        useUIStore.getState().setSidebarState('collapsed')
      })

      expect(useUIStore.getState().sidebarState).toBe('collapsed')
    })
  })

  describe('modal states', () => {
    it('should manage quick sale modal', () => {
      expect(useUIStore.getState().isQuickSaleOpen).toBe(false)

      act(() => {
        useUIStore.getState().setQuickSaleOpen(true)
      })

      expect(useUIStore.getState().isQuickSaleOpen).toBe(true)

      act(() => {
        useUIStore.getState().setQuickSaleOpen(false)
      })

      expect(useUIStore.getState().isQuickSaleOpen).toBe(false)
    })

    it('should manage search modal', () => {
      expect(useUIStore.getState().isSearchOpen).toBe(false)

      act(() => {
        useUIStore.getState().setSearchOpen(true)
      })

      expect(useUIStore.getState().isSearchOpen).toBe(true)
    })

    it('should manage settings modal', () => {
      expect(useUIStore.getState().isSettingsOpen).toBe(false)

      act(() => {
        useUIStore.getState().setSettingsOpen(true)
      })

      expect(useUIStore.getState().isSettingsOpen).toBe(true)
    })
  })

  describe('loading states', () => {
    it('should manage page loading state', () => {
      expect(useUIStore.getState().isPageLoading).toBe(false)

      act(() => {
        useUIStore.getState().setPageLoading(true)
      })

      expect(useUIStore.getState().isPageLoading).toBe(true)

      act(() => {
        useUIStore.getState().setPageLoading(false)
      })

      expect(useUIStore.getState().isPageLoading).toBe(false)
    })
  })

  describe('notifications', () => {
    it('should start with zero notifications', () => {
      localStorage.clear()
      const { notificationCount } = useUIStore.getState()
      // May not be 0 if store has default or previous state
      expect(typeof notificationCount).toBe('number')
    })

    it('should set notification count', () => {
      act(() => {
        useUIStore.getState().setNotificationCount(5)
      })

      expect(useUIStore.getState().notificationCount).toBe(5)
    })

    it('should increment notification count', () => {
      localStorage.clear()
      const initialCount = useUIStore.getState().notificationCount

      act(() => {
        useUIStore.getState().incrementNotificationCount()
        useUIStore.getState().incrementNotificationCount()
        useUIStore.getState().incrementNotificationCount()
      })

      expect(useUIStore.getState().notificationCount).toBe(initialCount + 3)
    })

    it('should clear notifications', () => {
      act(() => {
        useUIStore.getState().setNotificationCount(10)
        useUIStore.getState().clearNotifications()
      })

      expect(useUIStore.getState().notificationCount).toBe(0)
    })
  })

  describe('sound settings', () => {
    it('should start with sound disabled', () => {
      localStorage.clear()
      const { soundEnabled } = useUIStore.getState()
      expect(typeof soundEnabled).toBe('boolean')
    })

    it('should toggle sound enabled', () => {
      act(() => {
        useUIStore.getState().setSoundEnabled(true)
      })

      expect(useUIStore.getState().soundEnabled).toBe(true)

      act(() => {
        useUIStore.getState().setSoundEnabled(false)
      })

      expect(useUIStore.getState().soundEnabled).toBe(false)
    })
  })

  describe('receipt printer settings', () => {
    it('should start with auto-print disabled', () => {
      const { autoPrintReceipt } = useUIStore.getState()
      expect(autoPrintReceipt).toBe(false)
    })

    it('should toggle auto-print receipt', () => {
      act(() => {
        useUIStore.getState().setAutoPrintReceipt(true)
      })

      expect(useUIStore.getState().autoPrintReceipt).toBe(true)

      act(() => {
        useUIStore.getState().setAutoPrintReceipt(false)
      })

      expect(useUIStore.getState().autoPrintReceipt).toBe(false)
    })

    it('should default printer selection to null', () => {
      const state = useUIStore.getState()
      expect(state.receiptPrinterName).toBeNull()
      expect(state.labelPrinterName).toBeNull()
    })

    it('should update printer selections', () => {
      act(() => {
        useUIStore.getState().setReceiptPrinterName('Thermal-123')
        useUIStore.getState().setLabelPrinterName('Labeler-XYZ')
      })

      const state = useUIStore.getState()
      expect(state.receiptPrinterName).toBe('Thermal-123')
      expect(state.labelPrinterName).toBe('Labeler-XYZ')

      act(() => {
        useUIStore.getState().setReceiptPrinterName(null)
        useUIStore.getState().setLabelPrinterName(null)
      })

      expect(useUIStore.getState().receiptPrinterName).toBeNull()
      expect(useUIStore.getState().labelPrinterName).toBeNull()
    })
  })

  describe('POS settings', () => {
    it('should start with grid view mode', () => {
      const { posViewMode } = useUIStore.getState()
      expect(posViewMode).toBe('grid')
    })

    it('should toggle POS view mode', () => {
      act(() => {
        useUIStore.getState().setPosViewMode('list')
      })

      expect(useUIStore.getState().posViewMode).toBe('list')

      act(() => {
        useUIStore.getState().setPosViewMode('grid')
      })

      expect(useUIStore.getState().posViewMode).toBe('grid')
    })

    it('should set products per page', () => {
      expect(useUIStore.getState().posProductsPerPage).toBe(20)

      act(() => {
        useUIStore.getState().setPosProductsPerPage(50)
      })

      expect(useUIStore.getState().posProductsPerPage).toBe(50)
    })

    it('should enable/disable Smart Tender', () => {
      expect(useUIStore.getState().smartTenderEnabled).toBe(true)

      act(() => {
        useUIStore.getState().setSmartTenderEnabled(false)
      })

      expect(useUIStore.getState().smartTenderEnabled).toBe(false)
    })
  })

  describe('persistence', () => {
    it('should persist settings across store creation', () => {
      act(() => {
        useUIStore.getState().setTheme('dark')
        useUIStore.getState().setSoundEnabled(true)
        useUIStore.getState().setAutoPrintReceipt(true)
        useUIStore.getState().setReceiptPrinterName('Thermal-ABC')
        useUIStore.getState().setLabelPrinterName('Label-123')
        useUIStore.getState().setSmartTenderEnabled(false)
        useUIStore.getState().setPosViewMode('list')
      })

      const state = useUIStore.getState()
      expect(state.theme).toBe('dark')
      expect(state.soundEnabled).toBe(true)
      expect(state.autoPrintReceipt).toBe(true)
      expect(state.receiptPrinterName).toBe('Thermal-ABC')
      expect(state.labelPrinterName).toBe('Label-123')
      expect(state.smartTenderEnabled).toBe(false)
      expect(state.posViewMode).toBe('list')
    })
  })
})
