import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { CallbackService } from '../core/callback.service';
import type { VerifySignatureParams } from '../core/callback.service';
import { CregisSDK, SDKError, SDKErrorCode } from '..';
import type { CallbackRequest } from '..';

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

const appSecret = 'test-secret-key';
const appId = '550e8400-e29b-41d4-a716-446655440000';
const timestamp = '1713600000000';
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
  function createSDK(): CregisSDK {
    return new CregisSDK({
      baseUrl: 'https://api.test.com',
      appId,
      appSecret,
    });
  }

  it('calls callback on valid signature (metadata in headers, data in body)', async () => {
    const sdk = createSDK();
    const data = { unitId: 123, orderId: 'ORD-001' };
    const signature = buildSignature(appSecret, appId, timestamp, undefined, data);

    const req: CallbackRequest = {
      headers: {
        'x-app-id': appId,
        'x-timestamp': timestamp,
        'x-signature': `sha256=${signature}`,
      },
      body: data,
    };

    const callback = vi.fn();
    await sdk.onCallback(req, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(data);
  });

  it('awaits an async callback handler', async () => {
    const sdk = createSDK();
    const data = { unitId: 123 };
    const signature = buildSignature(appSecret, appId, timestamp, undefined, data);

    const req: CallbackRequest = {
      headers: {
        'x-app-id': appId,
        'x-timestamp': timestamp,
        'x-signature': `sha256=${signature}`,
      },
      body: data,
    };

    let resolved = false;
    const callback = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
    });

    await sdk.onCallback(req, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(true);
  });

  it('calls callback on valid signature with event', async () => {
    const sdk = createSDK();
    const data = { unitId: 123, txHash: '0xabc' };
    const signature = buildSignature(appSecret, appId, timestamp, event, data);

    const req: CallbackRequest = {
      headers: {
        'x-app-id': appId,
        'x-timestamp': timestamp,
        'x-event': event,
        'x-signature': `sha256=${signature}`,
      },
      body: data,
    };

    const callback = vi.fn();
    await sdk.onCallback(req, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(data);
  });

  it('throws SDKError on invalid signature', async () => {
    const sdk = createSDK();
    const req: CallbackRequest = {
      headers: {
        'x-app-id': appId,
        'x-timestamp': timestamp,
        'x-signature': 'sha256=invalid',
      },
      body: { unitId: 1 },
    };
    await expect(sdk.onCallback(req, () => {})).rejects.toThrow(SDKError);
  });

  it('throws SDKError on missing X-App-Id', async () => {
    const sdk = createSDK();
    const req: CallbackRequest = {
      headers: {
        'x-timestamp': timestamp,
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
    const data = { taskId: 'TSK-001' };
    const signature = buildSignature(appSecret, appId, timestamp, undefined, data);
    const tamperedData = { taskId: 'TSK-999' };

    const req: CallbackRequest = {
      headers: {
        'x-app-id': appId,
        'x-timestamp': timestamp,
        'x-signature': `sha256=${signature}`,
      },
      body: tamperedData,
    };
    await expect(sdk.onCallback(req, () => {})).rejects.toThrow(SDKError);
  });

  it('uses SIGNATURE_INVALID error code', async () => {
    const sdk = createSDK();
    const req: CallbackRequest = {
      headers: {
        'x-app-id': appId,
        'x-timestamp': timestamp,
        'x-signature': 'sha256=invalid',
      },
      body: {},
    };
    await expect(sdk.onCallback(req, () => {})).rejects.toMatchObject({ code: SDKErrorCode.SIGNATURE_INVALID });
  });
});
