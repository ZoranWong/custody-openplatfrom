/**
 * Rate Limit Middleware
 * Express middleware for API rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/jwt.types';
import {
  RateLimitService,
  createRateLimitService,
} from '../services/rate-limit.service';
import {
  RateLimitMiddlewareConfig,
  RateLimitTier,
  RateLimitResult,
  RateLimitHeaders,
} from '../types/rate-limit.types';
import { errorMapper } from '../services/error-mapper.service';

/**
 * Simple structured logger
 */
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', message, ...data }));
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...data }));
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...data }));
  },
};

/**
 * Create rate limit middleware
 */
export function createRateLimitMiddleware(
  config?: RateLimitMiddlewareConfig
) {
  const rateLimitService = createRateLimitService();
  const tierConfig = config?.tierConfig || {};
  const defaultTier = config?.defaultTier || 'basic';
  const endpointConfigs = config?.endpointConfigs || [];
  const whiteList = config?.whiteList || { appids: [], enterpriseIds: [], ips: [] };
  const skipHealthEndpoints = config?.skipHealthEndpoints ?? true;
  const enableEnterpriseLimit = config?.enableEnterpriseLimit ?? true;
  const enableEndpointLimit = config?.enableEndpointLimit ?? false;

  // Register endpoint configurations
  for (const endpointConfig of endpointConfigs) {
    rateLimitService.registerEndpointConfig(endpointConfig);
  }

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Skip health/check endpoints (no rate limiting for these)
    if (skipHealthEndpoints) {
      const healthPatterns = ['/health', '/ready', '/metrics', '/ping'];
      if (healthPatterns.some((p) => req.path.startsWith(p))) {
        return next();
      }
    }

    const traceId =
      (req as any).traceId ||
      req.headers['x-trace-id'] ||
      res.getHeader('X-Trace-Id') ||
      `rl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Set trace ID header
    res.setHeader('X-Trace-Id', traceId as string);

    // Get client identifier
    const ip = getClientIP(req);
    const appid = req.appid || (req.body as any)?.appid;
    const enterpriseId = req.enterprise_id || (req.body as any)?.enterprise_id;

    // Check whitelist
    if (
      whiteList.appids.includes(appid) ||
      whiteList.enterpriseIds.includes(enterpriseId) ||
      whiteList.ips.includes(ip)
    ) {
      logger.info('rate_limit_whitelisted', { ip, appid, enterpriseId, traceId });
      return next();
    }

    // Get tier from configuration
    const tier = getTierForApp(appid, (tierConfig || {}) as Record<RateLimitTier, unknown>, defaultTier);

    // Build rate limit key
    const key = {
      appid,
      enterpriseId: enableEnterpriseLimit ? enterpriseId : undefined,
      ip,
      tier,
    };

    try {
      // Check rate limit
      const result = await rateLimitService.checkAllWindows(key);

      // Set rate limit headers
      const headers = rateLimitService.generateHeaders(result);
      for (const [header, value] of Object.entries(headers)) {
        res.setHeader(header, value);
      }

      if (!result.allowed) {
        const violation = rateLimitService.generateViolationResponse(result);

        logger.warn('rate_limit_exceeded', {
          ip,
          appid,
          enterpriseId,
          tier,
          count: result.limit - result.remaining + 1,
          limit: result.limit,
          retryAfter: violation.retryAfter,
          traceId,
        });

        res.setHeader('Retry-After', violation.retryAfter);

        res.status(429).json(
          errorMapper.mapError(
            {
              code: violation.code,
              message: violation.message,
            },
            traceId
          )
        );
        return;
      }

      logger.info('rate_limit_passed', {
        ip,
        appid,
        enterpriseId,
        tier,
        remaining: result.remaining,
        traceId,
      });

      next();
    } catch (error) {
      logger.error('rate_limit_error', {
        ip,
        appid,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId,
      });

      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips.trim();
  }

  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Get tier for an appid
 */
function getTierForApp(
  appid: string | undefined,
  _tierConfig: Record<RateLimitTier, unknown>,
  defaultTier: RateLimitTier
): RateLimitTier {
  if (!appid) {
    return defaultTier;
  }

  return defaultTier;
}

/**
 * Create tier-based rate limit middleware
 */
export function createTierRateLimitMiddleware(tier: RateLimitTier) {
  return createRateLimitMiddleware({
    defaultTier: tier,
  });
}

/**
 * Strict rate limit middleware (for critical endpoints)
 */
export function createStrictRateLimitMiddleware(
  options: {
    requestsPerMinute: number;
    burstSize?: number;
  }
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const rateLimitService = createRateLimitService();
    const ip = getClientIP(req);

    const key = { ip, tier: 'basic' as const };
    const result = await rateLimitService.checkRateLimit(key);

    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': options.requestsPerMinute.toString(),
      'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
      'X-RateLimit-Reset': Math.floor(result.resetAt / 1000).toString(),
      'X-RateLimit-Policy': 'strict',
    };

    for (const [header, value] of Object.entries(headers)) {
      res.setHeader(header, value);
    }

    if (!result.allowed) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({
        code: 42901,
        message: 'Rate limit exceeded. Please try again later.',
      });
      return;
    }

    next();
  };
}

/**
 * Default rate limit middleware (uses basic tier)
 */
export const defaultRateLimitMiddleware = createRateLimitMiddleware();

/**
 * Get rate limit info from request
 */
export function getRateLimitInfo(req: Request): RateLimitResult | null {
  return (req as any).rateLimitResult || null;
}

/**
 * Check if request is rate limited
 */
export function isRateLimited(req: Request): boolean {
  const result = getRateLimitInfo(req);
  return result !== null && !result.allowed;
}
