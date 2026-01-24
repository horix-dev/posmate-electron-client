/**
 * Permission Hook
 *
 * React hook for accessing permission utilities with current user context
 */

import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { PermissionString } from '@/types/permission.types'
import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  canRead as checkCanRead,
  canCreate as checkCanCreate,
  canUpdate as checkCanUpdate,
  canDelete as checkCanDelete,
  canViewPrice as checkCanViewPrice,
  isShopOwner as checkIsShopOwner,
  canPerformAction,
  getAccessibleModules,
  countActivePermissions,
} from '@/lib/permissions'

/**
 * Hook to access permission checking utilities
 *
 * @example
 * const { hasPermission, canCreate, isShopOwner } = usePermissions()
 *
 * if (hasPermission('sales.create')) {
 *   // Show create sale button
 * }
 */
export function usePermissions() {
  const { user } = useAuthStore()

  return useMemo(
    () => ({
      /**
       * Check if user has a specific permission
       * @example hasPermission('sales.create')
       */
      hasPermission: (permission: PermissionString) => checkPermission(user, permission),

      /**
       * Check if user has ANY of the specified permissions
       * @example hasAnyPermission(['sales.create', 'sales.update'])
       */
      hasAnyPermission: (permissions: PermissionString[]) => checkAnyPermission(user, permissions),

      /**
       * Check if user has ALL of the specified permissions
       * @example hasAllPermissions(['products.read', 'products.price'])
       */
      hasAllPermissions: (permissions: PermissionString[]) =>
        checkAllPermissions(user, permissions),

      /**
       * Check if user can read a module
       * @example canRead('sales')
       */
      canRead: (module: string) => checkCanRead(user, module),

      /**
       * Check if user can create in a module
       * @example canCreate('products')
       */
      canCreate: (module: string) => checkCanCreate(user, module),

      /**
       * Check if user can update in a module
       * @example canUpdate('categories')
       */
      canUpdate: (module: string) => checkCanUpdate(user, module),

      /**
       * Check if user can delete in a module
       * @example canDelete('brands')
       */
      canDelete: (module: string) => checkCanDelete(user, module),

      /**
       * Check if user can view prices in a module
       * @example canViewPrice('products')
       */
      canViewPrice: (module: string) => checkCanViewPrice(user, module),

      /**
       * Check if current user is shop owner
       */
      isShopOwner: () => checkIsShopOwner(user),

      /**
       * Check if user can perform a specific action
       * @example canPerformAction('sales', 'create')
       */
      canPerformAction: (
        module: string,
        action: 'read' | 'create' | 'update' | 'delete' | 'price'
      ) => canPerformAction(user, module, action),

      /**
       * Get list of modules user can access
       */
      getAccessibleModules: () => getAccessibleModules(user),

      /**
       * Get count of active permissions
       */
      getPermissionCount: () => countActivePermissions(user),

      /**
       * Get current user
       */
      user,
    }),
    [user]
  )
}
