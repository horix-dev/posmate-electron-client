import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'
type SidebarState = 'expanded' | 'collapsed'

interface UIState {
  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Sidebar
  sidebarState: SidebarState
  toggleSidebar: () => void
  setSidebarState: (state: SidebarState) => void

  // Modal states
  isQuickSaleOpen: boolean
  setQuickSaleOpen: (open: boolean) => void

  isSearchOpen: boolean
  setSearchOpen: (open: boolean) => void

  isSettingsOpen: boolean
  setSettingsOpen: (open: boolean) => void

  // Loading states
  isPageLoading: boolean
  setPageLoading: (loading: boolean) => void

  // Notifications count
  notificationCount: number
  setNotificationCount: (count: number) => void
  incrementNotificationCount: () => void
  clearNotifications: () => void

  // Sound settings
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void

  // Receipt printer settings
  autoPrintReceipt: boolean
  setAutoPrintReceipt: (enabled: boolean) => void

  // POS Smart Tender
  smartTenderEnabled: boolean
  setSmartTenderEnabled: (enabled: boolean) => void

  // POS view mode
  posViewMode: 'grid' | 'list'
  setPosViewMode: (mode: 'grid' | 'list') => void

  // Products per page in POS
  posProductsPerPage: number
  setPosProductsPerPage: (count: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => {
        set({ theme })
        // Apply theme to document
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')

        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          root.classList.add(systemTheme)
        } else {
          root.classList.add(theme)
        }
      },

      // Sidebar
      sidebarState: 'expanded',
      toggleSidebar: () => {
        set({ sidebarState: get().sidebarState === 'expanded' ? 'collapsed' : 'expanded' })
      },
      setSidebarState: (state) => set({ sidebarState: state }),

      // Modal states
      isQuickSaleOpen: false,
      setQuickSaleOpen: (open) => set({ isQuickSaleOpen: open }),

      isSearchOpen: false,
      setSearchOpen: (open) => set({ isSearchOpen: open }),

      isSettingsOpen: false,
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),

      // Loading states
      isPageLoading: false,
      setPageLoading: (loading) => set({ isPageLoading: loading }),

      // Notifications
      notificationCount: 0,
      setNotificationCount: (count) => set({ notificationCount: count }),
      incrementNotificationCount: () => set({ notificationCount: get().notificationCount + 1 }),
      clearNotifications: () => set({ notificationCount: 0 }),

      // Sound settings
      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      // Receipt printer
      autoPrintReceipt: true,
      setAutoPrintReceipt: (enabled) => set({ autoPrintReceipt: enabled }),

      // POS Smart Tender
      smartTenderEnabled: false,
      setSmartTenderEnabled: (enabled) => set({ smartTenderEnabled: enabled }),

      // POS view mode
      posViewMode: 'grid',
      setPosViewMode: (mode) => set({ posViewMode: mode }),

      // Products per page
      posProductsPerPage: 20,
      setPosProductsPerPage: (count) => set({ posProductsPerPage: count }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarState: state.sidebarState,
        soundEnabled: state.soundEnabled,
        autoPrintReceipt: state.autoPrintReceipt,
        smartTenderEnabled: state.smartTenderEnabled,
        posViewMode: state.posViewMode,
        posProductsPerPage: state.posProductsPerPage,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme on rehydration
        if (state?.theme) {
          state.setTheme(state.theme)
        }
      },
    }
  )
)

export default useUIStore
