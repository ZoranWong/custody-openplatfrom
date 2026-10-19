import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient } from '../core/http';
import { SDKError, SDKErrorCode } from '../core/error';
import type { SDKConfig } from '../types';
import { makeConfig } from './fixtures';

const config: SDKConfig = makeConfig();

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Stub the underlying axios instance so we can drive handleResponse without
 * any network access.
 */
function stubAxios(http: HttpClient, impl: Record<string, unknown>) {
  const client = http.getClient() as unknown as Record<string, any>;
  for (const [method, fn] of Object.entries(impl)) {
    vi.spyOn(client, method).mockImplementation(fn as never);
  }
}

function response(data: Record<string, unknown>, status = 200) {
  return Promise.resolve({ status, data });
}

describe('HttpClient.handleResponse unwrapping', () => {
  it('returns `data` when code is 0', async () => {
    const http = new HttpClient(config);
    stubAxios(http, { post: () => response({ code: 0, message: 'ok', data: { id: 1 } }) });

    await expect(http.post('/x', {})).resolves.toEqual({ id: 1 });
  });

  it('returns `data` when code is 200', async () => {
    const http = new HttpClient(config);
    stubAxios(http, { post: () => response({ code: 200, message: 'ok', data: [1, 2] }) });

    await expect(http.post('/x', {})).resolves.toEqual([1, 2]);
  });

  it('returns the whole body when `data` is undefined (e.g. void endpoints)', async () => {
    const http = new HttpClient(config);
    const body = { code: 0, message: 'ok' };
    stubAxios(http, { post: () => response(body) });

    await expect(http.post('/x', {})).resolves.toEqual(body);
  });

  it('throws a mapped SDKError for a non-success code', async () => {
    const http = new HttpClient(config);
    stubAxios(http, {
      post: () => response({ code: 40001, message: 'missing unitId', traceId: 'trace-9' }, 400),
    });

    try {
      await http.post('/x', {});
      expect.fail('should throw');
    } catch (e) {
      const err = e as SDKError;
      expect(err).toBeInstanceOf(SDKError);
      expect(err.code).toBe(SDKErrorCode.VALIDATION_MISSING_REQUIRED);
      expect(err.httpStatus).toBe(400);
      expect(err.details).toMatchObject({ traceId: 'trace-9', apiCode: 40001 });
    }
  });

  it('unwraps GET responses', async () => {
    const http = new HttpClient(config);
    stubAxios(http, { get: () => response({ code: 0, message: 'ok', data: { a: 1 } }) });

    await expect(http.get('/x')).resolves.toEqual({ a: 1 });
  });

  it('unwraps PUT responses', async () => {
    const http = new HttpClient(config);
    stubAxios(http, { put: () => response({ code: 0, message: 'ok', data: { updated: true } }) });

    await expect(http.put('/x', {})).resolves.toEqual({ updated: true });
  });

  it('unwraps DELETE responses', async () => {
    const http = new HttpClient(config);
    stubAxios(http, { delete: () => response({ code: 0, message: 'ok', data: { deleted: true } }) });

    await expect(http.delete('/x')).resolves.toEqual({ deleted: true });
  });
});

describe('HttpClient configuration', () => {
  it('applies the configured base URL and a sane default timeout', () => {
    const http = new HttpClient(config);
    const client = http.getClient();

    expect(client.defaults.baseURL).toBe(config.baseUrl);
    expect(client.defaults.timeout).toBe(30000);
  });

  it('honours an explicit timeout', () => {
    const http = new HttpClient({ ...config, timeout: 5000 });
    expect(http.getClient().defaults.timeout).toBe(5000);
  });
});
