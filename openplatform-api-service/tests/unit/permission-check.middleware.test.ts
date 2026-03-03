/**
 * Permission Check Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createPermissionCheckMiddleware,
  requirePermission,
  requireAnyPermission,
} from '../../src/middleware/permission-check.middleware';
import { AuthenticatedRequest } from '../../src/types/jwt.types';
import {
  PermissionCheckService,
  createPermissionCheckService,
} from '../../src/services/permission-check.service';
import {
  InMemoryEndpointPermissionRepository,
} from '../../src/repositories/endpoint-permission.repository';
import {
  InMemoryPermissionCache,
} from '../../src/cache/permission.cache';
import { PermissionErrorCode } from '../../src/types/permission.types';

describe('PermissionCheckMiddleware', () => {
  let repository: InMemoryEndpointPermissionRepository;
  let cache: InMemoryPermissionCache;
  let service: PermissionCheckService;
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    repository = new InMemoryEndpointPermissionRepository();
    cache = new InMemoryPermissionCache();
    service = createPermissionCheckService({
      permissionRepository: repository,
      permissionCache: cache,
      enableCache: false,
    });

    mockReq = {
      body: {},
      query: {},
      headers: {},
      path: '/api/test',
      method: 'GET',
      appid: undefined,
      permissions: [],
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
      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
        excludePaths: ['/health', '/api/public'],
      });

      mockReq.path = '/health';
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip public paths', async () => {
      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
        publicPaths: ['/api/v1/status'],
      });

      mockReq.path = '/api/v1/status';
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip when no appid in request', async () => {
      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      // No appid set
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('permission granted', () => {
    it('should pass when app has required permission', async () => {
      repository.upsert({
        path: '/api/test',
        method: 'GET',
        requiredPermissions: ['test:read'],
      });

      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.permissions = ['test:read'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass when app has multiple required permissions', async () => {
      repository.upsert({
        path: '/api/test',
        method: 'POST',
        requiredPermissions: ['test:read', 'test:write'],
      });

      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.method = 'POST';
      mockReq.permissions = ['test:read', 'test:write', 'test:delete'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('permission denied', () => {
    it('should return 403 when permission not found', async () => {
      repository.upsert({
        path: '/api/test',
        method: 'GET',
        requiredPermissions: ['test:write'],
      });

      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.permissions = ['test:read'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: PermissionErrorCode.INSUFFICIENT_PERMISSIONS,
        message: expect.stringContaining('Insufficient permissions'),
        trace_id: expect.any(String),
        missing_permissions: ['test:write'],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when endpoint config not found', async () => {
      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.permissions = ['test:read'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: PermissionErrorCode.PERMISSION_CONFIG_NOT_FOUND,
        message: expect.stringContaining('Permission configuration not found'),
        trace_id: expect.any(String),
      });
    });

    it('should return 403 when multiple permissions missing', async () => {
      repository.upsert({
        path: '/api/test',
        method: 'PUT',
        requiredPermissions: ['test:read', 'test:write', 'test:delete'],
      });

      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.method = 'PUT';
      mockReq.permissions = ['test:read'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: PermissionErrorCode.INSUFFICIENT_PERMISSIONS,
        message: expect.stringContaining('Insufficient permissions'),
        trace_id: expect.any(String),
        missing_permissions: ['test:write', 'test:delete'],
      });
    });
  });

  describe('enterprise context', () => {
    it('should use enterprise_id from request', async () => {
      repository.upsert({
        path: '/api/test',
        method: 'GET',
        requiredPermissions: ['enterprise:access'],
      });

      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.enterprise_id = 'ent_123';
      mockReq.permissions = ['enterprise:access'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing enterprise_id', async () => {
      repository.upsert({
        path: '/api/test',
        method: 'GET',
        requiredPermissions: ['test:read'],
      });

      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.enterprise_id = undefined;
      mockReq.permissions = ['test:read'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('trace_id', () => {
    it('should generate trace_id if not present', async () => {
      repository.upsert({
        path: '/api/test',
        method: 'GET',
        requiredPermissions: ['test:read'],
      });

      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.permissions = ['test:read'];
      mockReq.headers = {};
      mockRes.getHeader = vi.fn().mockReturnValue(undefined);

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Trace-Id', expect.any(String));
    });

    it('should use existing trace_id from header', async () => {
      repository.upsert({
        path: '/api/test',
        method: 'GET',
        requiredPermissions: ['test:read'],
      });

      const middleware = createPermissionCheckMiddleware({
        permissionService: service,
      });

      mockReq.appid = 'app_1';
      mockReq.permissions = ['test:read'];
      mockReq.headers = { 'x-trace-id': 'existing-trace-id' };

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Trace-Id', 'existing-trace-id');
    });
  });

  describe('requirePermission helper', () => {
    it('should pass when app has required permission', async () => {
      const middleware = requirePermission('admin:access');

      mockReq.appid = 'app_1';
      mockReq.permissions = ['admin:access'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 when permission missing', async () => {
      const middleware = requirePermission('admin:access');

      mockReq.appid = 'app_1';
      mockReq.permissions = ['read:only'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40305,
        message: expect.stringContaining('Permission denied'),
        trace_id: expect.any(String),
        missing_permissions: ['admin:access'],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should skip when no appid', async () => {
      const middleware = requirePermission('admin:access');

      mockReq.appid = undefined;
      mockReq.permissions = [];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAnyPermission helper', () => {
    it('should pass when app has one of required permissions', async () => {
      const middleware = requireAnyPermission(['admin:access', 'moderator:access']);

      mockReq.appid = 'app_1';
      mockReq.permissions = ['moderator:access'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass when app has multiple required permissions', async () => {
      const middleware = requireAnyPermission(['admin:access', 'moderator:access']);

      mockReq.appid = 'app_1';
      mockReq.permissions = ['admin:access', 'moderator:access'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when no matching permissions', async () => {
      const middleware = requireAnyPermission(['admin:access', 'moderator:access']);

      mockReq.appid = 'app_1';
      mockReq.permissions = ['read:only', 'guest:access'];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 40305,
        message: expect.stringContaining('Permission denied'),
        trace_id: expect.any(String),
        missing_permissions: ['admin:access', 'moderator:access'],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should skip when no appid', async () => {
      const middleware = requireAnyPermission(['admin:access']);

      mockReq.appid = undefined;
      mockReq.permissions = [];

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
