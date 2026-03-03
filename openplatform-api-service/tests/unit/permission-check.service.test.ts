/**
 * Permission Check Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
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

describe('PermissionCheckService', () => {
  let repository: InMemoryEndpointPermissionRepository;
  let cache: InMemoryPermissionCache;
  let service: PermissionCheckService;

  beforeEach(() => {
    repository = new InMemoryEndpointPermissionRepository();
    cache = new InMemoryPermissionCache();
    service = createPermissionCheckService({
      permissionRepository: repository,
      permissionCache: cache,
      enableCache: true,
    });
  });

  describe('checkEndpointPermission', () => {
    it('should return allowed when app has required permission', async () => {
      // Add test permission config
      repository.upsert({
        path: '/api/v1/test',
        method: 'GET',
        requiredPermissions: ['test:read'],
      });

      const result = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/test',
        'GET',
        ['test:read']
      );

      expect(result.allowed).toBe(true);
      expect(result.missing_permissions).toBeUndefined();
    });

    it('should return denied when app lacks required permission', async () => {
      repository.upsert({
        path: '/api/v1/test',
        method: 'POST',
        requiredPermissions: ['test:write'],
      });

      const result = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/test',
        'POST',
        ['test:read']
      );

      expect(result.allowed).toBe(false);
      expect(result.missing_permissions).toContain('test:write');
    });

    it('should return config not found for unknown endpoint', async () => {
      const result = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/unknown',
        'GET',
        ['test:read']
      );

      expect(result.allowed).toBe(false);
      expect(result.error_code).toBe(40306);
    });

    it('should return missing permissions when multiple required', async () => {
      repository.upsert({
        path: '/api/v1/complex',
        method: 'PUT',
        requiredPermissions: ['test:read', 'test:write', 'test:delete'],
      });

      const result = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/complex',
        'PUT',
        ['test:read']
      );

      expect(result.allowed).toBe(false);
      expect(result.missing_permissions).toEqual(['test:write', 'test:delete']);
    });

    it('should cache successful permission check', async () => {
      repository.upsert({
        path: '/api/v1/cache-test',
        method: 'GET',
        requiredPermissions: ['cache:read'],
      });

      // First call
      const result1 = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/cache-test',
        'GET',
        ['cache:read']
      );

      // Second call - should use cache
      const result2 = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/cache-test',
        'GET',
        ['cache:read']
      );

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should handle wildcard path patterns', async () => {
      repository.upsert({
        path: '/api/v1/users/*',
        method: 'GET',
        requiredPermissions: ['users:read'],
      });

      const result = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/users/123',
        'GET',
        ['users:read']
      );

      expect(result.allowed).toBe(true);
    });

    it('should handle ALL method wildcard', async () => {
      repository.upsert({
        path: '/api/v1/public',
        method: 'ALL',
        requiredPermissions: ['public:access'],
      });

      const result = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/public',
        'DELETE',
        ['public:access']
      );

      expect(result.allowed).toBe(true);
    });

    it('should normalize HTTP method to uppercase', async () => {
      repository.upsert({
        path: '/api/v1/case-test',
        method: 'post',
        requiredPermissions: ['case:write'],
      });

      const result = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/case-test',
        'post',
        ['case:write']
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return true when app has permission', async () => {
      const result = await service.hasPermission(
        'read',
        ['read', 'write']
      );

      expect(result).toBe(true);
    });

    it('should return false when app lacks permission', async () => {
      const result = await service.hasPermission(
        'delete',
        ['read', 'write']
      );

      expect(result).toBe(false);
    });

    it('should return false when no permissions provided', async () => {
      const result = await service.hasPermission('read');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return false when app has none of the permissions', async () => {
      const result = await service.hasAnyPermission(
        ['delete', 'admin'],
        ['read', 'write']
      );

      expect(result).toBe(false);
    });

    it('should return true when app has one of the permissions', async () => {
      const result = await service.hasAnyPermission(
        ['delete', 'write'],
        ['read', 'write']
      );

      expect(result).toBe(true);
    });

    it('should return false when no permissions provided', async () => {
      const result = await service.hasAnyPermission(['read']);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when app has all permissions', async () => {
      const result = await service.hasAllPermissions(
        ['read', 'write'],
        ['read', 'write', 'delete']
      );

      expect(result).toBe(true);
    });

    it('should return false when app lacks some permissions', async () => {
      const result = await service.hasAllPermissions(
        ['read', 'write', 'admin'],
        ['read', 'write']
      );

      expect(result).toBe(false);
    });

    it('should return false when no permissions provided', async () => {
      const result = await service.hasAllPermissions(['read']);

      expect(result).toBe(false);
    });
  });

  describe('getRequiredPermissions', () => {
    it('should return required permissions for endpoint', async () => {
      repository.upsert({
        path: '/api/v1/required',
        method: 'POST',
        requiredPermissions: ['required:write', 'required:approve'],
      });

      const permissions = await service.getRequiredPermissions(
        '/api/v1/required',
        'POST'
      );

      expect(permissions).toEqual(['required:write', 'required:approve']);
    });

    it('should return empty array for unknown endpoint', async () => {
      const permissions = await service.getRequiredPermissions(
        '/api/v1/unknown',
        'GET'
      );

      expect(permissions).toEqual([]);
    });
  });

  describe('invalidateCache', () => {
    it('should clear cache for specific app/enterprise', async () => {
      repository.upsert({
        path: '/api/v1/cache',
        method: 'GET',
        requiredPermissions: ['cache:read'],
      });

      // First call to populate cache
      await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/cache',
        'GET',
        ['cache:read']
      );

      // Invalidate cache
      await service.invalidateCache('app_1', 'ent_1');

      // Cache should be cleared
      const cacheStats = cache.getStats();
      expect(cacheStats.size).toBe(0);
    });
  });

  describe('input validation', () => {
    it('should return error result for empty appid', async () => {
      const result = await service.checkEndpointPermission(
        '',
        'ent_1',
        '/api/v1/test',
        'GET',
        ['test:read']
      );

      expect(result.allowed).toBe(false);
      expect(result.error_code).toBe(40305);
      expect(result.error_message).toContain('Invalid appid');
    });

    it('should return error result for empty path', async () => {
      const result = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '',
        'GET',
        ['test:read']
      );

      expect(result.allowed).toBe(false);
      expect(result.error_code).toBe(40305);
      expect(result.error_message).toContain('Invalid path');
    });

    it('should return error result for empty method', async () => {
      const result = await service.checkEndpointPermission(
        'app_1',
        'ent_1',
        '/api/v1/test',
        '',
        ['test:read']
      );

      expect(result.allowed).toBe(false);
      expect(result.error_code).toBe(40305);
      expect(result.error_message).toContain('Invalid method');
    });
  });
});
