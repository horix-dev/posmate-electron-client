import { useState, useEffect, useCallback } from 'react'
import {
  Minus,
  Square,
  X,
  Maximize2,
  Maximize,
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
        'app-drag-region fixed right-0 top-0 z-40 flex h-12 select-none items-center justify-between border-b bg-card transition-all duration-300',
        showFullWidth ? 'left-0 px-4' : sidebarState === 'expanded' ? 'left-64' : 'left-16'
      )}
    >
      {/* Left: Search Bar (only when authenticated) */}
      <div className="app-no-drag flex items-center">
        {isAuthenticated && (
          <div className="relative w-full max-w-md pl-4">
            <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products, customers, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              className="h-8 pl-10 text-sm"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
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
            <div className="mr-1 flex items-center gap-1 border-r px-2">
              {/* Sync Status */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'relative h-8 w-8',
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
              </Tooltip>

              {/* Notifications */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-8 w-8">
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
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
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
        <div className="flex h-full">
          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className={cn(
              'flex h-full w-11 items-center justify-center',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
              'transition-colors duration-150'
            )}
            title="Minimize"
            aria-label="Minimize window"
          >
            <Minus className="h-4 w-4" />
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={handleMaximize}
            className={cn(
              'flex h-full w-11 items-center justify-center',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
              'transition-colors duration-150'
            )}
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          >
            {isMaximized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            className={cn(
              'flex h-full w-11 items-center justify-center',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
              'transition-colors duration-150'
            )}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <Maximize className="h-3.5 w-3.5" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className={cn(
              'flex h-full w-11 items-center justify-center',
              'text-muted-foreground hover:bg-red-600 hover:text-white',
              'transition-colors duration-150'
            )}
            title="Close"
            aria-label="Close window"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default TitleBar
