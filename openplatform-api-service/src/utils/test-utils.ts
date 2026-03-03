/**
 * Test Utilities
 * Mock implementations for testing
 */

import {
  TokenBlacklist,
  RefreshTokenRepository,
  CredentialService,
  RateLimiter,
} from '../types/jwt.types';
import { vi } from 'vitest';

/**
 * Create a mock TokenBlacklist
 */
export function createMockBlacklist(): TokenBlacklist {
  return {
    blacklist: vi.fn().mockResolvedValue(undefined),
    isBlacklisted: vi.fn().mockResolvedValue(false),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock RefreshTokenRepository
 */
export function createMockRefreshTokenRepo(): RefreshTokenRepository {
  return {
    create: vi.fn().mockResolvedValue({
      id: 1n,
      jti: 'test-jti',
      appid: 'test_app',
      user_id: 'user_123',
      expires_at: Math.floor(Date.now() / 1000) + 2592000,
      revoked: false,
      replaced_by_jti: null,
      created_at: Date.now(),
      last_used_at: null,
    }),
    findByJti: vi.fn().mockResolvedValue(null),
    findByAppid: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(null),
    revoke: vi.fn().mockResolvedValue(true),
    markReplaced: vi.fn().mockResolvedValue(true),
    deleteExpired: vi.fn().mockResolvedValue(0),
  };
}

/**
 * Create a mock CredentialService
 */
export function createMockCredentialService(): CredentialService {
  return {
    validateCredentials: vi.fn().mockResolvedValue({
      valid: true,
      user_id: 'user_123',
      enterprise_id: 'enterprise_456',
      permissions: ['read', 'write'],
    }),
  };
}

/**
 * Create a mock RateLimiter
 */
export function createMockRateLimiter(): RateLimiter {
  return {
    checkLimit: vi.fn().mockResolvedValue({
      limited: false,
      remaining: 9,
      resetAt: Date.now() + 60000,
    }),
    increment: vi.fn().mockResolvedValue(undefined),
  };
}
