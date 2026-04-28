/**
 * Integration Test Helpers
 *
 * Environment-driven base URL:
 *   TEST_ENV=local    → http://127.0.0.1:1000 (default)
 *   TEST_ENV=testing  → http://api.vaulink.com/openplatform
 */
import { CregisSDK } from '../../src';

export const TEST_ENV = process.env.TEST_ENV || 'local';

export const BASE_URL = TEST_ENV === 'testing'
  ? 'http://api.vaulink.com/openplatform'
  : 'http://127.0.0.1:1000';

export const APP_ID = process.env.CREGIS_APP_ID || '5c6bef2e-3da7-4d7f-9bed-9d198b9b9e16';
export const APP_SECRET = process.env.CREGIS_APP_SECRET || 'sk_mo4bd1bum5dv0s4k';
export const AUTHORIZATION_ID = process.env.CREGIS_AUTHORIZATION_ID || 'dd28de60-6061-4c3d-9ea2-3553951db5f9';

/**
 * Check if the API service is reachable via /health endpoint
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${BASE_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Create a configured CregisSDK instance for integration tests
 */
export function createSDK(): CregisSDK {
  return new CregisSDK({
    baseUrl: BASE_URL,
    appId: APP_ID,
    appSecret: APP_SECRET,
  });
}

/**
 * Print diagnostic info on test failure
 */
export function printDiagnostic(error: unknown, method?: string) {
  console.error('========================================');
  console.error('[Integration Test Failure]');
  console.error(`Base URL: ${BASE_URL}`);
  console.error(`Test Env: ${TEST_ENV}`);
  if (method) console.error(`Method: ${method}`);
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  console.error('========================================');
}
