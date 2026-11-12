import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const repo = {
    listDevelopersWithRawLogs: vi.fn(async (_day: string) => ['dev-1']),
    listDevelopersWithDailySnapshots: vi.fn(async (_month: string) => ['dev-1'] as string[]),
    listAlertSettingDevelopers: vi.fn(async () => [] as string[]),
    countRawForDeveloper: vi.fn(async (_dev: string, _day: string) => 1),
    hasDailySnapshot: vi.fn(async (_dev: string, _day: string) => true),
    rollupDay: vi.fn(async (_dev: string, _day: string) => ({ calls: 1, errors: 0 })),
    deleteRawBeforeForDeveloper: vi.fn(async (_dev: string, _day: string) => ({ count: 1 })),
    deleteUnassignedRawBefore: vi.fn(async (_day: string) => ({ count: 1 })),
    pruneDailyOlderThan: vi.fn(async (_day: string) => ({ snapshots: 1, endpoints: 1 })),
    rollupMonth: vi.fn(async (_dev: string, _month: string) => 1),
    pruneMonthlyOlderThan: vi.fn(async (_month: string) => 0),
  };
  /** developerId → effective retention days handed back to the rollup. */
  const retention = new Map<string, number>();
  return { repo, retention };
});

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => mocks.repo,
}));

// The scheduler uses getClient(); runOnce never touches it directly.
vi.mock('../../src/repositories/db-client', () => ({
  getClient: () => ({}),
}));

vi.mock('../../src/services/api-log-retention.service', () => ({
  resolveRetentionForDevelopers: async (devs: string[]) => {
    const result = new Map<string, { effectiveDays: number }>();
    for (const dev of devs) {
      result.set(dev, { effectiveDays: mocks.retention.get(dev) ?? 3 });
    }
    return result;
  },
}));

const { createApiLogRollupService } = await import('../../src/services/api-log-rollup.service');

const { repo, retention } = mocks;
const NOW = new Date('2026-11-02T04:00:00Z'); // UTC day 2026-11-02

/** Restore every mock to its default behaviour (tests override individual ones). */
function resetRepo() {
  repo.listDevelopersWithRawLogs.mockReset().mockResolvedValue(['dev-1']);
  repo.listDevelopersWithDailySnapshots.mockReset().mockResolvedValue(['dev-1']);
  repo.listAlertSettingDevelopers.mockReset().mockResolvedValue([]);
  repo.countRawForDeveloper.mockReset().mockResolvedValue(1);
  repo.hasDailySnapshot.mockReset().mockResolvedValue(true);
  repo.rollupDay.mockReset().mockResolvedValue({ calls: 1, errors: 0 });
  repo.deleteRawBeforeForDeveloper.mockReset().mockResolvedValue({ count: 1 });
  repo.deleteUnassignedRawBefore.mockReset().mockResolvedValue({ count: 1 });
  repo.pruneDailyOlderThan.mockReset().mockResolvedValue({ snapshots: 1, endpoints: 1 });
  repo.rollupMonth.mockReset().mockResolvedValue(1);
  repo.pruneMonthlyOlderThan.mockReset().mockResolvedValue(0);
  retention.clear();
}

describe('ApiLogRollupService', () => {
  beforeEach(() => {
    resetRepo();
  });

  it('rolls up D-1..D-3 then deletes raw rows older than D-2 for the default 3 days', async () => {
    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    const days = repo.rollupDay.mock.calls.map((c) => c[1]);
    // Only the developer's own retention window is recomputed.
    expect(days).toEqual(['2026-11-01', '2026-10-31', '2026-10-30']);
    // Default 3 days → exclusive cutoff D-2: rows before 2026-10-31 go, so
    // D-2, D-1 and today remain.
    expect(repo.deleteRawBeforeForDeveloper).toHaveBeenCalledWith('dev-1', '2026-10-31');
    expect(repo.deleteUnassignedRawBefore).toHaveBeenCalledWith('2026-10-31');
  });

  it('keeps a longer retention for the developer that configured it', async () => {
    retention.set('dev-1', 7);
    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    const days = repo.rollupDay.mock.calls.map((c) => c[1]);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe('2026-10-26');
    expect(repo.deleteRawBeforeForDeveloper).toHaveBeenCalledWith('dev-1', '2026-10-27');
    // Rows inside the unassigned slice are untouched by the developer delete.
    expect(repo.deleteUnassignedRawBefore).toHaveBeenCalledWith('2026-10-31');
  });

  it('skips deleting a day whose snapshot is missing', async () => {
    repo.hasDailySnapshot.mockResolvedValue(false);
    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();
    // Rows exist in the older span, so the per-developer delete must not run.
    expect(repo.deleteRawBeforeForDeveloper).not.toHaveBeenCalled();
    expect(repo.deleteUnassignedRawBefore).toHaveBeenCalled();
  });

  it('skips raw deletion when a day rollup throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.rollupDay.mockRejectedValueOnce(new Error('boom'));

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    expect(repo.deleteRawBeforeForDeveloper).not.toHaveBeenCalled();
    // A global failure blocks unassigned pruning; it cannot be tied to a
    // developer and would otherwise be deleted before its snapshot exists.
    expect(repo.deleteUnassignedRawBefore).not.toHaveBeenCalled();
    // One failure does not abort the remaining days.
    expect(repo.rollupDay).toHaveBeenCalledTimes(3);
    expect(errorSpy.mock.calls.some((c) => String(c[0]).includes('Rollup failed for dev-1/2026-11-01'))).toBe(true);
    errorSpy.mockRestore();
  });

  it('stops the month walk at the first empty month and prunes with the right labels', async () => {
    // 2026-11 current → daily window starts 2026-06; months before it are
    // rolled over starting at 2026-05, stopping once a month has no daily rows.
    repo.listDevelopersWithDailySnapshots
      .mockResolvedValueOnce(['dev-1']) // 2026-05
      .mockResolvedValueOnce([]);       // 2026-04 → stop

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    expect(repo.listDevelopersWithDailySnapshots.mock.calls.map((c) => c[0])).toEqual([
      '2026-05',
      '2026-04',
    ]);
    expect(repo.rollupMonth.mock.calls).toEqual([['dev-1', '2026-05']]);
    expect(repo.pruneDailyOlderThan).toHaveBeenCalledWith('2026-06-01');
    // currentMonth=2026-11, MONTHLY_RETENTION_YEARS=5,
    // cutoff = 2026-11 + (-5*12) = 2021-11; addMonths returns '2021-11'.
    expect(repo.pruneMonthlyOlderThan.mock.calls[0]).toEqual(['2021-11']);
  });

  it('still prunes when a month rollup throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.rollupMonth.mockRejectedValueOnce(new Error('month boom'));

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    expect(repo.pruneDailyOlderThan).toHaveBeenCalled();
    expect(repo.pruneMonthlyOlderThan).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
