import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The repository talks to Prisma through `getClient()`. This mock records the
 * `where` clause passed to `findMany`/`count` so the tests can assert on the
 * generated filter without a real database.
 */
const mocks = vi.hoisted(() => {
  const state = {
    findManyArgs: [] as any[],
    countArgs: [] as any[],
  };
  const client: any = {
    apiLog: {
      findMany: async (args: any) => {
        state.findManyArgs.push(args);
        return [];
      },
      count: async (args: any) => {
        state.countArgs.push(args);
        return 0;
      },
      findUnique: async () => null,
    },
    developerAlertSetting: {
      findMany: async () => [],
      findUnique: async () => null,
      upsert: async () => ({}),
    },
    developerAlertEvent: {
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
      create: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
  };
  return { state, client };
});

vi.mock('../../src/repositories/db-client', () => ({
  getClient: () => mocks.client,
}));

const { ApiLogRepositoryImpl } = await import('../../src/repositories/implementations/api-log.repository');

const { state } = mocks;

describe('ApiLogRepositoryImpl findByDeveloper filters', () => {
  let repo: InstanceType<typeof ApiLogRepositoryImpl>;

  beforeEach(() => {
    state.findManyArgs.length = 0;
    state.countArgs.length = 0;
    repo = new ApiLogRepositoryImpl();
  });

  it('filters by traceId', async () => {
    await repo.findByDeveloper('dev-1', 1, 20, { traceId: 'abc-123' });
    expect(state.findManyArgs[0].where.traceId).toBe('abc-123');
  });

  it('matches apiName OR endpoint for keyword search', async () => {
    await repo.findByDeveloper('dev-1', 1, 20, { apiName: 'withdraw' });
    expect(state.findManyArgs[0].where.OR).toEqual([
      { apiName: { contains: 'withdraw' } },
      { endpoint: { contains: 'withdraw' } },
    ]);
  });

  it('applies the admin developerId filter when scoped to "__admin__"', async () => {
    await repo.findByDeveloper('__admin__', 1, 20, { developerId: 'dev-9' });
    expect(state.findManyArgs[0].where.developerId).toBe('dev-9');
  });

  it('omits developerId when scoped and no override is given', async () => {
    await repo.findByDeveloper('dev-1', 1, 20, {});
    expect(state.findManyArgs[0].where.developerId).toBe('dev-1');
  });

  it('combines isError and date range', async () => {
    const startDate = new Date('2026-11-01T00:00:00Z');
    const endDate = new Date('2026-11-02T00:00:00Z');
    await repo.findByDeveloper('dev-1', 1, 20, { isError: true, startDate, endDate });
    const where = state.findManyArgs[0].where;
    expect(where.isError).toBe(true);
    expect(where.createdAt).toEqual({ gte: startDate, lte: endDate });
  });
});
