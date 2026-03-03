/**
 * Request Logger Tests
 * Unit tests for request logging functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';

describe('Request Logger Service', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {
        'x-trace-id': 'test-trace-id',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'test-agent',
        'x-app-id': 'test-app',
        'content-length': '100',
      },
      path: '/api/test',
      method: 'GET',
      query: { page: '1' },
      ip: '192.168.1.1',
      socket: {
        remoteAddress: '192.168.1.1',
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      send: vi.fn().mockReturnThis(),
      on: vi.fn(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequestLoggerMiddleware', () => {
    it('should be importable', async () => {
      const { createRequestLoggerMiddleware } = await import('../../src/services/request-logger.service.js');
      expect(createRequestLoggerMiddleware).toBeDefined();
    });

    it('should create middleware function', async () => {
      const { createRequestLoggerMiddleware } = await import('../../src/services/request-logger.service.js');
      const middleware = createRequestLoggerMiddleware();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('createRequestLoggerService', () => {
    it('should create service with logRequest method', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();
      expect(service.logRequest).toBeDefined();
      expect(typeof service.logRequest).toBe('function');
    });

    it('should create service with logResponse method', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();
      expect(service.logResponse).toBeDefined();
      expect(typeof service.logResponse).toBe('function');
    });

    it('should create service with logError method', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();
      expect(service.logError).toBeDefined();
      expect(typeof service.logError).toBe('function');
    });

    it('should create service with middleware method', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();
      expect(service.middleware).toBeDefined();
      expect(typeof service.middleware).toBe('function');
    });
  });

  describe('logRequest', () => {
    it('should log request with method and path', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();

      // Should not throw
      expect(() => {
        service.logRequest({
          method: 'GET',
          path: '/api/test',
          headers: {},
          traceId: 'test-123',
        });
      }).not.toThrow();
    });

    it('should log request with query parameters', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();

      expect(() => {
        service.logRequest({
          method: 'GET',
          path: '/api/test',
          query: { page: 1, limit: 10 },
          headers: {},
          traceId: 'test-456',
        });
      }).not.toThrow();
    });

    it('should log request with IP and user agent', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();

      expect(() => {
        service.logRequest({
          method: 'POST',
          path: '/api/test',
          headers: {},
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          traceId: 'test-789',
        });
      }).not.toThrow();
    });
  });

  describe('logResponse', () => {
    it('should log response with status and timing', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();

      expect(() => {
        service.logResponse({
          status: 200,
          responseTime: 45.5,
          traceId: 'test-123',
        });
      }).not.toThrow();
    });

    it('should log response with error status', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();

      expect(() => {
        service.logResponse({
          status: 500,
          responseTime: 120.0,
          traceId: 'test-500',
        });
      }).not.toThrow();
    });

    it('should log response with response length', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();

      expect(() => {
        service.logResponse({
          status: 200,
          responseTime: 30.0,
          responseLength: 1024,
          traceId: 'test-length',
        });
      }).not.toThrow();
    });
  });

  describe('logError', () => {
    it('should log error with message', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();

      expect(() => {
        service.logError({
          message: 'Test error',
          traceId: 'test-error',
        });
      }).not.toThrow();
    });

    it('should log error with error object', async () => {
      const { createRequestLoggerService } = await import('../../src/services/request-logger.service.js');
      const service = createRequestLoggerService();

      const error = new Error('Test error message');

      expect(() => {
        service.logError({
          message: 'Error occurred',
          error,
          traceId: 'test-error-obj',
        });
      }).not.toThrow();
    });
  });
});
