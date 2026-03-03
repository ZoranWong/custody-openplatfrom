/**
 * Permission Check Middleware
 * Validates endpoint permissions for API requests
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/jwt.types';
import {
  PermissionCheckService,
  createPermissionCheckService,
} from '../services/permission-check.service';

/**
 * Configuration for permission check middleware
 */
export interface PermissionCheckMiddlewareConfig {
  /**
   * Paths to exclude from permission check
   * @default ['/health', '/ready', '/metrics', '/oauth', '/api/public']
   */
  excludePaths?: string[];

  /**
   * Paths that don't require specific permissions but still go through binding validation
   * @default ['/api/v1/health', '/api/v1/status']
   */
  publicPaths?: string[];

  /**
   * Custom permission check service
   */
  permissionService?: PermissionCheckService;

  /**
   * Whether to use permissions from request (from binding validation)
   * @default true
   */
  useRequestPermissions?: boolean;
}

/**
 * Create permission check middleware
 */
export function createPermissionCheckMiddleware(
  config?: PermissionCheckMiddlewareConfig
) {
  const permissionService =
    config?.permissionService ||
    createPermissionCheckService();

  const excludePaths = config?.excludePaths ?? [
    '/health',
    '/ready',
    '/metrics',
    '/oauth',
  ];

  const publicPaths = config?.publicPaths ?? [
    '/api/v1/health',
    '/api/v1/status',
  ];

  const useRequestPermissions = config?.useRequestPermissions ?? true;

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Generate trace_id if not present
    const traceId =
      (req.headers['x-trace-id'] as string) ||
      res.getHeader('X-Trace-Id') ||
      `perm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    res.setHeader('X-Trace-Id', traceId as string);

    // Skip excluded paths
    if (excludePaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Skip public paths
    if (publicPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Get appid from JWT-authenticated request
    const appid = req.appid;

    if (!appid) {
      // No appid means request didn't pass JWT authentication
      // Let other middleware handle this
      return next();
    }

    // Get enterprise_id from validated request
    const enterpriseId = req.enterprise_id;

    // Get permissions from request (set by binding validation middleware)
    const requestPermissions = useRequestPermissions ? req.permissions : undefined;

    // Perform permission check
    const result = await permissionService.checkEndpointPermission(
      appid,
      enterpriseId,
      req.path,
      req.method,
      requestPermissions
    );

    if (!result.allowed) {
      res.status(403).json({
        code: result.error_code,
        message: result.error_message,
        trace_id: traceId,
        ...(result.missing_permissions && {
          missing_permissions: result.missing_permissions,
        }),
      });
      return;
    }

    // Update request with merged permissions (deduplicated using Set)
    if (result.matched_config?.required_permissions) {
      const existingPermissions = new Set(req.permissions || []);
      const newPermissions = result.matched_config.required_permissions.filter(
        (p: string) => !existingPermissions.has(p)
      );
      req.permissions = [...(req.permissions || []), ...newPermissions];
    }

    next();
  };
}

/**
 * Permission check middleware instance
 * Use this for simple cases without custom configuration
 */
export const permissionCheckMiddleware = createPermissionCheckMiddleware();

/**
 * Factory for creating middleware with custom permission service
 */
export function withPermissionService(
  permissionService: PermissionCheckService,
  config?: Partial<PermissionCheckMiddlewareConfig>
) {
  return createPermissionCheckMiddleware({
    ...config,
    permissionService,
  });
}

/**
 * Require specific permission middleware
 * Use this for requiring a single permission on a specific route
 */
export function requirePermission(permission: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const appid = req.appid;
    const enterpriseId = req.enterprise_id;
    const permissions = req.permissions || [];

    if (!appid) {
      return next();
    }

    if (!permissions.includes(permission)) {
      const traceId =
        (req.headers['x-trace-id'] as string) ||
        res.getHeader('X-Trace-Id') ||
        `perm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      res.status(403).json({
        code: 40305,
        message: `Permission denied. Required: ${permission}`,
        trace_id: traceId,
        missing_permissions: [permission],
      });
      return;
    }

    next();
  };
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const appid = req.appid;
    const grantedPermissions = req.permissions || [];

    if (!appid) {
      return next();
    }

    const hasPermission = permissions.some((p) =>
      grantedPermissions.includes(p)
    );

    if (!hasPermission) {
      const traceId =
        (req.headers['x-trace-id'] as string) ||
        res.getHeader('X-Trace-Id') ||
        `perm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      res.status(403).json({
        code: 40305,
        message: `Permission denied. Required one of: ${permissions.join(', ')}`,
        trace_id: traceId,
        missing_permissions: permissions.filter(
          (p) => !grantedPermissions.includes(p)
        ),
      });
      return;
    }

    next();
  };
}
