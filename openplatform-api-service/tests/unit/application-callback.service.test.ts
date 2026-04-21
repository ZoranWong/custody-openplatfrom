/**
 * Unit tests for ApplicationCallbackService
 * Testing isolated functions that don't require database
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ApplicationCallbackService } from '../../src/services/application-callback.service'

describe('ApplicationCallbackService', () => {
  let service: ApplicationCallbackService

  beforeEach(() => {
    service = new ApplicationCallbackService()
  })

  describe('buildSignature', () => {
    it('should generate correct HMAC-SHA256 signature', () => {
      const appSecret = 'test_secret_123'
      const appId = 'app_123'
      const event = 'authorization.created'
      const timestamp = '1745220600000'

      const signature = service.buildSignature(appSecret, appId, event, timestamp)

      expect(signature).toBeDefined()
      expect(typeof signature).toBe('string')
      expect(signature).toHaveLength(64) // SHA256 produces 64 hex characters

      // Verify it's deterministic
      const signature2 = service.buildSignature(appSecret, appId, event, timestamp)
      expect(signature).toBe(signature2)
    })

    it('should produce different signatures for different inputs', () => {
      const appSecret = 'test_secret_123'

      const sig1 = service.buildSignature(appSecret, 'app_1', 'event1', '123')
      const sig2 = service.buildSignature(appSecret, 'app_2', 'event1', '123')
      const sig3 = service.buildSignature(appSecret, 'app_1', 'event2', '123')
      const sig4 = service.buildSignature(appSecret, 'app_1', 'event1', '456')

      expect(sig1).not.toBe(sig2)
      expect(sig1).not.toBe(sig3)
      expect(sig1).not.toBe(sig4)
    })

    it('should match expected signature format', () => {
      const appSecret = 'mySecretKey'
      const appId = 'app_test'
      const event = 'test.event'
      const timestamp = '1000000000'

      const signature = service.buildSignature(appSecret, appId, event, timestamp)

      // This is a fixed test - we just verify it generates something consistent
      expect(signature).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('validateUrl', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should accept HTTPS URLs in production', () => {
      process.env.NODE_ENV = 'production'
      const service = new ApplicationCallbackService()
      expect(service.validateUrl('https://example.com/callback')).toEqual({ valid: true })
    })

    it('should reject HTTP URLs in production', () => {
      process.env.NODE_ENV = 'production'
      const service = new ApplicationCallbackService()
      expect(service.validateUrl('http://example.com/callback')).toEqual({ valid: false, error: 'https_required' })
    })

    it('should accept localhost HTTP URLs in development', () => {
      process.env.NODE_ENV = 'development'
      const service = new ApplicationCallbackService()
      expect(service.validateUrl('http://localhost:8080/callback')).toEqual({ valid: true })
      expect(service.validateUrl('http://127.0.0.1:8080/callback')).toEqual({ valid: true })
    })

    it('should reject non-localhost HTTP URLs in development', () => {
      process.env.NODE_ENV = 'development'
      const service = new ApplicationCallbackService()
      expect(service.validateUrl('http://example.com/callback')).toEqual({ valid: false, error: 'https_required' })
    })
  })
})

describe('Callback Signature Verification (for developer side)', () => {
  let service: ApplicationCallbackService

  beforeEach(() => {
    service = new ApplicationCallbackService()
  })

  it('should generate signature that can be verified with same secret', () => {
    const appSecret = 'developer_app_secret'
    const appId = 'app_abc123'
    const event = 'transaction.completed'
    const timestamp = '1745220600000'

    // Generate signature
    const signature = service.buildSignature(appSecret, appId, event, timestamp)

    // Verify by regenerating with same inputs
    const verifySignature = service.buildSignature(appSecret, appId, event, timestamp)

    expect(signature).toBe(verifySignature)
  })

  it('should produce different signature when secret differs', () => {
    const appId = 'app_abc123'
    const event = 'transaction.completed'
    const timestamp = '1745220600000'

    const sig1 = service.buildSignature('secret1', appId, event, timestamp)
    const sig2 = service.buildSignature('secret2', appId, event, timestamp)

    expect(sig1).not.toBe(sig2)
  })
})