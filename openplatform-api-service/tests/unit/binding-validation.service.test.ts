/**
 * Binding Validation Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
import { BindingErrorCode } from '../../src/types/binding.types';

describe('BindingValidationService', () => {
  let repository: InMemoryBindingRepository;
  let cache: InMemoryBindingCache;
  let service: BindingValidationService;

  beforeEach(() => {
    repository = new InMemoryBindingRepository();
    cache = new InMemoryBindingCache();
    service = createBindingValidationService(repository, cache);
  });

  describe('validateBinding', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        valid: true,
        enterprise_id: 'ent_123',
        permissions: ['read'],
      };
      await cache.setValidation('app_1', 'ent_123', cachedResult);

      const result = await service.validateBinding('app_1', 'ent_123');

      expect(result.valid).toBe(true);
      expect(result.enterprise_id).toBe('ent_123');
      // Verify cache was hit by checking result matches cached value
      expect(result.permissions).toEqual(['read']);
    });

    it('should return error when binding not found', async () => {
      const result = await service.validateBinding('app_unknown', 'ent_unknown');

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe(BindingErrorCode.APP_NOT_BOUND);
      expect(result.error_message).toBe('Application not authorized for this enterprise');
    });

    it('should return error when binding is revoked', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);
      await repository.updateStatus('app_1', 'ent_1', 'revoked');

      const result = await service.validateBinding('app_1', 'ent_1');

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe(BindingErrorCode.BINDING_REVOKED);
      expect(result.error_message).toBe('Application binding has been revoked');
    });

    it('should return error when binding is expired', async () => {
      // Create binding with past expiration
      await repository.create('app_1', 'ent_1', ['read'], Math.floor(Date.now() / 1000) - 3600);

      const result = await service.validateBinding('app_1', 'ent_1');

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe(BindingErrorCode.BINDING_EXPIRED);
      expect(result.error_message).toBe('Application binding has expired');
    });

    it('should return valid result with permissions for active binding', async () => {
      await repository.create('app_1', 'ent_1', ['read', 'write'], null);

      const result = await service.validateBinding('app_1', 'ent_1');

      expect(result.valid).toBe(true);
      expect(result.enterprise_id).toBe('ent_1');
      expect(result.permissions).toEqual(['read', 'write']);
    });

    it('should return valid result for binding without expiration', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      const result = await service.validateBinding('app_1', 'ent_1');

      expect(result.valid).toBe(true);
      expect(result.error_code).toBeUndefined();
    });

    it('should cache valid result', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      // First call - hits database
      const result1 = await service.validateBinding('app_1', 'ent_1');
      expect(result1.valid).toBe(true);

      // Second call - should hit cache (returns cached)
      const result2 = await service.validateBinding('app_1', 'ent_1');
      expect(result2.valid).toBe(true);

      // Verify cache has the result
      const cached = await cache.getValidation('app_1', 'ent_1');
      expect(cached).not.toBeNull();
      expect(cached!.valid).toBe(true);
    });

    it('should cache invalid result', async () => {
      // Don't create binding - it will be invalid

      // First call - hits database
      const result1 = await service.validateBinding('app_1', 'ent_1');
      expect(result1.valid).toBe(false);

      // Second call - should hit cache
      const result2 = await service.validateBinding('app_1', 'ent_1');
      expect(result2.valid).toBe(false);

      // Verify cache has the error result
      const cached = await cache.getValidation('app_1', 'ent_1');
      expect(cached).not.toBeNull();
      expect(cached!.valid).toBe(false);
      expect(cached!.error_code).toBe(BindingErrorCode.APP_NOT_BOUND);
    });
  });

  describe('getPermissions', () => {
    it('should return null when binding not found', async () => {
      const permissions = await service.getPermissions('app_1', 'ent_1');
      expect(permissions).toBeNull();
    });

    it('should return permissions for valid binding', async () => {
      await repository.create('app_1', 'ent_1', ['read', 'write'], null);

      const permissions = await service.getPermissions('app_1', 'ent_1');

      expect(permissions).toEqual(['read', 'write']);
    });

    it('should return null for revoked binding', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);
      await repository.updateStatus('app_1', 'ent_1', 'revoked');

      const permissions = await service.getPermissions('app_1', 'ent_1');

      expect(permissions).toBeNull();
    });

    it('should return null for expired binding', async () => {
      await repository.create('app_1', 'ent_1', ['read'], Math.floor(Date.now() / 1000) - 3600);

      const permissions = await service.getPermissions('app_1', 'ent_1');

      expect(permissions).toBeNull();
    });
  });

  describe('getBinding', () => {
    it('should return null when binding not found', async () => {
      const binding = await service.getBinding('app_1', 'ent_1');
      expect(binding).toBeNull();
    });

    it('should return binding when found', async () => {
      const created = await repository.create('app_1', 'ent_1', ['read'], null);

      const binding = await service.getBinding('app_1', 'ent_1');

      expect(binding).not.toBeNull();
      expect(binding!.appid).toBe('app_1');
      expect(binding!.enterprise_id).toBe('ent_1');
    });
  });

  describe('createBinding', () => {
    it('should create binding and invalidate cache', async () => {
      // Pre-populate cache with invalid result
      await cache.setValidation('app_1', 'ent_1', {
        valid: false,
        error_code: BindingErrorCode.APP_NOT_BOUND,
        error_message: 'Application not authorized for this enterprise',
      });

      const binding = await service.createBinding('app_1', 'ent_1', ['read'], null);

      expect(binding.appid).toBe('app_1');
      expect(binding.enterprise_id).toBe('ent_1');
      expect(binding.permissions).toEqual(['read']);
      expect(binding.status).toBe('active');

      // Cache should be invalidated
      const cached = await cache.getValidation('app_1', 'ent_1');
      expect(cached).toBeNull();
    });

    it('should create binding with expiration', async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 86400; // 24 hours

      const binding = await service.createBinding('app_1', 'ent_1', ['read'], expiresAt);

      expect(binding.expires_at).toBe(expiresAt);
    });
  });

  describe('updatePermissions', () => {
    it('should update permissions and invalidate cache', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      // Pre-populate cache with valid result
      await cache.setValidation('app_1', 'ent_1', {
        valid: true,
        enterprise_id: 'ent_1',
        permissions: ['read'],
      });

      const result = await service.updatePermissions('app_1', 'ent_1', ['read', 'write']);

      expect(result).toBe(true);

      // Cache should be invalidated
      const cached = await cache.getValidation('app_1', 'ent_1');
      expect(cached).toBeNull();
    });

    it('should return false when binding not found', async () => {
      const result = await service.updatePermissions('app_1', 'ent_1', ['read']);
      expect(result).toBe(false);
    });
  });

  describe('revokeBinding', () => {
    it('should revoke binding and invalidate cache', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      // Pre-populate cache
      await cache.setValidation('app_1', 'ent_1', {
        valid: true,
        enterprise_id: 'ent_1',
        permissions: ['read'],
      });

      const result = await service.revokeBinding('app_1', 'ent_1');

      expect(result).toBe(true);

      // Verify binding is revoked
      const binding = await repository.findByAppAndEnterprise('app_1', 'ent_1');
      expect(binding!.status).toBe('revoked');

      // Cache should be invalidated
      const cached = await cache.getValidation('app_1', 'ent_1');
      expect(cached).toBeNull();
    });
  });

  describe('deleteBinding', () => {
    it('should delete binding and invalidate cache', async () => {
      await repository.create('app_1', 'ent_1', ['read'], null);

      // Pre-populate cache
      await cache.setValidation('app_1', 'ent_1', {
        valid: true,
        enterprise_id: 'ent_1',
        permissions: ['read'],
      });

      const result = await service.deleteBinding('app_1', 'ent_1');

      expect(result).toBe(true);

      // Binding should be deleted
      const binding = await repository.findByAppAndEnterprise('app_1', 'ent_1');
      expect(binding).toBeNull();

      // Cache should be invalidated
      const cached = await cache.getValidation('app_1', 'ent_1');
      expect(cached).toBeNull();
    });
  });
});
