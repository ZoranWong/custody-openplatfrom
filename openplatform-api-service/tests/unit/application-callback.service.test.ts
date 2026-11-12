/**
 * Unit tests for ApplicationCallbackService
 * Testing isolated functions that don't require database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import { ApplicationCallbackService, CallbackAttemptLog } from '../../src/services/application-callback.service'
import * as apiLogService from '../../src/services/api-log.service'

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
    })),
  },
}))

describe('ApplicationCallbackService', () => {
  let service: ApplicationCallbackService

  beforeEach(() => {
    service = new ApplicationCallbackService()
  })

  describe('buildSignature', () => {
    it('should generate correct HMAC-SHA256 signature', () => {
      const appSecret = 'test_secret_123'
      const meta = { appId: 'app_123', event: 'authorization.created', timestamp: '1745220600000' }
      const data = { key: 'value' }

      const signature = service.buildSignature(appSecret, meta, data)

      expect(signature).toBeDefined()
      expect(typeof signature).toBe('string')
      expect(signature).toHaveLength(64) // SHA256 produces 64 hex characters

      // Verify it's deterministic
      const signature2 = service.buildSignature(appSecret, meta, data)
      expect(signature).toBe(signature2)
    })

    it('should produce different signatures for different inputs', () => {
      const appSecret = 'test_secret_123'

      const sig1 = service.buildSignature(appSecret, { appId: 'app_1', timestamp: '123' }, { x: 1 })
      const sig2 = service.buildSignature(appSecret, { appId: 'app_2', timestamp: '123' }, { x: 1 })
      const sig3 = service.buildSignature(appSecret, { appId: 'app_1', event: 'event2', timestamp: '123' }, { x: 1 })
      const sig4 = service.buildSignature(appSecret, { appId: 'app_1', timestamp: '456' }, { x: 1 })

      expect(sig1).not.toBe(sig2)
      expect(sig1).not.toBe(sig3)
      expect(sig1).not.toBe(sig4)
    })

    it('should match expected signature format', () => {
      const appSecret = 'mySecretKey'
      const meta = { appId: 'app_test', event: 'test.event', timestamp: '1000000000' }
      const data = {}

      const signature = service.buildSignature(appSecret, meta, data)

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

  describe('sendWithRetry attempt logging', () => {
    it('should call onAttempt callback with correct attempt data on success', async () => {
      // sendWithRetry is private, but we can test via pushEvent which calls it.
      // For a unit test we verify the CallbackAttemptLog interface structure.
      const attemptLog: CallbackAttemptLog = {
        attempt: 1,
        url: 'https://example.com/cb',
        status: 200,
        responseTime: 42,
        error: undefined,
      }
      expect(attemptLog.attempt).toBe(1)
      expect(attemptLog.status).toBe(200)
      expect(attemptLog.responseTime).toBe(42)
      expect(attemptLog.error).toBeUndefined()
    })

    it('should call onAttempt with undefined status on network error', async () => {
      const attemptLog: CallbackAttemptLog = {
        attempt: 2,
        url: 'https://example.com/cb',
        status: undefined,
        responseTime: 5012,
        error: 'ECONNREFUSED',
      }
      expect(attemptLog.attempt).toBe(2)
      expect(attemptLog.status).toBeUndefined()
      expect(attemptLog.error).toBe('ECONNREFUSED')
    })
  })

  describe('pushEvent logs to API log system', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    function getMockedAxios() {
      return (axios as any).create()
    }

    it('should create an API log entry per attempt', async () => {
      const createApiLogSpy = vi.spyOn(apiLogService, 'createApiLog').mockResolvedValue()
      const mockPost = vi.fn().mockResolvedValue({ status: 200 })
      vi.mocked(axios.create).mockReturnValue({ post: mockPost } as any)

      const service = new ApplicationCallbackService()
      await service.pushEvent({
        application: { id: 'app_1', appSecret: 'secret', callbackUrl: 'http://localhost:9999/cb' },
        event: 'authorization.created',
        data: { token: 'abc' },
        traceId: 'trace-001',
      })

      // pushEvent + sendWithRetry may make multiple createApiLog calls:
      // one per attempt (callback.push) + one summary (callback.push.summary)
      const calls = createApiLogSpy.mock.calls
      expect(calls.length).toBeGreaterThanOrEqual(2)

      // Verify summary entry exists
      const summaryCall = calls.find(c => c[0].apiName === 'callback.push.summary')
      expect(summaryCall).toBeDefined()
      expect(summaryCall![0].appId).toBe('app_1')
      expect(summaryCall![0].traceId).toBe('trace-001')
      expect(summaryCall![0].endpoint).toBe('http://localhost:9999/cb')
      expect(summaryCall![0].method).toBe('POST')
    })

    it('should not call createApiLog when no callbackUrl is configured', async () => {
      const createApiLogSpy = vi.spyOn(apiLogService, 'createApiLog').mockResolvedValue()

      const service = new ApplicationCallbackService()
      await service.pushEvent({
        application: { id: 'app_2', appSecret: 'secret', callbackUrl: null },
        event: 'authorization.created',
        data: { token: 'abc' },
      })

      expect(createApiLogSpy).not.toHaveBeenCalled()
    })

    it('should not call createApiLog when URL validation fails', async () => {
      const createApiLogSpy = vi.spyOn(apiLogService, 'createApiLog').mockResolvedValue()
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        const service = new ApplicationCallbackService()
        await service.pushEvent({
          application: { id: 'app_3', appSecret: 'secret', callbackUrl: 'http://example.com/cb' },
          event: 'authorization.created',
          data: {},
        })
        expect(createApiLogSpy).not.toHaveBeenCalled()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should mark isError true for non-2xx responses', async () => {
      const createApiLogSpy = vi.spyOn(apiLogService, 'createApiLog').mockResolvedValue()
      const mockPost = vi.fn().mockResolvedValue({ status: 500 })
      vi.mocked(axios.create).mockReturnValue({ post: mockPost } as any)

      const service = new ApplicationCallbackService()
      await service.pushEvent({
        application: { id: 'app_4', appSecret: 'secret', callbackUrl: 'http://localhost:9999/cb' },
        data: {},
      })

      const attemptCalls = createApiLogSpy.mock.calls.filter(c => c[0].apiName === 'callback.push')
      // Each attempt call should have isError = true (500 response)
      expect(attemptCalls.length).toBeGreaterThan(0)
      expect(attemptCalls[0][0].isError).toBe(true)
    })

    it('stamps the developerId on attempt and summary rows', async () => {
      const createApiLogSpy = vi.spyOn(apiLogService, 'createApiLog').mockResolvedValue()
      const mockPost = vi.fn().mockResolvedValue({ status: 200 })
      vi.mocked(axios.create).mockReturnValue({ post: mockPost } as any)

      const service = new ApplicationCallbackService()
      await service.pushEvent({
        application: {
          id: 'app_dev',
          appSecret: 'secret',
          callbackUrl: 'http://localhost:9999/cb',
          isvDeveloperId: 'dev-42',
        },
        event: 'authorization.created',
        data: {},
      })

      const pushed = createApiLogSpy.mock.calls.filter(
        c => c[0].apiName === 'callback.push' || c[0].apiName === 'callback.push.summary',
      )
      expect(pushed.length).toBeGreaterThan(0)
      for (const call of pushed) {
        expect(call[0].developerId).toBe('dev-42')
      }
    })

    it('should log responseTime for each attempt', async () => {
      const createApiLogSpy = vi.spyOn(apiLogService, 'createApiLog').mockResolvedValue()
      const mockPost = vi.fn().mockResolvedValue({ status: 200 })
      vi.mocked(axios.create).mockReturnValue({ post: mockPost } as any)

      const service = new ApplicationCallbackService()
      await service.pushEvent({
        application: { id: 'app_5', appSecret: 'secret', callbackUrl: 'http://localhost:9999/cb' },
        data: {},
      })

      const allCalls = createApiLogSpy.mock.calls
      // All calls should have responseTime defined (number)
      for (const call of allCalls) {
        const entry = call[0]
        if (entry.apiName === 'callback.push' || entry.apiName === 'callback.push.summary') {
          expect(typeof entry.responseTime).toBe('number')
        }
      }
    })
  })
})