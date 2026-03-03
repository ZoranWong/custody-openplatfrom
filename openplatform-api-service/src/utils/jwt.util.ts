import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * JWT Token Management Utilities
 * Provides JWT signing, verification, and token lifecycle management
 */

// Configuration constants
const DEFAULT_ACCESS_TOKEN_EXPIRY = 7200; // 2 hours in seconds
const DEFAULT_REFRESH_TOKEN_EXPIRY = 2592000; // 30 days in seconds

/**
 * JWT Payload interfaces
 */
export interface AccessTokenPayload {
  appid: string;
  enterprise_id?: string;
  permissions: string[];
  iat: number;
  exp: number;
  jti: string; // Unique token ID for revocation
  type?: string; // 'access' or 'refresh'
}

export interface RefreshTokenPayload {
  appid: string;
  user_id: string;
  type: 'refresh';
  iat: number;
  exp: number;
  jti: string;
}

export interface JWTPayload {
  appid: string;
  enterprise_id?: string;
  permissions?: string[];
  type?: string;
  [key: string]: unknown;
}

/**
 * Result of signing a token
 */
export interface SignedToken {
  token: string;
  expiresAt: number;
  jti: string;
}

/**
 * Key configuration for JWT operations
 */
export interface JWTKeyConfig {
  privateKey: string; // Base64 encoded PKCS8
  publicKey: string; // Base64 encoded SPKI
}

/**
 * Get JWT keys from environment variables
 */
export function getJWTKeys(): JWTKeyConfig {
  const privateKey = process.env.JWT_PRIVATE_KEY;
  const publicKey = process.env.JWT_PUBLIC_KEY;

  if (!privateKey || !publicKey) {
    throw new Error('JWT keys not configured. Set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables.');
  }

  return {
    privateKey: Buffer.from(privateKey, 'base64').toString('utf8'),
    publicKey: Buffer.from(publicKey, 'base64').toString('utf8'),
  };
}

/**
 * Generate a unique token ID (UUID v4 compatible)
 */
export function generateJti(): string {
  return crypto.randomUUID();
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(exp: number): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime >= exp;
}

/**
 * Calculate remaining time until expiration in seconds
 */
export function getTokenRemainingTTL(exp: number): number {
  const currentTime = Math.floor(Date.now() / 1000);
  const remaining = exp - currentTime;
  return remaining > 0 ? remaining : 0;
}

/**
 * Sign an AccessToken with RS256 algorithm
 */
export function signAccessToken(
  payload: Omit<AccessTokenPayload, 'iat' | 'exp' | 'jti' | 'type'>,
  options?: {
    expiresIn?: number;
    privateKey?: string;
  }
): SignedToken {
  const keys = options?.privateKey ? { privateKey: options.privateKey } : getJWTKeys();
  const expiresIn = options?.expiresIn || DEFAULT_ACCESS_TOKEN_EXPIRY;
  const jti = generateJti();
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload = {
    ...payload,
    iat: now,
    jti,
    type: 'access',
  };

  const token = jwt.sign(tokenPayload, keys.privateKey, {
    algorithm: 'RS256',
    expiresIn,
  });

  // Decode to get the actual exp value set by the library
  const decoded = jwt.decode(token) as { exp: number };

  return {
    token,
    expiresAt: decoded.exp,
    jti,
  };
}

/**
 * Sign a RefreshToken with RS256 algorithm
 */
export function signRefreshToken(
  appid: string,
  userId: string,
  options?: {
    expiresIn?: number;
    privateKey?: string;
  }
): SignedToken {
  const keys = options?.privateKey ? { privateKey: options.privateKey } : getJWTKeys();
  const expiresIn = options?.expiresIn || DEFAULT_REFRESH_TOKEN_EXPIRY;
  const jti = generateJti();
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload = {
    appid,
    user_id: userId,
    type: 'refresh',
    iat: now,
    jti,
  };

  const token = jwt.sign(tokenPayload, keys.privateKey, {
    algorithm: 'RS256',
    expiresIn,
  });

  // Decode to get the actual exp value set by the library
  const decoded = jwt.decode(token) as { exp: number };

  return {
    token,
    expiresAt: decoded.exp,
    jti,
  };
}

/**
 * Verify and decode an AccessToken
 */
export function verifyAccessToken(
  token: string,
  options?: {
    publicKey?: string;
  }
): AccessTokenPayload | null {
  try {
    const keys = options?.publicKey ? { publicKey: options.publicKey } : getJWTKeys();

    const decoded = jwt.verify(token, keys.publicKey, {
      algorithms: ['RS256'],
    }) as AccessTokenPayload;

    // Ensure this is an access token, not a refresh token
    if (decoded.type === 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify and decode a RefreshToken
 */
export function verifyRefreshToken(
  token: string,
  options?: {
    publicKey?: string;
  }
): RefreshTokenPayload | null {
  try {
    const keys = options?.publicKey ? { publicKey: options.publicKey } : getJWTKeys();

    const decoded = jwt.verify(token, keys.publicKey, {
      algorithms: ['RS256'],
    }) as RefreshTokenPayload;

    // Ensure this is a refresh token
    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a token without verification (for inspection)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Generate RSA key pair for JWT signing
 * This is a development utility - in production, keys should be generated externally
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
}

/**
 * Generate base64 encoded key pair for environment variables
 */
export function generateBase64KeyPair(): { publicKeyBase64: string; privateKeyBase64: string } {
  const { publicKey, privateKey } = generateKeyPair();

  return {
    publicKeyBase64: Buffer.from(publicKey).toString('base64'),
    privateKeyBase64: Buffer.from(privateKey).toString('base64'),
  };
}

/**
 * Sign a generic JWT with custom payload
 */
export function signJWT(
  payload: Record<string, unknown>,
  options?: {
    expiresIn?: number;
    privateKey?: string;
    algorithm?: 'RS256';
  }
): SignedToken {
  const keys = options?.privateKey ? { privateKey: options.privateKey } : getJWTKeys();
  const expiresIn = options?.expiresIn || DEFAULT_ACCESS_TOKEN_EXPIRY;
  const jti = generateJti();
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload = {
    ...payload,
    iat: now,
    jti,
  };

  const token = jwt.sign(tokenPayload, keys.privateKey, {
    algorithm: options?.algorithm || 'RS256',
    expiresIn,
  });

  // Decode to get the actual exp value set by the library
  const decoded = jwt.decode(token) as { exp: number };

  return {
    token,
    expiresAt: decoded.exp,
    jti,
  };
}

/**
 * Verify a generic JWT
 */
export function verifyJWT<T = Record<string, unknown>>(
  token: string,
  options?: {
    publicKey?: string;
    algorithms?: ['RS256'];
  }
): T | null {
  try {
    const keys = options?.publicKey ? { publicKey: options.publicKey } : getJWTKeys();

    const decoded = jwt.verify(token, keys.publicKey, {
      algorithms: options?.algorithms || ['RS256'],
    }) as T;

    return decoded;
  } catch {
    return null;
  }
}
