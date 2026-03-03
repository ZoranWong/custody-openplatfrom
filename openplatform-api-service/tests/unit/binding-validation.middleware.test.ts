/**
 * Binding Validation Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createBindingValidationMiddleware,
} from '../../src/middleware/binding-validation.middleware';
import { AuthenticatedRequest } from '../../src/types/jwt.types';
import { BindingErrorCode } from '../../src/types/binding.types';
import {
  BindingValidationService,
  createBindingValidationService,
} from '../../src/services/binding-validation.service';
import {
  InMemoryBindingRepository,
} from '../../src/repositories/binding.repository';
import {
  InMemoryBindingCache,
} from '../../src/cache/binding.cache';

describe('BindingValidationMiddleware', () => {
  let repository: InMemoryBindingRepository;
  let cache: InMemoryBindingCache;
  let service: BindingValidationService;
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    repository = new InMemoryBindingRepository();
    cache = new InMemoryBindingCache();
    service = createBindingValidationService(repository, cache, {
      cacheTtlSeconds: 300,
    });

    mockReq = {
      body: {},
      query: {},
      headers: {},
      path: '/api/test',
      appid: undefined,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn().mockReturnValue('test-trace-id'),
    };

    mockNext = vi.fn();
  });

  describe('skip conditions', () => {
    it('should skip excluded paths', async () => {
      const middleware = createBindingValidationMiddleware({
        bindingService: service,
        excludePaths: ['/health', '/api/public'],
      });

      mockReq.path = '/health';
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip when no appid in request', async () => {
      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      // No appid set
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip when no enterprise_id and requireEnterprise is false', async () => {
      const middleware = createBindingValidationMiddleware({
        bindingService: service,
        requireEnterprise: false,
      });

      mockReq.appid = 'app_1';
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('requireEnterprise', () => {
    it('should return error when enterprise_id required but not provided', async () => {
      const middleware = createBindingValidationMiddleware({
        bindingService: service,
        requireEnterprise: true,
      });

      mockReq.appid = 'app_1';
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: BindingErrorCode.ENTERPRISE_NOT_FOUND,
        message: 'Enterprise ID is required',
        trace_id: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('binding validation', () => {
    it('should return 403 when binding not found', async () => {
      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_1' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: BindingErrorCode.APP_NOT_BOUND,
        message: 'Application not authorized for this enterprise',
        trace_id: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass when binding is valid', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_1' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should attach enterprise_id to request', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_1' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect((mockReq as AuthenticatedRequest).enterprise_id).toBe('ent_1');
    });

    it('should attach permissions to request', async () => {
      await repository.create('app_1', 'ent_1', ['read', 'write'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_1' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect((mockReq as AuthenticatedRequest).permissions).toContain('read');
      expect((mockReq as AuthenticatedRequest).permissions).toContain('write');
    });

    it('should merge permissions with existing permissions', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.permissions = ['admin'];
      mockReq.body = { enterprise_id: 'ent_1' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect((mockReq as AuthenticatedRequest).permissions).toContain('admin');
      expect((mockReq as AuthenticatedRequest).permissions).toContain('read');
    });

    it('should return 403 when binding is revoked', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);
      await repository.updateStatus('app_1', 'ent_1', 'revoked');

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_1' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: BindingErrorCode.BINDING_REVOKED,
        message: 'Application binding has been revoked',
        trace_id: expect.any(String),
      });
    });

    it('should return 403 when binding is expired', async () => {
      await repository.create('app_1', 'ent_1', ['read'], Math.floor(Date.now() / 1000) - 3600);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_1' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: BindingErrorCode.BINDING_EXPIRED,
        message: 'Application binding has expired',
        trace_id: expect.any(String),
      });
    });
  });

  describe('enterprise_id sources', () => {
    it('should get enterprise_id from body', async () => {
      await repository.create('app_1', 'ent_body', ['read'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_body' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should get enterprise_id from query', async () => {
      await repository.create('app_1', 'ent_query', ['read'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.query = { enterprise_id: 'ent_query' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should get enterprise_id from header', async () => {
      await repository.create('app_1', 'ent_header', ['read'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.headers = { 'x-enterprise-id': 'ent_header' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should prefer body over query over header', async () => {
      await repository.create('app_1', 'ent_body', ['read'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_body' };
      mockReq.query = { enterprise_id: 'ent_query' };
      mockReq.headers = { 'x-enterprise-id': 'ent_header' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).enterprise_id).toBe('ent_body');
    });
  });

  describe('trace_id', () => {
    it('should generate trace_id if not present', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_1' };
      mockReq.headers = {};
      mockRes.getHeader = vi.fn().mockReturnValue(undefined);

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Trace-Id', expect.any(String));
    });

    it('should use existing trace_id from header', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      const middleware = createBindingValidationMiddleware({
        bindingService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.body = { enterprise_id: 'ent_1' };
      mockReq.headers = { 'x-trace-id': 'existing-trace-id' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Trace-Id', 'existing-trace-id');
    });
  });
});
