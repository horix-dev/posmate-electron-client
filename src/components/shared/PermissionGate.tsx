/**
 * PermissionGate Component
 *
 * Conditional rendering based on user permissions
 * Similar to Laravel's @usercan directive
 */

import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionString } from '@/types/permission.types'

interface PermissionGateProps {
  /** Permission(s) required to render children */
  permission?: PermissionString | PermissionString[]
  /** Require ALL permissions (default: false - requires ANY) */
  requireAll?: boolean
  /** Fallback content when permission is denied */
  fallback?: ReactNode
  /** Children to render when permission is granted */
  children: ReactNode
}

/**
 * Gate component that conditionally renders children based on permissions
 *
 * @example
 * // Single permission
 * <PermissionGate permission="sales.create">
 *   <Button>Create Sale</Button>
 * </PermissionGate>
 *
 * @example
 * // Any of multiple permissions
 * <PermissionGate permission={['sales.create', 'sales.update']}>
 *   <Button>Create/Edit Sale</Button>
 * </PermissionGate>
 *
 * @example
 * // All permissions required
 * <PermissionGate
 *   permission={['products.read', 'products.price']}
 *   requireAll
 * >
 *   <ProductPriceColumn />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate
 *   permission="products.price"
 *   fallback={<span className="text-muted-foreground">***</span>}
 * >
 *   <span>{product.price}</span>
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  // If no permission specified, always render (for compatibility)
  if (!permission) {
    return <>{children}</>
  }

  let hasAccess = false

  if (Array.isArray(permission)) {
    // Multiple permissions
    hasAccess = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission)
  } else {
    // Single permission
    hasAccess = hasPermission(permission)
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * Inverse permission gate - renders when permission is NOT granted
 * Useful for showing "upgrade" messages or alternative UI
 *
 * @example
 * <PermissionGate.Deny permission="reports.r">
 *   <Alert>You don't have access to reports. Contact your administrator.</Alert>
 * </PermissionGate.Deny>
 */
function PermissionGateDeny({
  permission,
  requireAll = false,
  children,
}: Omit<PermissionGateProps, 'fallback'>) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  if (!permission) {
    return null
  }

  let hasAccess = false

  if (Array.isArray(permission)) {
    hasAccess = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission)
  } else {
    hasAccess = hasPermission(permission)
  }

  // Render children only if access is denied
  return hasAccess ? null : <>{children}</>
}

PermissionGate.Deny = PermissionGateDeny

export default PermissionGate
