/**
 * Resource Authorization Service
 * Verifies that appId has permission to access resourceKey
 */

import { getOauthResourceRepository } from '../repositories/repository.factory'
import { getAuthorizationCache } from './authorization-cache.service'
import { logger } from '../utils/logger'

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

export interface AuthorizationResult {
  authorized: boolean
  authorizationId?: string
  userId?: string
  resourceKey?: string
  expiresAt?: Date
  errorCode?: string
  errorMessage?: string
}

export interface AuthorizationCheckOptions {
  operation?: string
  checkExpiration?: boolean
}

export class ResourceAuthorizationService {
  async checkAuthorization(
    appId: string,
      authorizationId: string,
    options: AuthorizationCheckOptions = {}
  ): Promise<AuthorizationResult> {
    const { operation, checkExpiration = true } = options

    if (checkExpiration) {
      const cache = getAuthorizationCache()
        const cachedResult = cache.get(appId, authorizationId)
      if (cachedResult) {
        return cachedResult
      }
    }

    const repo = getOauthResourceRepository()

    try {
        const oauthResource = await repo.findById(authorizationId)

      if (!oauthResource) {
          logAuthorizationFailure(appId, authorizationId, 'resource_not_authorized')
        return {
          authorized: false,
          errorCode: 'RESOURCE_NOT_AUTHORIZED',
          errorMessage: 'Resource key not authorized for this application',
        }
      }

      if (oauthResource.status !== 'active') {
          logAuthorizationFailure(appId, authorizationId, 'authorization_inactive', {
          status: oauthResource.status,
        })
        return {
          authorized: false,
          errorCode: 'AUTHORIZATION_INACTIVE',
          errorMessage: 'Authorization is not active',
        }
      }

      if (checkExpiration && oauthResource.expiresAt) {
        if (oauthResource.expiresAt < new Date()) {
            logAuthorizationFailure(appId, authorizationId, 'authorization_expired', {
            expiresAt: oauthResource.expiresAt.toISOString(),
          })
          return {
            authorized: false,
            errorCode: 'AUTHORIZATION_EXPIRED',
            errorMessage: 'Authorization has expired',
          }
        }
      }

      if (operation) {
        // Placeholder for future scope validation
      }

      const result: AuthorizationResult = {
        authorized: true,
        authorizationId: oauthResource.id,
        resourceKey: oauthResource.resourceKey || undefined,
        expiresAt: oauthResource.expiresAt || undefined,
      }

      if (checkExpiration) {
        const cache = getAuthorizationCache()
          cache.set(appId, authorizationId, result)
      }

      return result
    } catch (error) {
      logger.error('Error checking authorization', {
        type: 'error',
        event: 'authorization_check_error',
        error: error instanceof Error ? error.message : String(error),
        appId,
          authorizationId,
      })
      return {
        authorized: false,
        errorCode: 'INTERNAL_ERROR',
        errorMessage: 'Error checking authorization',
      }
    }
  }

  async getAuthorizationById(authorizationId: string): Promise<AuthorizationResult | null> {
    const repo = getOauthResourceRepository()

    try {
      const oauthResource = await repo.findById(authorizationId)

      if (!oauthResource) {
        return null
      }

      return {
        authorized: oauthResource.status === 'active',
        authorizationId: oauthResource.id,
        resourceKey: oauthResource.resourceKey || undefined,
        expiresAt: oauthResource.expiresAt || undefined,
        errorCode: oauthResource.status !== 'active' ? 'AUTHORIZATION_INACTIVE' : undefined,
        errorMessage: oauthResource.status !== 'active' ? 'Authorization is not active' : undefined,
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

  invalidateCache(appId: string, resourceKey: string): void {
    const cache = getAuthorizationCache()
    cache.invalidate(appId, resourceKey)
  }

  invalidateCacheByAppId(appId: string): void {
    const cache = getAuthorizationCache()
    cache.invalidateByAppId(appId)
  }

  invalidateCacheByUserId(userId: string): void {
    const cache = getAuthorizationCache()
    cache.invalidateByUserId(userId)
  }
}

let authorizationService: ResourceAuthorizationService | null = null

export function getAuthorizationService(): ResourceAuthorizationService {
  if (!authorizationService) {
    authorizationService = new ResourceAuthorizationService()
  }
  return authorizationService
}

export default {
  ResourceAuthorizationService,
  getAuthorizationService,
}
