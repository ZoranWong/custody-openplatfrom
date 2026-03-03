import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as crypto from 'crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  generateJti,
  getTokenRemainingTTL,
  generateKeyPair,
  generateBase64KeyPair,
  signJWT,
  verifyJWT,
  getJWTKeys,
} from '../../src/utils/jwt.util';

describe('JWT Utility', () => {
  describe('generateJti', () => {
    it('should generate UUID v4 format', () => {
      const jti = generateJti();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(jti).toMatch(uuidRegex);
    });

    it('should generate unique values', () => {
      const jtis = new Set<string>();
      for (let i = 0; i < 100; i++) {
        jtis.add(generateJti());
      }
      expect(jtis.size).toBe(100);
    });
  });

  describe('generateKeyPair', () => {
    it('should generate valid RSA key pair', () => {
      const { publicKey, privateKey } = generateKeyPair();

      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should generate keys of correct length', () => {
      const { publicKey, privateKey } = generateKeyPair();

      // RSA 2048 bit modulus produces ~450 char PEM
      expect(publicKey.length).toBeGreaterThan(400);
      expect(privateKey.length).toBeGreaterThan(1600);
    });
  });

  describe('generateBase64KeyPair', () => {
    it('should generate base64 encoded keys', () => {
      const { publicKeyBase64, privateKeyBase64 } = generateBase64KeyPair();

      // Verify valid base64
      expect(() => Buffer.from(publicKeyBase64, 'base64')).not.toThrow();
      expect(() => Buffer.from(privateKeyBase64, 'base64')).not.toThrow();

      // Verify decoded keys are valid PEM
      const publicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf8');
      const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');

      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });
  });

  describe('signAccessToken', () => {
    const testPayload = {
      appid: 'test_app_123',
      enterprise_id: 'enterprise_456',
      permissions: ['read', 'write'],
    };

    it('should sign access token with RS256', () => {
      const { privateKey } = generateKeyPair();

      const result = signAccessToken(testPayload, {
        privateKey,
        expiresIn: 7200,
      });

      expect(result.token).toBeTruthy();
      expect(result.token.split('.')).toHaveLength(3);
      expect(result.expiresAt).toBeGreaterThan(Date.now() / 1000);
      expect(result.jti).toBeTruthy();
    });

    it('should set correct expiration', () => {
      const { privateKey } = generateKeyPair();
      const expiresIn = 3600; // 1 hour

      const result = signAccessToken(testPayload, {
        privateKey,
        expiresIn,
      });

      const expectedExpiry = Math.floor(Date.now() / 1000) + expiresIn;
      expect(result.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1);
      expect(result.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1);
    });

    it('should include all payload claims', () => {
      const { privateKey } = generateKeyPair();

      const result = signAccessToken(testPayload, { privateKey });

      const decoded = decodeToken(result.token);
      expect(decoded?.appid).toBe(testPayload.appid);
      expect(decoded?.enterprise_id).toBe(testPayload.enterprise_id);
      expect(decoded?.permissions).toEqual(testPayload.permissions);
      expect(decoded?.type).toBe('access');
      expect(decoded?.jti).toBe(result.jti);
    });

    it('should use default expiration if not provided', () => {
      const { privateKey } = generateKeyPair();

      const result = signAccessToken(testPayload, { privateKey });

      const expectedExpiry = Math.floor(Date.now() / 1000) + 7200;
      expect(result.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1);
    });
  });

  describe('signRefreshToken', () => {
    const testAppid = 'test_app_123';
    const testUserId = 'user_456';

    it('should sign refresh token with RS256', () => {
      const { privateKey } = generateKeyPair();

      const result = signRefreshToken(testAppid, testUserId, {
        privateKey,
        expiresIn: 2592000,
      });

      expect(result.token).toBeTruthy();
      expect(result.token.split('.')).toHaveLength(3);
      expect(result.jti).toBeTruthy();
    });

    it('should include refresh token specific claims', () => {
      const { privateKey } = generateKeyPair();

      const result = signRefreshToken(testAppid, testUserId, { privateKey });

      const decoded = decodeToken(result.token);
      expect(decoded?.appid).toBe(testAppid);
      expect(decoded?.type).toBe('refresh');
      expect(decoded?.user_id).toBe(testUserId);
    });

    it('should have 30-day expiration by default', () => {
      const { privateKey } = generateKeyPair();

      const result = signRefreshToken(testAppid, testUserId, { privateKey });

      const expectedExpiry = Math.floor(Date.now() / 1000) + 2592000;
      expect(result.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1);
    });
  });

  describe('verifyAccessToken', () => {
    const testPayload = {
      appid: 'test_app_123',
      enterprise_id: 'enterprise_456',
      permissions: ['read', 'write'],
    };

    it('should verify valid access token', () => {
      const { privateKey, publicKey } = generateKeyPair();

      const { token } = signAccessToken(testPayload, { privateKey });
      const result = verifyAccessToken(token, { publicKey });

      expect(result).not.toBeNull();
      expect(result?.appid).toBe(testPayload.appid);
      expect(result?.enterprise_id).toBe(testPayload.enterprise_id);
      expect(result?.permissions).toEqual(testPayload.permissions);
    });

    it('should reject refresh token as access token', () => {
      const { privateKey, publicKey } = generateKeyPair();

      const { token } = signRefreshToken(
        testPayload.appid,
        'user_123',
        { privateKey }
      );
      const result = verifyAccessToken(token, { publicKey });

      expect(result).toBeNull();
    });

    it('should reject expired token', async () => {
      const { privateKey, publicKey } = generateKeyPair();

      // Create token with 0 second expiration (already expired)
      const jwt = await import('jsonwebtoken');
      const jti = generateJti();
      const now = Math.floor(Date.now() / 1000);

      const token = jwt.sign(
        {
          ...testPayload,
          iat: now - 7200,
          exp: now - 3600, // Expired 1 hour ago
          jti,
          type: 'access',
        },
        privateKey,
        { algorithm: 'RS256' }
      );

      const result = verifyAccessToken(token, { publicKey });
      expect(result).toBeNull();
    });

    it('should reject token with wrong public key', () => {
      const { privateKey } = generateKeyPair();
      const { publicKey: wrongKey } = generateKeyPair();

      const { token } = signAccessToken(testPayload, { privateKey });
      const result = verifyAccessToken(token, { publicKey: wrongKey });

      expect(result).toBeNull();
    });

    it('should reject malformed token', () => {
      const { publicKey } = generateKeyPair();

      expect(verifyAccessToken('invalid.token.here', { publicKey })).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const { privateKey, publicKey } = generateKeyPair();

      const { token } = signRefreshToken('app123', 'user456', {
        privateKey,
      });
      const result = verifyRefreshToken(token, { publicKey });

      expect(result).not.toBeNull();
      expect(result?.appid).toBe('app123');
      expect(result?.user_id).toBe('user456');
      expect(result?.type).toBe('refresh');
    });

    it('should reject access token as refresh token', () => {
      const { privateKey, publicKey } = generateKeyPair();

      const { token } = signAccessToken(
        { appid: 'app123', permissions: [] },
        { privateKey }
      );
      const result = verifyRefreshToken(token, { publicKey });

      expect(result).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const { privateKey } = generateKeyPair();

      const { token } = signAccessToken(
        { appid: 'app123', permissions: ['read'] },
        { privateKey }
      );

      const decoded = decodeToken(token);
      expect(decoded?.appid).toBe('app123');
      expect(decoded?.permissions).toEqual(['read']);
    });

    it('should return null for malformed token', () => {
      expect(decodeToken('not.a.token')).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for future timestamp', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      expect(isTokenExpired(futureTime)).toBe(false);
    });

    it('should return true for past timestamp', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      expect(isTokenExpired(pastTime)).toBe(true);
    });

    it('should return true for current timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTokenExpired(now)).toBe(true);
    });
  });

  describe('getTokenRemainingTTL', () => {
    it('should return positive TTL for future expiration', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 7200;
      const ttl = getTokenRemainingTTL(futureTime);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(7200);
    });

    it('should return 0 for past expiration', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 100;
      const ttl = getTokenRemainingTTL(pastTime);
      expect(ttl).toBe(0);
    });
  });

  describe('signJWT and verifyJWT', () => {
    it('should sign and verify custom payload', () => {
      const { privateKey, publicKey } = generateKeyPair();

      const customPayload = {
        userId: 'user123',
        role: 'admin',
        customClaim: 'value',
      };

      const result = signJWT(customPayload, {
        privateKey,
        expiresIn: 3600,
        algorithm: 'RS256',
      });

      const verified = verifyJWT<typeof customPayload>(result.token, {
        publicKey,
        algorithms: ['RS256'],
      });

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe('user123');
      expect(verified?.role).toBe('admin');
      expect(verified?.customClaim).toBe('value');
    });
  });
});
