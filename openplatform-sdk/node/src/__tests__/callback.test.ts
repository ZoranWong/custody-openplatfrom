import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { CallbackService } from '../core/callback.service';
import type { VerifySignatureParams } from '../core/callback.service';
import { CregisSDK, SDKError, SDKErrorCode } from '..';
import type { CallbackRequest } from '..';
import { makeConfig, TEST_APP_ID, TEST_APP_SECRET } from './fixtures';

function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

function buildSignature(
  appSecret: string,
  appId: string,
  timestamp: string,
  event?: string,
  data?: Record<string, unknown>,
): string {
  let signData = appId;
  if (event) signData += '.' + event;
  signData += '.' + timestamp;
  if (data !== undefined) {
    signData += '.' + crypto.createHash('md5').update(JSON.stringify(sortObjectKeys(data))).digest('hex');
  }
  return crypto.createHmac('sha256', appSecret).update(signData).digest('hex');
}

const appSecret = TEST_APP_SECRET;
const appId = TEST_APP_ID;
const timestamp = '1713600000000';       // fixed, used by pure signature tests
const freshTimestamp = () => String(Date.now());  // within the replay window
const event = 'transaction.completed';

describe('CallbackService.verifySignature', () => {
  let service: CallbackService;

  beforeEach(() => {
    service = new CallbackService();
  });

  it('verifies a signature without event (business callback)', () => {
    const signature = buildSignature(appSecret, appId, timestamp);
    const params: VerifySignatureParams = { appSecret, appId, timestamp, signature };
    expect(service.verifySignature(params)).toBe(true);
  });

  it('verifies a signature with event', () => {
    const signature = buildSignature(appSecret, appId, timestamp, event);
    const params: VerifySignatureParams = { appSecret, appId, event, timestamp, signature };
    expect(service.verifySignature(params)).toBe(true);
  });

  it('verifies a signature with event + data', () => {
    const data = { taskId: 'T-1', amount: '100' };
    const signature = buildSignature(appSecret, appId, timestamp, event, data);
    const params: VerifySignatureParams = { appSecret, appId, event, timestamp, signature, data };
    expect(service.verifySignature(params)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const params: VerifySignatureParams = { appSecret, appId, timestamp, signature: 'invalid-signature-hex' };
    expect(service.verifySignature(params)).toBe(false);
  });

  it('rejects a tampered data (data participates in signature)', () => {
    const data = { taskId: 'T-1', amount: '100' };
    const signature = buildSignature(appSecret, appId, timestamp, event, data);
    const tamperedData = { taskId: 'T-1', amount: '999' };
    const params: VerifySignatureParams = { appSecret, appId, event, timestamp, signature, data: tamperedData };
    expect(service.verifySignature(params)).toBe(false);
  });

  it('rejects signature signed with wrong appSecret', () => {
    const signature = buildSignature('wrong-secret', appId, timestamp);
    const params: VerifySignatureParams = { appSecret, appId, timestamp, signature };
    expect(service.verifySignature(params)).toBe(false);
  });
});

describe('CallbackService.buildSignature', () => {
  let service: CallbackService;

  beforeEach(() => {
    service = new CallbackService();
  });

  it('builds a signature without event', () => {
    const expected = buildSignature(appSecret, appId, timestamp);
    expect(service.buildSignature(appSecret, appId, timestamp)).toBe(expected);
  });

  it('builds a signature with event', () => {
    const expected = buildSignature(appSecret, appId, timestamp, event);
    expect(service.buildSignature(appSecret, appId, timestamp, event)).toBe(expected);
  });
});

describe('CregisSDK.onCallback', () => {
  function createSDK(overrides: Partial<Parameters<typeof makeConfig>[0]> = {}): CregisSDK {
    return new CregisSDK(makeConfig({ appId, appSecret, ...overrides }));
  }

  /** Build a request with a matching timestamp in both signature and header. */
  function makeRequest(
    data: Record<string, unknown>,
    opts: { event?: string; appIdOverride?: string; ts?: string; signatureOverride?: string } = {},
  ): CallbackRequest {
    const ts = opts.ts ?? String(Date.now());
    const requestAppId = opts.appIdOverride ?? appId;
    const signature =
      opts.signatureOverride ??
      buildSignature(appSecret, requestAppId, ts, opts.event, data);
    const headers: CallbackRequest['headers'] = {
      'x-app-id': requestAppId,
      'x-timestamp': ts,
      'x-signature': `sha256=${signature}`,
    };
    if (opts.event) headers['x-event'] = opts.event;
    return { headers, body: data };
  }

  it('calls callback on valid signature (metadata in headers, data in body)', async () => {
    const sdk = createSDK();
    const data = { unitId: 123, orderId: 'ORD-001' };

    const callback = vi.fn();
    await sdk.onCallback(makeRequest(data), callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(data, undefined);
  });

  it('awaits an async callback handler', async () => {
    const sdk = createSDK();
    const data = { unitId: 123 };

    let resolved = false;
    const callback = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
    });

    await sdk.onCallback(makeRequest(data), callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(true);
  });

  it('passes the event name when X-Event is present', async () => {
    const sdk = createSDK();
    const data = { unitId: 123, txHash: '0xabc' };

    const callback = vi.fn();
    await sdk.onCallback(makeRequest(data, { event }), callback);

    expect(callback).toHaveBeenCalledWith(data, 'transaction.completed');
  });

  it('throws SDKError on invalid signature', async () => {
    const sdk = createSDK();
    const req = makeRequest({ unitId: 1 }, { signatureOverride: 'invalid' });
    await expect(sdk.onCallback(req, () => {})).rejects.toThrow(SDKError);
  });

  it('throws SDKError on missing X-App-Id', async () => {
    const sdk = createSDK();
    const req: CallbackRequest = {
      headers: {
        'x-timestamp': String(Date.now()),
        'x-signature': 'sha256=some',
      },
      body: {},
    };
    await expect(sdk.onCallback(req, () => {})).rejects.toThrow(SDKError);
  });

  it('throws SDKError on missing X-Timestamp', async () => {
    const sdk = createSDK();
    const req: CallbackRequest = {
      headers: {
        'x-app-id': appId,
        'x-signature': 'sha256=some',
      },
      body: {},
    };
    await expect(sdk.onCallback(req, () => {})).rejects.toThrow(SDKError);
  });

  it('throws SDKError on tampered data', async () => {
    const sdk = createSDK();
    const ts = String(Date.now());
    const signature = buildSignature(appSecret, appId, ts, undefined, { taskId: 'TSK-001' });
    const req: CallbackRequest = {
      headers: {
        'x-app-id': appId,
        'x-timestamp': ts,
        'x-signature': `sha256=${signature}`,
      },
      body: { taskId: 'TSK-999' },
    };
    await expect(sdk.onCallback(req, () => {})).rejects.toThrow(SDKError);
  });

  it('uses SIGNATURE_INVALID error code', async () => {
    const sdk = createSDK();
    const req = makeRequest({}, { signatureOverride: 'invalid' });
    await expect(sdk.onCallback(req, () => {})).rejects.toMatchObject({
      code: SDKErrorCode.SIGNATURE_INVALID,
    });
  });

  it('rejects a callback whose appId differs from the configured appId', async () => {
    const sdk = createSDK();
    const otherAppId = '00000000-0000-4000-8000-000000000000';
    const req = makeRequest({ unitId: 1 }, { appIdOverride: otherAppId });

    await expect(sdk.onCallback(req, () => {})).rejects.toMatchObject({
      code: SDKErrorCode.SIGNATURE_INVALID,
      message: expect.stringContaining('appId'),
    });
  });

  it('rejects a stale timestamp (replay protection)', async () => {
    const sdk = createSDK();
    const stale = String(Date.now() - 10 * 60 * 1000);
    const req = makeRequest({ unitId: 1 }, { ts: stale });

    await expect(sdk.onCallback(req, () => {})).rejects.toMatchObject({
      code: SDKErrorCode.SIGNATURE_INVALID,
      message: expect.stringContaining('timestamp'),
    });
  });

  it('honours a custom tolerance window', async () => {
    const sdk = createSDK({ callbackTimestampToleranceMs: 15 * 60 * 1000 });
    const tenMinutesAgo = String(Date.now() - 10 * 60 * 1000);
    const req = makeRequest({ unitId: 1 }, { ts: tenMinutesAgo });

    const callback = vi.fn();
    await sdk.onCallback(req, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('skips the replay window when tolerance is 0', async () => {
    const sdk = createSDK({ callbackTimestampToleranceMs: 0 });
    const longAgo = String(Date.now() - 24 * 60 * 60 * 1000);
    const req = makeRequest({ unitId: 1 }, { ts: longAgo });

    const callback = vi.fn();
    await sdk.onCallback(req, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
