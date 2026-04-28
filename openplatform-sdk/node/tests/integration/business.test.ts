/**
 * Business API Integration Tests
 *
 * Tests cover:
 * - Treasury unit queries
 * - Payout order queries
 * - Transaction/activity queries
 * - Error paths (invalid auth, empty params)
 *
 * Run:
 *   TEST_ENV=local npm test
 *   TEST_ENV=testing npm test
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  BASE_URL,
  AUTHORIZATION_ID,
  createSDK,
  healthCheck,
  printDiagnostic,
} from './helpers';
import { CregisSDK } from '../../src';

let sdk: CregisSDK;

beforeAll(async () => {
  const healthy = await healthCheck();
  if (!healthy) {
    throw new Error(`API service not reachable at ${BASE_URL}. Ensure the API server is running.`);
  }
  sdk = createSDK();
  console.log(`[Setup] SDK initialized — Base URL: ${BASE_URL}`);
});

// ============ Treasury ============

describe('Treasury', () => {
  it('listTreasuryUnits — 查询财务单元列表', async () => {
    try {
      const units = await sdk.listTreasuryUnits(AUTHORIZATION_ID, { pageSize: 10, pageNum: 1 });
      expect(units).toBeDefined();
      expect(Array.isArray(units)).toBe(true);
      console.log(`[Treasury] Units count: ${units.length}`);
    } catch (error) {
      printDiagnostic(error, 'listTreasuryUnits');
      throw error;
    }
  });

  it('getTreasuryUnitAddress — 查询财务单元地址 (unitId=1)', async () => {
    try {
      const addresses = await sdk.getTreasuryUnitAddress(AUTHORIZATION_ID, { unitId: 1 });
      expect(addresses).toBeDefined();
      expect(Array.isArray(addresses)).toBe(true);
      console.log(`[Treasury] Addresses count: ${addresses.length}`);
    } catch (error) {
      printDiagnostic(error, 'getTreasuryUnitAddress');
      throw error;
    }
  }, 15000);
});

// ============ Payout ============

describe('Payout', () => {
  it('listTransferOutOrders — 查询出金订单', async () => {
    try {
      const result = await sdk.listTransferOutOrders(AUTHORIZATION_ID, { pageSize: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      console.log(`[Payout] Transfer-out orders total: ${result.total}`);
    } catch (error) {
      printDiagnostic(error, 'listTransferOutOrders');
      throw error;
    }
  }, 15000);

  it('listTransferInOrders — 查询入金订单', async () => {
    try {
      const result = await sdk.listTransferInOrders(AUTHORIZATION_ID, { pageSize: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      console.log(`[Payout] Transfer-in orders total: ${result.total}`);
    } catch (error) {
      printDiagnostic(error, 'listTransferInOrders');
      throw error;
    }
  }, 15000);
});

// ============ Transaction ============

describe('Transaction', () => {
  it('listActivities — 查询活动记录', async () => {
    try {
      const result = await sdk.listActivities(AUTHORIZATION_ID, { pageSize: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      console.log(`[Transaction] Activities total: ${result.total}`);
    } catch (error) {
      printDiagnostic(error, 'listActivities');
      throw error;
    }
  }, 15000);

  it('listFundRecords — 查询资金流水', async () => {
    try {
      const result = await sdk.listFundRecords(AUTHORIZATION_ID, { pageSize: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      console.log(`[Transaction] Fund records total: ${result.total}`);
    } catch (error) {
      printDiagnostic(error, 'listFundRecords');
      throw error;
    }
  }, 15000);
});

// ============ Error Paths ============

describe('Error Paths', () => {
  it('无效 authorizationId → 应返回错误', async () => {
    await expect(
      sdk.listTreasuryUnits('invalid-uuid', { pageSize: 10 })
    ).rejects.toThrow();
  });

  it('空 authorizationId → 应抛异常', async () => {
    await expect(
      sdk.listTreasuryUnits('', { pageSize: 10 })
    ).rejects.toThrow();
  });
});
