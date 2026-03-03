import * as crypto from 'crypto';
import {
  computeSignature,
  verifySignature,
  isTimestampValid,
  buildSignString,
  InMemoryNonceCache,
  createNonceCacheKey,
  SignatureParams,
} from '../../src/utils/signature.util';

describe('Signature Utility', () => {
  describe('computeSignature', () => {
    it('should compute consistent HMAC-SHA256 signature', () => {
      const secretKey = 'test_secret_key';
      const params: SignatureParams = {
        appid: 'app_123',
        nonce: 'abc123',
        timestamp: 1700000000,
        method: 'POST',
        path: '/api/v1/test',
        body: '{"amount":100}',
      };

      const signature1 = computeSignature(secretKey, params);
      const signature2 = computeSignature(secretKey, params);

      expect(signature1).toBe(signature2);
      expect(signature1).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it('should produce different signatures for different secret keys', () => {
      const params: SignatureParams = {
        appid: 'app_123',
        nonce: 'abc123',
        timestamp: 1700000000,
        method: 'POST',
        path: '/api/v1/test',
        body: '{"amount":100}',
      };

      const signature1 = computeSignature('secret_key_1', params);
      const signature2 = computeSignature('secret_key_2', params);

      expect(signature1).not.toBe(signature2);
    });

    it('should produce different signatures for different params', () => {
      const secretKey = 'test_secret_key';

      const params1: SignatureParams = {
        appid: 'app_123',
        nonce: 'nonce1',
        timestamp: 1700000000,
        method: 'POST',
        path: '/api/v1/test',
        body: '{"amount":100}',
      };

      const params2: SignatureParams = {
        appid: 'app_123',
        nonce: 'nonce2', // Different nonce
        timestamp: 1700000000,
        method: 'POST',
        path: '/api/v1/test',
        body: '{"amount":100}',
      };

      const signature1 = computeSignature(secretKey, params1);
      const signature2 = computeSignature(secretKey, params2);

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('verifySignature', () => {
    it('should return true for matching signatures', () => {
      const secretKey = 'test_secret_key';
      const params: SignatureParams = {
        appid: 'app_123',
        nonce: 'abc123',
        timestamp: 1700000000,
        method: 'POST',
        path: '/api/v1/test',
        body: '{"amount":100}',
      };

      const signature = computeSignature(secretKey, params);
      const isValid = verifySignature(secretKey, signature, params);

      expect(isValid).toBe(true);
    });

    it('should return false for mismatched signatures', () => {
      const secretKey = 'test_secret_key';
      const params: SignatureParams = {
        appid: 'app_123',
        nonce: 'abc123',
        timestamp: 1700000000,
        method: 'POST',
        path: '/api/v1/test',
        body: '{"amount":100}',
      };

      const invalidSignature = 'a'.repeat(64);
      const isValid = verifySignature(secretKey, invalidSignature, params);

      expect(isValid).toBe(false);
    });

    it('should return false for wrong secret key', () => {
      const params: SignatureParams = {
        appid: 'app_123',
        nonce: 'abc123',
        timestamp: 1700000000,
        method: 'POST',
        path: '/api/v1/test',
        body: '{"amount":100}',
      };

      const signature = computeSignature('correct_key', params);
      const isValid = verifySignature('wrong_key', signature, params);

      expect(isValid).toBe(false);
    });
  });

  describe('isTimestampValid', () => {
    it('should return true for current timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTimestampValid(now)).toBe(true);
    });

    it('should return true for timestamp within 5 minutes', () => {
      const fourMinutesAgo = Math.floor(Date.now() / 1000) - 240;
      expect(isTimestampValid(fourMinutesAgo)).toBe(true);
    });

    it('should return false for timestamp older than 5 minutes', () => {
      const sixMinutesAgo = Math.floor(Date.now() / 1000) - 360;
      expect(isTimestampValid(sixMinutesAgo)).toBe(false);
    });

    it('should return false for future timestamp', () => {
      const oneMinuteInFuture = Math.floor(Date.now() / 1000) + 60;
      expect(isTimestampValid(oneMinuteInFuture)).toBe(false);
    });

    it('should use custom window when specified', () => {
      const now = Math.floor(Date.now() / 1000);
      const tenMinutesAgo = now - 600; // 10 minutes

      // With 5 min window, should be false
      expect(isTimestampValid(tenMinutesAgo, 300)).toBe(false);

      // With 10 min window, should be true
      expect(isTimestampValid(tenMinutesAgo, 600)).toBe(true);
    });
  });

  describe('buildSignString', () => {
    it('should build canonical sign string', () => {
      const params: SignatureParams = {
        appid: 'app_123',
        nonce: 'nonce_xyz',
        timestamp: 1700000000,
        method: 'GET',
        path: '/api/users',
        body: '',
      };

      const signString = buildSignString(params);
      const expected = 'app_123\nnonce_xyz\n1700000000\nGET\n/api/users\n';

      expect(signString).toBe(expected);
    });

    it('should handle empty body', () => {
      const params: SignatureParams = {
        appid: 'app_123',
        nonce: 'nonce',
        timestamp: 1700000000,
        method: 'GET',
        path: '/api/test',
        body: '',
      };

      const signString = buildSignString(params);
      expect(signString.endsWith('\n')).toBe(true);
      expect(signString.split('\n')).toHaveLength(6);
    });

    it('should include JSON body correctly', () => {
      const params: SignatureParams = {
        appid: 'app_123',
        nonce: 'nonce',
        timestamp: 1700000000,
        method: 'POST',
        path: '/api/test',
        body: '{"key":"value"}',
      };

      const signString = buildSignString(params);
      expect(signString).toContain('{"key":"value"}');
    });
  });

  describe('InMemoryNonceCache', () => {
    let cache: InMemoryNonceCache;

    beforeEach(() => {
      cache = new InMemoryNonceCache();
    });

    describe('isDuplicate', () => {
      it('should return false for new nonce', async () => {
        const isDup = await cache.isDuplicate('app1', 'nonce1');
        expect(isDup).toBe(false);
      });

      it('should return true after nonce is recorded', async () => {
        await cache.record('app1', 'nonce1', 300);
        const isDup = await cache.isDuplicate('app1', 'nonce1');
        expect(isDup).toBe(true);
      });

      it('should be app-specific', async () => {
        await cache.record('app1', 'nonce1', 300);
        const isDup = await cache.isDuplicate('app2', 'nonce1');
        expect(isDup).toBe(false);
      });

      it('should be nonce-specific', async () => {
        await cache.record('app1', 'nonce1', 300);
        const isDup = await cache.isDuplicate('app1', 'nonce2');
        expect(isDup).toBe(false);
      });
    });

    describe('record', () => {
      it('should store nonce in cache', async () => {
        await cache.record('app1', 'nonce1', 300);
        expect(await cache.isDuplicate('app1', 'nonce1')).toBe(true);
      });

      it('should allow recording same nonce for different apps', async () => {
        await cache.record('app1', 'nonce1', 300);
        await cache.record('app2', 'nonce1', 300);
        expect(await cache.isDuplicate('app1', 'nonce1')).toBe(true);
        expect(await cache.isDuplicate('app2', 'nonce1')).toBe(true);
      });
    });
  });

  describe('createNonceCacheKey', () => {
    it('should create consistent cache key', () => {
      const key1 = createNonceCacheKey('app123', 'nonce456');
      const key2 = createNonceCacheKey('app123', 'nonce456');

      expect(key1).toBe(key2);
      expect(key1).toBe('signature:nonce:app123:nonce456');
    });

    it('should produce different keys for different inputs', () => {
      const key1 = createNonceCacheKey('app1', 'nonce1');
      const key2 = createNonceCacheKey('app2', 'nonce1');
      const key3 = createNonceCacheKey('app1', 'nonce2');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });
});
