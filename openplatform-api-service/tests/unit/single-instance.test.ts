import { describe, it, expect, vi } from 'vitest';
import { isRollupInstance, withAdvisoryLock } from '../../src/utils/single-instance';

describe('single-instance', () => {
  it('runs only on instance 0 or when unset', () => {
    expect(isRollupInstance({})).toBe(true);
    expect(isRollupInstance({ NODE_APP_INSTANCE: '0' })).toBe(true);
    expect(isRollupInstance({ NODE_APP_INSTANCE: '1' })).toBe(false);
    expect(isRollupInstance({ NODE_APP_INSTANCE: '7' })).toBe(false);
  });

  it('skips work when the advisory lock is held', async () => {
    const client = { $queryRaw: async () => [{ got: 0 }], $executeRaw: async () => 1 };
    const fn = vi.fn();
    const ran = await withAdvisoryLock(client as any, 'api_log_rollup', fn);
    expect(ran).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('runs work and releases the lock when acquired', async () => {
    const client = { $queryRaw: async () => [{ got: 1 }], $executeRaw: async () => 1 };
    const fn = vi.fn().mockResolvedValue(undefined);
    const ran = await withAdvisoryLock(client as any, 'api_log_rollup', fn);
    expect(ran).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('still releases the lock when the work throws', async () => {
    const execute = vi.fn().mockResolvedValue(1);
    const client = { $queryRaw: async () => [{ got: 1 }], $executeRaw: execute };
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withAdvisoryLock(client as any, 'x', fn)).rejects.toThrow('boom');
    expect(execute).toHaveBeenCalled(); // RELEASE_LOCK
  });
});
