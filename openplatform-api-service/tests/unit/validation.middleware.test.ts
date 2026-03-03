/**
 * Validation Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../src/types/jwt.types';
import {
  createValidationMiddleware,
  createEndpointValidationMiddleware,
  getValidationResult,
  isValidationPassed,
  ValidationMiddlewareConfig,
} from '../../src/middleware/validation.middleware';
import { ValidationService } from '../../src/services/validation.service';
import { basicFieldValidators } from '../../src/services/validators/request.validators';

describe('ValidationMiddleware', () => {
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

  describe('createValidationMiddleware', () => {
    it('should pass validation for valid request', async () => {
      const middleware = createValidationMiddleware();

      mockReq.body = {
        appid: 'app_1234567890',
        nonce: 'abc1234567890',
        timestamp: 1700000000,
        sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      };
      mockReq.headers = { 'content-type': 'application/json' };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail for missing basic fields', async () => {
      const middleware = createValidationMiddleware();

      mockReq.body = {
        appid: 'app_1234567890',
        // Missing nonce, timestamp, sign
      };
      mockReq.headers = { 'content-type': 'application/json' };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail for invalid Content-Type', async () => {
      const middleware = createValidationMiddleware();

      mockReq.method = 'POST';
      mockReq.headers = { 'content-type': 'text/plain' };
      mockReq.body = {};

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 40002,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should skip validation for GET requests', async () => {
      const middleware = createValidationMiddleware();

      mockReq.method = 'GET';
      mockReq.body = {};

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip health endpoints', async () => {
      const middleware = createValidationMiddleware();

      mockReq.path = '/health';
      mockReq.body = {};

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip health endpoints with prefix', async () => {
      const middleware = createValidationMiddleware();

      mockReq.path = '/health/check';
      mockReq.body = {};

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should set trace ID header', async () => {
      const middleware = createValidationMiddleware();

      mockReq.body = {
        appid: 'app_1234567890',
        nonce: 'abc1234567890',
        timestamp: 1700000000,
        sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      };

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

    it('should use existing trace ID', async () => {
      const middleware = createValidationMiddleware();

      mockReq.headers = {
        'x-trace-id': 'existing-trace-id',
        'content-type': 'application/json',
      };
      mockReq.body = {
        appid: 'app_1234567890',
        nonce: 'abc1234567890',
        timestamp: 1700000000,
        sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      };

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

    it('should attach validation result to request', async () => {
      const middleware = createValidationMiddleware();

      mockReq.body = {
        appid: 'app_1234567890',
        nonce: 'abc1234567890',
        timestamp: 1700000000,
        sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      };
      mockReq.headers = { 'content-type': 'application/json' };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      const validationResult = getValidationResult(mockReq as Request);
      expect(validationResult).toBeDefined();
      expect(validationResult?.valid).toBe(true);
      expect(validationResult?.validatedAt).toBeDefined();
    });
  });

  describe('createEndpointValidationMiddleware', () => {
    it('should validate against provided rules', async () => {
      const rules = [
        { field: 'name', type: 'string' as const, required: true, message: 'name required' },
      ];

      const middleware = createEndpointValidationMiddleware(rules);

      mockReq.body = { name: 'Test' };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail for missing required field', async () => {
      const rules = [
        { field: 'name', type: 'string' as const, required: true, message: 'name required' },
      ];

      const middleware = createEndpointValidationMiddleware(rules);

      mockReq.body = {};

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('custom validators configuration', () => {
    it('should use custom validation service', async () => {
      const customService = new ValidationService();
      const config: ValidationMiddlewareConfig = {
        service: customService,
        validators: {
          basic: basicFieldValidators,
        },
      };

      const middleware = createValidationMiddleware(config);

      mockReq.body = {
        appid: 'app_1234567890',
        nonce: 'abc1234567890',
        timestamp: 1700000000,
        sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      };
      mockReq.headers = { 'content-type': 'application/json' };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getValidationResult', () => {
    it('should return null for request without validation', () => {
      const req = {} as Request;

      const result = getValidationResult(req);

      expect(result).toBeNull();
    });

    it('should return validation result when present', () => {
      const req = {
        validationResult: {
          valid: true,
          validatedAt: '2024-01-01T00:00:00Z',
        },
      } as unknown as Request;

      const result = getValidationResult(req);

      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
    });
  });

  describe('isValidationPassed', () => {
    it('should return false for request without validation', () => {
      const req = {} as Request;

      const result = isValidationPassed(req);

      expect(result).toBe(false);
    });

    it('should return true for passed validation', () => {
      const req = {
        validationResult: {
          valid: true,
          validatedAt: '2024-01-01T00:00:00Z',
        },
      } as unknown as Request;

      const result = isValidationPassed(req);

      expect(result).toBe(true);
    });

    it('should return false for failed validation', () => {
      const req = {
        validationResult: {
          valid: false,
          validatedAt: '2024-01-01T00:00:00Z',
        },
      } as unknown as Request;

      const result = isValidationPassed(req);

      expect(result).toBe(false);
    });
  });

  describe('DELETE requests', () => {
    it('should skip Content-Type validation for DELETE', async () => {
      const middleware = createValidationMiddleware();

      mockReq.method = 'DELETE';
      mockReq.headers = {};
      mockReq.body = {};

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('Validation Middleware Integration', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {
        appid: 'app_1234567890',
        nonce: 'abc1234567890',
        timestamp: 1700000000,
        sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      },
      query: {},
      headers: { 'content-type': 'application/json' },
      path: '/api/v1/payments',
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

  it('should validate payment request structure', async () => {
    mockReq.body = {
      appid: 'app_1234567890',
      nonce: 'abc1234567890',
      timestamp: 1700000000,
      sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      data: {
        unit_id: 'unit_1234567890',
        amount: 100.5,
        currency: 'BTC',
        recipient_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
      },
    };

    const middleware = createValidationMiddleware({
      validators: {
        basic: basicFieldValidators,
      },
    });

    await middleware(
      mockReq as AuthenticatedRequest,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
  });
});
