/**
 * Billing Service Tests
 *
 * Data access is mocked: these exercise the service's mapping/contract logic,
 * not a live database. Invoice generation is still a documented placeholder in
 * BillingService, so those cases pin the placeholder behaviour instead of
 * asserting an invoice that does not exist yet.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadUsageWindow: vi.fn(),
  getRetentionInfo: vi.fn(),
  getRecentErrors: vi.fn(),
  getDailyBreakdown: vi.fn(),
  findActiveWithPackage: vi.fn(),
  findByFilters: vi.fn(),
  getLogRetentionDays: vi.fn(),
}));

vi.mock('../../src/services/api-log-stats.service', () => ({
  loadUsageWindow: mocks.loadUsageWindow,
}));

vi.mock('../../src/services/api-log-retention.service', () => ({
  getRetentionInfo: mocks.getRetentionInfo,
}));

vi.mock('../../src/services/api-log.service', () => ({
  getRecentErrors: mocks.getRecentErrors,
}));

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => ({
    getDailyBreakdown: mocks.getDailyBreakdown,
    getLogRetentionDays: mocks.getLogRetentionDays,
  }),
  getSubscriptionRepository: () => ({
    findActiveWithPackage: mocks.findActiveWithPackage,
  }),
  getOrderRepository: () => ({
    findByFilters: mocks.findByFilters,
  }),
  getTicketRepository: () => ({}),
}));

const { createBillingService } = await import('../../src/services/billing.service');

const USAGE_WINDOW = {
  totalCalls: 100,
  apiCalls: 100,
  callbackCalls: 4,
  errorCalls: 2,
  totalBytes: 2048,
  avgResponseTime: 40,
  series: [
    { date: '2026-11-01', calls: 100, errorCalls: 2, totalBytes: 2048, avgResponseTime: 40 },
  ],
  endpoints: [
    {
      endpoint: '/a',
      method: 'POST',
      calls: 100,
      successCount: 98,
      successRate: 98,
      percentage: 100,
      totalBytes: 2048,
      avgResponseTime: 40,
      maxResponseTime: 90,
    },
  ],
  bytesTrackedSince: '2026-11-01',
  partial: false,
  retentionDays: 3,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findActiveWithPackage.mockResolvedValue(null);
  mocks.getRetentionInfo.mockResolvedValue({ effectiveDays: 3 });
  mocks.getRecentErrors.mockResolvedValue([]);
  mocks.loadUsageWindow.mockResolvedValue(USAGE_WINDOW);
  mocks.getDailyBreakdown.mockResolvedValue([]);
  mocks.findByFilters.mockResolvedValue({ list: [], total: 0 });
});

describe('BillingService', () => {
  describe('invoice placeholder', () => {
    // TODO(invoices): replace with real assertions once generateInvoice is implemented.
    it('rejects generateInvoice because invoice generation is not implemented', async () => {
      const service = createBillingService();
      await expect(
        service.generateInvoice('dev-1', '2026-01-01', '2026-01-31'),
      ).rejects.toThrow(/not yet implemented/);
    });

    it('returns null for an unknown invoice', async () => {
      const service = createBillingService();
      expect(await service.getInvoice('INV-2026-0001')).toBeNull();
    });

    it('returns an empty invoice history page', async () => {
      const service = createBillingService();
      const result = await service.getInvoiceHistory('dev-1', 2, 1);
      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(1);
    });
  });

  describe('getPaymentHistory', () => {
    it('maps repository orders and forwards pagination', async () => {
      mocks.findByFilters.mockResolvedValue({
        list: [
          {
            id: 'ord-1',
            externalPaymentId: 'ext-1',
            amount: '49.00',
            currency: 'CNY',
            paymentMethod: 'bank_transfer',
            status: 'pending',
            createdAt: new Date('2026-11-01T00:00:00Z'),
          },
        ],
        total: 1,
      });
      const service = createBillingService();
      const result = await service.getPaymentHistory('dev-1', 2, 5);

      expect(mocks.findByFilters).toHaveBeenCalledWith({ developerId: 'dev-1' }, 2, 5);
      expect(result.total).toBe(1);
      expect(result.list[0]).toMatchObject({
        id: 'ord-1',
        amount: 49,
        currency: 'CNY',
        status: 'pending',
        createdAt: '2026-11-01T00:00:00.000Z',
      });
    });

    it('returns an empty page when the repository throws', async () => {
      mocks.findByFilters.mockRejectedValue(new Error('db down'));
      const service = createBillingService();
      const result = await service.getPaymentHistory('dev-1', 1, 10);
      expect(result).toMatchObject({ list: [], total: 0, page: 1, pageSize: 10 });
    });
  });

  describe('getUsageStatistics', () => {
    it('maps the usage window into the portal contract', async () => {
      const service = createBillingService();
      const stats = await service.getUsageStatistics('dev-1', '30days');

      expect(stats.totalApiCalls).toBe(100);
      expect(stats.apiCalls).toBe(100);
      expect(stats.callbackCalls).toBe(4);
      expect(stats.totalCalls).toBe(100);
      expect(stats.totalBandwidth).toBe(2048);
      expect(stats.successRate).toBe(98);
      expect(stats.currency).toBe('USD');
      expect(stats.dailyBreakdown?.[0]).toMatchObject({ calls: 100, successCount: 98 });
      expect(stats.endpointBreakdown?.[0]).toMatchObject({ endpoint: '/a', totalBytes: 2048 });

      const [developerId, startDay, , , retentionDays] = mocks.loadUsageWindow.mock.calls[0];
      expect(developerId).toBe('dev-1');
      expect(typeof startDay).toBe('string'); // 30-day window, inclusive of today
      expect(retentionDays).toBe(3);
    });

    it('keeps costs at zero until pricing is implemented', async () => {
      const service = createBillingService();
      const stats = await service.getUsageStatistics('dev-1');
      expect(stats.apiCallCost).toBe(0);
      expect(stats.bandwidthCost).toBe(0);
      expect(stats.storageCost).toBe(0);
      expect(stats.totalCost).toBe(0);
    });
  });

  describe('getUsageTrend', () => {
    it('maps daily breakdown rows for the requested period', async () => {
      mocks.getDailyBreakdown.mockResolvedValue([
        { date: '2026-11-10', calls: 3, successCount: 3, avgResponseTime: 10 },
        { date: '2026-11-11', calls: 4, successCount: 4, avgResponseTime: 12 },
      ]);
      const service = createBillingService();
      const trend = await service.getUsageTrend('dev-1', '7d');

      expect(trend).toHaveLength(2);
      expect(trend[0]).toEqual({ date: '2026-11-10', apiCalls: 3, bandwidth: 0 });
      expect(mocks.getDailyBreakdown).toHaveBeenCalledTimes(1);
    });

    it('defaults to the 7-day window', async () => {
      const service = createBillingService();
      await service.getUsageTrend('dev-1');

      const [, startDate] = mocks.getDailyBreakdown.mock.calls[0];
      const days = Math.round(
        (Date.now() - (startDate as Date).getTime()) / (24 * 60 * 60 * 1000),
      );
      expect(days).toBe(7);
    });
  });
});
