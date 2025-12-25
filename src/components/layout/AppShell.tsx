import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUIStore } from '@/stores'
import { cn } from '@/lib/utils'

export function AppShell() {
  const navigate = useNavigate()
  const sidebarState = useUIStore((state) => state.sidebarState)

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Title Bar with navigation */}
      <TitleBar onNavigate={navigate} />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex flex-1 flex-col pt-12 transition-all duration-300',
          sidebarState === 'expanded' ? 'ml-64' : 'ml-16'
        )}
      >
        {/* Offline Banner */}
        <OfflineBanner />

        {/* Page Content */}
        <ScrollArea className="flex-1 bg-muted/100">
          <main className="min-h-full p-6">
            <Outlet />
          </main>
        </ScrollArea>
      </div>
    </div>
  )
}

export default AppShell
