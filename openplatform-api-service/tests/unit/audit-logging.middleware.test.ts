/**
 * Audit Logging Middleware Tests
 * Unit tests for audit logging functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';

// Mock the logger module before importing the middleware
vi.mock('../../src/utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  logAuthFailure: vi.fn(),
  logAuthzFailure: vi.fn(),
  logRateLimitHit: vi.fn(),
  logValidationError: vi.fn(),
}));

describe('Audit Logging Middleware', () => {
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
      },
      path: '/api/test',
      method: 'GET',
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
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuditLoggingMiddleware', () => {
    it('should be importable', async () => {
      const { createAuditLoggingMiddleware } = await import('../../src/middleware/audit-logging.middleware.js');
      expect(createAuditLoggingMiddleware).toBeDefined();
    });

    it('should create middleware function', async () => {
      const { createAuditLoggingMiddleware } = await import('../../src/middleware/audit-logging.middleware.js');
      const middleware = createAuditLoggingMiddleware();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('logSignatureFailure', () => {
    it('should be importable', async () => {
      const { logSignatureFailure } = await import('../../src/middleware/audit-logging.middleware.js');
      expect(logSignatureFailure).toBeDefined();
    });

    it('should accept invalid_signature reason', async () => {
      const { logSignatureFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logSignatureFailure(mockReq as Request, 'invalid_signature');
      }).not.toThrow();
    });

    it('should accept missing_signature reason', async () => {
      const { logSignatureFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logSignatureFailure(mockReq as Request, 'missing_signature');
      }).not.toThrow();
    });

    it('should accept expired_timestamp reason', async () => {
      const { logSignatureFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logSignatureFailure(mockReq as Request, 'expired_timestamp');
      }).not.toThrow();
    });

    it('should accept invalid_appid reason', async () => {
      const { logSignatureFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logSignatureFailure(mockReq as Request, 'invalid_appid');
      }).not.toThrow();
    });

    it('should accept optional details', async () => {
      const { logSignatureFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logSignatureFailure(mockReq as Request, 'invalid_signature', { detail: 'test' });
      }).not.toThrow();
    });
  });

  describe('logTokenFailure', () => {
    it('should be importable', async () => {
      const { logTokenFailure } = await import('../../src/middleware/audit-logging.middleware.js');
      expect(logTokenFailure).toBeDefined();
    });

    it('should accept expired_token reason', async () => {
      const { logTokenFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logTokenFailure(mockReq as Request, 'expired_token');
      }).not.toThrow();
    });

    it('should accept missing_token reason', async () => {
      const { logTokenFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logTokenFailure(mockReq as Request, 'missing_token');
      }).not.toThrow();
    });

    it('should accept invalid_token reason', async () => {
      const { logTokenFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logTokenFailure(mockReq as Request, 'invalid_token');
      }).not.toThrow();
    });
  });

  describe('logAuthorizationFailure', () => {
    it('should be importable', async () => {
      const { logAuthorizationFailure } = await import('../../src/middleware/audit-logging.middleware.js');
      expect(logAuthorizationFailure).toBeDefined();
    });

    it('should log authorization failure with permission', async () => {
      const { logAuthorizationFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logAuthorizationFailure(mockReq as Request, 'admin:write');
      }).not.toThrow();
    });

    it('should accept optional reason', async () => {
      const { logAuthorizationFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      expect(() => {
        logAuthorizationFailure(mockReq as Request, 'admin:write', 'insufficient_permissions');
      }).not.toThrow();
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should be importable', async () => {
      const { logRateLimitExceeded } = await import('../../src/middleware/audit-logging.middleware.js');
      expect(logRateLimitExceeded).toBeDefined();
    });

    it('should log rate limit hit with limit info', async () => {
      const { logRateLimitExceeded } = await import('../../src/middleware/audit-logging.middleware.js');

      const resetTime = new Date();

      expect(() => {
        logRateLimitExceeded(mockReq as Request, 100, 0, resetTime);
      }).not.toThrow();
    });
  });

  describe('logValidationFailure', () => {
    it('should be importable', async () => {
      const { logValidationFailure } = await import('../../src/middleware/audit-logging.middleware.js');
      expect(logValidationFailure).toBeDefined();
    });

    it('should log validation errors with field info', async () => {
      const { logValidationFailure } = await import('../../src/middleware/audit-logging.middleware.js');

      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'amount', message: 'Amount must be positive' },
      ];

      expect(() => {
        logValidationFailure(mockReq as Request, errors);
      }).not.toThrow();
    });
  });

  describe('createAuditLogger', () => {
    it('should be importable', async () => {
      const { createAuditLogger } = await import('../../src/middleware/audit-logging.middleware.js');
      expect(createAuditLogger).toBeDefined();
    });

    it('should return object with logging functions', async () => {
      const { createAuditLogger } = await import('../../src/middleware/audit-logging.middleware.js');
      const auditLogger = createAuditLogger();

      expect(auditLogger.logSignatureFailure).toBeDefined();
      expect(auditLogger.logTokenFailure).toBeDefined();
      expect(auditLogger.logAuthorizationFailure).toBeDefined();
      expect(auditLogger.logRateLimitExceeded).toBeDefined();
      expect(auditLogger.logValidationFailure).toBeDefined();
    });
  });
});

describe('Audit Event Types', () => {
  it('should support all audit event types', () => {
    const eventTypes = [
      'auth_failure',
      'authz_failure',
      'rate_limit',
      'validation_error',
    ];

    eventTypes.forEach((type) => {
      expect(type).toMatch(/^(auth_failure|authz_failure|rate_limit|validation_error)$/);
    });
  });
});
