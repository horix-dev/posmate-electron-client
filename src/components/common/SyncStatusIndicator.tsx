/**
 * SyncStatusIndicator Component
 * Compact indicator showing sync status with expandable panel
 * Follows accessibility best practices with proper ARIA labels
 */

import { memo, useState } from 'react'
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { useSyncStore } from '@/stores/sync.store'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

interface SyncStatusIndicatorProps {
  /** Whether to show in collapsed/icon-only mode */
  collapsed?: boolean
  /** Callback when "View All" is clicked */
  onViewAll?: () => void
}

// ============================================
// Status Badge Component
// ============================================

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'syncing' | 'error' | 'idle'
  pendingCount: number
  failedCount: number
}

const StatusBadge = memo(function StatusBadge({
  status,
  pendingCount,
  failedCount,
}: StatusBadgeProps) {
  if (status === 'offline') {
    return (
      <Badge variant="destructive" className="gap-1">
        <CloudOff className="h-3 w-3" />
        Offline
      </Badge>
    )
  }

  if (status === 'syncing') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Syncing...
      </Badge>
    )
  }

  if (failedCount > 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        {failedCount} Failed
      </Badge>
    )
  }

  if (pendingCount > 0) {
    return (
      <Badge variant="secondary" className="gap-1">
        <RefreshCw className="h-3 w-3" />
        {pendingCount} Pending
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
      <CheckCircle2 className="h-3 w-3" />
      Synced
    </Badge>
  )
})

// ============================================
// Popover Content Component
// ============================================

interface PopoverContentViewProps {
  stats: { pending: number; failed: number; completed: number }
  isOnline: boolean
  isSyncing: boolean
  syncProgress: { completed: number; total: number } | null
  onSyncNow: () => void
  onRetryFailed: () => void
  onViewAll?: () => void
}

const PopoverContentView = memo(function PopoverContentView({
  stats,
  isOnline,
  isSyncing,
  syncProgress,
  onSyncNow,
  onRetryFailed,
  onViewAll,
}: PopoverContentViewProps) {
  return (
    <div className="w-80 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Cloud className="h-5 w-5 text-green-500" />
          ) : (
            <CloudOff className="h-5 w-5 text-destructive" />
          )}
          <span className="text-base font-semibold">{isOnline ? 'Connected' : 'Offline'}</span>
        </div>
        <StatusBadge
          status={!isOnline ? 'offline' : isSyncing ? 'syncing' : 'idle'}
          pendingCount={stats.pending}
          failedCount={stats.failed}
        />
      </div>

      {/* Progress bar when syncing */}
      {isSyncing && syncProgress && syncProgress.total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Syncing...</span>
            <span>
              {syncProgress.completed} / {syncProgress.total}
            </span>
          </div>
          <Progress value={(syncProgress.completed / syncProgress.total) * 100} className="h-1.5" />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 py-2 text-center">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-2xl font-bold">{stats.pending}</div>
          <div className="mt-1 text-xs text-muted-foreground">Pending</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
          <div className="mt-1 text-xs text-muted-foreground">Failed</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="mt-1 text-xs text-muted-foreground">Synced</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        {stats.pending > 0 && isOnline && (
          <Button size="sm" onClick={onSyncNow} disabled={isSyncing} className="h-9 w-full">
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        )}

        {stats.failed > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetryFailed}
            disabled={isSyncing}
            className="h-9 w-full"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Retry Failed ({stats.failed})
          </Button>
        )}

        {onViewAll && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onViewAll}
            className="h-9 w-full justify-between"
          >
            View All Records
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Offline message */}
      {!isOnline && (
        <p className="pb-1 pt-2 text-center text-xs text-muted-foreground">
          Changes will sync when you're back online
        </p>
      )}
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function SyncStatusIndicatorComponent({ collapsed = false, onViewAll }: SyncStatusIndicatorProps) {
  const [open, setOpen] = useState(false)

  // Store state
  const isOnline = useSyncStore((state) => state.isOnline)
  const syncProgress = useSyncStore((state) => state.syncProgress)

  // Queue hook
  const { stats, syncNow, retryAllFailed, isSyncing } = useSyncQueue()

  const handleViewAll = () => {
    setOpen(false)
    onViewAll?.()
  }

  // Determine icon and color
  const getStatusIcon = () => {
    if (!isOnline) {
      return <CloudOff className="h-5 w-5 text-destructive" />
    }
    if (isSyncing) {
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />
    }
    if (stats.failed > 0) {
      return <AlertCircle className="h-5 w-5 text-destructive" />
    }
    if (stats.pending > 0) {
      return <RefreshCw className="h-5 w-5 text-muted-foreground" />
    }
    return <Cloud className="h-5 w-5 text-muted-foreground" />
  }

  const getStatusLabel = () => {
    if (!isOnline) return 'Offline'
    if (isSyncing) return 'Syncing...'
    if (stats.failed > 0) return `${stats.failed} Failed`
    if (stats.pending > 0) return `${stats.pending} Pending`
    return 'Synced'
  }

  const showBadge = stats.pending > 0 || stats.failed > 0

  const triggerContent = (
    <Button
      variant="ghost"
      size={collapsed ? 'icon' : 'sm'}
      className={cn('relative', collapsed ? 'h-10 w-10' : 'w-full justify-start gap-2')}
      aria-label={`Sync status: ${getStatusLabel()}`}
    >
      <div className="relative">
        {getStatusIcon()}
        {showBadge && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
            {stats.pending + stats.failed}
          </span>
        )}
      </div>
      {!collapsed && (
        <span className="flex items-center gap-2">
          <span>{getStatusLabel()}</span>
          {getStatusLabel() === 'Synced' && <span className="h-2 w-2 rounded-full bg-green-500" />}
        </span>
      )}
    </Button>
  )

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{triggerContent}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{getStatusLabel()}</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent side="right" align="start" className="w-auto min-w-max p-4">
          <PopoverContentView
            stats={stats}
            isOnline={isOnline}
            isSyncing={isSyncing}
            syncProgress={syncProgress}
            onSyncNow={syncNow}
            onRetryFailed={retryAllFailed}
            onViewAll={handleViewAll}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerContent}</PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-auto min-w-max p-4">
        <PopoverContentView
          stats={stats}
          isOnline={isOnline}
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          onSyncNow={syncNow}
          onRetryFailed={retryAllFailed}
          onViewAll={handleViewAll}
        />
      </PopoverContent>
    </Popover>
  )
}

export const SyncStatusIndicator = memo(SyncStatusIndicatorComponent)

SyncStatusIndicator.displayName = 'SyncStatusIndicator'

export default SyncStatusIndicator
