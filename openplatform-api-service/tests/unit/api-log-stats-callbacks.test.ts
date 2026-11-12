import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `loadUsageWindow` mixes rolled-up snapshots with live raw days. Callback
 * pushes share the raw table, so these tests pin the split: API-call totals
 * stay API-only (snapshot-compatible), callbacks are reported separately, and a
 * day that already has a snapshot is not double-counted.
 */

const state = {
  aggregateArgs: [] as any[],
  snapshotDays: [] as string[],
  rawByDay: new Map<string, { calls: number }>(),
  callbackCount: 0,
  callbackRange: null as null | { start: Date; end: Date },
};

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => ({
    getMonthlySnapshotsBetween: async () => [],
    getDailySnapshotsBetween: async (): Promise<any[]> =>
      state.snapshotDays.map((date) => ({
        date,
        totalCalls: 10,
        errorCalls: 1,
        totalBytes: 100,
        avgResponseTime: 50,
      })),
    getEndpointDailyBetween: async () => [],
    aggregateRawRange: async (_dev: string, start: Date) => {
      const day = start.toISOString().slice(0, 10);
      state.aggregateArgs.push(day);
      const raw = state.rawByDay.get(day);
      return {
        calls: raw?.calls ?? 0,
        errorCalls: 0,
        totalBytes: 0,
        avgResponseTime: 0,
        callbackCalls: 0,
        byEndpoint: [],
        byDay: [],
      };
    },
    countCallbackLogsBetween: async (_dev: string, start: Date, end: Date) => {
      state.callbackRange = { start, end };
      return state.callbackCount;
    },
  }),
}));

const { loadUsageWindow } = await import('../../src/services/api-log-stats.service');

const NOW = new Date('2026-11-12T12:00:00Z');
const TODAY = '2026-11-12';

describe('loadUsageWindow callback split', () => {
  beforeEach(() => {
    state.aggregateArgs.length = 0;
    state.snapshotDays = [];
    state.rawByDay.clear();
    state.callbackCount = 0;
    state.callbackRange = null;
  });

  it('reports callback rows separately without inflating API calls', async () => {
    state.rawByDay.set(TODAY, { calls: 7 });
    state.callbackCount = 3;

    const window = await loadUsageWindow('dev-1', TODAY, 'UTC', NOW, 3);
    expect(window.totalCalls).toBe(7);
    expect(window.apiCalls).toBe(7);
    expect(window.callbackCalls).toBe(3);
    // Callbacks are counted for the whole raw window in one query.
    expect(state.callbackRange).not.toBeNull();
  });

  it('does not double-count a snapshot day, but still reports its callbacks', async () => {
    state.snapshotDays = [TODAY];
    state.rawByDay.set(TODAY, { calls: 7 });
    state.callbackCount = 3;

    const window = await loadUsageWindow('dev-1', TODAY, 'UTC', NOW, 3);
    expect(window.totalCalls).toBe(10); // snapshot value, not 10 + 7
    expect(window.apiCalls).toBe(10);
    expect(window.callbackCalls).toBe(3);
    // Snapshot days are not re-queried for API aggregates.
    expect(state.aggregateArgs).not.toContain(TODAY);
  });
});
