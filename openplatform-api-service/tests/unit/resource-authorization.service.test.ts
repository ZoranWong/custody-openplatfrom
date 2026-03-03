/**
 * Resource Authorization Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock prisma client
const mockOauthResource = {
  findFirst: vi.fn(),
  findUnique: vi.fn()
}

const mockPrisma = {
  oauthResource: mockOauthResource
}

vi.mock('../../src/database/prisma-client', () => ({
  getPrismaClient: vi.fn(() => mockPrisma)
}))

// Mock authorization cache
vi.mock('../../src/services/authorization-cache.service', () => ({
  getAuthorizationCache: vi.fn(() => ({
    get: vi.fn(() => null),
    set: vi.fn()
  })),
  resetAuthorizationCache: vi.fn()
}))

import { ResourceAuthorizationService } from '../../src/services/resource-authorization.service'

describe('ResourceAuthorizationService', () => {
  let service: ResourceAuthorizationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ResourceAuthorizationService()
  })

  describe('checkAuthorization', () => {
    const appId = 'app-123'
    const resourceKey = 'resource-456'

    it('should return authorized when valid OAuthResource exists', async () => {
      const mockOauth = {
        id: 'oauth-1',
        appId,
        userId: 'user-1',
        resourceKey,
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000) // 1 day from now
      }

      mockOauthResource.findFirst.mockResolvedValue(mockOauth)

      const result = await service.checkAuthorization(appId, resourceKey)

      expect(result.authorized).toBe(true)
      expect(result.authorizationId).toBe('oauth-1')
      expect(result.userId).toBe('user-1')
      expect(result.resourceKey).toBe(resourceKey)
    })

    it('should return unauthorized when OAuthResource not found', async () => {
      mockOauthResource.findFirst.mockResolvedValue(null)

      const result = await service.checkAuthorization(appId, resourceKey)

      expect(result.authorized).toBe(false)
      expect(result.errorCode).toBe('RESOURCE_NOT_AUTHORIZED')
    })

    it('should return unauthorized when status is not active', async () => {
      mockOauthResource.findFirst.mockResolvedValue({
        id: 'oauth-1',
        appId,
        userId: 'user-1',
        resourceKey,
        status: 'revoked'
      })

      const result = await service.checkAuthorization(appId, resourceKey)

      expect(result.authorized).toBe(false)
      expect(result.errorCode).toBe('AUTHORIZATION_INACTIVE')
    })

    it('should return unauthorized when authorization expired', async () => {
      mockOauthResource.findFirst.mockResolvedValue({
        id: 'oauth-1',
        appId,
        userId: 'user-1',
        resourceKey,
        status: 'active',
        expiresAt: new Date(Date.now() - 86400000) // 1 day ago
      })

      const result = await service.checkAuthorization(appId, resourceKey)

      expect(result.authorized).toBe(false)
      expect(result.errorCode).toBe('AUTHORIZATION_EXPIRED')
    })

    it('should skip expiration check when checkExpiration is false', async () => {
      mockOauthResource.findFirst.mockResolvedValue({
        id: 'oauth-1',
        appId,
        userId: 'user-1',
        resourceKey,
        status: 'active',
        expiresAt: new Date(Date.now() - 86400000) // Expired
      })

      const result = await service.checkAuthorization(appId, resourceKey, {
        checkExpiration: false
      })

      expect(result.authorized).toBe(true)
    })

    it('should handle null expiresAt', async () => {
      mockOauthResource.findFirst.mockResolvedValue({
        id: 'oauth-1',
        appId,
        userId: 'user-1',
        resourceKey,
        status: 'active',
        expiresAt: null
      })

      const result = await service.checkAuthorization(appId, resourceKey)

      expect(result.authorized).toBe(true)
      expect(result.expiresAt).toBeUndefined()
    })
  })

  describe('getAuthorizationById', () => {
    it('should return authorization when found', async () => {
      const mockOauth = {
        id: 'oauth-1',
        appId: 'app-123',
        userId: 'user-1',
        resourceKey: 'resource-456',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000)
      }

      mockOauthResource.findUnique.mockResolvedValue(mockOauth)

      const result = await service.getAuthorizationById('oauth-1')

      expect(result).not.toBeNull()
      expect(result?.authorized).toBe(true)
      expect(result?.authorizationId).toBe('oauth-1')
    })

    it('should return null when not found', async () => {
      mockOauthResource.findUnique.mockResolvedValue(null)

      const result = await service.getAuthorizationById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('checkMultipleResources', () => {
    it('should check multiple resources', async () => {
      const resources = ['resource-1', 'resource-2', 'resource-3']

      mockOauthResource.findFirst
        .mockResolvedValueOnce({
          id: 'oauth-1',
          appId: 'app-1',
          userId: 'user-1',
          resourceKey: 'resource-1',
          status: 'active'
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'oauth-3',
          appId: 'app-1',
          userId: 'user-1',
          resourceKey: 'resource-3',
          status: 'active'
        })

      const result = await service.checkMultipleResources('app-1', resources)

      expect(result.size).toBe(3)
      expect(result.get('resource-1')?.authorized).toBe(true)
      expect(result.get('resource-2')?.authorized).toBe(false)
      expect(result.get('resource-3')?.authorized).toBe(true)
    })
  })
})
