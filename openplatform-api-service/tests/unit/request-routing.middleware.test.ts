/**
 * Request Routing Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createRequestRoutingMiddleware,
  createBackendForwardingMiddleware,
  createCombinedRoutingMiddleware,
  getRoutingInfo,
  getTraceId,
} from '../../src/middleware/request-routing.middleware';
import { AuthenticatedRequest } from '../../src/types/jwt.types';
import {
  RequestRoutingService,
} from '../../src/services/request-routing.service';

describe('RequestRoutingMiddleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      headers: {},
      path: '/api/oauth/custody/enterprise/wallets',
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

  describe('createRequestRoutingMiddleware', () => {
    it('should attach routing info for valid route', async () => {
      const middleware = createRequestRoutingMiddleware({
        skipHealthEndpoints: false,
      });

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      // The actual backendPath is computed from route config: /api/custody${1} + /enterprise/wallets = /api/custody/enterprise/wallets
      expect((mockReq as any).routingInfo).toMatchObject({
        backendService: 'custody-enterprise',
        allowed: true,
      });
    });

    it('should return 404 for unknown route', async () => {
      // Use a path that's not in the route table
      mockReq.path = '/api/v1/unknown';
      mockReq.method = 'GET';

      const middleware = createRequestRoutingMiddleware({
        skipHealthEndpoints: false,
      });

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40401,
        message: 'Route not found',
        trace_id: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should skip health endpoints by default', async () => {
      mockReq.path = '/health';

      const middleware = createRequestRoutingMiddleware();

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).routingInfo).toBeUndefined();
    });

    it('should set X-Trace-Id header', async () => {
      const mockRoutingService = {
        getRoutingInfo: vi.fn().mockReturnValue({
          backendService: 'custody-enterprise',
          backendPath: '/api/oauth/custody/enterprise/wallets',
        }),
      };

      const middleware = createRequestRoutingMiddleware({
        routingService: mockRoutingService as unknown as RequestRoutingService,
      });

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

    it('should use existing trace ID from header', async () => {
      mockReq.headers = { 'x-trace-id': 'existing-trace-id' };

      const mockRoutingService = {
        getRoutingInfo: vi.fn().mockReturnValue({
          backendService: 'custody-enterprise',
          backendPath: '/api/oauth/custody/enterprise/wallets',
        }),
      };

      const middleware = createRequestRoutingMiddleware({
        routingService: mockRoutingService as unknown as RequestRoutingService,
      });

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Trace-Id',
        'existing-trace-id'
      );
    });
  });

  describe('createBackendForwardingMiddleware', () => {
    it('should forward request to backend', async () => {
      const mockResponse = { success: true, data: { id: '123' } };

      const mockRoutingService = {
        forwardRequest: vi.fn().mockResolvedValue(mockResponse),
      };

      (mockReq as any).routingInfo = {
        backendService: 'custody-enterprise',
        backendPath: '/api/oauth/custody/enterprise/wallets',
      };
      (mockReq as any).traceId = 'test-trace-id';

      const middleware = createBackendForwardingMiddleware(
        mockRoutingService as unknown as RequestRoutingService
      );

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRoutingService.forwardRequest).toHaveBeenCalledWith(
        'POST',
        '/api/oauth/custody/enterprise/wallets',
        {},
        {},
        {},
        'app_123',
        'ent_456',
        'test-trace-id',
        mockReq
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should return next if no routing info', async () => {
      const middleware = createBackendForwardingMiddleware();

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle backend error', async () => {
      const mockRoutingService = {
        forwardRequest: vi.fn().mockRejectedValue({
          code: 500,
          message: 'Internal server error',
          trace_id: 'test-trace-id',
        }),
      };

      (mockReq as any).routingInfo = {
        backendService: 'custody-enterprise',
        backendPath: '/api/oauth/custody/enterprise/wallets',
      };
      (mockReq as any).traceId = 'test-trace-id';

      const middleware = createBackendForwardingMiddleware(
        mockRoutingService as unknown as RequestRoutingService
      );

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('getRoutingInfo', () => {
    it('should return routing info from request', () => {
      const req = {
        routingInfo: {
          backendService: 'custody-enterprise',
          backendPath: '/api/oauth/custody/enterprise/wallets',
        },
      } as unknown as Request;

      const info = getRoutingInfo(req);

      expect(info).toEqual({
        backendService: 'custody-enterprise',
        backendPath: '/api/oauth/custody/enterprise/wallets',
      });
    });

    it('should return null if no routing info', () => {
      const req = {} as Request;

      const info = getRoutingInfo(req);

      expect(info).toBeNull();
    });
  });

  describe('getTraceId', () => {
    it('should return trace ID from request', () => {
      const req = {
        traceId: 'test-trace-id',
      } as unknown as Request;

      const traceId = getTraceId(req);

      expect(traceId).toBe('test-trace-id');
    });

    it('should return trace ID from header if not on request', () => {
      const req = {
        headers: { 'x-trace-id': 'header-trace-id' },
      } as unknown as Request;

      const traceId = getTraceId(req);

      expect(traceId).toBe('header-trace-id');
    });

    it('should return null if no trace ID', () => {
      const req = {
        headers: {},
      } as unknown as Request;

      const traceId = getTraceId(req);

      expect(traceId).toBeNull();
    });
  });
});
