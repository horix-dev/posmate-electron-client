/**
 * Permission Debugger Component
 *
 * Displays current user's permissions for debugging purposes.
 * Only visible in development mode.
 *
 * Usage: Add <PermissionDebugger /> anywhere in your app during development
 */

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/usePermissions'
import { parseVisibility } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bug, X, CheckCircle2, XCircle } from 'lucide-react'

export function PermissionDebugger() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuthStore()
  const { isShopOwner, getPermissionCount } = usePermissions()

  // Only show in development
  if (import.meta.env.PROD) {
    return null
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        variant="outline"
        className="fixed bottom-4 right-4 z-[9999] shadow-lg"
      >
        <Bug className="mr-2 h-4 w-4" />
        Debug Permissions
      </Button>
    )
  }

  const visibility = parseVisibility(user?.visibility)
  const totalPermissions = getPermissionCount()

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96">
      <Card className="shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              <CardTitle>Permission Debugger</CardTitle>
            </div>
            <Button onClick={() => setIsOpen(false)} size="icon" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Current user permissions</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* User Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User:</span>
              <span className="text-sm">{user?.name || 'Not logged in'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm">{user?.email || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Role:</span>
              <Badge variant={user?.role === 'shop-owner' ? 'default' : 'secondary'}>
                {user?.role || 'N/A'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Shop Owner:</span>
              {isShopOwner() ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Permissions:</span>
              <Badge variant="outline">{isShopOwner() ? '∞ (All)' : totalPermissions}</Badge>
            </div>
          </div>

          {/* Permissions List */}
          {!isShopOwner() && (
            <>
              <div className="border-t pt-3">
                <h4 className="mb-2 text-sm font-semibold">Granted Permissions:</h4>
                <ScrollArea className="h-64 rounded-md border p-2">
                  <div className="space-y-1">
                    {Object.keys(visibility).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No permissions assigned</p>
                    ) : (
                      Object.entries(visibility).map(([module, permissions]) => (
                        <div
                          key={module}
                          className="rounded-sm border-l-2 border-primary/20 bg-muted/50 p-2"
                        >
                          <div className="mb-1 text-xs font-semibold text-primary">{module}</div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(permissions || {}).map(([action, value]) => {
                              const isGranted = value === '1' || value === true
                              return (
                                <Badge
                                  key={action}
                                  variant={isGranted ? 'default' : 'outline'}
                                  className="text-[10px]"
                                >
                                  {action}: {isGranted ? '✓' : '✗'}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Raw JSON */}
              <div className="border-t pt-3">
                <h4 className="mb-2 text-sm font-semibold">Raw Visibility JSON:</h4>
                <ScrollArea className="h-32 rounded-md border bg-muted p-2">
                  <pre className="text-[10px]">{JSON.stringify(visibility, null, 2)}</pre>
                </ScrollArea>
              </div>
            </>
          )}

          {isShopOwner() && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                🎉 Shop Owner has ALL permissions
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                All permission checks are automatically bypassed
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PermissionDebugger
