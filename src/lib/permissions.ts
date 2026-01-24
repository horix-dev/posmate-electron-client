/**
 * Permission Utilities
 *
 * Helper functions for checking user permissions
 * Based on Laravel backend visibility JSON structure
 */

import type { User } from '@/types/api.types'
import type {
  PermissionString,
  UserVisibility,
  PermissionCheckResult,
  PermissionValue,
  ModulePermissions,
} from '@/types/permission.types'

/**
 * Map full permission names to short codes
 * Backend sends: "read", "create", "update", "delete", "price"
 * Frontend uses: "r", "c", "u", "d", "price"
 */
function normalizePermissionKey(key: string): string {
  const mapping: Record<string, string> = {
    read: 'r',
    create: 'c',
    update: 'u',
    delete: 'd',
    price: 'price',
  }
  return mapping[key] || key
}

/**
 * Parse visibility JSON string to object and normalize permission keys
 */
export function parseVisibility(
  visibility?: string | UserVisibility | Record<string, unknown> | null
): UserVisibility {
  if (!visibility) return {}

  let parsed: UserVisibility | Record<string, unknown>

  // Handle string (JSON string from backend)
  if (typeof visibility === 'string') {
    try {
      parsed = JSON.parse(visibility) as Record<string, unknown>
    } catch {
      return {}
    }
  } else {
    // Already an object
    parsed = visibility
  }

  // Normalize permission keys from full names (read, create) to short codes (r, c)
  const normalized: UserVisibility = {}

  for (const [module, permissions] of Object.entries(parsed)) {
    if (permissions && typeof permissions === 'object') {
      normalized[module as keyof UserVisibility] = {} as ModulePermissions

      for (const [action, value] of Object.entries(permissions as Record<string, unknown>)) {
        const normalizedAction = normalizePermissionKey(action) as keyof ModulePermissions
        ;(normalized[module as keyof UserVisibility] as ModulePermissions)[normalizedAction] =
          value as PermissionValue
      }
    }
  }

  return normalized
}

/**
 * Check if a permission value is granted
 */
function isPermissionGranted(value: PermissionValue | undefined): boolean {
  return value === '1' || value === true
}

/**
 * Check if user is shop owner (has all permissions)
 */
export function isShopOwner(user: User | null): boolean {
  return user?.role === 'shop-owner'
}

/**
 * Check if user has a specific permission
 *
 * @param user - Current user object
 * @param permission - Permission string in format "module.action" (e.g., "sales.create")
 * @returns boolean - true if user has permission
 *
 * @example
 * hasPermission(user, 'sales.create') // Check if user can create sales
 * hasPermission(user, 'products.price') // Check if user can view product prices
 */
export function hasPermission(user: User | null, permission: PermissionString): boolean {
  // No user = no permissions
  if (!user) return false

  // Shop owners have all permissions
  if (isShopOwner(user)) return true

  // Parse permission format: "module.action"
  const [module, action] = permission.split('.')
  if (!module || !action) return false

  // Parse visibility JSON
  const visibility = parseVisibility(user.visibility)

  // Check if permission exists and is granted
  const modulePermissions = visibility[module as keyof UserVisibility]
  if (!modulePermissions) return false

  const permissionValue = modulePermissions[action as keyof typeof modulePermissions]
  return isPermissionGranted(permissionValue)
}

/**
 * Check if user has ANY of the specified permissions
 *
 * @example
 * hasAnyPermission(user, ['sales.create', 'sales.update'])
 */
export function hasAnyPermission(user: User | null, permissions: PermissionString[]): boolean {
  if (!user) return false
  if (isShopOwner(user)) return true

  return permissions.some((permission) => hasPermission(user, permission))
}

/**
 * Check if user has ALL of the specified permissions
 *
 * @example
 * hasAllPermissions(user, ['products.read', 'products.price'])
 */
export function hasAllPermissions(user: User | null, permissions: PermissionString[]): boolean {
  if (!user) return false
  if (isShopOwner(user)) return true

  return permissions.every((permission) => hasPermission(user, permission))
}

/**
 * Convenience helpers for common permission checks
 */

export function canRead(user: User | null, module: string): boolean {
  return hasPermission(user, `${module}.r`)
}

export function canCreate(user: User | null, module: string): boolean {
  return hasPermission(user, `${module}.c`)
}

export function canUpdate(user: User | null, module: string): boolean {
  return hasPermission(user, `${module}.u`)
}

export function canDelete(user: User | null, module: string): boolean {
  return hasPermission(user, `${module}.d`)
}

export function canViewPrice(user: User | null, module: string): boolean {
  return hasPermission(user, `${module}.price`)
}

/**
 * Get detailed permission check result with reason
 */
export function checkPermissionDetailed(
  user: User | null,
  permission: PermissionString
): PermissionCheckResult {
  if (!user) {
    return { allowed: false, reason: 'User not authenticated' }
  }

  if (isShopOwner(user)) {
    return { allowed: true, reason: 'Shop owner has all permissions' }
  }

  const [module, action] = permission.split('.')
  if (!module || !action) {
    return { allowed: false, reason: 'Invalid permission format' }
  }

  const visibility = parseVisibility(user.visibility)
  const modulePermissions = visibility[module as keyof UserVisibility]

  if (!modulePermissions) {
    return { allowed: false, reason: `No permissions defined for module: ${module}` }
  }

  const permissionValue = modulePermissions[action as keyof typeof modulePermissions]

  if (!isPermissionGranted(permissionValue)) {
    return { allowed: false, reason: `Permission denied for ${module}.${action}` }
  }

  return { allowed: true }
}

/**
 * Count total active permissions for a user
 */
export function countActivePermissions(user: User | null): number {
  if (!user) return 0
  if (isShopOwner(user)) return Infinity // Shop owner has all

  const visibility = parseVisibility(user.visibility)
  let count = 0

  Object.values(visibility).forEach((modulePermissions) => {
    if (modulePermissions) {
      Object.values(modulePermissions).forEach((value) => {
        if (isPermissionGranted(value as PermissionValue)) {
          count++
        }
      })
    }
  })

  return count
}

/**
 * Get all modules user has access to (read permission)
 */
export function getAccessibleModules(user: User | null): string[] {
  if (!user) return []

  const visibility = parseVisibility(user.visibility)
  const modules: string[] = []

  Object.entries(visibility).forEach(([module, permissions]) => {
    if (permissions && isPermissionGranted(permissions.r)) {
      modules.push(module)
    }
  })

  return modules
}

/**
 * Check if user can perform action on specific module
 * Used for UI button visibility
 */
export function canPerformAction(
  user: User | null,
  module: string,
  action: 'read' | 'create' | 'update' | 'delete' | 'price'
): boolean {
  const actionMap = {
    read: 'r',
    create: 'c',
    update: 'u',
    delete: 'd',
    price: 'price',
  }

  return hasPermission(user, `${module}.${actionMap[action]}`)
}

/**
 * Filter items based on permission
 * Useful for filtering menu items, routes, etc.
 */
export function filterByPermission<T extends { permission?: PermissionString }>(
  user: User | null,
  items: T[]
): T[] {
  return items.filter((item) => {
    if (!item.permission) return true // No permission required
    return hasPermission(user, item.permission)
  })
}
