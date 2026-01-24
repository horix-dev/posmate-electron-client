import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Truck,
  Tags,
  Receipt,
  ChevronDown,
  UserCheck,
  Building2,
  ClipboardList,
  PackageMinus,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useUIStore, useBusinessStore } from '@/stores'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionString } from '@/types/permission.types'
import { cn } from '@/lib/utils'
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator'
import { SyncQueuePanel } from '@/components/common/SyncQueuePanel'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
  permission?: PermissionString
  children?: SubNavItem[]
}

interface SubNavItem {
  title: string
  href: string
  icon: React.ElementType
  permission?: PermissionString
  alternatePermission?: PermissionString
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: Home, permission: 'dashboard.r' },
  { title: 'POS', href: '/pos', icon: ShoppingCart, permission: 'sales.c' },
  {
    title: 'Products',
    href: '/products',
    icon: Package,
    permission: 'products.r',
    children: [
      { title: 'Add Product', href: '/products/create', icon: Plus, permission: 'products.c' },
      { title: 'All Products', href: '/products', icon: Package, permission: 'products.r' },
    ],
  },
  {
    title: 'Sales',
    href: '/sales',
    icon: Receipt,
    // Show Sales menu if user has either read OR create permission
    permission: 'sales.r',
    children: [
      { title: 'All Sales', href: '/sales?tab=sales', icon: Receipt, permission: 'sales.r' },
      {
        title: 'Sales Returns',
        href: '/sales?tab=returns',
        icon: PackageMinus,
        permission: 'sale-returns.r',
        alternatePermission: 'sale-returns.c',
      },
    ],
  },
  {
    title: 'Purchases',
    href: '/purchases',
    icon: Truck,
    permission: 'purchases.r',
    children: [
      { title: 'Add Purchase', href: '/purchases/new', icon: Plus, permission: 'purchases.c' },
      {
        title: 'All Purchases',
        href: '/purchases?tab=purchases',
        icon: Package,
        permission: 'purchases.r',
      },
      {
        title: 'Purchase Returns',
        href: '/purchases?tab=returns',
        icon: PackageMinus,
        permission: 'purchase-returns.r',
      },
    ],
  },
  { title: 'Due', href: '/due', icon: Wallet, permission: 'dues.r' },
  {
    title: 'Parties',
    href: '/customers',
    icon: Users,
    permission: 'parties.r',
    children: [
      { title: 'Customers', href: '/customers', icon: UserCheck, permission: 'parties.r' },
      { title: 'Suppliers', href: '/suppliers', icon: Building2, permission: 'parties.r' },
    ],
  },
]

const secondaryNavItems: NavItem[] = [
  { title: 'Finance', href: '/finance', icon: Wallet, permission: 'incomes.r' },
  { title: 'Stocks', href: '/stocks', icon: Package, permission: 'stocks.r' },
  // { title: 'Invoices', href: '/invoices', icon: FileText },
  // { title: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { title: 'Product Settings', href: '/product-settings', icon: Tags, permission: 'categories.r' },
  {
    title: 'Stock Adjustments',
    href: '/inventory/stock-adjustments',
    icon: ClipboardList,
    permission: 'inventory.r',
  },
  { title: 'Reports', href: '/reports', icon: BarChart3, permission: 'sale-reports.r' },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarState, toggleSidebar } = useUIStore()
  const business = useBusinessStore((state) => state.business)
  const { hasPermission } = usePermissions()
  const [syncPanelOpen, setSyncPanelOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const isCollapsed = sidebarState === 'collapsed'

  // Filter menu items based on permissions
  const filteredMainNav = mainNavItems
    .filter((item) => {
      // Special case for Sales: show if user has any sales or sale-returns permission
      if (item.title === 'Sales') {
        return (
          hasPermission('sales.r') ||
          hasPermission('sales.c') ||
          hasPermission('sale-returns.r') ||
          hasPermission('sale-returns.c')
        )
      }
      return !item.permission || hasPermission(item.permission)
    })
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => {
        if (!child.permission) return true
        // Check primary permission or alternate permission
        const hasMainPermission = hasPermission(child.permission)
        const hasAlternate = child.alternatePermission
          ? hasPermission(child.alternatePermission)
          : false
        return hasMainPermission || hasAlternate
      }),
    }))

  const filteredSecondaryNav = secondaryNavItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(href)) {
        next.delete(href)
      } else {
        next.add(href)
      }
      return next
    })
  }

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.href)
    const isChildActive =
      hasChildren &&
      item.children?.some((child) => {
        const childPath = child.href.split('?')[0]
        const childSearch = child.href.split('?')[1]
        return (
          location.pathname === childPath && (!childSearch || location.search.includes(childSearch))
        )
      })
    const Icon = item.icon

    const handleClick = (e: React.MouseEvent) => {
      if (hasChildren && !isCollapsed) {
        e.preventDefault()
        toggleExpanded(item.href)
      }
    }

    const linkContent = (
      <>
        <Link
          to={item.href}
          onClick={handleClick}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
            'hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground',
            isActive || isChildActive
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
              : 'text-sidebar-foreground/70',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
          {!isCollapsed && <span className="flex-1">{item.title}</span>}
          {!isCollapsed && item.badge !== undefined && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {item.badge}
            </span>
          )}
          {!isCollapsed && hasChildren && (
            <ChevronDown
              strokeWidth={1.5}
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          )}
        </Link>

        {/* Sub-menu items */}
        {!isCollapsed && hasChildren && isExpanded && (
          <div className="ml-8 mt-0.5 flex flex-col gap-0.5">
            {item.children?.map((child) => {
              const SubIcon = child.icon
              const childPath = child.href.split('?')[0]
              const childSearch = child.href.split('?')[1]
              const isSubActive =
                location.pathname === childPath &&
                (!childSearch || location.search.includes(childSearch))
              return (
                <Link
                  key={child.href}
                  to={child.href}
                  className={cn(
                    'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    'hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground',
                    isSubActive
                      ? 'bg-primary/10 font-semibold text-primary-foreground'
                      : 'text-sidebar-foreground/60'
                  )}
                >
                  {isSubActive && (
                    <div className="absolute left-0 h-full w-[2px] rounded-r-full bg-primary" />
                  )}
                  <SubIcon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span>{child.title}</span>
                </Link>
              )
            })}
          </div>
        )}
      </>
    )

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div>
              <Link
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  'hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground',
                  isActive || isChildActive
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                    : 'text-sidebar-foreground/70',
                  'justify-center px-2'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              </Link>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-2 p-2">
            <div className="flex items-center gap-2 font-medium">
              {item.title}
              {item.badge !== undefined && (
                <span className="text-sidebar-foreground/70">{item.badge}</span>
              )}
            </div>
            {hasChildren && (
              <div className="ml-2 flex flex-col gap-1 border-l-2 border-sidebar-border pl-2">
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    to={child.href}
                    className="text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  >
                    {child.title}
                  </Link>
                ))}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return <div>{linkContent}</div>
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50 flex flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-all duration-300',
          "relative before:absolute before:inset-0 before:z-0 before:content-['']",
          'before:bg-[linear-gradient(115deg,transparent_0%,hsl(var(--sidebar-primary)/0.18)_38%,transparent_62%),linear-gradient(65deg,transparent_0%,hsl(var(--sidebar-accent)/0.14)_42%,transparent_70%),radial-gradient(800px_circle_at_18%_-12%,hsl(var(--sidebar-primary)/0.22),transparent_55%)]',
          'before:pointer-events-none before:opacity-70',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="relative z-10 flex h-full flex-col">
          {/* Business Name - Matches unified title bar height */}
          <div className="mb-2 flex h-12 items-center justify-center border-b border-sidebar-border bg-sidebar px-4">
            {!isCollapsed && (
              <span className="text-sm font-semibold">{business?.companyName || 'POS Mate'}</span>
            )}
            {isCollapsed && <span className="text-xs font-semibold">PM</span>}
          </div>

          {/* Navigation */}
          <ScrollArea
            className="flex-1 px-3 py-6"
            scrollbarClassName="border-l-0 bg-transparent"
            thumbClassName="bg-sidebar-foreground/15 hover:bg-sidebar-foreground/25"
          >
            <nav className="flex flex-col gap-1">
              {filteredMainNav.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>

            <Separator className="my-4" />

            <nav className="flex flex-col gap-1">
              {filteredSecondaryNav.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </ScrollArea>

          {/* Footer - Sync Status, Settings & Toggle */}
          <div className="border-t border-white/10 p-3">
            {/* Sync Status Indicator */}
            <div className="mb-2">
              <SyncStatusIndicator
                collapsed={isCollapsed}
                onViewAll={() => setSyncPanelOpen(true)}
              />
            </div>

            <Separator className="my-2" />

            <nav className="mb-2">
              <NavLink
                item={{
                  title: 'Settings',
                  href: '/settings',
                  icon: Settings,
                  permission: 'manage-settings.r',
                }}
              />
            </nav>

            <Button
              variant="ghost"
              onClick={toggleSidebar}
              className={cn('mt-2 h-10 w-full', isCollapsed && 'px-2')}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <>
                  <ChevronLeft className="mr-2 h-5 w-5" strokeWidth={1.5} />
                  Collapse
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* Sync Queue Panel */}
      <SyncQueuePanel open={syncPanelOpen} onOpenChange={setSyncPanelOpen} />
    </TooltipProvider>
  )
}

export default Sidebar
