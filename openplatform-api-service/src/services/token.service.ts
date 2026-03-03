/**
 * Token Service
 * Handles token issuance, refresh, revocation, and appToken validation
 */

import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  isTokenExpired,
  getTokenRemainingTTL,
} from '../utils/jwt.util';
import {
  TokenPair,
  TokenClaims,
  RefreshTokenRecord,
  RefreshTokenRepository,
  TokenBlacklist,
  CredentialService,
  RateLimiter,
} from '../types/jwt.types';

/**
 * AppToken payload interface
 * Used for simple hash-based tokens from third-party developers
 */
export interface AppTokenPayload {
  appId: string;
  timestamp: number;
  nonce: string;
  iat?: number;
  exp?: number;
}

/**
 * AppToken validation result
 */
export interface AppTokenValidationResult {
  valid: boolean;
  claims?: AppTokenPayload;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Error codes for token operations
 */
export enum TokenErrorCode {
  INVALID_CREDENTIALS = 40110,
  INVALID_REFRESH_TOKEN = 40107,
  RATE_LIMIT_EXCEEDED = 42901,
  TOKEN_NOT_FOUND = 40401,
}

/**
 * Configuration for token service
 */
export interface TokenServiceConfig {
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
  rateLimitPerMinute: number;
  privateKey?: string;
  publicKey?: string;
}

/**
 * Token Service
 * Handles all token lifecycle operations
 */
export class TokenService {
  private readonly blacklist: TokenBlacklist;
  private readonly refreshTokenRepo: RefreshTokenRepository;
  private readonly credentialService: CredentialService;
  private readonly rateLimiter: RateLimiter;
  private readonly config: TokenServiceConfig;

  constructor(
    blacklist: TokenBlacklist,
    refreshTokenRepo: RefreshTokenRepository,
    credentialService: CredentialService,
    rateLimiter: RateLimiter,
    config?: Partial<TokenServiceConfig>
  ) {
    this.blacklist = blacklist;
    this.refreshTokenRepo = refreshTokenRepo;
    this.credentialService = credentialService;
    this.rateLimiter = rateLimiter;
    this.config = {
      accessTokenExpiry: config?.accessTokenExpiry ?? 7200, // 2 hours
      refreshTokenExpiry: config?.refreshTokenExpiry ?? 2592000, // 30 days
      rateLimitPerMinute: config?.rateLimitPerMinute ?? 10,
      privateKey: config?.privateKey,
      publicKey: config?.publicKey,
    };
  }

  /**
   * Issue new token pair (AccessToken + RefreshToken)
   */
  async issueTokens(
    appid: string,
    appsecret: string,
    userId: string,
    enterpriseId?: string,
    permissions?: string[],
    clientIp?: string
  ): Promise<{ tokens: TokenPair } | { error: { code: number; message: string } }> {
    // Check rate limit
    const rateLimitKey = clientIp || appid;
    const rateLimit = await this.rateLimiter.checkLimit(rateLimitKey);

    if (rateLimit.limited) {
      return {
        error: {
          code: TokenErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Too many requests. Please try again later.',
        },
      };
    }

    // Validate credentials
    const credentialResult = await this.credentialService.validateCredentials(
      appid,
      appsecret
    );

    if (!credentialResult.valid) {
      return {
        error: {
          code: TokenErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid credentials',
        },
      };
    }

    // Generate tokens
    const accessTokenResult = signAccessToken(
      {
        appid,
        enterprise_id: enterpriseId || credentialResult.enterprise_id,
        permissions: permissions || credentialResult.permissions || [],
      },
      {
        expiresIn: this.config.accessTokenExpiry,
        privateKey: this.config.privateKey,
      }
    );

    const effectiveUserId = userId || credentialResult.user_id || 'unknown';

    const refreshTokenResult = signRefreshToken(
      appid,
      effectiveUserId,
      {
        expiresIn: this.config.refreshTokenExpiry,
        privateKey: this.config.privateKey,
      }
    );

    // Store RefreshToken in database
    await this.refreshTokenRepo.create({
      jti: refreshTokenResult.jti,
      appid,
      user_id: effectiveUserId,
      expires_at: refreshTokenResult.expiresAt,
      revoked: false,
      replaced_by_jti: null,
      created_at: Date.now(),
      last_used_at: null,
    });

    // Increment rate limit counter
    await this.rateLimiter.increment(rateLimitKey, 60);

    return {
      tokens: {
        access_token: accessTokenResult.token,
        refresh_token: refreshTokenResult.token,
        expires_in: this.config.accessTokenExpiry,
        token_type: 'Bearer',
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * Implements token rotation - new refresh token is issued
   */
  async refreshAccessToken(
    refreshToken: string,
    appid: string,
    clientIp?: string
  ): Promise<{ tokens: TokenPair } | { error: { code: number; message: string } }> {
    // Check rate limit
    const rateLimitKey = clientIp || appid;
    const rateLimit = await this.rateLimiter.checkLimit(rateLimitKey);

    if (rateLimit.limited) {
      return {
        error: {
          code: TokenErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Too many requests. Please try again later.',
        },
      };
    }

    // Verify refresh token
    const decodedToken = verifyRefreshToken(refreshToken, {
      publicKey: this.config.publicKey,
    });

    if (!decodedToken) {
      return {
        error: {
          code: TokenErrorCode.INVALID_REFRESH_TOKEN,
          message: 'Invalid or expired refresh token',
        },
      };
    }

    // Verify appid matches
    if (decodedToken.appid !== appid) {
      return {
        error: {
          code: TokenErrorCode.INVALID_REFRESH_TOKEN,
          message: 'Token does not match application',
        },
      };
    }

    // Check expiration
    if (isTokenExpired(decodedToken.exp)) {
      return {
        error: {
          code: TokenErrorCode.INVALID_REFRESH_TOKEN,
          message: 'Refresh token has expired',
        },
      };
    }

    // Find existing RefreshToken record
    const existingRecord = await this.refreshTokenRepo.findByJti(decodedToken.jti);

    if (!existingRecord) {
      return {
        error: {
          code: TokenErrorCode.INVALID_REFRESH_TOKEN,
          message: 'Refresh token not found',
        },
      };
    }

    if (existingRecord.revoked) {
      return {
        error: {
          code: TokenErrorCode.INVALID_REFRESH_TOKEN,
          message: 'Refresh token has been revoked',
        },
      };
    }

    if (existingRecord.replaced_by_jti) {
      return {
        error: {
          code: TokenErrorCode.INVALID_REFRESH_TOKEN,
          message: 'Refresh token has been replaced',
        },
      };
    }

    // Fetch current credentials to restore permissions and enterprise_id
    const credentialResult = await this.credentialService.validateCredentials(
      appid,
      '' // appsecret not needed for refresh — only appid lookup
    );

    // Generate new token pair (TOKEN ROTATION)
    const newAccessToken = signAccessToken(
      {
        appid,
        enterprise_id: credentialResult.valid ? credentialResult.enterprise_id : undefined,
        permissions: credentialResult.valid ? (credentialResult.permissions || []) : [],
      },
      {
        expiresIn: this.config.accessTokenExpiry,
        privateKey: this.config.privateKey,
      }
    );

    const newRefreshToken = signRefreshToken(
      appid,
      existingRecord.user_id,
      {
        expiresIn: this.config.refreshTokenExpiry,
        privateKey: this.config.privateKey,
      }
    );

    // Revoke old refresh token (mark as replaced)
    await this.refreshTokenRepo.markReplaced(
      existingRecord.jti,
      newRefreshToken.jti
    );

    // Store new RefreshToken
    await this.refreshTokenRepo.create({
      jti: newRefreshToken.jti,
      appid,
      user_id: existingRecord.user_id,
      expires_at: newRefreshToken.expiresAt,
      revoked: false,
      replaced_by_jti: null,
      created_at: Date.now(),
      last_used_at: Date.now(),
    });

    // Increment rate limit counter
    await this.rateLimiter.increment(rateLimitKey, 60);

    return {
      tokens: {
        access_token: newAccessToken.token,
        refresh_token: newRefreshToken.token,
        expires_in: this.config.accessTokenExpiry,
        token_type: 'Bearer',
      },
    };
  }

  /**
   * Revoke access token (add to blacklist)
   */
  async revokeAccessToken(
    jti: string,
    expiresAt?: number
  ): Promise<{ success: boolean } | { error: { code: number; message: string } }> {
    try {
      const ttl = expiresAt
        ? getTokenRemainingTTL(expiresAt)
        : this.config.accessTokenExpiry;

      await this.blacklist.blacklist(jti, ttl);

      return { success: true };
    } catch {
      return {
        error: {
          code: TokenErrorCode.TOKEN_NOT_FOUND,
          message: 'Failed to revoke token',
        },
      };
    }
  }

  /**
   * Revoke refresh token (in database)
   */
  async revokeRefreshToken(
    refreshToken: string
  ): Promise<{ success: boolean } | { error: { code: number; message: string } }> {
    const decoded = verifyRefreshToken(refreshToken, {
      publicKey: this.config.publicKey,
    });

    if (!decoded) {
      return {
        error: {
          code: TokenErrorCode.INVALID_REFRESH_TOKEN,
          message: 'Invalid refresh token',
        },
      };
    }

    const revoked = await this.refreshTokenRepo.revoke(decoded.jti);

    if (!revoked) {
      return {
        error: {
          code: TokenErrorCode.INVALID_REFRESH_TOKEN,
          message: 'Refresh token not found or already revoked',
        },
      };
    }

    // Also blacklist any remaining access token with same jti
    // (access tokens use different jti, so this is for safety)
    await this.blacklist.blacklist(decoded.jti, 60);

    return { success: true };
  }

  /**
   * Check if access token is revoked
   */
  async isAccessTokenRevoked(jti: string): Promise<boolean> {
    return this.blacklist.isBlacklisted(jti);
  }

  /**
   * Check if refresh token is valid
   */
  async isRefreshTokenValid(
    refreshToken: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const decoded = verifyRefreshToken(refreshToken, {
      publicKey: this.config.publicKey,
    });

    if (!decoded) {
      return { valid: false, reason: 'Invalid token' };
    }

    if (isTokenExpired(decoded.exp)) {
      return { valid: false, reason: 'Token expired' };
    }

    const record = await this.refreshTokenRepo.findByJti(decoded.jti);

    if (!record) {
      return { valid: false, reason: 'Token not found' };
    }

    if (record.revoked) {
      return { valid: false, reason: 'Token revoked' };
    }

    if (record.replaced_by_jti) {
      return { valid: false, reason: 'Token has been replaced' };
    }

    return { valid: true };
  }

  /**
   * Get refresh token record by jti
   */
  async getRefreshTokenRecord(
    jti: string
  ): Promise<RefreshTokenRecord | null> {
    return this.refreshTokenRepo.findByJti(jti);
  }

  /**
   * Get all active refresh tokens for an app
   */
  async getActiveRefreshTokens(
    appid: string
  ): Promise<RefreshTokenRecord[]> {
    return this.refreshTokenRepo.findByAppid(appid);
  }

  /**
   * Revoke all refresh tokens for an app
   */
  async revokeAllRefreshTokens(
    appid: string
  ): Promise<{ revoked: number }> {
    const tokens = await this.refreshTokenRepo.findByAppid(appid);
    let revoked = 0;

    for (const token of tokens) {
      if (!token.revoked) {
        const result = await this.refreshTokenRepo.revoke(token.jti);
        if (result) revoked++;
      }
    }

    return { revoked };
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<{ deleted: number }> {
    const deleted = await this.refreshTokenRepo.deleteExpired();
    return { deleted };
  }

  /**
   * Validate appToken (simple hash-based token from third-party developers)
   * Token format: md5(appId + appSecret + timestamp + nonce) + '-' + timestamp + '-' + nonce
   * Also supports JWT format for backward compatibility
   */
  async validateAppToken(
    appToken: string,
    appSecret: string,
    appId?: string
  ): Promise<AppTokenValidationResult> {
    try {
      // Check if it's a JWT token (contains dots)
      if (appToken.includes('.') && appToken.split('.').length === 3) {
        return this.validateJwtToken(appToken, appSecret);
      }

      // It's a hash-based token: hash-timestamp-nonce
      return this.validateHashToken(appToken, appSecret, appId);
    } catch (error) {
      return {
        valid: false,
        error: {
          code: 40103,
          message: 'Invalid token',
        },
      };
    }
  }

  /**
   * Validate JWT-based token (HS256)
   */
  private async validateJwtToken(
    appToken: string,
    appSecret: string
  ): Promise<AppTokenValidationResult> {
    try {
      // Verify and decode the JWT with HS256
      const decoded = jwt.verify(appToken, appSecret, {
        algorithms: ['HS256'],
      }) as AppTokenPayload;

      // Validate required claims
      if (!decoded.appId || !decoded.timestamp || !decoded.nonce) {
        return {
          valid: false,
          error: {
            code: 40101,
            message: 'Invalid token: missing required claims',
          },
        };
      }

      // Check expiration (default 1 hour)
      const tokenAge = Date.now() - decoded.timestamp;
      if (tokenAge > 3600000) {
        return {
          valid: false,
          error: {
            code: 40102,
            message: 'Token expired',
          },
        };
      }

      return {
        valid: true,
        claims: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: {
            code: 40102,
            message: 'Token expired',
          },
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: {
            code: 40103,
            message: 'Invalid token',
          },
        };
      }

      return {
        valid: false,
        error: {
          code: 40103,
          message: 'Invalid token',
        },
      };
    }
  }

  /**
   * Validate hash-based token
   * Token format: hash-timestamp-nonce
   * Validation: md5(appId + appSecret + timestamp + nonce) should equal hash
   */
  private async validateHashToken(
    appToken: string,
    appSecret: string,
    appId?: string
  ): Promise<AppTokenValidationResult> {
    // Parse token: hash-timestamp-nonce
    const parts = appToken.split('-');
    if (parts.length !== 3) {
      return {
        valid: false,
        error: {
          code: 40103,
          message: 'Invalid token format',
        },
      };
    }

    const [providedHash, timestampStr, nonce] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Validate timestamp is a number
    if (isNaN(timestamp)) {
      return {
        valid: false,
        error: {
          code: 40103,
          message: 'Invalid token: invalid timestamp',
        },
      };
    }

    // Check if timestamp is within valid range (not expired, max 1 hour old)
    const tokenAge = Date.now() - timestamp;
    if (tokenAge < 0 || tokenAge > 3600000) {
      return {
        valid: false,
        error: {
          code: 40102,
          message: 'Token expired or not yet valid',
        },
      };
    }

    // Calculate expected hash
    // If appId is provided, use it; otherwise try to extract from token format
    const appIdForHash = appId || 'unknown';
    const hashInput = appIdForHash + appSecret + timestampStr + nonce;
    const expectedHash = crypto.createHash('md5').update(hashInput).digest('hex');

    // Compare hashes
    if (providedHash !== expectedHash) {
      return {
        valid: false,
        error: {
          code: 40103,
          message: 'Invalid token: hash mismatch',
        },
      };
    }

    // Token is valid
    return {
      valid: true,
      claims: {
        appId: appIdForHash,
        timestamp,
        nonce,
      },
    };
  }
}

/**
 * Create default token service instance
 */
export function createTokenService(
  blacklist: TokenBlacklist,
  refreshTokenRepo: RefreshTokenRepository,
  credentialService: CredentialService,
  rateLimiter: RateLimiter,
  config?: Partial<TokenServiceConfig>
): TokenService {
  return new TokenService(
    blacklist,
    refreshTokenRepo,
    credentialService,
    rateLimiter,
    config
  );
}

// ============================================
// Default Token Service Instance (for DI)
// ============================================

// Default in-memory implementations for dependency injection
const defaultBlacklist: TokenBlacklist = {
  blacklist: async () => {},
  isBlacklisted: async () => false,
  remove: async () => {},
};

const defaultRefreshTokenRepo: RefreshTokenRepository = {
  create: async (record) => ({
    ...record,
    id: 0n,
  }),
  findByJti: async () => null,
  findByAppid: async () => [],
  update: async () => null,
  revoke: async () => false,
  markReplaced: async () => false,
  deleteExpired: async () => 0,
};

const defaultCredentialService: CredentialService = {
  validateCredentials: async () => ({
    valid: false,
  }),
};

const defaultRateLimiter: RateLimiter = {
  checkLimit: async () => ({
    limited: false,
    remaining: 10,
    resetAt: Date.now() + 60000,
  }),
  increment: async () => {},
};

/**
 * Default token service instance
 * Use this for dependency injection in controllers/routes
 *
 * NOTE: In production, this should be replaced with a properly configured instance
 * that uses Redis for blacklist and repository, and real credential validation.
 */
export const tokenService = createTokenService(
  defaultBlacklist,
  defaultRefreshTokenRepo,
  defaultCredentialService,
  defaultRateLimiter
);
