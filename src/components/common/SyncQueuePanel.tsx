/**
 * SyncQueuePanel Component
 * Detailed sheet/panel showing all sync queue items with actions
 * Follows accessibility best practices
 */

import { memo, useState, useCallback } from 'react'
import {
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  Receipt,
  Users,
  MoreHorizontal,
  CloudOff,
  Cloud,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { useSyncStore } from '@/stores/sync.store'
import type { SyncQueueItem } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

export interface SyncQueuePanelProps {
  /** Whether the panel is open */
  open: boolean
  /** Callback when panel open state changes */
  onOpenChange: (open: boolean) => void
}

// ============================================
// Helper Functions
// ============================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getEntityIcon(entity: SyncQueueItem['entity']) {
  switch (entity) {
    case 'sale':
      return Receipt
    case 'product':
      return Package
    case 'party':
    case 'customer':
      return Users
    default:
      return Package
  }
}

function getEntityLabel(entity: SyncQueueItem['entity']): string {
  switch (entity) {
    case 'sale':
      return 'Sale'
    case 'product':
      return 'Product'
    case 'party':
    case 'customer':
      return 'Customer'
    case 'purchase':
      return 'Purchase'
    case 'expense':
      return 'Expense'
    case 'income':
      return 'Income'
    case 'due_collection':
      return 'Due Collection'
    default:
      return entity
  }
}

function getOperationLabel(operation: SyncQueueItem['operation']): string {
  switch (operation) {
    case 'CREATE':
      return 'Create'
    case 'UPDATE':
      return 'Update'
    case 'DELETE':
      return 'Delete'
    default:
      return operation
  }
}

// ============================================
// Queue Item Component
// ============================================

interface QueueItemProps {
  item: SyncQueueItem
  onRetry: (id: number) => void
  onDelete: (id: number) => void
}

const QueueItem = memo(function QueueItem({
  item,
  onRetry,
  onDelete,
}: QueueItemProps) {
  const Icon = getEntityIcon(item.entity)
  
  const getStatusBadge = () => {
    switch (item.status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Synced
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        item.status === 'failed' && 'border-destructive/50 bg-destructive/5',
        item.status === 'processing' && 'border-primary/50 bg-primary/5'
      )}
    >
      {/* Icon */}
      <div className="rounded-full bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">
              {getOperationLabel(item.operation)} {getEntityLabel(item.entity)}
            </p>
            <p className="text-xs text-muted-foreground">
              ID: {item.entityId}
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Error message */}
        {item.error && (
          <p className="mt-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
            {item.error}
          </p>
        )}

        {/* Meta info */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatRelativeTime(item.createdAt)}</span>
          {item.attempts > 0 && (
            <span>
              Attempts: {item.attempts}/{item.maxAttempts}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {item.status === 'failed' && item.id && (
            <DropdownMenuItem onClick={() => onRetry(item.id!)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </DropdownMenuItem>
          )}
          {item.id && (
            <DropdownMenuItem
              onClick={() => onDelete(item.id!)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

// ============================================
// Empty State Component
// ============================================

interface EmptyStateProps {
  type: 'pending' | 'failed' | 'completed' | 'all'
}

const EmptyState = memo(function EmptyState({ type }: EmptyStateProps) {
  const messages = {
    pending: {
      icon: Cloud,
      title: 'No pending items',
      description: 'All changes have been synced to the server.',
    },
    failed: {
      icon: CheckCircle2,
      title: 'No failed items',
      description: 'All sync operations are healthy.',
    },
    completed: {
      icon: Clock,
      title: 'No completed items',
      description: 'Completed items will appear here.',
    },
    all: {
      icon: Cloud,
      title: 'Queue is empty',
      description: 'No items in the sync queue.',
    },
  }

  const { icon: Icon, title, description } = messages[type]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function SyncQueuePanelComponent({ open, onOpenChange }: SyncQueuePanelProps) {
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null)

  // Store state
  const isOnline = useSyncStore((state) => state.isOnline)

  // Queue hook
  const {
    pendingItems,
    failedItems,
    items,
    stats,
    isLoading,
    isSyncing,
    retryItem,
    retryAllFailed,
    deleteItem,
    clearCompleted,
    syncNow,
  } = useSyncQueue()

  // Handlers
  const handleRetry = useCallback(
    async (id: number) => {
      await retryItem(id)
    },
    [retryItem]
  )

  const handleDeleteClick = useCallback((id: number) => {
    setDeleteItemId(id)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteItemId) {
      await deleteItem(deleteItemId)
      setDeleteItemId(null)
    }
  }, [deleteItemId, deleteItem])

  const completedItems = items.filter((i) => i.status === 'completed')

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  {isOnline ? (
                    <Cloud className="h-5 w-5 text-green-500" />
                  ) : (
                    <CloudOff className="h-5 w-5 text-destructive" />
                  )}
                  Sync Queue
                </SheetTitle>
                <SheetDescription>
                  {stats.pending} pending, {stats.failed} failed, {stats.completed} synced
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Actions Bar */}
          <div className="flex items-center gap-2 my-4">
            {stats.pending > 0 && isOnline && (
              <Button size="sm" onClick={syncNow} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync Now
              </Button>
            )}
            {stats.failed > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={retryAllFailed}
                disabled={isSyncing}
              >
                Retry All Failed
              </Button>
            )}
            {stats.completed > 0 && (
              <Button size="sm" variant="ghost" onClick={clearCompleted}>
                Clear Synced
              </Button>
            )}
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs defaultValue="pending" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="gap-1">
                Pending
                {stats.pending > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {stats.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="failed" className="gap-1">
                Failed
                {stats.failed > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {stats.failed}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">Synced</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-280px)] mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <TabsContent value="pending" className="mt-0 space-y-2">
                    {pendingItems.length === 0 ? (
                      <EmptyState type="pending" />
                    ) : (
                      pendingItems.map((item) => (
                        <QueueItem
                          key={item.id}
                          item={item}
                          onRetry={handleRetry}
                          onDelete={handleDeleteClick}
                        />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="failed" className="mt-0 space-y-2">
                    {failedItems.length === 0 ? (
                      <EmptyState type="failed" />
                    ) : (
                      failedItems.map((item) => (
                        <QueueItem
                          key={item.id}
                          item={item}
                          onRetry={handleRetry}
                          onDelete={handleDeleteClick}
                        />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="completed" className="mt-0 space-y-2">
                    {completedItems.length === 0 ? (
                      <EmptyState type="completed" />
                    ) : (
                      completedItems.map((item) => (
                        <QueueItem
                          key={item.id}
                          item={item}
                          onRetry={handleRetry}
                          onDelete={handleDeleteClick}
                        />
                      ))
                    )}
                  </TabsContent>
                </>
              )}
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteItemId !== null}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Queue Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item from the sync queue? This
              action cannot be undone and the change will not be synced to the
              server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export const SyncQueuePanel = memo(SyncQueuePanelComponent)

SyncQueuePanel.displayName = 'SyncQueuePanel'

export default SyncQueuePanel
