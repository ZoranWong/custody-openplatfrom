/**
 * Permission Check Service
 * Core business logic for endpoint permission checking
 */

import { EndpointPermission } from '@prisma/client'
import {
  PermissionCheckResult,
  PermissionErrorCode,
} from '../types/permission.types'
import {
  EndpointPermissionRepository,
} from '../repositories/repository.interfaces'
import {
  getEndpointPermissionRepository,
} from '../repositories/repository.factory'

/**
 * Simple structured logger
 */
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', message, ...data }))
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...data }))
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...data }))
  },
}

/**
 * Configuration for permission check service
 */
export interface PermissionCheckConfig {
  permissionRepository?: EndpointPermissionRepository
}

/**
 * Permission Check Service
 * Handles permission checking using EndpointPermission Prisma model
 * Note: Prisma EndpointPermission has `endpoint` (path) and `permission` (single string)
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
    if (!appid || typeof appid !== 'string' || appid.trim() === '') {
      logger.warn('permission_check_invalid_input', { reason: 'invalid_appid', appid, path, method })
      return {
        allowed: false,
        error_code: PermissionErrorCode.INSUFFICIENT_PERMISSIONS,
        error_message: 'Invalid appid: must be a non-empty string',
      }
    }
    if (!path || typeof path !== 'string') {
      logger.warn('permission_check_invalid_input', { reason: 'invalid_path', appid, path, method })
      return {
        allowed: false,
        error_code: PermissionErrorCode.INSUFFICIENT_PERMISSIONS,
        error_message: 'Invalid path: must be a non-empty string',
      }
    }
    if (!method || typeof method !== 'string') {
      logger.warn('permission_check_invalid_input', { reason: 'invalid_method', appid, path, method })
      return {
        allowed: false,
        error_code: PermissionErrorCode.INSUFFICIENT_PERMISSIONS,
        error_message: 'Invalid method: must be a non-empty string',
      }
    }

    const normalizedMethod = method.toUpperCase()
    const endpointConfig = await this.findMatchingEndpoint(path, normalizedMethod)

    if (!endpointConfig) {
      logger.warn('permission_config_not_found', { appid, enterpriseId, path, method: normalizedMethod })
      return {
        allowed: false,
        error_code: PermissionErrorCode.PERMISSION_CONFIG_NOT_FOUND,
        error_message: 'Permission configuration not found for this endpoint',
      }
    }

    const permissions = appPermissions || []
    const requiredPermissions = [endpointConfig.permission]
    const missingPermissions = this.findMissingPermissions(permissions, requiredPermissions)

    const result: PermissionCheckResult = {
      allowed: missingPermissions.length === 0,
      matched_config: {
        id: endpointConfig.id,
        path: endpointConfig.endpoint,
        method: endpointConfig.method,
        required_permissions: requiredPermissions,
        is_active: endpointConfig.isEnabled,
        created_at: endpointConfig.createdAt.toISOString(),
        updated_at: endpointConfig.updatedAt.toISOString(),
      },
    }

    if (missingPermissions.length > 0) {
      result.missing_permissions = missingPermissions
      result.error_code = PermissionErrorCode.INSUFFICIENT_PERMISSIONS
      result.error_message = `Insufficient permissions. Required: ${missingPermissions.join(', ')}`
      logger.warn('permission_check_denied', { appid, enterpriseId, path, method: normalizedMethod, missing: missingPermissions })
    } else {
      logger.info('permission_check_allowed', { appid, enterpriseId, path, method: normalizedMethod })
    }

    return result
  }

  /**
   * Find matching endpoint permission config
   */
  private async findMatchingEndpoint(path: string, method: string): Promise<EndpointPermission | null> {
    const exactMatch = await this.repository.findByPathAndMethod(path, method)
    if (exactMatch) return exactMatch

    const allMethodMatch = await this.repository.findByPathAndMethod(path, 'ALL')
    if (allMethodMatch) return allMethodMatch

    const configs = await this.repository.findAll()
    for (const config of configs) {
      if (this.pathMatchesPattern(path, config.endpoint)) {
        if (config.method === method || config.method === 'ALL') {
          return config
        }
      }
    }

    return null
  }

  private pathMatchesPattern(path: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
      try {
        const regex = new RegExp(`^${regexPattern}$`)
        return regex.test(path)
      } catch {
        return false
      }
    }
    return path === pattern
  }

  private findMissingPermissions(granted: string[], required: string[]): string[] {
    const grantedSet = new Set(granted)
    return required.filter(perm => !grantedSet.has(perm))
  }

  async hasPermission(permission: string, appPermissions?: string[]): Promise<boolean> {
    return (appPermissions || []).includes(permission)
  }

  async hasAnyPermission(permissions: string[], appPermissions?: string[]): Promise<boolean> {
    const granted = appPermissions || []
    return permissions.some(p => granted.includes(p))
  }

  async hasAllPermissions(required: string[], appPermissions?: string[]): Promise<boolean> {
    const granted = appPermissions || []
    return required.every(p => granted.includes(p))
  }

  async getRequiredPermissions(path: string, method: string): Promise<string[]> {
    const endpointConfig = await this.findMatchingEndpoint(path, method.toUpperCase())
    return endpointConfig ? [endpointConfig.permission] : []
  }
}

export function createPermissionCheckService(config?: PermissionCheckConfig): PermissionCheckService {
  return new PermissionCheckService(config?.permissionRepository)
}
