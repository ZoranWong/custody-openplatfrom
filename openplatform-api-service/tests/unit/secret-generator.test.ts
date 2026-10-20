/**
 * Unit tests for the app secret generator.
 */
import { describe, it, expect } from 'vitest';
import { generateAppSecret, maskSecret } from '../../src/utils/secret-generator';

describe('generateAppSecret', () => {
  it('uses the sk_beta_ prefix by default and is 56+ chars long', () => {
    const secret = generateAppSecret();
    expect(secret.startsWith('sk_beta_')).toBe(true);
    expect(secret.length).toBeGreaterThanOrEqual(56);
  });

  it('honors the env segment', () => {
    const secret = generateAppSecret('test');
    expect(secret.startsWith('sk_test_')).toBe(true);
  });

  it('only contains URL-safe characters', () => {
    for (let i = 0; i < 50; i++) {
      const secret = generateAppSecret();
      expect(secret).toMatch(/^sk_(beta|test)_[A-Za-z0-9_-]+$/);
    }
  });

  it('produces unique secrets', () => {
    const set = new Set(Array.from({ length: 1000 }, () => generateAppSecret()));
    expect(set.size).toBe(1000);
  });
});

describe('maskSecret', () => {
  it('keeps the env prefix plus 3 chars and the last 4', () => {
    const masked = maskSecret('sk_beta_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234');
    expect(masked.startsWith('sk_beta_')).toBe(true);
    expect(masked).toBe('sk_beta_ABC...1234');
  });

  it('supports the test env', () => {
    const masked = maskSecret('sk_test_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234');
    expect(masked).toBe('sk_test_ABC...1234');
  });

  it('returns short secrets unchanged', () => {
    expect(maskSecret('sk_beta_short')).toBe('sk_beta_short');
  });
});
