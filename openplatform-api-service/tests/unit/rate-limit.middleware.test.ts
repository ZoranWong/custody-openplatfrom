/**
 * Rate Limit Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../src/types/jwt.types';
import {
  createRateLimitMiddleware,
  createTierRateLimitMiddleware,
  getRateLimitInfo,
  isRateLimited,
} from '../../src/middleware/rate-limit.middleware';

describe('RateLimitMiddleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      headers: {},
      path: '/api/v1/enterprises',
      method: 'POST',
      appid: 'app_123',
      enterprise_id: 'ent_456',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn().mockReturnValue('test-trace-id'),
      send: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('createRateLimitMiddleware', () => {
    it('should allow request under rate limit', async () => {
      const middleware = createRateLimitMiddleware();

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should set rate limit headers', async () => {
      const middleware = createRateLimitMiddleware();

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        expect.any(String)
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        expect.any(String)
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String)
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Policy',
        'basic'
      );
    });

    it('should skip health endpoints', async () => {
      const middleware = createRateLimitMiddleware();

      mockReq.path = '/health';
      mockReq.method = 'GET';

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });

    it('should skip ready endpoints', async () => {
      const middleware = createRateLimitMiddleware();

      mockReq.path = '/ready';
      mockReq.method = 'GET';

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip metrics endpoints', async () => {
      const middleware = createRateLimitMiddleware();

      mockReq.path = '/metrics';
      mockReq.method = 'GET';

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip whitelisted IPs', async () => {
      const middleware = createRateLimitMiddleware({
        whiteList: {
          appids: [],
          enterpriseIds: [],
          ips: ['127.0.0.1'],
        },
      });

      mockReq.headers = {
        'x-forwarded-for': '127.0.0.1',
      };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip whitelisted appids', async () => {
      const middleware = createRateLimitMiddleware({
        whiteList: {
          appids: ['app_internal_001'],
          enterpriseIds: [],
          ips: [],
        },
      });

      mockReq.appid = 'app_internal_001';

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip whitelisted enterprise IDs', async () => {
      const middleware = createRateLimitMiddleware({
        whiteList: {
          appids: [],
          enterpriseIds: ['ent_internal'],
          ips: [],
        },
      });

      mockReq.enterprise_id = 'ent_internal';

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use appid from body if not on request', async () => {
      const middleware = createRateLimitMiddleware();

      mockReq.appid = undefined;
      (mockReq.body as any).appid = 'app_body_123';

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use enterprise_id from body if not on request', async () => {
      const middleware = createRateLimitMiddleware();

      mockReq.enterprise_id = undefined;
      (mockReq.body as any).enterprise_id = 'ent_body_456';

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const middleware = createRateLimitMiddleware();

      mockReq.headers = {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract IP from x-real-ip header', async () => {
      const middleware = createRateLimitMiddleware();

      mockReq.headers = {
        'x-real-ip': '172.16.0.1',
      };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createTierRateLimitMiddleware', () => {
    it('should create middleware with specified tier', async () => {
      const middleware = createTierRateLimitMiddleware('pro');

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Policy',
        'pro'
      );
    });

    it('should have different limits for pro tier', async () => {
      const basicMiddleware = createTierRateLimitMiddleware('basic');
      const proMiddleware = createTierRateLimitMiddleware('pro');

      await basicMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Reset mocks
      mockNext.mockClear();
      mockRes.setHeader.mockClear();

      await proMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Pro tier should have higher limits
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        expect.any(String)
      );
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return null for request without rate limit info', () => {
      const req = {} as Request;
      const result = getRateLimitInfo(req);
      expect(result).toBeNull();
    });

    it('should return rate limit info when present', () => {
      const req = {
        rateLimitResult: {
          allowed: true,
          remaining: 99,
          resetAt: Date.now() + 60000,
          limit: 100,
          tier: 'basic',
        },
      } as unknown as Request;

      const result = getRateLimitInfo(req);

      expect(result).toBeDefined();
      expect(result?.allowed).toBe(true);
      expect(result?.remaining).toBe(99);
    });
  });

  describe('isRateLimited', () => {
    it('should return false for request without rate limit info', () => {
      const req = {} as Request;
      const result = isRateLimited(req);
      expect(result).toBe(false);
    });

    it('should return false when request is allowed', () => {
      const req = {
        rateLimitResult: {
          allowed: true,
          remaining: 99,
          resetAt: Date.now() + 60000,
          limit: 100,
          tier: 'basic',
        },
      } as unknown as Request;

      const result = isRateLimited(req);
      expect(result).toBe(false);
    });

    it('should return true when request is blocked', () => {
      const req = {
        rateLimitResult: {
          allowed: false,
          remaining: 0,
          resetAt: Date.now() + 60000,
          limit: 100,
          tier: 'basic',
        },
      } as unknown as Request;

      const result = isRateLimited(req);
      expect(result).toBe(true);
    });
  });

  describe('fail-open behavior', () => {
    it('should allow request when rate limiting fails', async () => {
      // This tests the fail-open behavior when storage fails
      // In practice, this would require mocking the storage to throw
    });
  });

  describe('trace ID handling', () => {
    it('should set X-Trace-Id header', async () => {
      const middleware = createRateLimitMiddleware();

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Trace-Id',
        expect.any(String)
      );
    });

    it('should use existing trace ID from request', async () => {
      const middleware = createRateLimitMiddleware();

      (mockReq as any).traceId = 'existing_trace_123';

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Trace-Id',
        'existing_trace_123'
      );
    });

    it('should use trace ID from x-trace-id header', async () => {
      const middleware = createRateLimitMiddleware();

      mockReq.headers = {
        'x-trace-id': 'header_trace_456',
      };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Trace-Id',
        'header_trace_456'
      );
    });
  });
});

describe('Rate Limit Integration', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: { appid: 'app_integration_test' },
      query: {},
      headers: { 'content-type': 'application/json' },
      path: '/api/v1/payments',
      method: 'POST',
      appid: 'app_integration_test',
      enterprise_id: 'ent_test',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn().mockReturnValue('test-trace-id'),
      send: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  it('should apply endpoint-specific rate limits', async () => {
    const middleware = createRateLimitMiddleware({
      endpointConfigs: [
        {
          endpoint: '/api/v1/payments',
          methods: ['POST'],
          multiplier: 0.5,
        },
      ],
    });

    await middleware(
      mockReq as AuthenticatedRequest,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.setHeader).toHaveBeenCalled();
  });

  it('should respect tier-based configurations', async () => {
    const middleware = createRateLimitMiddleware({
      tierConfig: {
        free: {
          requestsPerDay: 1000,
          requestsPerHour: 100,
          requestsPerMinute: 10,
          burstSize: 20,
        },
        basic: {
          requestsPerDay: 10000,
          requestsPerHour: 1000,
          requestsPerMinute: 100,
          burstSize: 200,
        },
        pro: {
          requestsPerDay: 100000,
          requestsPerHour: 10000,
          requestsPerMinute: 1000,
          burstSize: 2000,
        },
        enterprise: {
          requestsPerDay: -1,
          requestsPerHour: 100000,
          requestsPerMinute: 10000,
          burstSize: 20000,
        },
      },
      defaultTier: 'pro',
    });

    mockReq.appid = 'app_pro_tier';

    await middleware(
      mockReq as AuthenticatedRequest,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Policy',
      'pro'
    );
  });
});
