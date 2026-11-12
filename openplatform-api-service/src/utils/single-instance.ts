/**
 * Guards for background jobs that must run once per cluster, not once per worker.
 *
 * pm2 cluster mode sets NODE_APP_INSTANCE on every worker so cheap
 * worker-side checks can skip the job. A MySQL advisory lock complements that
 * check so two processes racing (e.g. during a restart) cannot run the same
 * job twice.
 */

import { openDedicatedConnection } from '../database/prisma-client';

export function isRollupInstance(env: NodeJS.ProcessEnv = process.env): boolean {
  const idx = env.NODE_APP_INSTANCE;
  return idx === undefined || idx === '0';
}

type GuardedClient = Pick<any, '$queryRaw' | '$executeRaw'>;

/**
 * Run `fn` while holding a MySQL advisory lock. Returns false when another
 * instance already holds it. The lock is always released, even on error —
 * a release failure is logged but never masks the work's own result.
 *
 * `GET_LOCK`/`RELEASE_LOCK` are session-scoped: both statements must run on
 * the same connection, and the job must NOT be wrapped in a transaction —
 * a long rollup would exceed the interactive-transaction timeout (5s by
 * default) and abort mid-way.
 *
 * Without a client argument a dedicated connection is opened for the duration
 * of the call and closed afterwards. A `client` may be injected for tests or
 * callers that already own a single session; those callers manage its
 * lifetime themselves.
 */
export async function withAdvisoryLock(
  clientOrLock: GuardedClient | string | null | undefined,
  lockNameOrFn: string | (() => Promise<void>),
  maybeFn?: () => Promise<void>,
): Promise<boolean> {
  const ownsConnection = typeof clientOrLock !== 'object' || clientOrLock === null;
  const lockName = (ownsConnection ? clientOrLock : lockNameOrFn) as string;
  const fn = (ownsConnection ? lockNameOrFn : maybeFn) as () => Promise<void>;
  const connection: any = ownsConnection ? await openDedicatedConnection() : null;
  const client: GuardedClient = connection
    ? {
        $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) =>
          connection.query(strings.join('?'), values),
        $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) =>
          connection.query(strings.join('?'), values),
      }
    : (clientOrLock as GuardedClient);

  try {
    const rows = await client.$queryRaw`
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
  } finally {
    if (connection) {
      // Closing the session also drops any lock that failed to release.
      await connection.end().catch(() => {});
    }
  }
}
