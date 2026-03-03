import { Request, Response, NextFunction } from 'express';
import {
  verifyAccessToken,
  decodeToken,
  isTokenExpired,
  getJWTKeys,
} from '../utils/jwt.util';
import {
  AuthenticatedRequest,
  JWTAuthMiddlewareConfig,
  TokenBlacklist,
} from '../types/jwt.types';

/**
 * Error codes for JWT authentication
 */
export enum JWTErrorCode {
  MISSING_TOKEN = 40105,
  INVALID_TOKEN = 40105,
  EXPIRED_TOKEN = 40106,
  INVALID_REFRESH_TOKEN = 40107,
  REVOKED_TOKEN = 40108,
  INVALID_TOKEN_TYPE = 40109,
}

/**
 * Default configuration for JWT middleware
 */
const DEFAULT_CONFIG: Required<JWTAuthMiddlewareConfig> = {
  excludePaths: ['/health', '/ready', '/metrics', '/oauth/token', '/oauth/revoke', '/oauth/appToken/validate'],
  allowNoAuth: false,
  getPublicKey: () => {
    try {
      return getJWTKeys().publicKey;
    } catch {
      throw new Error('JWT public key not available. Set JWT_PUBLIC_KEY environment variable.');
    }
  },
};

/**
 * Creates JWT authentication middleware
 *
 * @param tokenBlacklist - Token blacklist for immediate revocation
 * @param config - Middleware configuration
 * @returns Express middleware function
 */
export function createJWTAuthMiddleware(
  tokenBlacklist?: TokenBlacklist,
  config?: JWTAuthMiddlewareConfig
) {
  const blacklist = tokenBlacklist;
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Generate trace_id at entry (consistent with C.1.1)
    const traceId = (req.headers['x-trace-id'] as string) ||
      `jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    res.setHeader('X-Trace-Id', traceId);

    // Skip authentication for excluded paths
    if (finalConfig.excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers.authorization;

    // Check for Authorization header
    if (!authHeader) {
      if (finalConfig.allowNoAuth) {
        return next();
      }
      res.status(401).json({
        code: JWTErrorCode.MISSING_TOKEN,
        message: 'Missing or invalid Authorization header',
        trace_id: traceId,
      } as { code: number; message: string; trace_id: string });
      return;
    }

    // Validate Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        code: JWTErrorCode.INVALID_TOKEN,
        message: 'Invalid Authorization header format. Expected: Bearer <token>',
        trace_id: traceId,
      } as { code: number; message: string; trace_id: string });
      return;
    }

    const token = authHeader.slice(7);

    // Get public key from config
    const publicKey = finalConfig.getPublicKey();

    // Verify the token
    const payload = verifyAccessToken(token, { publicKey });

    if (!payload) {
      // Try to decode to provide better error message
      const decoded = decodeToken(token);
      if (decoded && decoded.type === 'refresh') {
        res.status(401).json({
          code: JWTErrorCode.INVALID_TOKEN_TYPE,
          message: 'Invalid token type: use access_token for authentication',
          trace_id: traceId,
        } as { code: number; message: string; trace_id: string });
      } else if (decoded && decoded.exp && isTokenExpired(decoded.exp as number)) {
        res.status(401).json({
          code: JWTErrorCode.EXPIRED_TOKEN,
          message: 'Token expired, please refresh',
          trace_id: traceId,
        } as { code: number; message: string; trace_id: string });
      } else {
        res.status(401).json({
          code: JWTErrorCode.INVALID_TOKEN,
          message: 'Invalid or malformed token',
          trace_id: traceId,
        } as { code: number; message: string; trace_id: string });
      }
      return;
    }

    // Check expiration
    if (isTokenExpired(payload.exp)) {
      res.status(401).json({
        code: JWTErrorCode.EXPIRED_TOKEN,
        message: 'Token expired, please refresh',
        trace_id: traceId,
      } as { code: number; message: string; trace_id: string });
      return;
    }

    // Check blacklist for immediate revocation
    if (blacklist && (await blacklist.isBlacklisted(payload.jti))) {
      res.status(401).json({
        code: JWTErrorCode.REVOKED_TOKEN,
        message: 'Token has been revoked',
        trace_id: traceId,
      } as { code: number; message: string; trace_id: string });
      return;
    }

    // Attach authentication info to request
    const authReq = req as AuthenticatedRequest;
    authReq.appid = payload.appid;
    authReq.enterprise_id = payload.enterprise_id;
    authReq.permissions = payload.permissions;
    authReq.jti = payload.jti;
    authReq.isAuthenticated = true;

    next();
  };
}

/**
 * JWT Authentication Middleware instance
 * Use this for simple cases without custom configuration
 */
export const jwtAuthMiddleware = createJWTAuthMiddleware();

/**
 * Require authentication middleware
 * Always requires authentication (never allows no-auth)
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.isAuthenticated) {
    const traceId = res.getHeader('X-Trace-Id') ||
      `jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    res.status(401).json({
      code: JWTErrorCode.MISSING_TOKEN,
      message: 'Authentication required',
      trace_id: traceId,
    } as { code: number; message: string; trace_id: string });
    return;
  }

  next();
}

/**
 * Optional authentication middleware factory
 * Attaches auth info if present, continues without error if not
 */
export function createOptionalAuth(
  tokenBlacklist?: TokenBlacklist,
  config?: JWTAuthMiddlewareConfig
) {
  const middleware = createJWTAuthMiddleware(tokenBlacklist, {
    ...config,
    allowNoAuth: true,
  });
  return middleware;
}

/**
 * Optional authentication middleware (default instance)
 * Attaches auth info if present, continues without error if not
 */
export const optionalAuth = createOptionalAuth();

/**
 * Extract appid from request (after auth middleware has run)
 */
export function getAppId(req: Request): string | undefined {
  return (req as AuthenticatedRequest).appid;
}

/**
 * Extract enterprise_id from request (after auth middleware has run)
 */
export function getEnterpriseId(req: Request): string | undefined {
  return (req as AuthenticatedRequest).enterprise_id;
}

/**
 * Extract permissions from request (after auth middleware has run)
 */
export function getPermissions(req: Request): string[] | undefined {
  return (req as AuthenticatedRequest).permissions;
}

/**
 * Check if request has specific permission
 */
export function hasPermission(
  req: Request,
  permission: string
): boolean {
  const permissions = getPermissions(req);
  return permissions?.includes(permission) ?? false;
}

/**
 * Check if request has all specified permissions
 */
export function hasAllPermissions(
  req: Request,
  requiredPermissions: string[]
): boolean {
  const permissions = getPermissions(req);
  if (!permissions) return false;
  return requiredPermissions.every(p => permissions.includes(p));
}

/**
 * Check if request has any of the specified permissions
 */
export function hasAnyPermission(
  req: Request,
  requiredPermissions: string[]
): boolean {
  const permissions = getPermissions(req);
  if (!permissions) return false;
  return requiredPermissions.some(p => permissions.includes(p));
}
