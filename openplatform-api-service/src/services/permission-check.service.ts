/**
 * Permission Check Service
 * Core business logic for endpoint permission checking
 */

import {
  PermissionCheckResult,
  EndpointPermissionConfig,
  PermissionErrorCode,
} from '../types/permission.types';
import {
  EndpointPermissionRepository,
} from '../repositories/repository.interfaces';
import {
  getEndpointPermissionRepository,
} from '../repositories/repository.factory';

/**
 * Simple structured logger
 */
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', message, ...data }));
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...data }));
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...data }));
  },
};

/**
 * Configuration for permission check service
 */
export interface PermissionCheckConfig {
  /**
   * Repository for endpoint permissions
   */
  permissionRepository?: EndpointPermissionRepository;
}

/**
 * Permission Check Service
 * Handles permission checking
 */
export class PermissionCheckService {
  constructor(
    private readonly repository: EndpointPermissionRepository = getEndpointPermissionRepository()
  ) {}

  /**
   * Check if an app has permission to access an endpoint
   */
  async checkEndpointPermission(
    appid: string,
    enterpriseId: string | null | undefined,
    path: string,
    method: string,
    appPermissions?: string[]
  ): Promise<PermissionCheckResult> {
    // Validate input - return error result instead of throwing
    if (!appid || typeof appid !== 'string' || appid.trim() === '') {
      const result: PermissionCheckResult = {
        allowed: false,
        error_code: PermissionErrorCode.INSUFFICIENT_PERMISSIONS,
        error_message: 'Invalid appid: must be a non-empty string',
      };
      logger.warn('permission_check_invalid_input', {
        reason: 'invalid_appid',
        appid,
        path,
        method,
      });
      return result;
    }
    if (!path || typeof path !== 'string') {
      const result: PermissionCheckResult = {
        allowed: false,
        error_code: PermissionErrorCode.INSUFFICIENT_PERMISSIONS,
        error_message: 'Invalid path: must be a non-empty string',
      };
      logger.warn('permission_check_invalid_input', {
        reason: 'invalid_path',
        appid,
        path,
        method,
      });
      return result;
    }
    if (!method || typeof method !== 'string') {
      const result: PermissionCheckResult = {
        allowed: false,
        error_code: PermissionErrorCode.INSUFFICIENT_PERMISSIONS,
        error_message: 'Invalid method: must be a non-empty string',
      };
      logger.warn('permission_check_invalid_input', {
        reason: 'invalid_method',
        appid,
        path,
        method,
      });
      return result;
    }

    const normalizedMethod = method.toUpperCase();

    // Find endpoint permission config
    const endpointConfig = await this.findMatchingEndpoint(path, normalizedMethod);

    if (!endpointConfig) {
      const result: PermissionCheckResult = {
        allowed: false,
        error_code: PermissionErrorCode.PERMISSION_CONFIG_NOT_FOUND,
        error_message: 'Permission configuration not found for this endpoint',
      };

      logger.warn('permission_config_not_found', {
        appid,
        enterpriseId,
        path,
        method: normalizedMethod,
      });

      return result;
    }

    // Get app permissions
    const permissions = appPermissions || [];

    // Check if app has all required permissions
    const missingPermissions = this.findMissingPermissions(
      permissions,
      endpointConfig.required_permissions
    );

    const result: PermissionCheckResult = {
      allowed: missingPermissions.length === 0,
      matched_config: endpointConfig,
    };

    if (missingPermissions.length > 0) {
      result.missing_permissions = missingPermissions;
      result.error_code = PermissionErrorCode.INSUFFICIENT_PERMISSIONS;
      result.error_message = `Insufficient permissions. Required: ${missingPermissions.join(', ')}`;

      logger.warn('permission_check_denied', {
        appid,
        enterpriseId,
        path,
        method: normalizedMethod,
        missing: missingPermissions,
      });
    } else {
      logger.info('permission_check_allowed', {
        appid,
        enterpriseId,
        path,
        method: normalizedMethod,
        permissionCount: permissions.length,
      });
    }

    return result;
  }

  /**
   * Find matching endpoint permission config
   * Supports exact match and wildcard patterns
   */
  private async findMatchingEndpoint(
    path: string,
    method: string
  ): Promise<EndpointPermissionConfig | null> {
    // Try exact match first
    const exactMatch = await this.repository.findByPathAndMethod(path, method);
    if (exactMatch) {
      return exactMatch;
    }

    // Try ALL method wildcard
    const allMethodMatch = await this.repository.findByPathAndMethod(path, 'ALL');
    if (allMethodMatch) {
      return allMethodMatch;
    }

    // Try path pattern matching
    const configs = await this.repository.findMany({});
    for (const config of configs) {
      if (this.pathMatchesPattern(path, config.path)) {
        // Check if method matches
        if (
          config.method === method ||
          config.method === 'ALL'
        ) {
          return config;
        }
      }
    }

    return null;
  }

  /**
   * Check if a path matches a pattern
   */
  private pathMatchesPattern(path: string, pattern: string): boolean {
    // Handle wildcard patterns
    if (pattern.includes('*')) {
      // Convert wildcard to regex
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\*\*/g, '.*') // ** matches anything
        .replace(/\*/g, '[^/]*'); // * matches any chars except /

      try {
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
      } catch {
        return false;
      }
    }

    return path === pattern;
  }

  /**
   * Find permissions that are required but not granted
   */
  private findMissingPermissions(
    granted: string[],
    required: string[]
  ): string[] {
    const grantedSet = new Set(granted);
    const missing: string[] = [];

    for (const perm of required) {
      if (!grantedSet.has(perm)) {
        missing.push(perm);
      }
    }

    return missing;
  }

  /**
   * Check if app has a specific permission
   */
  async hasPermission(
    permission: string,
    appPermissions?: string[]
  ): Promise<boolean> {
    const permissions = appPermissions || [];
    return permissions.includes(permission);
  }

  /**
   * Check if app has any of the specified permissions
   */
  async hasAnyPermission(
    permissions: string[],
    appPermissions?: string[]
  ): Promise<boolean> {
    const granted = appPermissions || [];
    return permissions.some((p) => granted.includes(p));
  }

  /**
   * Check if app has all of the specified permissions
   */
  async hasAllPermissions(
    required: string[],
    appPermissions?: string[]
  ): Promise<boolean> {
    const granted = appPermissions || [];
    return required.every((p) => granted.includes(p));
  }

  /**
   * Get all required permissions for a path
   */
  async getRequiredPermissions(
    path: string,
    method: string
  ): Promise<string[]> {
    const endpointConfig = await this.findMatchingEndpoint(
      path,
      method.toUpperCase()
    );
    return endpointConfig?.required_permissions || [];
  }
}

/**
 * Create permission check service
 */
export function createPermissionCheckService(
  config?: PermissionCheckConfig
): PermissionCheckService {
  return new PermissionCheckService(config?.permissionRepository);
}
