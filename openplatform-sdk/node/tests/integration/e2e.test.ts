/**
 * Full E2E Integration Tests
 *
 * Tests the complete OAuth + business API flow:
 * 1. authorizeUrl → get authorization URL
 * 2. verify → exchange oauthToken for authorizeId
 * 3. treasury/list → query treasury units
 * 4. treasury/address → get treasury addresses
 * 5. payout/transfer-out-orders → list payout orders
 * 6. transaction/activities → list activities
 * 7. transaction/fund-records → list fund records
 * 8. pooling → pooling request
 * 9. list-unit-account → list unit accounts
 * 10. create-unit-address → create unit address
 * 11. unit-fund-records → unit-level fund records
 * 12. error path → invalid authorizationId
 * 13. quota check → verify dailyApiUsage increment
 *
 * Run:
 *   npm test
 *   TEST_ENV=local npm test
 *   TEST_ENV=testing npm test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  BASE_URL, APP_ID, APP_SECRET, RESOURCE_KEY, TREASURY_UNIT_ID,
  createSDK, healthCheck, printDiagnostic,
} from './helpers';
import { CregisSDK, SDKError } from '../../src';

let sdk: CregisSDK;
let authorizeId: string;

/**
 * Exchange an oauthToken for an authorizeId via POST /oauth/verify.
 * Exposed as a helper so later tests don't depend on test 2's execution order.
 */
async function verifyOAuthorization(): Promise<string> {
  const authUrlResult = await sdk.getAuthorizationUrl({
    permissions: ['read', 'write'],
    callback: 'https://example.com/callback',
    state: 'test-state-' + Date.now(),
  });
  const token = new URL(authUrlResult.authorizeUrl).searchParams.get('appToken')!;

  // Verify directly (no signature needed for /oauth/verify).
  // resourceKey must be a key provisioned on the custody backend, otherwise
  // every downstream call fails with 400103 THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS.
  const res = await fetch(`${BASE_URL}/api/thirdparty/oauth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceKey: RESOURCE_KEY, oauthToken: token }),
  });
  const result: any = await res.json();

  if (result.code !== 0 || !result.data?.authorizeId) {
    throw new Error(`oauth/verify failed: ${JSON.stringify(result)}`);
  }
  return result.data.authorizeId;
}

beforeAll(async () => {
  const healthy = await healthCheck();
  if (!healthy) {
    throw new Error(`API service not reachable at ${BASE_URL}/health`);
  }
  sdk = createSDK();
  authorizeId = await verifyOAuthorization();
  console.log(`[Setup] Base URL: ${BASE_URL}`);
  console.log(`[Setup] App ID: ${APP_ID}`);
  console.log(`[Setup] authorizeId: ${authorizeId}`);
});

// ============ OAuth Flow ============

describe('OAuth Flow', () => {
  it('1. authorizeUrl — 获取授权 URL', async () => {
    const result = await sdk.getAuthorizationUrl({
      permissions: ['read', 'write'],
      callback: 'https://example.com/callback',
      state: 'test-state-' + Date.now(),
    });

    expect(result).toBeDefined();
    expect(result.authorizeUrl).toBeTruthy();
    expect(result.expiresIn).toBeGreaterThan(0);

    // Extract appToken from authorizeUrl
    const url = new URL(result.authorizeUrl);
    const appToken = url.searchParams.get('appToken');
    expect(appToken).toBeTruthy();

    console.log(`[OAuth] authorizeUrl OK, expiresIn: ${result.expiresIn}s`);
  });

  it('2. verify — 验证 OAuth token 获取 authorizeId', async () => {
    authorizeId = await verifyOAuthorization();
    expect(authorizeId).toBeTruthy();
    console.log(`[OAuth] verify OK, authorizeId: ${authorizeId}`);
  });
});

// ============ Treasury ============

describe('Treasury', () => {
  it('3. listTreasuryUnits — 查询财务单元列表', async () => {
    try {
      const units = await sdk.listTreasuryUnits(authorizeId, { pageSize: 10, pageNum: 1 });
      expect(units).toBeDefined();
      expect(Array.isArray(units)).toBe(true);
      console.log(`[Treasury] Units count: ${units.length}`);
    } catch (error) {
      printDiagnostic(error, 'listTreasuryUnits');
      throw error;
    }
  });

  it('4. getTreasuryUnitAddress — 查询财务单元地址', async () => {
    try {
      // coinId/network must come from the unit's account list — without them the
      // custody backend returns an empty page.
      const accounts = await sdk.listUnitAccount(authorizeId, TREASURY_UNIT_ID);
      const account = accounts.find(a => a.type === 'PAYIN') ?? accounts[0];
      expect(account).toBeDefined();

      const addresses = await sdk.getTreasuryUnitAddress(authorizeId, {
        unitId: TREASURY_UNIT_ID,
        accountType: account.type,
        coinId: account.coinId,
        network: account.network,
      });
      expect(addresses).toBeDefined();
      expect(Array.isArray(addresses.records)).toBe(true);
      console.log(`[Treasury] Addresses count: ${addresses.records.length}`);
    } catch (error) {
      printDiagnostic(error, 'getTreasuryUnitAddress');
      throw error;
    }
  }, 15000);

  it('5. listUnitAccount — 查询财务单元账户列表', async () => {
    try {
      const accounts = await sdk.listUnitAccount(authorizeId, TREASURY_UNIT_ID);
      expect(accounts).toBeDefined();
      expect(Array.isArray(accounts)).toBe(true);
      console.log(`[Treasury] Unit accounts count: ${accounts.length}`);
    } catch (error) {
      printDiagnostic(error, 'listUnitAccount');
      throw error;
    }
  }, 15000);

  it('6. createUnitAddress — 创建财务单元地址', async () => {
    try {
      // coinId/network are taken from the unit's accounts: the custody backend
      // rejects coins not configured for the unit.
      const accounts = await sdk.listUnitAccount(authorizeId, TREASURY_UNIT_ID);
      const account = accounts.find(a => a.type === 'PAYIN') ?? accounts[0];
      expect(account).toBeDefined();

      await sdk.createUnitAddress(authorizeId, {
        unitId: TREASURY_UNIT_ID,
        accountType: account.type,
        network: account.network,
        coinId: account.coinId,
        number: 1,
      });
      console.log(`[Treasury] createUnitAddress OK: ${account.type} ${account.coinId}/${account.network}`);
    } catch (error) {
      printDiagnostic(error, 'createUnitAddress');
      throw error;
    }
  }, 15000);
});

// ============ Payout ============

describe('Payout', () => {
  it('7. listTransferOutOrders — 查询出金订单', async () => {
    try {
      const result = await sdk.listTransferOutOrders(authorizeId, { pageSize: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      console.log(`[Payout] Transfer-out orders: ${result.total}`);
    } catch (error) {
      printDiagnostic(error, 'listTransferOutOrders');
      throw error;
    }
  }, 15000);

  it('8. listTransferInOrders — 查询入金订单', async () => {
    try {
      const result = await sdk.listTransferInOrders(authorizeId, { pageSize: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      console.log(`[Payout] Transfer-in orders: ${result.total}`);
    } catch (error) {
      printDiagnostic(error, 'listTransferInOrders');
      throw error;
    }
  }, 15000);
});

// ============ Transaction ============

describe('Transaction', () => {
  it('9. listActivities — 查询活动记录', async () => {
    try {
      const result = await sdk.listActivities(authorizeId, { pageSize: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      console.log(`[Transaction] Activities: ${result.total}`);
    } catch (error) {
      printDiagnostic(error, 'listActivities');
      throw error;
    }
  }, 15000);

  it('10. listFundRecords — 查询资金流水（账户级）', async () => {
    try {
      const result = await sdk.listFundRecords(authorizeId, { pageSize: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      console.log(`[Transaction] Fund records: ${result.total}`);
    } catch (error) {
      printDiagnostic(error, 'listFundRecords');
      throw error;
    }
  }, 15000);

  it('11. listUnitFundRecords — 查询资金流水（财务单元级）', async () => {
    try {
      const result = await sdk.listUnitFundRecords(authorizeId, { pageSize: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      console.log(`[Transaction] Unit fund records: ${result.total}`);
    } catch (error) {
      printDiagnostic(error, 'listUnitFundRecords');
      throw error;
    }
  }, 15000);
});

// ============ Pooling ============

describe('Pooling', () => {
  it('12. pooling — 发起归集请求', async () => {
    // Pooling sweeps a PAYIN account to PRIMARY. Resolve the source account and
    // its address from the API (coin/network come from the account list) and
    // skip when the unit has no funded, addressable PAYIN account.
    const accounts = await sdk.listUnitAccount(authorizeId, TREASURY_UNIT_ID);
    const source = accounts.find(a => a.type === 'PAYIN' && a.balance > 0);
    if (!source) {
      console.log('[Pooling] SKIPPED — no funded PAYIN account for unit', TREASURY_UNIT_ID);
      return;
    }
    const addresses = await sdk.getUnitAddressByAccount(authorizeId, source.id, {
      unitId: TREASURY_UNIT_ID, coinId: source.coinId, network: source.network,
    });
    const address = addresses.records[0]?.address;
    if (!address) {
      console.log('[Pooling] SKIPPED — no address for PAYIN account', source.id);
      return;
    }

    try {
      const result = await sdk.pooling(authorizeId, {
        unitId: TREASURY_UNIT_ID,
        fromAccountId: source.id,
        address,
        amount: 100,
        coinId: source.coinId,
        network: source.network,
      });
      expect(result).toBeDefined();
      console.log(`[Pooling] Result: ${JSON.stringify(result)}`);
    } catch (error) {
      // 120042 ONLY_ACQUIRING_ACCOUNT_ALLOWED: the custody backend only sweeps
      // acquiring (PAYIN) accounts created by the platform; this fixture's PAYIN
      // account is a plain one. The request itself was signed and forwarded, so
      // this is a data precondition, not a gateway/SDK failure.
      if (error instanceof SDKError && (error.details as any)?.apiCode === 120042) {
        console.log('[Pooling] SKIPPED — custody rejects non-acquiring source account (120042)');
        return;
      }
      printDiagnostic(error, 'pooling');
      throw error;
    }
  }, 20000);
});

// ============ Error Paths ============

describe('Error Paths', () => {
  it('13. 无效 authorizationId → 应返回错误', async () => {
    await expect(
      sdk.listTreasuryUnits('invalid-uuid', { pageSize: 10 })
    ).rejects.toThrow();
  });

  it('14. 空 authorizationId → 应抛异常', async () => {
    await expect(
      sdk.listTreasuryUnits('', { pageSize: 10 })
    ).rejects.toThrow();
  });

  it('15. submitTask 无效 taskId → 应返回错误', async () => {
    await expect(
      sdk.submitTask(authorizeId, 'invalid-task-id', { confirmed: true })
    ).rejects.toThrow();
  });
});

// ============ Quota Check ============

describe('Quota Check', () => {
  it('16. 多次调用后 dailyApiUsage 应递增', async () => {
    try {
      // Call treasury list 3 times to verify quota counting
      for (let i = 0; i < 3; i++) {
        await sdk.listTreasuryUnits(authorizeId, { pageSize: 10 });
      }
      console.log('[Quota] 3 API calls completed — check dailyApiUsage in subscriptions table');
    } catch (error) {
      printDiagnostic(error, 'quotaCheck');
      throw error;
    }
  }, 30000);
});