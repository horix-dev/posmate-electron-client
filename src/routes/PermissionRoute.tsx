import { Navigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import type { StaffVisibility } from '@/types/api.types'

interface PermissionRouteProps {
  children: React.ReactNode
  /** If set, the user must have this module permission to access the route */
  module?: keyof StaffVisibility
  /** Which action is required. Defaults to 'view' */
  action?: 'view' | 'create' | 'delete'
  /** If true, only shop-owners can access this route */
  ownerOnly?: boolean
}

/**
 * Route guard that redirects to the dashboard when the current user
 * lacks the required permission. Shop-owners always pass through.
 */
export function PermissionRoute({
  children,
  module,
  action = 'view',
  ownerOnly = false,
}: PermissionRouteProps) {
  const { can, isOwner } = usePermissions()

  if (ownerOnly && !isOwner) {
    return <Navigate to="/" replace />
  }

  if (module && !can(module, action)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default PermissionRoute
