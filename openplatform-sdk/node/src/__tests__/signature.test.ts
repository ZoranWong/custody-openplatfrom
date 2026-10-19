import { describe, it, expect } from 'vitest';
import {
  md5,
  generateNonce,
  getTimestamp,
  isValidUUID,
  calculateBasicSignature,
  calculateResourceSignature,
  buildBasicInfo,
  buildBasicInfoWithAuthorization,
  isTimestampValid,
  SignatureType,
} from '../core/signature';
import { TEST_APP_ID, TEST_APP_SECRET, TEST_AUTHORIZATION_ID } from './fixtures';

const appId = TEST_APP_ID;
const appSecret = TEST_APP_SECRET;
const authorizationId = TEST_AUTHORIZATION_ID;
const timestamp = 1742947200;
const nonce = 'abc123def456';

describe('md5', () => {
  it('computes md5 of empty object JSON', () => {
    expect(md5('{}')).toBe('99914b932bd37a50b983c5e7c90ae93b');
  });
  it('computes md5 of a known string', () => {
    expect(md5('{"key":"value"}')).toBe('a7353f7cddce808de0032747a0b7be50');
  });
});

describe('generateNonce', () => {
  it('returns 32-char alphanumeric by default', () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9]{32}$/);
  });
  it('respects custom length', () => {
    expect(generateNonce(16)).toMatch(/^[A-Za-z0-9]{16}$/);
  });
});

describe('getTimestamp', () => {
  it('returns Unix seconds', () => {
    const ts = getTimestamp();
    expect(Math.abs(ts - Math.floor(Date.now() / 1000))).toBeLessThanOrEqual(1);
  });
});

describe('isValidUUID', () => {
  it('accepts a valid v4 UUID', () => {
    expect(isValidUUID(appId)).toBe(true);
  });
  it('rejects invalid strings', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });
});

describe('calculateBasicSignature', () => {
  it('matches golden value', () => {
    const sig = calculateBasicSignature({ appId, appSecret, timestamp, nonce, business: { key: 'value' } });
    expect(sig).toBe('c759c23224f23373433392ded184c7ce');
  });
  it('is stable for identical inputs', () => {
    const p = { appId, appSecret, timestamp, nonce, business: { key: 'value' } };
    expect(calculateBasicSignature(p)).toBe(calculateBasicSignature(p));
  });
  it('sorts business keys (order-independent)', () => {
    const a = calculateBasicSignature({ appId, appSecret, timestamp, nonce, business: { a: 1, b: 2 } });
    const b = calculateBasicSignature({ appId, appSecret, timestamp, nonce, business: { b: 2, a: 1 } });
    expect(a).toBe(b);
  });
  it('sorts keys inside objects nested in arrays (gateway re-serializes the same way)', () => {
    const a = calculateBasicSignature({
      appId, appSecret, timestamp, nonce,
      business: { coinIds: [{ coinId: 'CLCC', network: 'ethereum-sepolia' }], primaryManager: [{ unitId: 1, coinId: 'CLCC' }] },
    });
    const b = calculateBasicSignature({
      appId, appSecret, timestamp, nonce,
      business: { primaryManager: [{ coinId: 'CLCC', unitId: 1 }], coinIds: [{ network: 'ethereum-sepolia', coinId: 'CLCC' }] },
    });
    expect(a).toBe(b);
  });
  it('preserves array element order', () => {
    const a = calculateBasicSignature({ appId, appSecret, timestamp, nonce, business: { items: [{ i: 1 }, { i: 2 }] } });
    const b = calculateBasicSignature({ appId, appSecret, timestamp, nonce, business: { items: [{ i: 2 }, { i: 1 }] } });
    expect(a).not.toBe(b);
  });
});

describe('calculateResourceSignature', () => {
  it('matches golden value and differs from basic', () => {
    const sig = calculateResourceSignature({ appId, appSecret, authorizationId, timestamp, nonce, business: { key: 'value' } });
    expect(sig).toBe('d0be2bff93761728575c9ea2583dc6a3');
    expect(sig).not.toBe(calculateBasicSignature({ appId, appSecret, timestamp, nonce, business: { key: 'value' } }));
  });
});

describe('buildBasicInfo / buildBasicInfoWithAuthorization', () => {
  it('builds basic info with appId/timestamp/nonce/signature', () => {
    const info = buildBasicInfo({ appId, appSecret, timestamp, nonce, business: { key: 'value' } });
    expect(info.appId).toBe(appId);
    expect(info.timestamp).toBe(timestamp);
    expect(info.nonce).toBe(nonce);
    expect(info.signature).toMatch(/^[0-9a-f]{32}$/);
  });
  it('builds resource info with authorizationId', () => {
    const info = buildBasicInfoWithAuthorization({ appId, appSecret, authorizationId, timestamp, nonce, business: { key: 'value' } });
    expect(info.authorizationId).toBe(authorizationId);
    expect(info.signature).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('isTimestampValid', () => {
  it('validates within tolerance', () => {
    const now = getTimestamp();
    expect(isTimestampValid(now)).toBe(true);
    expect(isTimestampValid(now - 300)).toBe(true);
    expect(isTimestampValid(now - 301)).toBe(false);
  });
});

describe('SignatureType', () => {
  it('has BASIC and RESOURCE', () => {
    expect(SignatureType.BASIC).toBe('basic');
    expect(SignatureType.RESOURCE).toBe('resource');
  });
});
