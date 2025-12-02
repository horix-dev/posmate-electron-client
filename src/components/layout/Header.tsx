import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  HelpCircle,
  Wifi,
  WifiOff,
  Cloud,
} from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuthStore, useUIStore, useSyncStore } from '@/stores'
import { cn } from '@/lib/utils'

export function Header() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const { user, logout } = useAuthStore()
  const { theme, setTheme, notificationCount, setSearchOpen } = useUIStore()
  const { isOnline, syncStatus, pendingActions } = useSyncStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
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

  return (
    <header className="sticky top-8 z-30 flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Search Bar */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products, customers, invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            className="pl-10"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          {/* Sync Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative',
                  !isOnline && 'text-destructive',
                  syncStatus === 'syncing' && 'animate-pulse',
                  syncStatus === 'error' && 'text-yellow-500'
                )}
              >
                {isOnline ? (
                  syncStatus === 'syncing' ? (
                    <Cloud className="h-5 w-5" />
                  ) : (
                    <Wifi className="h-5 w-5" />
                  )
                ) : (
                  <WifiOff className="h-5 w-5" />
                )}
                {pendingActions.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] text-white">
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
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            </TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>

          {/* Help */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Help & Support</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.image} alt={user?.name} />
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
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
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
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
    </header>
  )
}

export default Header
