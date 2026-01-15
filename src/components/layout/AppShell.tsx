import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores'

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const isPosPage = location.pathname === '/pos' || location.pathname.startsWith('/pos/')

  const sidebarState = useUIStore((state) => state.sidebarState)
  const setSidebarState = useUIStore((state) => state.setSidebarState)
  const autoCollapsedRef = useRef(false)

  useEffect(() => {
    if (isPosPage) {
      if (sidebarState !== 'collapsed') {
        setSidebarState('collapsed')
        autoCollapsedRef.current = true
      }
      return
    }

    if (autoCollapsedRef.current) {
      setSidebarState('expanded')
      autoCollapsedRef.current = false
    }
  }, [isPosPage, setSidebarState, sidebarState])

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#f1ecf7] dark:bg-[#1c1c1e]">
      {/* Sidebar */}
      <Sidebar />

      {/* Title Bar with navigation */}
      <TitleBar onNavigate={navigate} />

      {/* Main Content Area */}
      <div className={cn('flex min-h-0 flex-1 flex-col pt-12 transition-all duration-300')}>
        {/* Offline Banner */}
        <OfflineBanner />

        {/* Page Content */}
        {isPosPage ? (
          <main className="min-h-0 flex-1 p-0">
            <Outlet />
          </main>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <main className="min-h-full p-6">
              <Outlet />
            </main>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}

export default AppShell
