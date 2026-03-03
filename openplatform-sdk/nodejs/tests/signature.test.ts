/**
 * Signature Utility Tests
 */

import { describe, it, expect } from 'vitest'
import {
  generateNonce,
  sortObjectKeys,
  calculateBusinessMd5,
  buildSignatureString,
  generateSignature,
  buildBasicParams,
  buildSignedRequest,
  verifySignature
} from '../src/utils/signature'

describe('Signature Utility', () => {
  describe('generateNonce', () => {
    it('should generate nonce with default length', () => {
      const nonce = generateNonce()
      expect(nonce).toHaveLength(32) // 16 bytes = 32 hex chars
    })

    it('should generate nonce with custom length', () => {
      const nonce = generateNonce(8)
      expect(nonce).toHaveLength(16) // 8 bytes = 16 hex chars
    })

    it('should generate unique nonces', () => {
      const nonces = new Set<string>()
      for (let i = 0; i < 100; i++) {
        nonces.add(generateNonce())
      }
      expect(nonces.size).toBe(100)
    })
  })

  describe('sortObjectKeys', () => {
    it('should sort object keys alphabetically', () => {
      const obj = { z: 1, a: 2, m: 3 }
      const sorted = sortObjectKeys(obj) as Record<string, number>
      const keys = Object.keys(sorted)
      expect(keys).toEqual(['a', 'm', 'z'])
    })

    it('should sort nested object keys', () => {
      const obj = {
        z: { c: 1, a: 2 },
        a: 1
      }
      const sorted = sortObjectKeys(obj) as Record<string, unknown>
      expect(Object.keys(sorted)).toEqual(['a', 'z'])
      expect(Object.keys(sorted.z as Record<string, unknown>)).toEqual(['a', 'c'])
    })

    it('should handle arrays', () => {
      const obj = { arr: [{ z: 1, a: 2 }, { m: 3, c: 4 }] }
      const sorted = sortObjectKeys(obj) as Record<string, unknown>
      const arr = sorted.arr as Array<Record<string, number>>
      expect(Object.keys(arr[0])).toEqual(['a', 'z'])
      expect(Object.keys(arr[1])).toEqual(['c', 'm'])
    })

    it('should handle primitives', () => {
      expect(sortObjectKeys(null)).toBeNull()
      expect(sortObjectKeys(42)).toBe(42)
      expect(sortObjectKeys('string')).toBe('string')
    })
  })

  describe('calculateBusinessMd5', () => {
    it('should calculate MD5 of empty object', () => {
      const md5 = calculateBusinessMd5(null)
      expect(md5).toHaveLength(32)
    })

    it('should calculate MD5 consistently for same data', () => {
      const data = { name: 'test', value: 123 }
      const md51 = calculateBusinessMd5(data)
      const md52 = calculateBusinessMd5(data)
      expect(md51).toBe(md52)
    })

    it('should produce different MD5 for different key order', () => {
      const data1 = { a: 1, b: 2 }
      const data2 = { b: 2, a: 1 }
      const md51 = calculateBusinessMd5(data1)
      const md52 = calculateBusinessMd5(data2)
      expect(md51).toBe(md52) // Same because we sort keys
    })
  })

  describe('buildSignatureString', () => {
    it('should build signature string correctly', () => {
      const result = buildSignatureString('app123', 'resourceKey', 1234567890, 'nonce123', 'abcd1234')
      expect(result).toBe('app123resourceKey1234567890nonce123abcd1234')
    })
  })

  describe('generateSignature', () => {
    it('should generate MD5 signature', () => {
      const signature = generateSignature('secret', 'teststring')
      expect(signature).toHaveLength(32)
    })

    it('should generate consistent signature', () => {
      const sig1 = generateSignature('secret', 'test')
      const sig2 = generateSignature('secret', 'test')
      expect(sig1).toBe(sig2)
    })
  })

  describe('buildBasicParams', () => {
    it('should build basic params with signature', () => {
      const params = buildBasicParams(
        'app-id-123',
        'app-secret-456',
        'resource-key',
        { name: 'test' }
      )

      expect(params.appId).toBe('app-id-123')
      expect(params.resourceKey).toBe('resource-key')
      expect(params.timestamp).toBeDefined()
      expect(params.nonce).toHaveLength(32)
      expect(params.signature).toHaveLength(32)
    })

    it('should use custom timestamp and nonce', () => {
      const params = buildBasicParams(
        'app-id',
        'secret',
        'resource',
        null,
        { timestamp: 1234567890, nonce: 'custom-nonce' }
      )

      expect(params.timestamp).toBe(1234567890)
      expect(params.nonce).toBe('custom-nonce')
    })
  })

  describe('buildSignedRequest', () => {
    it('should build complete signed request', () => {
      const request = buildSignedRequest(
        'app-id',
        'secret',
        'resource-key',
        { amount: 100, currency: 'USD' }
      )

      expect(request.basic).toBeDefined()
      expect(request.business).toEqual({ amount: 100, currency: 'USD' })
    })

    it('should handle empty business data', () => {
      const request = buildSignedRequest('app-id', 'secret', 'resource', null)

      expect(request.basic).toBeDefined()
      expect(request.business).toEqual({})
    })
  })

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const appId = 'app-id'
      const resourceKey = 'resource-key'
      const appSecret = 'secret'
      const timestamp = 1234567890
      const nonce = 'nonce123'
      const businessMd5 = calculateBusinessMd5({ test: 'data' })

      // Generate signature
      const signatureString = buildSignatureString(appId, resourceKey, timestamp, nonce, businessMd5)
      const signature = generateSignature(appSecret, signatureString)

      // Verify
      const isValid = verifySignature(appSecret, signature, appId, resourceKey, timestamp, nonce, businessMd5)
      expect(isValid).toBe(true)
    })

    it('should reject invalid signature', () => {
      const isValid = verifySignature('secret', 'invalid-signature', 'appId', 'resourceKey', 123, 'nonce', 'md5')
      expect(isValid).toBe(false)
    })
  })
})
