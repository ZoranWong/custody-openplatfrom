import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  TokenService,
  createTokenService,
  TokenErrorCode,
} from '../../src/services/token.service';
import {
  signRefreshToken,
  generateKeyPair,
} from '../../src/utils/jwt.util';
import {
  TokenBlacklist,
  RefreshTokenRepository,
  CredentialService,
  RateLimiter,
  TokenPair,
} from '../../src/types/jwt.types';

describe('Token Service', () => {
  let mockBlacklist: TokenBlacklist;
  let mockRefreshTokenRepo: RefreshTokenRepository;
  let mockCredentialService: CredentialService;
  let mockRateLimiter: RateLimiter;
  let tokenService: TokenService;
  let testPrivateKey: string;
  let testPublicKey: string;

  beforeEach(() => {
    vi.clearAllMocks();

    const keyPair = generateKeyPair();
    testPrivateKey = keyPair.privateKey;
    testPublicKey = keyPair.publicKey;

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
      mockRateLimiter,
      {
        accessTokenExpiry: 7200,
        refreshTokenExpiry: 2592000,
        rateLimitPerMinute: 10,
        privateKey: testPrivateKey,
        publicKey: testPublicKey,
      }
    );
  });

  describe('issueTokens', () => {
    it('should issue valid token pair', async () => {
      const result = await tokenService.issueTokens(
        'test_app',
        'test_secret',
        'user_123',
        'enterprise_456',
        ['read', 'write']
      );

      expect('tokens' in result).toBe(true);
      const tokens = (result as { tokens: TokenPair }).tokens;

      expect(tokens.access_token).toBeTruthy();
      expect(tokens.refresh_token).toBeTruthy();
      expect(tokens.expires_in).toBe(7200);
      expect(tokens.token_type).toBe('Bearer');
    });

    it('should validate credentials before issuing', async () => {
      await tokenService.issueTokens(
        'test_app',
        'test_secret',
        'user_123'
      );

      expect(mockCredentialService.validateCredentials).toHaveBeenCalledWith(
        'test_app',
        'test_secret'
      );
    });

    it('should return error for invalid credentials', async () => {
      (mockCredentialService.validateCredentials as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        valid: false,
      });

      const result = await tokenService.issueTokens(
        'invalid_app',
        'invalid_secret',
        'user_123'
      );

      expect('error' in result).toBe(true);
      expect((result as { error: { code: number } }).error.code).toBe(
        TokenErrorCode.INVALID_CREDENTIALS
      );
    });

    it('should return error when rate limited', async () => {
      (mockRateLimiter.checkLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        limited: true,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      const result = await tokenService.issueTokens(
        'test_app',
        'test_secret',
        'user_123'
      );

      expect('error' in result).toBe(true);
      expect((result as { error: { code: number } }).error.code).toBe(
        TokenErrorCode.RATE_LIMIT_EXCEEDED
      );
    });

    it('should store refresh token in database', async () => {
      await tokenService.issueTokens(
        'test_app',
        'test_secret',
        'user_123'
      );

      expect(mockRefreshTokenRepo.create).toHaveBeenCalled();
      const createCall = (mockRefreshTokenRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createCall.appid).toBe('test_app');
      expect(createCall.user_id).toBe('user_123');
      expect(createCall.type).toBeUndefined();
    });

    it('should increment rate limit counter', async () => {
      await tokenService.issueTokens(
        'test_app',
        'test_secret',
        'user_123'
      );

      expect(mockRateLimiter.increment).toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('should issue new token pair on refresh', async () => {
      const { token: refreshToken, jti } = signRefreshToken(
        'test_app',
        'user_123',
        { privateKey: testPrivateKey }
      );

      // Mock the repository to return a valid record
      (mockRefreshTokenRepo.findByJti as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 1n,
        jti,
        appid: 'test_app',
        user_id: 'user_123',
        expires_at: Date.now() / 1000 + 2592000,
        revoked: false,
        replaced_by_jti: null,
        created_at: Date.now(),
        last_used_at: null,
      });

      const result = await tokenService.refreshAccessToken(
        refreshToken,
        'test_app'
      );

      expect('tokens' in result).toBe(true);
      const tokens = (result as { tokens: TokenPair }).tokens;

      expect(tokens.access_token).toBeTruthy();
      expect(tokens.refresh_token).toBeTruthy();
      expect(tokens.expires_in).toBe(7200);
    });

    it('should return error for invalid refresh token', async () => {
      const result = await tokenService.refreshAccessToken(
        'invalid.token.here',
        'test_app'
      );

      expect('error' in result).toBe(true);
      expect((result as { error: { code: number } }).error.code).toBe(
        TokenErrorCode.INVALID_REFRESH_TOKEN
      );
    });

    it('should return error for expired refresh token', async () => {
      const jwt = await import('jsonwebtoken');
      const now = Math.floor(Date.now() / 1000);

      const expiredToken = jwt.sign(
        {
          appid: 'test_app',
          user_id: 'user_123',
          type: 'refresh',
          iat: now - 2592000,
          exp: now - 86400, // Expired 1 day ago
          jti: 'expired-jti',
        },
        testPrivateKey,
        { algorithm: 'RS256' }
      );

      const result = await tokenService.refreshAccessToken(
        expiredToken,
        'test_app'
      );

      expect('error' in result).toBe(true);
      expect((result as { error: { code: number } }).error.code).toBe(
        TokenErrorCode.INVALID_REFRESH_TOKEN
      );
    });

    it('should return error if appid does not match', async () => {
      const { token: refreshToken, jti } = signRefreshToken(
        'test_app',
        'user_123',
        { privateKey: testPrivateKey }
      );

      // Mock repo to return a record so we get past verification
      (mockRefreshTokenRepo.findByJti as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 1n,
        jti,
        appid: 'test_app',
        user_id: 'user_123',
        expires_at: Date.now() / 1000 + 2592000,
        revoked: false,
        replaced_by_jti: null,
        created_at: Date.now(),
        last_used_at: null,
      });

      const result = await tokenService.refreshAccessToken(
        refreshToken,
        'different_app'
      );

      expect('error' in result).toBe(true);
      expect((result as { error: { message: string } }).error.message).toContain(
        'match'
      );
    });

    it('should revoke old refresh token on rotation', async () => {
      const { token: refreshToken, jti } = signRefreshToken(
        'test_app',
        'user_123',
        { privateKey: testPrivateKey }
      );

      const existingRecord = {
        id: 1n,
        jti,
        appid: 'test_app',
        user_id: 'user_123',
        expires_at: Date.now() / 1000 + 2592000,
        revoked: false,
        replaced_by_jti: null,
        created_at: Date.now(),
        last_used_at: null,
      };

      (mockRefreshTokenRepo.findByJti as ReturnType<typeof vi.fn>).mockResolvedValueOnce(existingRecord);

      await tokenService.refreshAccessToken(refreshToken, 'test_app');

      expect(mockRefreshTokenRepo.markReplaced).toHaveBeenCalledWith(
        existingRecord.jti,
        expect.any(String) // new jti
      );
    });

    it('should return error for revoked refresh token', async () => {
      const { token: refreshToken, jti } = signRefreshToken(
        'test_app',
        'user_123',
        { privateKey: testPrivateKey }
      );

      (mockRefreshTokenRepo.findByJti as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 1n,
        jti,
        appid: 'test_app',
        user_id: 'user_123',
        expires_at: Date.now() / 1000 + 2592000,
        revoked: true,
        replaced_by_jti: null,
        created_at: Date.now(),
        last_used_at: null,
      });

      const result = await tokenService.refreshAccessToken(
        refreshToken,
        'test_app'
      );

      expect('error' in result).toBe(true);
      expect(
        (result as { error: { message: string } }).error.message
      ).toContain('revoked');
    });
  });

  describe('revokeAccessToken', () => {
    it('should add token to blacklist', async () => {
      const result = await tokenService.revokeAccessToken('test-jti');

      expect(result).toEqual({ success: true });
      expect(mockBlacklist.blacklist).toHaveBeenCalledWith(
        'test-jti',
        expect.any(Number)
      );
    });

    it('should use default TTL if not provided', async () => {
      await tokenService.revokeAccessToken('test-jti');

      expect(mockBlacklist.blacklist).toHaveBeenCalledWith(
        'test-jti',
        expect.any(Number)
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token in database', async () => {
      const { token: refreshToken } = signRefreshToken(
        'test_app',
        'user_123',
        { privateKey: testPrivateKey }
      );

      (mockRefreshTokenRepo.revoke as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const result = await tokenService.revokeRefreshToken(refreshToken);

      expect(result).toEqual({ success: true });
      expect(mockRefreshTokenRepo.revoke).toHaveBeenCalled();
    });

    it('should return error for invalid token', async () => {
      const result = await tokenService.revokeRefreshToken('invalid.token');

      expect('error' in result).toBe(true);
      expect((result as { error: { code: number } }).error.code).toBe(
        TokenErrorCode.INVALID_REFRESH_TOKEN
      );
    });

    it('should return error if token not found', async () => {
      const { token: refreshToken } = signRefreshToken(
        'test_app',
        'user_123',
        { privateKey: testPrivateKey }
      );

      (mockRefreshTokenRepo.revoke as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      const result = await tokenService.revokeRefreshToken(refreshToken);

      expect('error' in result).toBe(true);
      expect((result as { error: { code: number } }).error.code).toBe(
        TokenErrorCode.INVALID_REFRESH_TOKEN
      );
    });
  });

  describe('isAccessTokenRevoked', () => {
    it('should return true if token is blacklisted', async () => {
      (mockBlacklist.isBlacklisted as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const result = await tokenService.isAccessTokenRevoked('test-jti');

      expect(result).toBe(true);
    });

    it('should return false if token is not blacklisted', async () => {
      (mockBlacklist.isBlacklisted as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      const result = await tokenService.isAccessTokenRevoked('test-jti');

      expect(result).toBe(false);
    });
  });

  describe('isRefreshTokenValid', () => {
    it('should return valid: true for valid token', async () => {
      const { token: refreshToken, jti } = signRefreshToken(
        'test_app',
        'user_123',
        { privateKey: testPrivateKey }
      );

      (mockRefreshTokenRepo.findByJti as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 1n,
        jti,
        appid: 'test_app',
        user_id: 'user_123',
        expires_at: Date.now() / 1000 + 2592000,
        revoked: false,
        replaced_by_jti: null,
        created_at: Date.now(),
        last_used_at: null,
      });

      const result = await tokenService.isRefreshTokenValid(refreshToken);

      expect(result.valid).toBe(true);
    });

    it('should return reason for invalid token', async () => {
      const result = await tokenService.isRefreshTokenValid('invalid.token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBeTruthy();
    });
  });

  describe('getRefreshTokenRecord', () => {
    it('should return record by jti', async () => {
      const mockRecord = {
        id: 1n,
        jti: 'test-jti',
        appid: 'test_app',
        user_id: 'user_123',
        expires_at: Date.now() / 1000 + 2592000,
        revoked: false,
        replaced_by_jti: null,
        created_at: Date.now(),
        last_used_at: null,
      };

      (mockRefreshTokenRepo.findByJti as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockRecord);

      const result = await tokenService.getRefreshTokenRecord('test-jti');

      expect(result).toEqual(mockRecord);
    });

    it('should return null if not found', async () => {
      (mockRefreshTokenRepo.findByJti as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const result = await tokenService.getRefreshTokenRecord('unknown-jti');

      expect(result).toBeNull();
    });
  });

  describe('getActiveRefreshTokens', () => {
    it('should return all tokens for app', async () => {
      const mockTokens = [
        {
          id: 1n,
          jti: 'token-1',
          appid: 'test_app',
          user_id: 'user_123',
          expires_at: Date.now() / 1000 + 2592000,
          revoked: false,
          replaced_by_jti: null,
          created_at: Date.now(),
          last_used_at: null,
        },
        {
          id: 2n,
          jti: 'token-2',
          appid: 'test_app',
          user_id: 'user_123',
          expires_at: Date.now() / 1000 + 2592000,
          revoked: false,
          replaced_by_jti: null,
          created_at: Date.now(),
          last_used_at: null,
        },
      ];

      (mockRefreshTokenRepo.findByAppid as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockTokens);

      const result = await tokenService.getActiveRefreshTokens('test_app');

      expect(result).toHaveLength(2);
      expect(mockRefreshTokenRepo.findByAppid).toHaveBeenCalledWith('test_app');
    });
  });

  describe('revokeAllRefreshTokens', () => {
    it('should revoke all tokens for app', async () => {
      const mockTokens = [
        {
          id: 1n,
          jti: 'token-1',
          appid: 'test_app',
          user_id: 'user_123',
          expires_at: Date.now() / 1000 + 2592000,
          revoked: false,
          replaced_by_jti: null,
          created_at: Date.now(),
          last_used_at: null,
        },
        {
          id: 2n,
          jti: 'token-2',
          appid: 'test_app',
          user_id: 'user_123',
          expires_at: Date.now() / 1000 + 2592000,
          revoked: false,
          replaced_by_jti: null,
          created_at: Date.now(),
          last_used_at: null,
        },
      ];

      (mockRefreshTokenRepo.findByAppid as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockTokens);
      (mockRefreshTokenRepo.revoke as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await tokenService.revokeAllRefreshTokens('test_app');

      expect(result.revoked).toBe(2);
      expect(mockRefreshTokenRepo.revoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      (mockRefreshTokenRepo.deleteExpired as ReturnType<typeof vi.fn>).mockResolvedValueOnce(5);

      const result = await tokenService.cleanupExpiredTokens();

      expect(result.deleted).toBe(5);
      expect(mockRefreshTokenRepo.deleteExpired).toHaveBeenCalled();
    });
  });
});
