import { describe, it, expect, vi, afterEach } from 'vitest';
import { CregisSDK, SDKError, SDKErrorCode } from '../core';
import { HttpClient } from '../core/http';
import { calculateResourceSignature } from '../core/signature';
import type { SDKConfig } from '../types';
import { makeConfig, TEST_AUTHORIZATION_ID } from './fixtures';

const validConfig: SDKConfig = makeConfig();

const RAK = TEST_AUTHORIZATION_ID;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CregisSDK config validation', () => {
  it('constructs with a valid config', () => {
    expect(() => new CregisSDK(validConfig)).not.toThrow();
  });

  it('rejects a missing baseUrl', () => {
    try {
      new CregisSDK({ ...validConfig, baseUrl: '' });
      expect.fail('should throw');
    } catch (e) {
      expect((e as SDKError).code).toBe(SDKErrorCode.CONFIG_MISSING_BASE_URL);
    }
  });

  it('rejects a missing appId', () => {
    try {
      new CregisSDK({ ...validConfig, appId: '' });
      expect.fail('should throw');
    } catch (e) {
      expect((e as SDKError).code).toBe(SDKErrorCode.CONFIG_MISSING_APP_ID);
    }
  });

  it('rejects a non-UUID appId', () => {
    try {
      new CregisSDK({ ...validConfig, appId: 'not-a-uuid' });
      expect.fail('should throw');
    } catch (e) {
      expect((e as SDKError).code).toBe(SDKErrorCode.CONFIG_INVALID_APP_ID);
    }
  });

  it('rejects a missing appSecret', () => {
    try {
      new CregisSDK({ ...validConfig, appSecret: '' });
      expect.fail('should throw');
    } catch (e) {
      expect((e as SDKError).code).toBe(SDKErrorCode.CONFIG_MISSING_APP_SECRET);
    }
  });
});

describe('CregisSDK.getConfig', () => {
  it('returns baseUrl/appId/timeout/debug and never the appSecret', () => {
    const sdk = new CregisSDK({ ...validConfig, timeout: 5000, debug: true });
    const cfg = sdk.getConfig();

    expect(cfg).toEqual({
      baseUrl: validConfig.baseUrl,
      appId: validConfig.appId,
      timeout: 5000,
      debug: true,
    });
    expect(cfg).not.toHaveProperty('appSecret');
    expect(JSON.stringify(cfg)).not.toContain(validConfig.appSecret);
  });
});

describe('CregisSDK request shape', () => {
  function spyPost() {
    return vi
      .spyOn(HttpClient.prototype, 'post')
      .mockResolvedValue({} as never);
  }

  it('resource endpoints carry a signature that matches the documented algorithm', async () => {
    const sdk = new CregisSDK(validConfig);
    const spy = spyPost();

    await sdk.listTreasuryUnits(RAK, { pageSize: 10, pageNum: 1 });

    const [, body] = spy.mock.calls[0] as [
      string,
      { basic: Record<string, string | number>; business: Record<string, unknown> },
    ];

    const expected = calculateResourceSignature({
      appId: validConfig.appId,
      appSecret: validConfig.appSecret,
      authorizationId: RAK,
      timestamp: body.basic.timestamp as number,
      nonce: body.basic.nonce as string,
      business: body.business,
    });

    expect(body.basic.signature).toBe(expected);
    expect(body.basic.appId).toBe(validConfig.appId);
    expect(body.basic.authorizationId).toBe(RAK);
    expect(body.basic.timestamp).toBeTypeOf('number');
    expect(body.basic.nonce).toHaveLength(32);
  });

  it('getAuthorizationUrl must not carry an authorizationId', async () => {
    const sdk = new CregisSDK(validConfig);
    const spy = spyPost();

    await sdk.getAuthorizationUrl({ permissions: ['read'], state: 's', token: 't' });

    const [, body] = spy.mock.calls[0] as [
      string,
      { basic: Record<string, unknown> },
    ];
    expect(body.basic).not.toHaveProperty('authorizationId');
  });

  it('omits optional query fields that are not supplied', async () => {
    const sdk = new CregisSDK(validConfig);
    const spy = spyPost();

    await sdk.listTransferOutOrders(RAK, {});

    const [, body] = spy.mock.calls[0] as [string, { business: Record<string, unknown> }];
    expect(body.business).toEqual({});
  });

  it('keeps queryList when paginating', async () => {
    const sdk = new CregisSDK(validConfig);
    const spy = spyPost();

    await sdk.listActivities(RAK, {
      pageIndex: 0,
      pageSize: 20,
      sortFields: 'createTime_d',
      queryList: [{ key: 'coinId', value: 'USDT', oper: '=', join: 'and' }],
    });

    const [, body] = spy.mock.calls[0] as [string, { business: Record<string, unknown> }];
    expect(body.business).toEqual({
      pageIndex: 0,
      pageSize: 20,
      sortFields: 'createTime_d',
      queryList: [{ key: 'coinId', value: 'USDT', oper: '=', join: 'and' }],
    });
  });

  it('propagates HTTP errors to the caller', async () => {
    const sdk = new CregisSDK(validConfig);
    vi.spyOn(HttpClient.prototype, 'post').mockRejectedValue(
      new SDKError(SDKErrorCode.API_NOT_FOUND, 'not found', 404)
    );

    await expect(sdk.listTreasuryUnits(RAK)).rejects.toBeInstanceOf(SDKError);
  });
});
