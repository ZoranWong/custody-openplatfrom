import { describe, it, expect, vi, afterEach } from 'vitest';
import { CregisSDK } from '../core';
import { HttpClient } from '../core/http';
import type { SDKConfig } from '../types';
import { makeConfig, TEST_AUTHORIZATION_ID } from './fixtures';

const config: SDKConfig = makeConfig();

const RAK = TEST_AUTHORIZATION_ID;

function createSDK(): CregisSDK {
  return new CregisSDK(config);
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** Mock the SDK's private http.post and return the (url, body) it was called with. */
function spyPost() {
  const spy = vi.spyOn(HttpClient.prototype, 'post').mockResolvedValue({} as never);
  return spy;
}

function lastPost(spy: ReturnType<typeof vi.fn>) {
  return spy.mock.calls[spy.mock.calls.length - 1] as [string, Record<string, unknown>];
}

describe('CregisSDK treasury endpoints', () => {
  it('createTreasuryUnit posts to /treasury/create with business', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    const req = { unitName: 'U', businessScope: 'DEDICATED_ACCOUNT', topology: 'ORBIT', coinIds: [], primaryManager: [], payoutManager: [] } as any;
    await sdk.createTreasuryUnit(RAK, req);
    const [url, body] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/create');
    expect(body.business).toEqual(req);
    expect((body.basic as any).authorizationId).toBe(RAK);
  });

  it('createCustomUnit posts to /treasury/create-custom', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.createCustomUnit(RAK, { unitName: 'C', coinIds: [], fundControls: [] } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/create-custom');
  });

  it('listTreasuryUnits maps pageSize/pageNum/sortFields', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.listTreasuryUnits(RAK, { pageSize: 10, pageNum: 1, sortFields: 'createTime_d' });
    const [, body] = lastPost(spy as any);
    expect(body.business).toEqual({ pageSize: 10, pageNum: 1, sortFields: 'createTime_d' });
  });

  it('getTreasuryUnitAddress posts to /treasury/address', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.getTreasuryUnitAddress(RAK, { unitId: 1, accountType: 'PRIMARY' } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/address');
  });

  it('getUnitAddressByAccount posts to /address-by-account/{cusAccountId}', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.getUnitAddressByAccount(RAK, 42, { accountType: 'PAYOUT' } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/address-by-account/42');
  });

  it('listUnitAccount posts to /list-unit-account/{unitId}', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.listUnitAccount(RAK, 7);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/list-unit-account/7');
  });

  it('createUnitAddress builds path with accountType and encodes segments', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.createUnitAddress(RAK, { unitId: 1, accountType: 'PAYOUT', network: 'TRC20', coinId: 'USDT', number: 3 } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/create-unit-address/1/PAYOUT/TRC20/USDT/3');
  });

  it('createUnitAddressByAccount posts to /create-unit-address-by-account/{cusAccountId}/{number}', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.createUnitAddressByAccount(RAK, 5, 2);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/create-unit-address-by-account/5/2');
  });

  it('pooling posts to /treasury/pooling', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.pooling(RAK, { unitId: 1, fromAccountId: 2, address: '0xabc', amount: 100, coinId: 'USDT', network: 'TRC20' } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/pooling');
  });

  it('addCoins posts to /treasury/add-coins', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.addCoins(RAK, { treasuryUnitId: 1, coinIds: [] } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/add-coins');
  });

  it('updateFundControl posts to /treasury/fund-control-update', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.updateFundControl(RAK, { treasuryUnitId: 1, fundControls: [] } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/fund-control-update');
  });

  it('updateWhitelist posts to /treasury/whitelist-update', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.updateWhitelist(RAK, { treasuryUnitId: 1, addItems: [] } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/whitelist-update');
  });
});

describe('CregisSDK merchant/user/board endpoints', () => {
  it('registerMerchant posts to /merchant/register with basic signature (no authorizationId)', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.registerMerchant({ legalName: 'Acme', appId: config.appId } as any);
    const [url, body] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/merchant/register');
    expect((body.basic as any).authorizationId).toBeUndefined();
  });

  it('addUser posts to /user/add', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.addUser(RAK, { email: 'u@b.com', password: 'pw' } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/user/add');
  });

  it('initBoard posts to /board/init', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.initBoard(RAK, { guardians: ['g1'], threshold: 1 } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/board/init');
  });

  it('updateBoard posts to /board/update with a resource signature', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.updateBoard(RAK, { threshold: 2, validUntilTime: 1440 });
    const [url, body] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/board/update');
    expect(body.business).toEqual({ threshold: 2, validUntilTime: 1440 });
    expect((body.basic as any).authorizationId).toBe(RAK);
  });
});

describe('CregisSDK payout/transaction/submit endpoints', () => {
  it('createPayout posts to /treasury/payout', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.createPayout(RAK, { payTo: [], unitId: 1, coinId: 'USDT', network: 'TRC20', merchantType: 'NON_FINANCIAL_CORPORATE' } as any);
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/payout');
  });

  it('listTransferOutOrders forwards query options', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.listTransferOutOrders(RAK, { pageIndex: 0, pageSize: 10 });
    const [url, body] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/transfer-out-orders');
    expect(body.business).toEqual({ pageIndex: 0, pageSize: 10 });
  });

  it('listTransferInOrders posts to /transfer-in-orders', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.listTransferInOrders(RAK, { pageIndex: 0, pageSize: 10 });
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/transfer-in-orders');
  });

  it('submitTask posts to /submit-task/{taskId} and returns void', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    const result = await sdk.submitTask(RAK, 'task-1', { confirmed: true });
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/submit-task/task-1');
    expect(result).toBeUndefined();
  });

  it('listActivities posts to /activities', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.listActivities(RAK, { pageIndex: 0, pageSize: 10 });
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/activities');
  });

  it('listFundRecords posts to /fund-records', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.listFundRecords(RAK, {});
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/fund-records');
  });

  it('listUnitFundRecords posts to /unit-fund-records', async () => {
    const sdk = createSDK();
    const spy = spyPost();
    await sdk.listUnitFundRecords(RAK, {});
    const [url] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/treasury/unit-fund-records');
  });
});

describe('CregisSDK oauth endpoints', () => {
  it('getAuthorizationUrl posts permissions/state/callback/token', async () => {
    const sdk = createSDK();
    const spy = vi.spyOn(HttpClient.prototype, 'post').mockResolvedValue({ authorizeUrl: 'x', expiresIn: 1 } as never);
    await sdk.getAuthorizationUrl({ permissions: ['read'], state: 's', callback: 'cb', token: 'tk' });
    const [url, body] = lastPost(spy as any);
    expect(url).toBe('/api/thirdparty/oauth/authorizeUrl');
    expect(body.business).toEqual({ permissions: ['read'], state: 's', callback: 'cb', token: 'tk' });
  });

  it('getAuthorizationUrl does not send the deprecated redirectUri', async () => {
    const sdk = createSDK();
    const spy = vi.spyOn(HttpClient.prototype, 'post').mockResolvedValue({ authorizeUrl: 'x', expiresIn: 1 } as never);
    await sdk.getAuthorizationUrl({ permissions: ['read'], state: 's', redirectUri: 'https://example.com/cb' } as any);
    const [, body] = lastPost(spy as any);
    expect(body.business).toEqual({ permissions: ['read'], state: 's' });
  });
});
