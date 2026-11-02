/**
 * Guards for background jobs that must run once per cluster, not once per worker.
 *
 * pm2 cluster mode sets NODE_APP_INSTANCE on every worker so cheap
 * worker-side checks can skip the job. A MySQL advisory lock complements that
 * check so two processes racing (e.g. during a restart) cannot run the same
 * job twice.
 */

import { PrismaClient } from '@prisma/client';

export function isRollupInstance(env: NodeJS.ProcessEnv = process.env): boolean {
  const idx = env.NODE_APP_INSTANCE;
  return idx === undefined || idx === '0';
}

/**
 * Run `fn` while holding a MySQL advisory lock. Returns false when another
 * instance already holds it. The lock is always released, even on error —
 * a release failure is logged but never masks the work's own result.
 *
 * `GET_LOCK`/`RELEASE_LOCK` are session-scoped, so `client` must be a single
 * connection (Prisma's non-transaction client, e.g. from `getClient()`), not
 * a transaction or a connection pool that may switch sessions.
 */
export async function withAdvisoryLock(
  client: Pick<PrismaClient, '$queryRaw' | '$executeRaw'>,
  lockName: string,
  fn: () => Promise<void>,
): Promise<boolean> {
  const rows = await client.$queryRaw<Array<{ got: number | bigint }>>`
    SELECT GET_LOCK(${lockName}, 0) AS got
  `;
  const got = Number(rows?.[0]?.got ?? 0);
  if (got !== 1) return false;
  try {
    await fn();
  } finally {
    try {
      await client.$executeRaw`SELECT RELEASE_LOCK(${lockName})`;
    } catch (releaseError) {
      console.warn('[ApiLog] Failed to release advisory lock:', releaseError);
    }
  }
  return true;
}
