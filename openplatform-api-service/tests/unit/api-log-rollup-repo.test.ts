import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The repository talks to Prisma through `getClient()`. The mock returns a
 * plain object that records raw SQL and delegate calls, and supports the
 * interactive `$transaction(fn)` shape by handing the callback the same object
 * (rollup writes are issued through `tx` so they stay atomic in production).
 */
const mocks = vi.hoisted(() => {
  const state = {
    rawResults: [] as any[][],
    rawSql: [] as string[],
    executeValues: [] as any[][],
    snapshotUpserts: [] as any[],
    endpointUpserts: [] as any[],
    endpointDeletes: [] as any[],
    snapshotRows: [] as any[],
    endpointRows: [] as any[],
    snapshotExists: false,
  };

  const client: any = {
    $queryRaw: async (strings: any, ..._values: any[]) => {
      state.rawSql.push(strings.join('?'));
      return state.rawResults.shift() ?? [];
    },
    $executeRaw: async (strings: any, ...values: any[]) => {
      state.rawSql.push(strings.join('?'));
      state.executeValues.push(values);
      return 1;
    },
    $transaction: async (fn: any) => fn(client),
    apiLog: { findMany: async () => [] },
    apiLogSnapshot: {
      upsert: async (args: any) => {
        state.snapshotUpserts.push(args);
        return {};
      },
      findUnique: async () => (state.snapshotExists ? { id: BigInt(1) } : null),
      findMany: async () => state.snapshotRows,
      deleteMany: async () => ({ count: 0 }),
    },
    apiLogEndpointDaily: {
      upsert: async (args: any) => {
        state.endpointUpserts.push(args);
        return {};
      },
      findMany: async () => state.endpointRows,
      deleteMany: async (args: any) => {
        state.endpointDeletes.push(args);
        return { count: 0 };
      },
    },
    apiLogMonthlySnapshot: {
      deleteMany: async () => ({ count: 0 }),
    },
  };

  return { state, client };
});

vi.mock('../../src/repositories/db-client', () => ({
  getClient: () => mocks.client,
}));

const { ApiLogRepositoryImpl } = await import('../../src/repositories/implementations/api-log.repository');

const { state } = mocks;
const DAY_LABEL = new Date('2026-11-01T00:00:00.000Z');

describe('ApiLogRepositoryImpl rollups', () => {
  let repo: InstanceType<typeof ApiLogRepositoryImpl>;

  beforeEach(() => {
    state.rawResults.length = 0;
    state.rawSql.length = 0;
    state.executeValues.length = 0;
    state.snapshotUpserts.length = 0;
    state.endpointUpserts.length = 0;
    state.endpointDeletes.length = 0;
    state.snapshotRows.length = 0;
    state.endpointRows.length = 0;
    state.snapshotExists = false;
    repo = new ApiLogRepositoryImpl();
  });

  it('rollupDay aggregates bytes and writes the snapshot', async () => {
    state.rawResults.push([{ calls: 10, errors: 2, total_bytes: 500, avg_rt: 120 }]);
    state.rawResults.push([{ endpoint: '/a', method: 'POST', calls: 10, errors: 2, total_bytes: 500, avg_rt: 120, max_rt: 300 }]);
    state.rawResults.push([{ rt: 100 }, { rt: 120 }, { rt: 300 }]);

    const result = await repo.rollupDay('dev-1', '2026-11-01');

    expect(result).toEqual({ calls: 10, errors: 2 });
    const sql = state.rawSql.join('\n');
    expect(sql).toContain('request_bytes');
    expect(sql).toContain('response_bytes');

    // One batched upsert per table instead of a round-trip per endpoint.
    const snapshotSql = state.rawSql.find((s) => s.includes('INSERT INTO api_log_snapshots'));
    expect(snapshotSql).toBeDefined();
    expect(snapshotSql).toContain('ON DUPLICATE KEY UPDATE');
    // No per-row Prisma upserts may remain inside the transaction.
    expect(state.snapshotUpserts).toHaveLength(0);
    expect(state.endpointUpserts).toHaveLength(0);
  });

  it('rollupDay writes every endpoint in a single INSERT statement', async () => {
    state.rawResults.push([{ calls: 30, errors: 3, total_bytes: 900, avg_rt: 100 }]);
    state.rawResults.push([
      { endpoint: '/a', method: 'GET', calls: 10, errors: 1, total_bytes: 300, avg_rt: 80, max_rt: 200 },
      { endpoint: '/b', method: 'POST', calls: 20, errors: 2, total_bytes: 600, avg_rt: 110, max_rt: 400 },
    ]);
    state.rawResults.push([{ rt: 80 }, { rt: 110 }]);

    await repo.rollupDay('dev-1', '2026-11-01');

    const endpoointInserts = state.rawSql.filter((s) => s.includes('INSERT INTO api_log_endpoint_daily'));
    expect(endpoointInserts).toHaveLength(1);
    // The value list carries both endpoints inline, so 2 placeholders groups.
    expect(endpoointInserts[0]).toContain('ON DUPLICATE KEY UPDATE');
  });

  it('rollupDay is a no-op when the day has no rows', async () => {
    state.rawResults.push([{ calls: 0, errors: 0, total_bytes: null, avg_rt: null }]);
    state.rawResults.push([]);
    state.rawResults.push([]);
    const result = await repo.rollupDay('dev-1', '2026-11-01');
    expect(result).toEqual({ calls: 0, errors: 0 });
    // An already-rolled-up day keeps its snapshot: nothing is written or deleted.
    expect(state.rawSql.some((s) => s.includes('INSERT INTO'))).toBe(false);
    expect(state.rawSql.some((s) => s.includes('DELETE FROM api_log_endpoint_daily'))).toBe(false);
  });

  it('rollupDay deletes endpoint rows that are no longer present', async () => {
    state.rawResults.push([{ calls: 3, errors: 0, total_bytes: 30, avg_rt: 50 }]);
    state.rawResults.push([{ endpoint: '/a', method: 'GET', calls: 3, errors: 0, total_bytes: 30, avg_rt: 50, max_rt: 60 }]);
    state.rawResults.push([{ rt: 50 }, { rt: 50 }, { rt: 60 }]);

    await repo.rollupDay('dev-1', '2026-11-01');

    // The unique key is (developerId, date, endpoint, method): the keep set is
    // the endpoint+method pair, so a stale `/a GET` is removed while `/a POST`
    // survives.
    const deleteSql = state.rawSql.find((s) => s.includes('DELETE FROM api_log_endpoint_daily'));
    expect(deleteSql).toBeDefined();
    expect(deleteSql).toContain('(endpoint, method) NOT IN');
  });

  it('getDailySnapshotsBetween returns zeroed bytes for legacy rows', async () => {
    state.snapshotRows.push({
      date: new Date('2026-10-01T00:00:00.000Z'),
      developerId: 'dev-1',
      totalCalls: 5,
      errorCalls: 1,
      avgResponseTime: 10,
      p95ResponseTime: 20,
      totalBytes: null,
      topEndpoints: null,
      createdAt: new Date('2026-10-02T00:00:00.000Z'),
    });
    const rows = await repo.getDailySnapshotsBetween('dev-1', '2026-10-01', '2026-10-02');
    expect(rows[0].totalBytes).toBe(0);
    expect(rows[0].date).toBe('2026-10-01');
    expect(rows[0].topEndpoints).toEqual([]);
  });

  it('upsertDailySnapshot writes UTC-midnight date labels', async () => {
    await repo.upsertDailySnapshot({
      date: '2026-10-05',
      developerId: 'dev-1',
      totalCalls: 7,
      errorCalls: 1,
      avgResponseTime: 42,
      p95ResponseTime: 90,
      totalBytes: 1234,
      topEndpoints: [{ endpoint: '/x', calls: 7, errorRate: 14.3 }],
      createdAt: '2026-10-06T00:00:00.000Z',
    });

    expect(state.snapshotUpserts).toHaveLength(1);
    const write = state.snapshotUpserts[0];
    expect(write.where.uq_dev_date.date).toEqual(new Date('2026-10-05T00:00:00.000Z'));
    expect(write.create.totalBytes).toBe(BigInt(1234));
    expect(write.update).not.toHaveProperty('developerId');
    expect(write.update).not.toHaveProperty('date');
  });

  it('rollupMonth weights the average by call count', async () => {
    // Daily rows: 10 calls @100ms, 30 calls @200ms => 175ms weighted
    state.rawResults.push([
      { date: '2026-10-01', total_calls: 10, error_calls: 1, total_bytes: 100, avg_response_time: 100 },
      { date: '2026-10-02', total_calls: 30, error_calls: 3, total_bytes: 300, avg_response_time: 200 },
    ]);

    const written = await repo.rollupMonth('dev-1', '2026-10');
    expect(written).toBe(1);
    const upsertSql = state.rawSql.find((s) => s.includes('api_log_monthly_snapshots'));
    expect(upsertSql).toBeDefined();

    const insertValues = state.executeValues.find((v) => v[0] === 'dev-1');
    // values: developerId, start, totalCalls, errorCalls, totalBytes, avg
    expect(insertValues).toBeDefined();
    expect(insertValues![2]).toBe(40);
    expect(insertValues![3]).toBe(4);
    expect(insertValues![4]).toBe(400);
    expect(insertValues![5]).toBe(175);

    // Daily snapshots + endpoint rows covered by the month are removed.
    expect(state.rawSql.some((s) => s.includes('DELETE FROM api_log_snapshots'))).toBe(true);
    expect(state.rawSql.some((s) => s.includes('DELETE FROM api_log_endpoint_daily'))).toBe(true);
  });

  it('rollupMonth leaves an already-rolled month untouched', async () => {
    state.rawResults.push([]);
    expect(await repo.rollupMonth('dev-1', '2026-10')).toBe(0);
    expect(state.rawSql.some((s) => s.includes('api_log_monthly_snapshots'))).toBe(false);
    expect(state.executeValues).toHaveLength(0);
  });

  it('listDevelopersWithDailySnapshots maps the raw rows', async () => {
    state.rawResults.push([{ developer_id: 'dev-1' }]);
    const devs = await repo.listDevelopersWithDailySnapshots('2026-10');
    expect(devs).toEqual(['dev-1']);
    expect(state.rawSql[0]).toContain("DATE_ADD(?, INTERVAL 1 MONTH)");
  });
});
