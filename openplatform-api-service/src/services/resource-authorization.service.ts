/**
 * Resource Authorization Service
 * Verifies that appId has permission to access resourceKey
 */

import { getPrismaClient } from '../database/prisma-client'
import { getAuthorizationCache } from './authorization-cache.service'
import { logger } from '../utils/logger'

/**
 * Log authorization failure
 */
function logAuthorizationFailure(
  appId: string,
  resourceKey: string,
  reason: string,
  details?: Record<string, unknown>
): void {
  logger.warn('Authorization failed', {
    type: 'audit',
    event: 'authorization_failed',
    appId,
    resourceKey,
    reason,
    ...details,
  })
}

/**
 * Authorization check result
 */
export interface AuthorizationResult {
  /**
   * Whether authorization is granted
   */
  authorized: boolean

  /**
   * OAuthResource ID if authorized
   */
  authorizationId?: string

  /**
   * Associated user ID
   */
  userId?: string

  /**
   * Resource key
   */
  resourceKey?: string

  /**
   * Authorization expires at
   */
  expiresAt?: Date

  /**
   * Error code if not authorized
   */
  errorCode?: string

  /**
   * Error message if not authorized
   */
  errorMessage?: string
}

/**
 * Authorization check options
 */
export interface AuthorizationCheckOptions {
  /**
   * Required operation (for future scope validation)
   */
  operation?: string

  /**
   * Whether to check expiration
   */
  checkExpiration?: boolean
}

/**
 * Resource Authorization Service
 */
export class ResourceAuthorizationService {
  /**
   * Check if appId has authorization to access resourceKey
   */
  async checkAuthorization(
    appId: string,
    resourceKey: string,
    options: AuthorizationCheckOptions = {}
  ): Promise<AuthorizationResult> {
    const { operation, checkExpiration = true } = options

    // Try to get from cache first (skip cache if checkExpiration is false)
    if (checkExpiration) {
      const cache = getAuthorizationCache()
      const cachedResult = cache.get(appId, resourceKey)
      if (cachedResult) {
        return cachedResult
      }
    }

    const prisma = getPrismaClient()

    try {
      // Query authorization record
      const oauthResource = await prisma.oauthResource.findFirst({
        where: {
          appId,
          resourceKey,
          status: 'active'
        }
      })

      // Check if authorization exists
      if (!oauthResource) {
        logAuthorizationFailure(appId, resourceKey, 'resource_not_authorized')
        return {
          authorized: false,
          errorCode: 'RESOURCE_NOT_AUTHORIZED',
          errorMessage: 'Resource key not authorized for this application'
        }
      }

      // Check if authorization is active
      if (oauthResource.status !== 'active') {
        logAuthorizationFailure(appId, resourceKey, 'authorization_inactive', {
          status: oauthResource.status,
        })
        return {
          authorized: false,
          errorCode: 'AUTHORIZATION_INACTIVE',
          errorMessage: 'Authorization is not active'
        }
      }

      // Check expiration if required
      if (checkExpiration && oauthResource.expiresAt) {
        if (oauthResource.expiresAt < new Date()) {
          logAuthorizationFailure(appId, resourceKey, 'authorization_expired', {
            expiresAt: oauthResource.expiresAt.toISOString(),
          })
          return {
            authorized: false,
            errorCode: 'AUTHORIZATION_EXPIRED',
            errorMessage: 'Authorization has expired'
          }
        }
      }

      // Future: Scope verification
      // Currently not implemented - scope field doesn't exist in OAuthResource
      // When scope is added, verify operation is within scope
      if (operation) {
        // Placeholder for future scope validation
        // Example: const hasScope = oauthResource.scopes?.includes(operation)
      }

      const result: AuthorizationResult = {
        authorized: true,
        authorizationId: oauthResource.id,
        userId: oauthResource.userId,
        resourceKey: oauthResource.resourceKey || undefined,
        expiresAt: oauthResource.expiresAt || undefined
      }

      // Cache successful result
      if (checkExpiration) {
        const cache = getAuthorizationCache()
        cache.set(appId, resourceKey, result)
      }

      return result
    } catch (error) {
      logger.error('Error checking authorization', {
        type: 'error',
        event: 'authorization_check_error',
        error: error instanceof Error ? error.message : String(error),
        appId,
        resourceKey,
      })
      return {
        authorized: false,
        errorCode: 'INTERNAL_ERROR',
        errorMessage: 'Error checking authorization'
      }
    }
  }

  /**
   * Get authorization details by ID
   */
  async getAuthorizationById(authorizationId: string): Promise<AuthorizationResult | null> {
    const prisma = getPrismaClient()

    try {
      const oauthResource = await prisma.oauthResource.findUnique({
        where: { id: authorizationId }
      })

      if (!oauthResource) {
        return null
      }

      return {
        authorized: oauthResource.status === 'active',
        authorizationId: oauthResource.id,
        userId: oauthResource.userId,
        resourceKey: oauthResource.resourceKey || undefined,
        expiresAt: oauthResource.expiresAt || undefined,
        errorCode: oauthResource.status !== 'active' ? 'AUTHORIZATION_INACTIVE' : undefined,
        errorMessage: oauthResource.status !== 'active' ? 'Authorization is not active' : undefined
      }
    } catch (error) {
      logger.error('Error getting authorization', {
        type: 'error',
        event: 'get_authorization_error',
        error: error instanceof Error ? error.message : String(error),
        authorizationId,
      })
      return null
    }
  }

  /**
   * Check multiple resource keys for a single appId
   */
  async checkMultipleResources(
    appId: string,
    resourceKeys: string[]
  ): Promise<Map<string, AuthorizationResult>> {
    const results = new Map<string, AuthorizationResult>()

    await Promise.all(
      resourceKeys.map(async (resourceKey) => {
        const result = await this.checkAuthorization(appId, resourceKey)
        results.set(resourceKey, result)
      })
    )

    return results
  }

  /**
   * Invalidate cache for specific authorization
   * Call this when authorization is updated or revoked
   * @param appId Application ID
   * @param resourceKey Resource key
   */
  invalidateCache(appId: string, resourceKey: string): void {
    const cache = getAuthorizationCache()
    cache.invalidate(appId, resourceKey)
  }

  /**
   * Invalidate all cache entries for an appId
   * Call this when app's authorizations are changed
   * @param appId Application ID
   */
  invalidateCacheByAppId(appId: string): void {
    const cache = getAuthorizationCache()
    cache.invalidateByAppId(appId)
  }

  /**
   * Invalidate cache by userId
   * Call this when user's authorizations are changed
   * @param userId User ID
   */
  invalidateCacheByUserId(userId: string): void {
    const cache = getAuthorizationCache()
    cache.invalidateByUserId(userId)
  }
}

// Default singleton instance
let authorizationService: ResourceAuthorizationService | null = null

/**
 * Get the default ResourceAuthorizationService instance
 */
export function getAuthorizationService(): ResourceAuthorizationService {
  if (!authorizationService) {
    authorizationService = new ResourceAuthorizationService()
  }
  return authorizationService
}

export default {
  ResourceAuthorizationService,
  getAuthorizationService
}
