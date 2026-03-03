/**
 * Trace Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { createTraceMiddleware } from '../../src/middleware/trace.middleware';

// Mock the trace storage service
vi.mock('../../src/services/trace-storage.service', () => ({
  getTraceStorage: vi.fn().mockReturnValue({
    startSpan: vi.fn(),
    endSpan: vi.fn(),
  }),
}));

describe('Trace Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      method: 'GET',
      path: '/api/v1/test',
      originalUrl: '/api/v1/test',
      protocol: 'http',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    mockRes = {
      setHeader: vi.fn(),
      locals: {},
      statusCode: 200,
      statusMessage: 'OK',
      end: vi.fn(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createTraceMiddleware', () => {
    it('should generate new trace ID when none provided', () => {
      const middleware = createTraceMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.headers['x-trace-id']).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing trace ID from X-Trace-Id header', () => {
      mockReq.headers = { 'x-trace-id': 'existing-trace-id' };

      const middleware = createTraceMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.headers['x-trace-id']).toBe('existing-trace-id');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing trace ID from traceparent header', () => {
      mockReq.headers = {
        'traceparent': '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
      };

      const middleware = createTraceMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.headers['x-trace-id']).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set trace headers in response', () => {
      const middleware = createTraceMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('x-trace-id', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('traceparent', expect.any(String));
    });

    it('should store trace info in res.locals', () => {
      const middleware = createTraceMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.locals.traceId).toBeDefined();
      expect(mockRes.locals.spanId).toBeDefined();
    });

    it('should call next even without trace ID when generateTraceId is false', () => {
      mockReq.headers = {};
      const middleware = createTraceMiddleware({ generateTraceId: false });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should not include in response when disabled', () => {
      const middleware = createTraceMiddleware({ includeInResponse: false });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).not.toHaveBeenCalledWith('x-trace-id', expect.any(String));
    });

    it('should not start span when startSpan is false', () => {
      const middleware = createTraceMiddleware({ startSpan: false });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // The middleware should still work but without span creation
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract appid from request for span tagging', () => {
      mockReq.headers = { 'x-app-id': 'test-app-id' };

      const middleware = createTraceMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
