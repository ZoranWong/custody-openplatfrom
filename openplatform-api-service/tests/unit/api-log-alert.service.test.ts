import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const repo = {
    listAlertSettings: vi.fn(async (_enabledOnly?: boolean) => [
      {
        developerId: 'dev-1',
        alertEmail: 'dev@example.com',
        enabled: true,
        windowSeconds: 300,
        errorThreshold: 10,
        cooldownSeconds: 3600,
      },
    ]),
    getAlertCooldownEnd: vi.fn(async (_dev: string) => new Date('2026-11-01T00:00:00Z')),
    countErrorsInWindow: vi.fn(async (_dev: string, _start: Date, _end: Date) => [
      { errorCount: 15, totalCount: 100 },
    ]),
    findRecentErrorsInWindow: vi.fn(async () => [
      { endpoint: '/x', method: 'POST', traceId: 'trace-1', responseStatus: 500, createdAt: new Date('2026-11-01T01:00:00Z') },
    ]),
    createAlertEvent: vi.fn(async () => {}),
    markAlertSent: vi.fn(async () => {}),
  };
  const sendAlertEmail = vi.fn(async () => true);
  return { repo, sendAlertEmail };
});

vi.mock('../../src/repositories/repository.factory', () => ({
  getApiLogRepository: () => mocks.repo,
}));

vi.mock('../../src/repositories/db-client', () => ({
  getClient: () => ({}),
}));

vi.mock('../../src/utils/single-instance', () => ({
  isRollupInstance: () => true,
  withAdvisoryLock: async (_c: any, _n: string, fn: any) => fn(),
}));

vi.mock('../../src/services/email.service', () => ({
  sendAlertEmail: mocks.sendAlertEmail,
}));

const { createApiLogAlertService } = await import('../../src/services/api-log-alert.service');

const { repo, sendAlertEmail } = mocks;
const NOW = new Date('2026-11-02T00:00:00Z');

function resetRepo() {
  repo.listAlertSettings.mockReset().mockResolvedValue([
    { developerId: 'dev-1', alertEmail: 'dev@example.com', enabled: true, windowSeconds: 300, errorThreshold: 10, cooldownSeconds: 3600 },
  ]);
  repo.getAlertCooldownEnd.mockReset().mockResolvedValue(new Date('2026-11-01T00:00:00Z'));
  repo.countErrorsInWindow.mockReset().mockResolvedValue([{ errorCount: 15, totalCount: 100 }]);
  repo.findRecentErrorsInWindow.mockReset().mockResolvedValue([
    { endpoint: '/x', method: 'POST', traceId: 'trace-1', responseStatus: 500, createdAt: new Date('2026-11-01T01:00:00Z') },
  ]);
  repo.createAlertEvent.mockReset().mockResolvedValue(undefined);
  repo.markAlertSent.mockReset().mockResolvedValue(undefined);
  sendAlertEmail.mockReset().mockResolvedValue(true);
}

describe('ApiLogAlertService', () => {
  beforeEach(resetRepo);

  it('fires an alert and records the event when errors exceed the threshold', async () => {
    const svc = createApiLogAlertService({ now: () => NOW });
    await svc.runCheck();

    expect(repo.createAlertEvent).toHaveBeenCalledOnce();
    expect(repo.createAlertEvent.mock.calls[0][0]).toMatchObject({
      developerId: 'dev-1',
      errorCount: 15,
      totalCount: 100,
      sent: false,
    });
    expect(sendAlertEmail).toHaveBeenCalledOnce();
    expect(sendAlertEmail.mock.calls[0][0]).toBe('dev@example.com');
    expect(sendAlertEmail.mock.calls[0][2]).toBe(15);
    expect(repo.markAlertSent).toHaveBeenCalledOnce();
  });

  it('does not alert when errors are below the threshold', async () => {
    repo.countErrorsInWindow.mockResolvedValue([{ errorCount: 3, totalCount: 100 }]);
    const svc = createApiLogAlertService({ now: () => NOW });
    await svc.runCheck();

    expect(repo.createAlertEvent).not.toHaveBeenCalled();
    expect(sendAlertEmail).not.toHaveBeenCalled();
  });

  it('skips a developer with no alert email', async () => {
    repo.listAlertSettings.mockResolvedValue([
      { developerId: 'dev-1', alertEmail: null, enabled: true, windowSeconds: 300, errorThreshold: 10, cooldownSeconds: 3600 },
    ]);
    const svc = createApiLogAlertService({ now: () => NOW });
    await svc.runCheck();

    expect(repo.countErrorsInWindow).not.toHaveBeenCalled();
    expect(sendAlertEmail).not.toHaveBeenCalled();
  });

  it('records the event but does not mark sent when email throws', async () => {
    sendAlertEmail.mockRejectedValue(new Error('smtp down'));
    const svc = createApiLogAlertService({ now: () => NOW });
    await svc.runCheck();

    expect(repo.createAlertEvent).toHaveBeenCalledOnce();
    expect(repo.markAlertSent).not.toHaveBeenCalled();
  });

  it('does not mark sent when SMTP is unconfigured (email returns false)', async () => {
    sendAlertEmail.mockResolvedValue(false);
    const svc = createApiLogAlertService({ now: () => NOW });
    await svc.runCheck();

    expect(repo.createAlertEvent).toHaveBeenCalledOnce();
    expect(repo.markAlertSent).not.toHaveBeenCalled();
  });

  it('bounds the first scan to the configured window instead of all history', async () => {
    // No prior alert → cooldown end is the epoch.
    repo.getAlertCooldownEnd.mockResolvedValue(new Date(0));
    const svc = createApiLogAlertService({ now: () => NOW });
    await svc.runCheck();

    const [, start, end] = repo.countErrorsInWindow.mock.calls[0];
    // windowSeconds defaults to 300 in the settings fixture.
    expect((end as Date).getTime() - (start as Date).getTime()).toBe(300 * 1000);
    expect((end as Date).getTime()).toBe(NOW.getTime());
  });
});
