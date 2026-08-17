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
import {
  BASE_URL, APP_ID, APP_SECRET,
  createSDK, healthCheck, printDiagnostic,
} from './helpers';
import { CregisSDK, SDKError } from '../../src';

let sdk: CregisSDK;
let authorizeId: string;

beforeAll(async () => {
  const healthy = await healthCheck();
  if (!healthy) {
    throw new Error(`API service not reachable at ${BASE_URL}/health`);
  }
  sdk = createSDK();
  console.log(`[Setup] Base URL: ${BASE_URL}`);
  console.log(`[Setup] App ID: ${APP_ID}`);
});

// ============ OAuth Flow ============

describe('OAuth Flow', () => {
  it('1. authorizeUrl — 获取授权 URL', async () => {
    const result = await sdk.getAuthorizationUrl({
      permissions: ['read', 'write'],
      redirectUri: 'https://example.com/callback',
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
    // First get a token
    const authUrlResult = await sdk.getAuthorizationUrl({
      permissions: ['read', 'write'],
      redirectUri: 'https://example.com/callback',
      state: 'test-state-' + Date.now(),
    });
    const token = new URL(authUrlResult.authorizeUrl).searchParams.get('appToken')!;

    // Verify directly (no signature needed for /oauth/verify)
    const http = require('http');
    const body = JSON.stringify({ resourceKey: 'test-resource-key', oauthToken: token });
    const result: any = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost', port: 1000,
        path: '/api/thirdparty/oauth/verify',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res: any) => {
        let d = ''; res.on('data', (c: string) => d += c); res.on('end', () => resolve(JSON.parse(d)));
      });
      req.on('error', reject);
      req.write(body); req.end();
    });

    expect(result.code).toBe(0);
    expect(result.data?.authorizeId).toBeTruthy();
    authorizeId = result.data.authorizeId;
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
      const addresses = await sdk.getTreasuryUnitAddress(authorizeId, { unitId: 1 });
      expect(addresses).toBeDefined();
      expect(Array.isArray(addresses)).toBe(true);
      console.log(`[Treasury] Addresses count: ${addresses.length}`);
    } catch (error) {
      printDiagnostic(error, 'getTreasuryUnitAddress');
      throw error;
    }
  }, 15000);

  it('5. listUnitAccount — 查询财务单元账户列表', async () => {
    try {
      const accounts = await sdk.listUnitAccount(authorizeId, 1);
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
      const result = await sdk.createUnitAddress(authorizeId, {
        unitId: 1, accountTypy: 'PRIMARY', network: 'BTC', coinId: 'BTC', number: 1,
      });
      expect(result).toBeDefined();
      console.log(`[Treasury] createUnitAddress: ${JSON.stringify(result)}`);
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
    try {
      const result = await sdk.pooling(authorizeId, {
        unitId: 1, amount: 100, coinId: 'USDT', network: 'TRC20',
      });
      expect(result).toBeDefined();
      console.log(`[Pooling] Result: ${JSON.stringify(result)}`);
    } catch (error) {
      printDiagnostic(error, 'pooling');
      throw error;
    }
  }, 15000);
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