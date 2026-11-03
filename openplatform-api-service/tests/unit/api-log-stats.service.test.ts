import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => ({}),
}));

const { mergeTimeSeries, buildBreakdown } = await import('../../src/services/api-log-stats.service');

describe('api-log-stats merge', () => {
  it('merges daily and monthly series without gaps', () => {
    const daily = [
      { date: '2026-11-01', calls: 10, errorCalls: 1, totalBytes: 100, avgResponseTime: 50 },
    ];
    const monthly = [
      { month: '2026-10', totalCalls: 300, errorCalls: 30, totalBytes: 3000, avgResponseTime: 60 },
    ];
    const merged = mergeTimeSeries(daily, monthly);
    expect(merged).toEqual([
      { date: '2026-10', calls: 300, errorCalls: 30, totalBytes: 3000, avgResponseTime: 60 },
      { date: '2026-11-01', calls: 10, errorCalls: 1, totalBytes: 100, avgResponseTime: 50 },
    ]);
  });

  it('computes success rate and percentage from endpoint rows', () => {
    const rows = [
      { endpoint: '/a', method: 'POST', calls: 30, errorCalls: 3, totalBytes: 300, avgResponseTime: 10, maxResponseTime: 50 },
      { endpoint: '/b', method: 'GET', calls: 10, errorCalls: 0, totalBytes: 100, avgResponseTime: 20, maxResponseTime: 40 },
    ];
    const out = buildBreakdown(rows);
    expect(out[0]).toMatchObject({ endpoint: '/a', calls: 30, successRate: 90, percentage: 75, totalBytes: 300 });
    expect(out[1].percentage).toBe(25);
  });

  it('handles an empty set without dividing by zero', () => {
    expect(buildBreakdown([])).toEqual([]);
  });
});
