/**
 * Test credentials shared by all unit / integration tests.
 *
 * Values default to the SIT test environment and can be overridden with env
 * vars (e.g. in CI), mirroring tests/integration/helpers.ts.
 */
import type { SDKConfig } from '../types';

export const TEST_ENV = process.env.TEST_ENV || 'testing';

export const TEST_BASE_URL =
  process.env.CREGIS_BASE_URL ||
  (TEST_ENV === 'testing'
    ? 'https://custody-sit.cregis.ae/openplatform'
    : 'http://127.0.0.1:1000');

export const TEST_APP_ID =
  process.env.CREGIS_APP_ID || '5c6bef2e-3da7-4d7f-9bed-9d198b9b9e16';

export const TEST_APP_SECRET =
  process.env.CREGIS_APP_SECRET || 'sk_mo4bd1bum5dv0s4k';

export const TEST_AUTHORIZATION_ID =
  process.env.CREGIS_AUTHORIZATION_ID || 'dd28de60-6061-4c3d-9ea2-3553951db5f9';

/** Build an SDKConfig using the real test credentials. */
export function makeConfig(overrides: Partial<SDKConfig> = {}): SDKConfig {
  return {
    baseUrl: TEST_BASE_URL,
    appId: TEST_APP_ID,
    appSecret: TEST_APP_SECRET,
    ...overrides,
  };
}
