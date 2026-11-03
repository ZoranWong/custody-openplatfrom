import { describe, it, expect, vi } from 'vitest';

const loadUsageWindow = vi.fn();

vi.mock('../../src/services/api-log-stats.service', () => ({ loadUsageWindow }));

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => ({ findRecentErrors: async () => [] }),
  getSubscriptionRepository: () => ({ findActiveWithPackage: async () => null }),
  getOrderRepository: () => ({}),
  getTicketRepository: () => ({}),
}));

const { createBillingService } = await import('../../src/services/billing.service');

describe('getUsageStatistics', () => {
  it('maps the usage window into the existing contract plus bytes', async () => {
    loadUsageWindow.mockResolvedValue({
      totalCalls: 120,
      errorCalls: 6,
      totalBytes: 2400,
      avgResponseTime: 88,
      series: [{ date: '2026-11-01', calls: 120, errorCalls: 6, totalBytes: 2400, avgResponseTime: 88 }],
      endpoints: [{ endpoint: '/a', method: 'POST', calls: 120, successCount: 114, successRate: 95, percentage: 100, totalBytes: 2400, avgResponseTime: 88, maxResponseTime: 300 }],
      bytesTrackedSince: '2026-11-01',
      partial: false,
    });
    const svc = createBillingService();
    const stats = await svc.getUsageStatistics('dev-1', '30days');
    expect(stats.totalCalls).toBe(120);
    expect(stats.successRate).toBe(95);
    expect(stats.totalBytes).toBe(2400);
    expect(stats.bytesTrackedSince).toBe('2026-11-01');
    expect(stats.dailyBreakdown?.[0].calls).toBe(120);
    expect(stats.dailyBreakdown?.[0].bytes).toBe(2400);
    expect(stats.endpointBreakdown?.[0].totalBytes).toBe(2400);

    const [developerId, startDay] = loadUsageWindow.mock.calls[0];
    expect(developerId).toBe('dev-1');
    // 30-day window is inclusive of today.
    expect(typeof startDay).toBe('string');
  });

  it('reports partial data and a null traffic start when no bytes are tracked', async () => {
    loadUsageWindow.mockResolvedValue({
      totalCalls: 0,
      errorCalls: 0,
      totalBytes: 0,
      avgResponseTime: 0,
      series: [],
      endpoints: [],
      bytesTrackedSince: null,
      partial: true,
    });
    const svc = createBillingService();
    const stats = await svc.getUsageStatistics('dev-1', '7d');
    expect(stats.successRate).toBe(100);
    expect(stats.totalBytes).toBe(0);
    expect(stats.bytesTrackedSince).toBeNull();
    expect(stats.partial).toBe(true);
  });
});
