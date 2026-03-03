import { Request, Response, NextFunction } from 'express'
import { Resource, hasPermission, getPermissionsForRole } from '../constants/admin-permissions'

// Extend Express Request to include permission info
declare global {
  namespace Express {
    interface Request {
      requiredPermission?: Resource
      permissionGranted?: boolean
    }
  }
}

// Helper type for permission checking
type PermissionCheck = Resource | Resource[]

/**
 * Check if the admin has the required permission
 */
function checkPermission(adminRole: string, adminId: string, required: PermissionCheck): boolean {
  // Super admin bypasses all permission checks
  if (adminRole === 'super_admin') {
    return true
  }

  // Handle array of permissions (OR logic - user needs at least one)
  if (Array.isArray(required)) {
    return required.some(permission => hasPermission(adminRole as any, permission))
  }

  // Handle single permission
  return hasPermission(adminRole as any, required)
}

/**
 * Middleware factory to require specific permission(s)
 * @param requiredPermission - Single permission or array of permissions (OR logic)
 *
 * Usage:
 *   requirePermission(Resource.ISV_MANAGE)
 *   requirePermission([Resource.ISV_VIEW, Resource.ISV_MANAGE])
 */
export function requirePermission(requiredPermission: PermissionCheck) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const adminRole = (req as any).adminRole
    const adminId = (req as any).adminId

    // Store the required permission for logging
    req.requiredPermission = Array.isArray(requiredPermission)
      ? requiredPermission[0]
      : requiredPermission

    // Check permission
    const hasAccess = checkPermission(adminRole, adminId, requiredPermission)
    req.permissionGranted = hasAccess

    if (!hasAccess) {
      res.status(403).json({
        code: 40302,
        message: 'Permission denied',
        data: {
          required: Array.isArray(requiredPermission)
            ? requiredPermission
            : requiredPermission,
          granted: false
        },
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    next()
  }
}

/**
 * Middleware to require multiple permissions (AND logic)
 * @param requiredPermissions - Array of permissions (user needs ALL of them)
 *
 * Usage:
 *   requireAllPermissions([Resource.ISV_MANAGE, Resource.APP_MANAGE])
 */
export function requireAllPermissions(requiredPermissions: Resource[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const adminRole = (req as any).adminRole
    const adminId = (req as any).adminId

    // Super admin bypasses all permission checks
    if (adminRole === 'super_admin') {
      next()
      return
    }

    // Check ALL permissions
    const hasAll = requiredPermissions.every(permission =>
      hasPermission(adminRole as any, permission)
    )

    if (!hasAll) {
      res.status(403).json({
        code: 40302,
        message: 'Permission denied - insufficient permissions',
        data: {
          required: requiredPermissions,
          granted: false
        },
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    next()
  }
}

/**
 * Middleware to require admin or higher role
 */
export function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  const adminRole = (req as any).adminRole

  if (adminRole === 'operator') {
    res.status(403).json({
      code: 40303,
      message: 'Operator role cannot access this resource',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
    return
  }

  next()
}

/**
 * Middleware to require super_admin role only
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminRole = (req as any).adminRole

  if (adminRole !== 'super_admin') {
    res.status(403).json({
      code: 40304,
      message: 'Super admin access required',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
    return
  }

  next()
}

/**
 * Middleware that adds permission info to request for downstream use
 */
export function addPermissionContext(req: Request, _res: Response, next: NextFunction): void {
  const adminRole = (req as any).adminRole
  const adminId = (req as any).adminId

  // Add permissions array to request
  ;(req as any).permissions = getPermissionsForRole(adminRole as any)

  next()
}
