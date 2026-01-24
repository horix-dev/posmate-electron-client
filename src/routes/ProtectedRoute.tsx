import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionString } from '@/types/permission.types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ShieldAlert } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Optional permission required to access this route */
  permission?: PermissionString | PermissionString[]
  /** Require ALL permissions (default: false - requires ANY) */
  requireAll?: boolean
}

export function ProtectedRoute({ children, permission, requireAll = false }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuthStore()
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check permission if specified
  if (permission) {
    let hasAccess = false

    if (Array.isArray(permission)) {
      hasAccess = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission)
    } else {
      hasAccess = hasPermission(permission)
    }

    if (!hasAccess) {
      return (
        <div className="flex h-screen w-full items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access this page. Please contact your administrator if
              you believe this is an error.
            </AlertDescription>
          </Alert>
        </div>
      )
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
