import { RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore, type Resource } from '@/stores/permission.store'

/**
 * Route meta interface for permissions
 */
interface PermissionRouteMeta {
  requiresAuth?: boolean
  permission?: Resource | Resource[]
  permissionLogic?: 'OR' | 'AND'
}

/**
 * Check if user has required permission
 */
function hasPermission(
  userPermissions: Set<string>,
  required: Resource | Resource[],
  logic: 'OR' | 'AND' = 'OR'
): boolean {
  if (!required) return true

  const permissions = Array.isArray(required) ? required : [required]

  if (logic === 'AND') {
    return permissions.every(p => userPermissions.has(p))
  }

  return permissions.some(p => userPermissions.has(p))
}

/**
 * Create permission guard for routes
 */
export function createPermissionGuard() {
  return (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): void => {
    const authStore = useAuthStore()
    const permissionStore = usePermissionStore()

    // Get permission requirements from route meta
    const meta = to.meta as PermissionRouteMeta | undefined
    const requiredPermission = meta?.permission

    // If no permission required, allow access
    if (!requiredPermission) {
      next()
      return
    }

    // Super admin bypasses all permission checks
    if (authStore.user?.role === 'super_admin') {
      next()
      return
    }

    // Get user permissions
    const userPermissions = permissionStore.userPermissions

    // Check permission
    const logic = meta?.permissionLogic || 'OR'
    if (hasPermission(userPermissions, requiredPermission, logic)) {
      next()
      return
    }

    // Permission denied - redirect to forbidden page
    next({
      name: 'forbidden',
      query: {
        redirect: to.fullPath,
        required: Array.isArray(requiredPermission)
          ? requiredPermission.join(',')
          : requiredPermission
      }
    })
  }
}

/**
 * Factory to create guard with custom permission check
 */
export function requirePermission(required: Resource | Resource[], logic: 'OR' | 'AND' = 'OR') {
  return (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): void => {
    const permissionStore = usePermissionStore()
    const authStore = useAuthStore()

    // Super admin bypass
    if (authStore.user?.role === 'super_admin') {
      next()
      return
    }

    if (hasPermission(permissionStore.userPermissions, required, logic)) {
      next()
      return
    }

    next({
      name: 'forbidden',
      query: {
        redirect: to.fullPath,
        required: Array.isArray(required) ? required.join(',') : required
      }
    })
  }
}

/**
 * Guard for super admin only routes
 */
export function requireSuperAdmin() {
  return (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): void => {
    const authStore = useAuthStore()

    if (authStore.user?.role === 'super_admin') {
      next()
      return
    }

    next({
      name: 'forbidden',
      query: {
        redirect: to.fullPath,
        required: 'super_admin'
      }
    })
  }
}

/**
 * Guard for admin or higher roles
 */
export function requireAdminRole() {
  return (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): void => {
    const authStore = useAuthStore()

    // Operator role cannot access
    if (authStore.user?.role === 'operator') {
      next({
        name: 'forbidden',
        query: {
          redirect: to.fullPath,
          required: 'admin'
        }
      })
      return
    }

    next()
  }
}

/**
 * Helper to add permission meta to route
 */
export function withPermission(
  route: RouteRecordRaw,
  permission: Resource | Resource[],
  logic: 'OR' | 'AND' = 'OR'
): RouteRecordRaw {
  return {
    ...route,
    meta: {
      ...route.meta,
      permission,
      permissionLogic: logic
    }
  }
}

/**
 * Helper to add super admin requirement to route
 */
export function withSuperAdmin(route: RouteRecordRaw): RouteRecordRaw {
  return {
    ...route,
    meta: {
      ...route.meta,
      permission: 'super_admin',
      permissionLogic: 'OR'
    }
  }
}
