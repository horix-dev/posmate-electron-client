import { useState, useEffect, useCallback } from 'react'
import {
  Minus,
  Square,
  X,
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  Wifi,
  WifiOff,
  Cloud,
  Expand,
  Minimize,
  Shrink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore, useAuthStore, useSyncStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TitleBarProps {
  /**
   * Navigation function for profile/settings/logout
   * Pass from component that has router context
   */
  onNavigate?: (path: string) => void
}

/**
 * Unified Title Bar Component
 *
 * Combines the window controls with app header items (search, notifications, profile).
 * Layout: [Search] | [App Actions] | [Window Controls]
 */
export function TitleBar({ onNavigate }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isElectronReady, setIsElectronReady] = useState(false)

  const sidebarState = useUIStore((state) => state.sidebarState)
  const { theme, setTheme, notificationCount, setSearchOpen } = useUIStore()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { isOnline, syncStatus, pendingActions } = useSyncStore()

  // If not authenticated, show full-width title bar (no sidebar)
  const showFullWidth = !isAuthenticated

  // Check if window controls are available
  const hasWindowControls = !!window.electronAPI?.windowControls

  // Check if running in Electron - wait for API to be ready
  useEffect(() => {
    const checkElectron = () => {
      if (window.platform?.isElectron || window.electronAPI?.windowControls) {
        setIsElectronReady(true)
        return true
      }
      return false
    }

    // Check immediately
    if (checkElectron()) return

    // Poll for a short time in case preload is slow
    const interval = setInterval(() => {
      if (checkElectron()) {
        clearInterval(interval)
      }
    }, 50)

    // Give up after 500ms - not in Electron
    const timeout = setTimeout(() => {
      clearInterval(interval)
    }, 500)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  // Check initial maximized state
  useEffect(() => {
    if (!hasWindowControls) return

    const checkMaximized = async () => {
      try {
        const maximized = await window.electronAPI?.windowControls?.isMaximized?.()
        setIsMaximized(!!maximized)
      } catch {
        // Ignore errors
      }
    }

    checkMaximized()

    const handleResize = () => {
      checkMaximized()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [hasWindowControls])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleMinimize = useCallback(() => {
    window.electronAPI?.windowControls?.minimize?.()
  }, [])

  const handleMaximize = useCallback(async () => {
    const controls = window.electronAPI?.windowControls
    controls?.maximize?.()
    const maximized = await controls?.isMaximized?.()
    setIsMaximized(maximized ?? false)
  }, [])

  const handleClose = useCallback(() => {
    window.electronAPI?.windowControls?.close?.()
  }, [])

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    onNavigate?.('/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Don't render in browser (non-Electron)
  if (!isElectronReady) {
    return null
  }

  return (
    <header
      className={cn(
        'app-drag-region fixed right-0 top-0 z-40 flex h-12 select-none items-center justify-between border-b border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300',
        showFullWidth ? 'left-0 px-4' : sidebarState === 'expanded' ? 'left-64' : 'left-16'
      )}
    >
      {/* Left: Search Bar (only when authenticated) */}
      <div className="app-no-drag flex items-center">
        {isAuthenticated && (
          <div className="relative w-full pl-4">
            <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/70" />
            <Input
              placeholder="Search products, customers, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              className="h-8 max-w-xl border-sidebar-border bg-sidebar-accent/30 pl-10 pr-14 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:ring-sidebar-ring"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border border-sidebar-border bg-sidebar-accent/20 px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/80 opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        )}
      </div>

      {/* Center: Draggable spacer */}
      <div className="flex-1" />

      {/* Right: App Actions + Window Controls */}
      <div className="app-no-drag flex h-full items-center">
        {/* App Actions (only when authenticated) */}
        {isAuthenticated && (
          <TooltipProvider delayDuration={300}>
            <div className="mr-1 flex items-center gap-1 border-r border-sidebar-border px-2">
              {/* Sync Status */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'relative h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      !isOnline && 'text-destructive',
                      syncStatus === 'syncing' && 'animate-pulse',
                      syncStatus === 'error' && 'text-yellow-500'
                    )}
                  >
                    {isOnline ? (
                      syncStatus === 'syncing' ? (
                        <Cloud className="h-4 w-4" />
                      ) : (
                        <Wifi className="h-4 w-4" />
                      )
                    ) : (
                      <WifiOff className="h-4 w-4" />
                    )}
                    {pendingActions.length > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-yellow-500 text-[8px] text-white">
                        {pendingActions.length}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!isOnline
                    ? 'Offline - Changes will sync when online'
                    : syncStatus === 'syncing'
                      ? 'Syncing...'
                      : pendingActions.length > 0
                        ? `${pendingActions.length} pending actions`
                        : 'Online'}
                </TooltipContent>
              </Tooltip>

              {/* Theme Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={toggleTheme}
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
              </Tooltip>

              {/* Notifications */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Bell className="h-4 w-4" />
                    {notificationCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[8px]"
                      >
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full text-foreground hover:bg-sidebar-accent hover:text-foreground/70"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user?.image} alt={user?.name} />
                      <AvatarFallback className="text-xs">{getInitials(user?.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onNavigate?.('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate?.('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        )}

        {/* Window Controls */}
        <div className="flex h-full items-center gap-2 px-3">
          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            className={cn(
              'group flex h-7 w-7 items-center justify-center rounded-full',
              'bg-gray-500/20 backdrop-blur-sm hover:bg-gray-500/30',
              'transition-all duration-200 hover:scale-105'
            )}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Shrink className="h-3 w-3 text-white" />
            ) : (
              <Expand className="h-3 w-3 text-white" />
            )}
          </button>

          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className={cn(
              'group flex h-7 w-7 items-center justify-center rounded-full',
              'bg-gray-500/20 backdrop-blur-sm hover:bg-gray-500/30',
              'transition-all duration-200 hover:scale-105'
            )}
            title="Minimize"
            aria-label="Minimize window"
          >
            <Minus className="h-3 w-3 text-white" />
          </button>

          {/* Maximize / Restore - Hidden in fullscreen */}
          {!isFullscreen && (
            <button
              onClick={handleMaximize}
              className={cn(
                'group flex h-7 w-7 items-center justify-center rounded-full',
                'bg-gray-500/20 backdrop-blur-sm hover:bg-gray-500/30',
                'transition-all duration-200 hover:scale-105'
              )}
              title={isMaximized ? 'Restore' : 'Maximize'}
              aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            >
              {isMaximized ? (
                <Minimize className="h-3 w-3 text-white" />
              ) : (
                <Square className="h-3 w-3 text-white" />
              )}
            </button>
          )}

          {/* Close */}
          <button
            onClick={handleClose}
            className={cn(
              'group flex h-7 w-7 items-center justify-center rounded-full',
              'bg-rose-500/30 backdrop-blur-sm hover:bg-rose-500/50',
              'transition-all duration-200 hover:scale-105'
            )}
            title="Close"
            aria-label="Close window"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default TitleBar
