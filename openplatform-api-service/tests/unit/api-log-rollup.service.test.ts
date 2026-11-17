import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const repo = {
    listDevelopersWithRawLogs: vi.fn(async (_day: string) => ['dev-1']),
    listDevelopersWithDailySnapshots: vi.fn(async (_month: string) => ['dev-1'] as string[]),
    listAlertSettingDevelopers: vi.fn(async () => [] as string[]),
    countRawForDeveloper: vi.fn(async (_dev: string, _day: string) => 1),
    countApiCallRawForDeveloper: vi.fn(async (_dev: string, _day: string) => 1),
    hasDailySnapshot: vi.fn(async (_dev: string, _day: string) => true),
    rollupDay: vi.fn(async (_dev: string, _day: string) => ({ calls: 1, errors: 0 })),
    listDaysWithRawLogs: vi.fn(async () => [] as string[]),
    listRawDaysForDeveloper: vi.fn(async (_dev: string) => [] as string[]),
    deleteRawForDay: vi.fn(async (_dev: string, _day: string) => ({ count: 1 })),
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
  repo.countApiCallRawForDeveloper.mockReset().mockResolvedValue(1);
  repo.hasDailySnapshot.mockReset().mockResolvedValue(true);
  repo.rollupDay.mockReset().mockResolvedValue({ calls: 1, errors: 0 });
  repo.listDaysWithRawLogs.mockReset().mockResolvedValue(['2026-11-01', '2026-10-31', '2026-10-30']);
  repo.listRawDaysForDeveloper.mockReset().mockResolvedValue([]);
  repo.deleteRawForDay.mockReset().mockResolvedValue({ count: 1 });
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

  it('includes a developer whose only rows are older than 30 days, so they still get cleaned', async () => {
    // 2026-09-01 is far outside any retention window; a fixed 30-day lookback
    // would drop this developer entirely and leave the rows stranded.
    repo.listDaysWithRawLogs.mockResolvedValue(['2026-09-01']);
    repo.listDevelopersWithRawLogs.mockResolvedValue(['old-dev']);
    repo.listRawDaysForDeveloper.mockResolvedValue(['2026-09-01']);

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    expect(repo.rollupDay).toHaveBeenCalledWith('old-dev', '2026-09-01');
    expect(repo.deleteRawForDay).toHaveBeenCalledWith('old-dev', '2026-09-01');
  });

  it('rolls up every day that still has raw rows, then deletes rolled-up days before the cutoff', async () => {
    // Any day holding raw rows is rolled up, however old — otherwise old rows
    // can never earn a snapshot and can never be deleted.
    repo.listDaysWithRawLogs.mockResolvedValue(['2026-10-20', '2026-10-29', '2026-10-31', '2026-11-01', '2026-11-02']);
    // Default 3 days → cutoff D-2 (2026-10-31). Only days strictly before the
    // cutoff whose snapshot exists are deleted.
    repo.listRawDaysForDeveloper.mockResolvedValue(['2026-10-20', '2026-10-29', '2026-10-31', '2026-11-01']);

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    const days = repo.rollupDay.mock.calls.map((c) => c[1]);
    // Today (2026-11-02) is rolled up the next morning, so it is skipped here.
    expect(days).toEqual(['2026-10-20', '2026-10-29', '2026-10-31', '2026-11-01']);
    expect(repo.listRawDaysForDeveloper).toHaveBeenCalledWith('dev-1');
    expect(repo.deleteRawForDay.mock.calls).toEqual([
      ['dev-1', '2026-10-20'],
      ['dev-1', '2026-10-29'],
    ]);
    expect(repo.deleteUnassignedRawBefore).toHaveBeenCalledWith('2026-10-31');
  });

  it('a longer retention only widens the keep window, not which days get rolled up', async () => {
    retention.set('dev-1', 7);
    repo.listDaysWithRawLogs.mockResolvedValue(['2026-10-20', '2026-10-26', '2026-10-27', '2026-10-31']);
    repo.listRawDaysForDeveloper.mockResolvedValue(['2026-10-20', '2026-10-26', '2026-10-27', '2026-10-31']);

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    // Every raw day is still rolled up.
    expect(repo.rollupDay.mock.calls.map((c) => c[1])).toEqual([
      '2026-10-20', '2026-10-26', '2026-10-27', '2026-10-31',
    ]);
    // Retention 7 → cutoff 2026-10-27. Days strictly before it are deleted:
    // 10-20 and 10-26. 10-27 and 10-31 stay.
    expect(repo.deleteRawForDay.mock.calls).toEqual([
      ['dev-1', '2026-10-20'],
      ['dev-1', '2026-10-26'],
    ]);
    // Rows inside the unassigned slice are untouched by the developer delete.
    expect(repo.deleteUnassignedRawBefore).toHaveBeenCalledWith('2026-10-31');
  });

  it('skips deleting a day whose snapshot is missing, and still deletes the days that have one', async () => {
    repo.listRawDaysForDeveloper.mockResolvedValue(['2026-10-20', '2026-10-21', '2026-10-22']);
    repo.hasDailySnapshot.mockImplementation(async (_dev: string, day: string) => day !== '2026-10-21');

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    // 10-21 has no snapshot → its raw rows must survive; the other two go.
    expect(repo.deleteRawForDay.mock.calls).toEqual([
      ['dev-1', '2026-10-20'],
      ['dev-1', '2026-10-22'],
    ]);
    expect(repo.deleteUnassignedRawBefore).toHaveBeenCalled();
  });

  it('deletes a day that holds only callback pushes, which never get a snapshot', async () => {
    repo.listRawDaysForDeveloper.mockResolvedValue(['2026-10-20']);
    // Most recent rollup: the day has raw rows but rollupDay wrote no snapshot
    // because every row is a callback push.
    repo.hasDailySnapshot.mockResolvedValue(false);
    repo.countApiCallRawForDeveloper.mockResolvedValue(0);

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    expect(repo.deleteRawForDay.mock.calls).toEqual([['dev-1', '2026-10-20']]);
  });

  it('never deletes a day whose snapshot check throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.listRawDaysForDeveloper.mockResolvedValue(['2026-10-20', '2026-10-21']);
    repo.hasDailySnapshot.mockImplementation(async (_dev: string, day: string) => {
      if (day === '2026-10-20') throw new Error('db blip');
      return true;
    });

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    // Only the day whose check succeeded is deleted.
    expect(repo.deleteRawForDay.mock.calls).toEqual([['dev-1', '2026-10-21']]);
    expect(errorSpy.mock.calls.some((c) => String(c[0]).includes('Raw deletion failed for dev-1/2026-10-20'))).toBe(true);
    errorSpy.mockRestore();
  });

  it('skips raw deletion when a day rollup throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.rollupDay.mockRejectedValueOnce(new Error('boom'));
    repo.listRawDaysForDeveloper.mockResolvedValue(['2026-10-20']);

    const svc = createApiLogRollupService({ now: () => NOW });
    await svc.runOnce();

    expect(repo.deleteRawForDay).not.toHaveBeenCalled();
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
