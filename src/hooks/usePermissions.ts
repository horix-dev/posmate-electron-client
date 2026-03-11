import { useAuthStore } from '@/stores'
import type { StaffVisibility } from '@/types/api.types'

type Module = keyof StaffVisibility
type Action = 'view' | 'create' | 'delete'

/**
 * Parse the visibility field from the User profile.
 * The API may return it as a JSON string (stored in DB) or as a parsed object
 * (Axios auto-parses nested objects if the backend returns them properly).
 */
function parseVisibility(visibility: unknown): StaffVisibility | null {
  if (!visibility) return null
  if (typeof visibility === 'object') return visibility as StaffVisibility
  if (typeof visibility === 'string') {
    try {
      return JSON.parse(visibility) as StaffVisibility
    } catch {
      return null
    }
  }
  return null
}

/**
 * Hook for checking the current user's module permissions.
 *
 * - Shop-owners always have full access.
 * - Staff users are gated by their `visibility` JSON set during staff creation.
 *
 * Usage:
 *   const { can, canAccess, isOwner } = usePermissions()
 *   can('sales', 'create')   // true if the user can create sales
 *   canAccess('products')    // true if the user has view access to products
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user)

  const isOwner = !user || user.role === 'shop-owner'
  const visibility = parseVisibility(user?.visibility)

  /**
   * Check if the current user can perform `action` on `module`.
   * Shop-owners always return true.
   */
  const can = (module: Module, action: Action): boolean => {
    if (isOwner) return true
    if (!visibility) return false
    return visibility[module]?.[action as keyof (typeof visibility)[typeof module]] === '1'
  }

  /**
   * Check if the current user has at least view access to `module`.
   * Equivalent to can(module, 'view').
   */
  const canAccess = (module: Module): boolean => can(module, 'view')

  return { can, canAccess, isOwner, visibility }
}
