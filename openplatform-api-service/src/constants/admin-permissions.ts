// ============================================
// Admin Permissions Constants
// ============================================

// Permission levels (hierarchical)
export enum Permission {
  // Basic permissions
  VIEW = 'VIEW',
  MANAGE = 'MANAGE',
  APPROVE = 'APPROVE',
  ADMIN = 'ADMIN'
}

// Admin roles with hierarchy
export type AdminRole = 'super_admin' | 'admin' | 'operator'

// Resource types that can be accessed
export enum Resource {
  // Dashboard
  DASHBOARD = 'DASHBOARD',

  // ISV Management
  ISV_VIEW = 'ISV_VIEW',
  ISV_MANAGE = 'ISV_MANAGE',
  ISV_KYB = 'ISV_KYB',
  ISV_STATUS = 'ISV_STATUS',

  // Application Management
  APP_VIEW = 'APP_VIEW',
  APP_MANAGE = 'APP_MANAGE',

  // Analytics
  ANALYTICS_VIEW = 'ANALYTICS_VIEW',
  ANALYTICS_EXPORT = 'ANALYTICS_EXPORT',

  // System
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  SYSTEM_USERS = 'SYSTEM_USERS',
  SYSTEM_AUDIT = 'SYSTEM_AUDIT',

  // Audit Logs
  AUDIT_VIEW = 'AUDIT_VIEW',
  AUDIT_EXPORT = 'AUDIT_EXPORT'
}

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 100,
  admin: 50,
  operator: 10
}

// Permission matrix: What each role can do
export const ROLE_PERMISSIONS: Record<AdminRole, Resource[]> = {
  super_admin: [
    // Super admin has access to everything
    Resource.DASHBOARD,
    Resource.ISV_VIEW,
    Resource.ISV_MANAGE,
    Resource.ISV_KYB,
    Resource.ISV_STATUS,
    Resource.APP_VIEW,
    Resource.APP_MANAGE,
    Resource.ANALYTICS_VIEW,
    Resource.ANALYTICS_EXPORT,
    Resource.SYSTEM_CONFIG,
    Resource.SYSTEM_USERS,
    Resource.SYSTEM_AUDIT,
    Resource.AUDIT_VIEW,
    Resource.AUDIT_EXPORT
  ],
  admin: [
    // Admin has most operational permissions
    Resource.DASHBOARD,
    Resource.ISV_VIEW,
    Resource.ISV_MANAGE,
    Resource.ISV_KYB,
    Resource.ISV_STATUS,
    Resource.APP_VIEW,
    Resource.APP_MANAGE,
    Resource.ANALYTICS_VIEW,
    Resource.ANALYTICS_EXPORT,
    // Admin cannot modify system config or users
    Resource.AUDIT_VIEW
  ],
  operator: [
    // Operator has limited view permissions
    Resource.DASHBOARD,
    Resource.ISV_VIEW,
    Resource.APP_VIEW,
    Resource.ANALYTICS_VIEW
  ]
}

// Check if a role has a specific permission
export function hasPermission(role: AdminRole, resource: Resource): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.includes(resource)
}

// Check if role A has higher or equal privileges than role B
export function hasHigherOrEqualRole(roleA: AdminRole, roleB: AdminRole): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB]
}

// Get all permissions for a role
export function getPermissionsForRole(role: AdminRole): Resource[] {
  return ROLE_PERMISSIONS[role] || []
}

// Check if a permission string is valid
export function isValidPermission(permission: string): permission is Resource {
  return Object.values(Resource).includes(permission as Resource)
}

// Check if a role string is valid
export function isValidRole(role: string): role is AdminRole {
  return ['super_admin', 'admin', 'operator'].includes(role)
}
