import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Truck,
  Tags,
  Warehouse,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUIStore, useBusinessStore } from '@/stores'
import { cn } from '@/lib/utils'
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator'
import { SyncQueuePanel } from '@/components/common/SyncQueuePanel'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: Home },
  { title: 'POS', href: '/pos', icon: ShoppingCart },
  { title: 'Products', href: '/products', icon: Package },
  { title: 'Sales', href: '/sales', icon: Receipt },
  { title: 'Purchases', href: '/purchases', icon: Truck },
  { title: 'Parties', href: '/parties', icon: Users },
  { title: 'Expenses', href: '/expenses', icon: Wallet },
]

const secondaryNavItems: NavItem[] = [
  { title: 'Categories', href: '/categories', icon: Tags },
  { title: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { title: 'Reports', href: '/reports', icon: BarChart3 },
  { title: 'Invoices', href: '/invoices', icon: FileText },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarState, toggleSidebar } = useUIStore()
  const business = useBusinessStore((state) => state.business)
  const [syncPanelOpen, setSyncPanelOpen] = useState(false)

  const isCollapsed = sidebarState === 'collapsed'

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href
    const Icon = item.icon

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
            : 'text-muted-foreground',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>{item.title}</span>}
        {!isCollapsed && item.badge !== undefined && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {item.badge}
          </span>
        )}
      </Link>
    )

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-4">
            {item.title}
            {item.badge !== undefined && (
              <span className="ml-auto text-muted-foreground">{item.badge}</span>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return linkContent
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo / Business Name */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  {business?.companyName || 'POS Mate'}
                </span>
                <span className="text-xs text-muted-foreground">Point of Sale</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingCart className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          <Separator className="my-4" />

          <nav className="flex flex-col gap-1">
            {secondaryNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer - Sync Status, Settings & Toggle */}
        <div className="border-t p-3">
          {/* Sync Status Indicator */}
          <div className="mb-2">
            <SyncStatusIndicator
              collapsed={isCollapsed}
              onViewAll={() => setSyncPanelOpen(true)}
            />
          </div>

          <Separator className="my-2" />

          <nav className="mb-2">
            <NavLink item={{ title: 'Settings', href: '/settings', icon: Settings }} />
          </nav>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn('w-full', isCollapsed && 'px-2')}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Collapse
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Sync Queue Panel */}
      <SyncQueuePanel open={syncPanelOpen} onOpenChange={setSyncPanelOpen} />
    </TooltipProvider>
  )
}

export default Sidebar
