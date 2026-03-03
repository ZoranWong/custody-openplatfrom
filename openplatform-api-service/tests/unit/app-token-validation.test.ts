import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { TokenService, createTokenService } from '../../src/services/token.service';
import {
  TokenBlacklist,
  RefreshTokenRepository,
  CredentialService,
  RateLimiter,
} from '../../src/types/jwt.types';

describe('AppToken Validation', () => {
  let mockBlacklist: TokenBlacklist;
  let mockRefreshTokenRepo: RefreshTokenRepository;
  let mockCredentialService: CredentialService;
  let mockRateLimiter: RateLimiter;
  let tokenService: TokenService;
  const testAppSecret = 'test-app-secret';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock blacklist
    mockBlacklist = {
      blacklist: vi.fn().mockResolvedValue(undefined),
      isBlacklisted: vi.fn().mockResolvedValue(false),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    // Mock RefreshTokenRepository
    mockRefreshTokenRepo = {
      create: vi.fn().mockResolvedValue({
        id: 1n,
        jti: 'test-jti',
        appid: 'test_app',
        user_id: 'user_123',
        expires_at: Date.now() / 1000 + 2592000,
        revoked: false,
        replaced_by_jti: null,
        created_at: Date.now(),
        last_used_at: null,
      }),
      findByJti: vi.fn().mockResolvedValue(null),
      findByAppid: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(null),
      revoke: vi.fn().mockResolvedValue(true),
      markReplaced: vi.fn().mockResolvedValue(true),
      deleteExpired: vi.fn().mockResolvedValue(0),
    };

    // Mock CredentialService
    mockCredentialService = {
      validateCredentials: vi.fn().mockResolvedValue({
        valid: true,
        user_id: 'user_123',
        enterprise_id: 'enterprise_456',
        permissions: ['read', 'write'],
      }),
    };

    // Mock RateLimiter
    mockRateLimiter = {
      checkLimit: vi.fn().mockResolvedValue({
        limited: false,
        remaining: 9,
        resetAt: Date.now() + 60000,
      }),
      increment: vi.fn().mockResolvedValue(undefined),
    };

    tokenService = createTokenService(
      mockBlacklist,
      mockRefreshTokenRepo,
      mockCredentialService,
      mockRateLimiter
    );
  });

  describe('validateAppToken', () => {
    // Subtask 3.1: Test token validation with valid token
    it('should return valid result with claims for valid appToken', async () => {
      // Create a valid HS256 token
      const payload = {
        appId: 'app-123',
        userId: 'user-456',
        enterpriseId: 'ent-789',
        permissions: ['read', 'write'],
      };

      const token = jwt.sign(payload, testAppSecret, {
        algorithm: 'HS256',
        expiresIn: 3600, // 1 hour
      });

      const result = await tokenService.validateAppToken(token, testAppSecret);

      expect(result.valid).toBe(true);
      expect(result.claims).toBeDefined();
      expect(result.claims?.appId).toBe('app-123');
      expect(result.claims?.userId).toBe('user-456');
      expect(result.claims?.enterpriseId).toBe('ent-789');
      expect(result.claims?.permissions).toEqual(['read', 'write']);
    });

    // Subtask 3.2: Test token validation with expired token
    it('should return error for expired token', async () => {
      // Create an expired HS256 token
      const payload = {
        appId: 'app-123',
        userId: 'user-456',
        enterpriseId: 'ent-789',
        permissions: ['read', 'write'],
      };

      const token = jwt.sign(payload, testAppSecret, {
        algorithm: 'HS256',
        expiresIn: -3600, // Already expired
      });

      const result = await tokenService.validateAppToken(token, testAppSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(40102);
      expect(result.error?.message).toBe('Token expired');
    });

    // Subtask 3.3: Test token validation with invalid token
    it('should return error for invalid token (wrong signature)', async () => {
      const payload = {
        appId: 'app-123',
        userId: 'user-456',
        enterpriseId: 'ent-789',
        permissions: ['read', 'write'],
      };

      // Sign with wrong secret
      const token = jwt.sign(payload, 'wrong-secret', {
        algorithm: 'HS256',
        expiresIn: 3600,
      });

      const result = await tokenService.validateAppToken(token, testAppSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(40103);
      expect(result.error?.message).toBe('Invalid token');
    });

    it('should return error for malformed token', async () => {
      const result = await tokenService.validateAppToken('not-a-valid-jwt', testAppSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(40103);
      expect(result.error?.message).toBe('Invalid token');
    });

    it('should return error for token with missing required claims', async () => {
      // Create token without required claims
      const payload = {
        appId: 'app-123',
        // Missing userId
        // Missing enterpriseId
      };

      const token = jwt.sign(payload, testAppSecret, {
        algorithm: 'HS256',
        expiresIn: 3600,
      });

      const result = await tokenService.validateAppToken(token, testAppSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(40101);
      expect(result.error?.message).toBe('Invalid token: missing required claims');
    });

    it('should return error for token signed with different algorithm', async () => {
      // Create token with RS256 (different algorithm)
      const { privateKey, publicKey } = require('crypto').generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const payload = {
        appId: 'app-123',
        userId: 'user-456',
        enterpriseId: 'ent-789',
        permissions: ['read', 'write'],
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        expiresIn: 3600,
      });

      const result = await tokenService.validateAppToken(token, testAppSecret);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(40103);
    });
  });
});
