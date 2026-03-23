import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AdminRole, Resource } from '@/shared/admin-permissions'
import { Resource as EnumResource, ROLE_PERMISSIONS } from '@/shared/admin-permissions'

// Type for auth user role (re-exported for convenience)
export type { AdminRole, Resource } from '@/shared/admin-permissions'

// Role to permissions mapping (imported from shared)
const ROLE_PERMISSIONS_MAP: Record<string, Resource[]> = ROLE_PERMISSIONS

export const usePermissionStore = defineStore('permission', () => {
  // Permission state
  const permissions = ref<Set<Resource>>(new Set())
  const userRole = ref<AdminRole | null>(null)

  // Private function to get role (avoiding circular dependency)
  function getCurrentRole(): AdminRole | null {
    // Try to get from localStorage as backup
    const storedRole = localStorage.getItem('adminRole')
    if (storedRole && ['super_admin', 'admin', 'operator'].includes(storedRole)) {
      return storedRole as AdminRole
    }
    return userRole.value
  }

  // Private function to set role
  function setRole(role: AdminRole): void {
    userRole.value = role
    if (role) {
      localStorage.setItem('adminRole', role)
    } else {
      localStorage.removeItem('adminRole')
    }
  }

  // Computed
  const userPermissions = computed(() => permissions.value)

  const hasPermissionFn = computed(() => {
    return (resource: Resource): boolean => {
      const role = getCurrentRole()
      if (role === 'super_admin') return true
      return permissions.value.has(resource)
    }
  })

  const hasAnyPermission = computed(() => {
    return (resources: Resource[]): boolean => {
      const role = getCurrentRole()
      if (role === 'super_admin') return true
      return resources.some(r => permissions.value.has(r))
    }
  })

  const hasAllPermissions = computed(() => {
    return (resources: Resource[]): boolean => {
      const role = getCurrentRole()
      if (role === 'super_admin') return true
      return resources.every(r => permissions.value.has(r))
    }
  })

  const role = computed(() => getCurrentRole())

  const isSuperAdmin = computed(() => getCurrentRole() === 'super_admin')

  const isAdmin = computed(() => {
    const r = getCurrentRole()
    return r === 'super_admin' || r === 'admin'
  })

  const isOperator = computed(() => getCurrentRole() === 'operator')

  const canManageISV = computed(() => hasPermissionFn.value(EnumResource.ISV_MANAGE))

  const canApproveKYB = computed(() => hasPermissionFn.value(EnumResource.ISV_KYB))

  const canManageApp = computed(() => hasPermissionFn.value(EnumResource.APP_MANAGE))

  const canViewAnalytics = computed(() => hasPermissionFn.value(EnumResource.ANALYTICS_VIEW))

  const canExportData = computed(() => hasPermissionFn.value(EnumResource.ANALYTICS_EXPORT))

  const canViewAudit = computed(() => hasPermissionFn.value(EnumResource.AUDIT_VIEW))

  const canManageSystem = computed(() => hasPermissionFn.value(EnumResource.SYSTEM_CONFIG))

  // Actions
  function loadPermissions(role?: AdminRole): void {
    const currentRole = role || getCurrentRole()
    if (!currentRole) {
      permissions.value = new Set()
      return
    }

    // Get permissions from role
    const rolePerms = ROLE_PERMISSIONS_MAP[currentRole] || []
    permissions.value = new Set(rolePerms)
    setRole(currentRole)
  }

  function setPermissions(perms: Resource[]): void {
    permissions.value = new Set(perms)
  }

  function addPermission(perm: Resource): void {
    permissions.value.add(perm)
  }

  function removePermission(perm: Resource): void {
    permissions.value.delete(perm)
  }

  function clearPermissions(): void {
    permissions.value.clear()
  }

  function reset(): void {
    clearPermissions()
    loadPermissions()
  }

  // Set role from external (called by auth store after login)
  function updateRole(newRole: AdminRole): void {
    setRole(newRole)
    loadPermissions(newRole)
  }

  return {
    // State
    permissions,
    userPermissions,
    role,

    // Computed
    hasPermission: hasPermissionFn,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    isAdmin,
    isOperator,
    canManageISV,
    canApproveKYB,
    canManageApp,
    canViewAnalytics,
    canExportData,
    canViewAudit,
    canManageSystem,

    // Actions
    loadPermissions,
    setPermissions,
    addPermission,
    removePermission,
    clearPermissions,
    reset,
    updateRole
  }
})
