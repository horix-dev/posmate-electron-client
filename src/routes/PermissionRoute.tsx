/**
 * PermissionRoute - Wrapper to enforce permissions on route level
 *
 * This component is used internally in route definitions to check permissions
 * before rendering the page component.
 */

import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionString } from '@/types/permission.types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ShieldAlert } from 'lucide-react'

interface PermissionRouteProps {
  children: ReactNode
  permission?: PermissionString | PermissionString[]
  requireAll?: boolean
}

/**
 * Internal wrapper for route-level permission checking
 *
 * @example
 * <PermissionRoute permission="products.r">
 *   <ProductsPage />
 * </PermissionRoute>
 */
export function PermissionRoute({
  children,
  permission,
  requireAll = false,
}: PermissionRouteProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  // If no permission specified, always render
  if (!permission) {
    return <>{children}</>
  }

  let hasAccess = false

  if (Array.isArray(permission)) {
    hasAccess = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission)
  } else {
    hasAccess = hasPermission(permission)
  }

  if (!hasAccess) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this page. Please contact your administrator if you
            believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}

export default PermissionRoute
