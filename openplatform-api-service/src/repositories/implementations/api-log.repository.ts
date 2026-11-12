import { Prisma, ApiLog } from '@prisma/client';
import { BaseRepository } from './base.repository';
import {
  ApiLogRepository,
  ApiLogStats,
  ApiLogDailyBreakdown,
  ApiLogDailySnapshot,
  ApiLogEndpointBreakdown,
  ApiLogEndpointDailyRow,
  ApiLogMonthlySnapshot,
  ApiLogRawDayAggregate,
} from '../repository.interfaces';
import { addDays, startOfDay } from '../../utils/api-log-dates';
import { calculatePercentiles } from '../../utils/percentile-calculator';
import { CALLBACK_API_NAME_PREFIX } from '../../utils/api-log-category';
import { RAW_RETENTION_DAYS } from '../../config/api-log-retention';

/** SQL LIKE pattern matching every callback-push row (apiName `callback.push*`). */
const CALLBACK_LIKE = `${CALLBACK_API_NAME_PREFIX}%`;

export class ApiLogRepositoryImpl
  extends BaseRepository<Prisma.ApiLogDelegate>
  implements ApiLogRepository
{
  protected get modelName(): string {
    return 'apiLog';
  }

  async findRecentErrors(developerId: string, limit: number = 5) {
    const logs = await this.model.findMany({
      // Callback delivery failures are logged in the same table but are not API
      // errors; keep the dashboard list focused on inbound calls.
      where: {
        developerId,
        isError: true,
        NOT: { apiName: { startsWith: CALLBACK_API_NAME_PREFIX } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        apiName: true,
        endpoint: true,
        responseStatus: true,
        createdAt: true,
      },
    });
    return logs.map((l: any) => ({
      apiName: l.apiName || l.endpoint,
      endpoint: l.endpoint,
      responseStatus: l.responseStatus ?? 0,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async countByDeveloper(
    developerId: string,
    startDate?: Date,
    isError?: boolean,
  ) {
    return this.model.count({
      where: {
        developerId,
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
        ...(isError !== undefined ? { isError } : {}),
      },
    });
  }

  async countTodaySuccess(developerId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.model.count({
      where: { developerId, isError: false, createdAt: { gte: today } },
    });
  }

  async getStats(developerId: string, startDate: Date): Promise<ApiLogStats> {
    const [totalResult, errorResult, avgResult] = await Promise.all([
      this.model.aggregate({
        where: { developerId, createdAt: { gte: startDate } },
        _count: { id: true },
      }),
      this.model.count({
        where: { developerId, createdAt: { gte: startDate }, isError: true },
      }),
      this.model.aggregate({
        where: { developerId, createdAt: { gte: startDate } },
        _avg: { responseTime: true },
      }),
    ]);
    return {
      totalCalls: totalResult._count?.id ?? 0,
      errorCalls: errorResult,
      avgResponseTime: Math.round(avgResult._avg?.responseTime ?? 0),
    };
  }

  async getDailyBreakdown(
    developerId: string,
    startDate: Date,
  ): Promise<ApiLogDailyBreakdown[]> {
    const results: any[] = await this.queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as calls,
             SUM(CASE WHEN is_error = 0 THEN 1 ELSE 0 END) as success_count,
             ROUND(AVG(response_time), 0) as avg_response_time
      FROM api_logs
      WHERE developer_id = ${developerId} AND created_at >= ${startDate}
      GROUP BY DATE(created_at) ORDER BY date ASC
    `;
    return results.map((r: any) => ({
      date:
        typeof r.date === 'string'
          ? r.date
          : new Date(r.date).toISOString().split('T')[0],
      calls: Number(r.calls),
      successCount: Number(r.success_count),
      avgResponseTime: Number(r.avg_response_time) || 0,
    }));
  }

  async getEndpointBreakdown(
    developerId: string,
    startDate: Date,
    totalCalls: number,
  ): Promise<ApiLogEndpointBreakdown[]> {
    const results: any[] = await this.queryRaw`
      SELECT COALESCE(api_name, CONCAT(endpoint, ' ', method)) as api_name,
             COUNT(*) as calls,
             SUM(CASE WHEN is_error = 0 THEN 1 ELSE 0 END) as success_count,
             ROUND(SUM(CASE WHEN is_error = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as success_rate,
             ROUND(COUNT(*) * 100.0 / ${totalCalls || 1}, 1) as percentage,
             ROUND(AVG(response_time), 0) as avg_response_time,
             MAX(response_time) as max_response_time
      FROM api_logs
      WHERE developer_id = ${developerId} AND created_at >= ${startDate}
      GROUP BY COALESCE(api_name, CONCAT(endpoint, ' ', method))
      ORDER BY calls DESC LIMIT 10
    `;
    return results.map((e: any) => ({
      endpoint: e.api_name,
      method: '',
      calls: Number(e.calls),
      successCount: Number(e.success_count || 0),
      successRate: Number(e.success_rate || 0),
      percentage: Number(e.percentage),
      avgResponseTime: Number(e.avg_response_time || 0),
      maxResponseTime: Number(e.max_response_time || 0),
    }));
  }

  // -----------------------------------------------------------------------
  // Rollup writes / segmented reads
  //
  // Raw logs are the source of truth for the newest days; older days live in
  // api_log_snapshots + api_log_endpoint_daily, and months aged out of the
  // daily window live in api_log_monthly_snapshots. Every write below is an
  // idempotent upsert, so a missed or repeated run converges to the same
  // state. Snapshot labels are UTC midnight because `@db.Date` stores the UTC
  // calendar day of `created_at`.
  // -----------------------------------------------------------------------

  /** Read a precomputed snapshot's `top_endpoints` column. */
  private static normalizeTopEndpoints(value: unknown): ApiLogDailySnapshot['topEndpoints'] {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // A corrupted JSON column must not break a rollup run.
      return [];
    }
  }

  /**
   * Aggregate one day of raw logs into api_log_snapshots and api_log_endpoint_daily.
   * Byte sums use request_bytes + response_bytes; legacy NULLs count as 0.
   *
   * Idempotency / safety:
   * - A day with no raw rows is left untouched (returns early, writes nothing).
   *   The pipeline only deletes raw rows after a snapshot exists, so this is
   *   exactly the case of "already rolled up": the existing snapshot survives.
   * - We deliberately do NOT take `SELECT ... FOR UPDATE` here. The invariant
   *   above makes a concurrent re-run harmless: both writers compute the same
   *   aggregate from the same rows and upsert the same values, and the delete
   *   of stale endpoint rows only removes keys absent from the recomputation.
   * - The snapshot and endpoint writes share one interactive transaction so a
   *   crash never leaves the two tables out of sync.
   */
  async rollupDay(developerId: string, date: string): Promise<{ calls: number; errors: number }> {
    const start = startOfDay(date);
    const end = startOfDay(addDays(date, 1));
    const dayLabel = start;

    const [summary]: any[] = await this.queryRaw`
      SELECT COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${start} AND created_at < ${end}
        AND (api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE})
    `;

    const calls = Number(summary?.calls || 0);
    const errors = Number(summary?.errors || 0);
    if (calls === 0) {
      // Nothing to aggregate; leave any existing snapshot untouched.
      return { calls: 0, errors: 0 };
    }

    const endpointRows: any[] = await this.queryRaw`
      SELECT endpoint, method,
             COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt,
             MAX(response_time) AS max_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${start} AND created_at < ${end}
        AND (api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE})
      GROUP BY endpoint, method
      ORDER BY calls DESC
    `;

    const samples: any[] = await this.queryRaw`
      SELECT response_time AS rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${start} AND created_at < ${end}
        AND (api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE})
        AND response_time IS NOT NULL
    `;
    const p95 = calculatePercentiles(samples.map((s) => Number(s.rt))).p95;

    const topEndpoints = endpointRows.slice(0, 5).map((r) => ({
      endpoint: r.endpoint,
      calls: Number(r.calls),
      errorRate: Number(r.calls) ? Math.round((Number(r.errors) / Number(r.calls)) * 1000) / 10 : 0,
    }));

    const totalBytes = BigInt(Number(summary?.total_bytes || 0));
    const avgResponseTime = Number(summary?.avg_rt || 0);

    await this.client.$transaction(async (tx) => {
      await tx.apiLogSnapshot.upsert({
        where: { uq_dev_date: { developerId, date: dayLabel } },
        create: {
          developerId,
          date: dayLabel,
          totalCalls: calls,
          errorCalls: errors,
          avgResponseTime,
          p95ResponseTime: p95,
          totalBytes,
          topEndpoints: topEndpoints as any,
        },
        update: {
          totalCalls: calls,
          errorCalls: errors,
          avgResponseTime,
          p95ResponseTime: p95,
          totalBytes,
          topEndpoints: topEndpoints as any,
        },
      });

      for (const r of endpointRows) {
        await tx.apiLogEndpointDaily.upsert({
          where: {
            uq_dev_date_endpoint: {
              developerId,
              date: dayLabel,
              endpoint: r.endpoint,
              method: r.method,
            },
          },
          create: {
            developerId,
            date: dayLabel,
            endpoint: r.endpoint,
            method: r.method,
            calls: Number(r.calls),
            errorCalls: Number(r.errors),
            totalBytes: BigInt(Number(r.total_bytes || 0)),
            avgResponseTime: Number(r.avg_rt || 0),
            maxResponseTime: Number(r.max_rt || 0),
          },
          update: {
            calls: Number(r.calls),
            errorCalls: Number(r.errors),
            totalBytes: BigInt(Number(r.total_bytes || 0)),
            avgResponseTime: Number(r.avg_rt || 0),
            maxResponseTime: Number(r.max_rt || 0),
          },
        });
      }

      // Drop endpoint rows that no longer appear in the recomputation (for
      // example after a partial raw delete) so daily totals cannot drift.
      // The unique key is (developerId, date, endpoint, method), so the keep
      // set is the endpoint+method pair — matching on endpoint alone would
      // leave e.g. a stale `/x GET` row behind while `/x POST` still exists.
      if (endpointRows.length > 0) {
        const keep = endpointRows.map((r) => ({
          endpoint: r.endpoint,
          method: r.method,
        }));
        await tx.apiLogEndpointDaily.deleteMany({
          where: {
            developerId,
            date: dayLabel,
            NOT: { OR: keep },
          },
        });
      }
    });

    return { calls, errors };
  }

  /** Insert-or-update a precomputed daily snapshot (used by tests and backfills). */
  async upsertDailySnapshot(snapshot: ApiLogDailySnapshot): Promise<void> {
    const dayLabel = startOfDay(snapshot.date);
    const created = new Date(snapshot.createdAt);
    const data = {
      totalCalls: snapshot.totalCalls,
      errorCalls: snapshot.errorCalls,
      avgResponseTime: snapshot.avgResponseTime,
      p95ResponseTime: snapshot.p95ResponseTime,
      totalBytes: BigInt(snapshot.totalBytes || 0),
      topEndpoints: snapshot.topEndpoints as any,
    };

    await this.client.apiLogSnapshot.upsert({
      where: { uq_dev_date: { developerId: snapshot.developerId, date: dayLabel } },
      create: {
        developerId: snapshot.developerId,
        date: dayLabel,
        ...data,
        ...(Number.isNaN(created.getTime()) ? {} : { createdAt: created }),
      },
      update: data,
    });
  }

  /** Read daily snapshots in [startDay, endDay] inclusive. */
  async getDailySnapshotsBetween(
    developerId: string,
    startDay: string,
    endDay: string,
  ): Promise<ApiLogDailySnapshot[]> {
    const rows: any[] = await this.client.apiLogSnapshot.findMany({
      where: {
        developerId,
        date: { gte: startOfDay(startDay), lte: startOfDay(endDay) },
      },
      orderBy: { date: 'asc' },
    });
    return rows.map((r: any) => ({
      date: this.dayLabelOf(r.date),
      developerId: r.developerId,
      totalCalls: Number(r.totalCalls || 0),
      errorCalls: Number(r.errorCalls || 0),
      avgResponseTime: Number(r.avgResponseTime || 0),
      p95ResponseTime: Number(r.p95ResponseTime || 0),
      totalBytes: Number(r.totalBytes || 0),
      topEndpoints: ApiLogRepositoryImpl.normalizeTopEndpoints(r.topEndpoints),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }

  /** Read endpoint-daily rows in [startDay, endDay] inclusive. */
  async getEndpointDailyBetween(
    developerId: string,
    startDay: string,
    endDay: string,
  ): Promise<ApiLogEndpointDailyRow[]> {
    const rows: any[] = await this.client.apiLogEndpointDaily.findMany({
      where: {
        developerId,
        date: { gte: startOfDay(startDay), lte: startOfDay(endDay) },
      },
      orderBy: { date: 'asc' },
    });
    return rows.map((r: any) => ({
      date: this.dayLabelOf(r.date),
      endpoint: r.endpoint,
      method: r.method,
      calls: Number(r.calls || 0),
      errorCalls: Number(r.errorCalls || 0),
      totalBytes: Number(r.totalBytes || 0),
      avgResponseTime: Number(r.avgResponseTime || 0),
      maxResponseTime: Number(r.maxResponseTime || 0),
    }));
  }

  /**
   * Count outbound callback-push rows for a developer in a date range.
   * Callback pushes are split out of the API-call totals, so the usage window
   * reports them from here instead of folding them into the raw aggregate.
   */
  async countCallbackLogsBetween(developerId: string, startIso: Date, endIso: Date): Promise<number> {
    const [row]: any[] = await this.queryRaw`
      SELECT COUNT(*) AS callbacks
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${startIso} AND created_at < ${endIso}
        AND api_name LIKE ${CALLBACK_LIKE}
    `;
    return Number(row?.callbacks || 0);
  }

  /** Format a `@db.Date` value (Date or driver string) as YYYY-MM-DD in UTC. */
  private dayLabelOf(value: unknown): string {
    return value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);
  }

  /**
   * Aggregate raw logs for one developer over a day range (today's slice).
   *
   * `calls` counts inbound API calls only; outbound callback pushes are counted
   * separately in `callbackCalls`. Both are derived in a single pass with
   * conditional aggregation, so `calls + callbackCalls` is the raw row total.
   * Byte/latency metrics follow `calls` (API only) to stay comparable with
   * snapshots written by `rollupDay`.
   */
  async aggregateRawRange(
    developerId: string,
    startIso: Date,
    endIso: Date,
  ): Promise<{
    calls: number; errorCalls: number; totalBytes: number; avgResponseTime: number;
    callbackCalls: number; byEndpoint: ApiLogEndpointDailyRow[]; byDay: ApiLogRawDayAggregate[];
  }> {
    const [summary]: any[] = await this.queryRaw`
      SELECT
        SUM(CASE WHEN api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE} THEN 1 ELSE 0 END) AS calls,
        SUM(CASE WHEN api_name LIKE ${CALLBACK_LIKE} THEN 1 ELSE 0 END) AS callback_calls,
        SUM(CASE WHEN (api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE}) AND is_error = 1 THEN 1 ELSE 0 END) AS errors,
        SUM(CASE WHEN api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE}
                 THEN COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0) ELSE 0 END) AS total_bytes,
        ROUND(AVG(CASE WHEN api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE}
                       THEN response_time END), 0) AS avg_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${startIso} AND created_at < ${endIso}
    `;
    const byEndpointRows: any[] = await this.queryRaw`
      SELECT endpoint, method,
             COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt,
             MAX(response_time) AS max_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${startIso} AND created_at < ${endIso}
        AND (api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE})
      GROUP BY endpoint, method
      ORDER BY calls DESC
    `;
    const byDayRows: any[] = await this.queryRaw`
      SELECT DATE(created_at) AS d,
             COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${startIso} AND created_at < ${endIso}
        AND (api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE})
      GROUP BY DATE(created_at)
      ORDER BY d ASC
    `;
    return {
      calls: Number(summary?.calls || 0),
      errorCalls: Number(summary?.errors || 0),
      totalBytes: Number(summary?.total_bytes || 0),
      avgResponseTime: Number(summary?.avg_rt || 0),
      callbackCalls: Number(summary?.callback_calls || 0),
      byEndpoint: byEndpointRows.map((r) => ({
        // Caller fills the date; the range may span several days.
        date: '',
        endpoint: r.endpoint,
        method: r.method,
        calls: Number(r.calls || 0),
        errorCalls: Number(r.errors || 0),
        totalBytes: Number(r.total_bytes || 0),
        avgResponseTime: Number(r.avg_rt || 0),
        maxResponseTime: Number(r.max_rt || 0),
      })),
      byDay: byDayRows.map((r) => ({
        date: this.dayLabelOf(r.d),
        calls: Number(r.calls || 0),
        errorCalls: Number(r.errors || 0),
        totalBytes: Number(r.total_bytes || 0),
        avgResponseTime: Number(r.avg_rt || 0),
      })),
    };
  }

  /**
   * Roll daily snapshots of a month into api_log_monthly_snapshots, then
   * delete the covered daily snapshot / endpoint rows in the same transaction.
   *
   * A month with no daily rows is a no-op: this is what makes a re-run after
   * the daily rows were already deleted safe — the existing monthly row is
   * never zeroed.
   */
  async rollupMonth(developerId: string, month: string): Promise<number> {
    const start = startOfDay(`${month}-01`);
    const rows: any[] = await this.queryRaw`
      SELECT date, total_calls, error_calls, total_bytes, avg_response_time
      FROM api_log_snapshots
      WHERE developer_id = ${developerId}
        AND date >= ${start}
        AND date < DATE_ADD(${start}, INTERVAL 1 MONTH)
    `;
    if (rows.length === 0) return 0;

    const totalCalls = rows.reduce((s, r) => s + Number(r.total_calls || 0), 0);
    const errorCalls = rows.reduce((s, r) => s + Number(r.error_calls || 0), 0);
    const totalBytes = rows.reduce((s, r) => s + Number(r.total_bytes || 0), 0);
    const weighted = rows.reduce(
      (s, r) => s + Number(r.avg_response_time || 0) * Number(r.total_calls || 0),
      0,
    );
    const avg = totalCalls ? Math.round(weighted / totalCalls) : 0;

    await this.client.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO api_log_monthly_snapshots
          (developer_id, month, total_calls, error_calls, total_bytes, avg_response_time, created_at)
        VALUES (${developerId}, ${start}, ${totalCalls}, ${errorCalls}, ${totalBytes}, ${avg}, NOW())
        ON DUPLICATE KEY UPDATE
          total_calls = VALUES(total_calls),
          error_calls = VALUES(error_calls),
          total_bytes = VALUES(total_bytes),
          avg_response_time = VALUES(avg_response_time)
      `;
      await tx.$executeRaw`
        DELETE FROM api_log_snapshots
        WHERE developer_id = ${developerId}
          AND date >= ${start} AND date < DATE_ADD(${start}, INTERVAL 1 MONTH)
      `;
      await tx.$executeRaw`
        DELETE FROM api_log_endpoint_daily
        WHERE developer_id = ${developerId}
          AND date >= ${start} AND date < DATE_ADD(${start}, INTERVAL 1 MONTH)
      `;
    });
    return 1;
  }

  /** Read monthly snapshots in [startMonth, endMonth] inclusive. */
  async getMonthlySnapshotsBetween(
    developerId: string,
    startMonth: string,
    endMonth: string,
  ): Promise<ApiLogMonthlySnapshot[]> {
    const rows: any[] = await this.queryRaw`
      SELECT month, total_calls, error_calls, total_bytes, avg_response_time
      FROM api_log_monthly_snapshots
      WHERE developer_id = ${developerId}
        AND month >= ${startOfDay(`${startMonth}-01`)}
        AND month <= ${startOfDay(`${endMonth}-01`)}
      ORDER BY month ASC
    `;
    return rows.map((r) => ({
      month:
        r.month instanceof Date
          ? r.month.toISOString().slice(0, 7)
          : String(r.month).slice(0, 7),
      totalCalls: Number(r.total_calls || 0),
      errorCalls: Number(r.error_calls || 0),
      totalBytes: Number(r.total_bytes || 0),
      avgResponseTime: Number(r.avg_response_time || 0),
    }));
  }

  /** Delete raw rows with no developer id older than `day` (YYYY-MM-DD, exclusive). */
  async deleteUnassignedRawBefore(day: string): Promise<{ count: number }> {
    const cutoff = startOfDay(day);
    const result = await this.model.deleteMany({
      where: { createdAt: { lt: cutoff }, developerId: null },
    });
    return { count: result.count };
  }

  /** Delete one developer's raw rows older than `day` (YYYY-MM-DD, exclusive). */
  async deleteRawBeforeForDeveloper(developerId: string, day: string): Promise<{ count: number }> {
    const cutoff = startOfDay(day);
    const result = await this.model.deleteMany({
      where: { developerId, createdAt: { lt: cutoff } },
    });
    return { count: result.count };
  }

  /** Whether any daily snapshot exists for the developer+day. */
  async hasDailySnapshot(developerId: string, date: string): Promise<boolean> {
    const row = await this.client.apiLogSnapshot.findUnique({
      where: { uq_dev_date: { developerId, date: startOfDay(date) } },
      select: { id: true },
    });
    return !!row;
  }

  /** List developer ids that have raw rows in the given day. */
  async listDevelopersWithRawLogs(date: string): Promise<string[]> {
    const start = startOfDay(date);
    const end = startOfDay(addDays(date, 1));
    const rows: any[] = await this.queryRaw`
      SELECT DISTINCT developer_id
      FROM api_logs
      WHERE created_at >= ${start} AND created_at < ${end}
        AND developer_id IS NOT NULL
    `;
    return rows.map((r) => r.developer_id);
  }

  /** Number of raw rows one developer holds on the given day. */
  async countRawForDeveloper(developerId: string, date: string): Promise<number> {
    const start = startOfDay(date);
    const end = startOfDay(addDays(date, 1));
    const rows: any[] = await this.queryRaw`
      SELECT COUNT(*) AS cnt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${start} AND created_at < ${end}
    `;
    return Number(rows[0]?.cnt || 0);
  }

  /** List developer ids that still have daily snapshots in the given month (YYYY-MM). */
  async listDevelopersWithDailySnapshots(month: string): Promise<string[]> {
    const start = startOfDay(`${month}-01`);
    const rows: any[] = await this.queryRaw`
      SELECT DISTINCT developer_id FROM api_log_snapshots
      WHERE date >= ${start} AND date < DATE_ADD(${start}, INTERVAL 1 MONTH)
    `;
    return rows.map((r) => r.developer_id);
  }

  /** Delete daily snapshots / endpoint rows older than `day` atomically; returns deleted counts. */
  async pruneDailyOlderThan(day: string): Promise<{ snapshots: number; endpoints: number }> {
    const cutoff = startOfDay(day);
    const result = await this.client.$transaction(async (tx) => {
      const snaps = await tx.apiLogSnapshot.deleteMany({ where: { date: { lt: cutoff } } });
      const eps = await tx.apiLogEndpointDaily.deleteMany({ where: { date: { lt: cutoff } } });
      return { snapshots: snaps.count, endpoints: eps.count };
    });
    return result;
  }

  /** Delete monthly snapshots older than the given month. */
  async pruneMonthlyOlderThan(month: string): Promise<number> {
    const cutoff = startOfDay(`${month}-01`);
    const res = await this.client.apiLogMonthlySnapshot.deleteMany({ where: { month: { lt: cutoff } } });
    return res.count;
  }

  /**
   * Physically delete rows older than N days.
   */
  async cleanup(retentionDays: number = 180) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    return this.model.deleteMany({ where: { createdAt: { lt: cutoff } } });
  }

  async findByDeveloper(
    developerId: string,
    page: number,
    pageSize: number,
    filters?: { isError?: boolean; apiName?: string; startDate?: Date; endDate?: Date; traceId?: string; developerId?: string; category?: 'api' | 'callback' },
  ) {
    const where: any = {};
    if (developerId && developerId !== '__admin__') where.developerId = developerId;
    // Allow admin to filter by a specific developerId even when developerId param is '__admin__'.
    if (filters?.developerId) where.developerId = filters.developerId;
    if (filters?.isError !== undefined) where.isError = filters.isError;
    // Callback pushes are logged as apiName=callback.push[.summary]; splitting on
    // the apiName prefix lets the portal show outbound callbacks in the same
    // trace list without mixing them into API-call views.
    const callbackFilter = { apiName: { startsWith: CALLBACK_API_NAME_PREFIX } };
    if (filters?.category === 'callback') {
      where.apiName = callbackFilter.apiName;
    } else if (filters?.category === 'api') {
      // api_name is nullable; a plain NOT would drop NULL rows in Prisma, which
      // are API calls, so keep them explicitly.
      where.AND = [{ OR: [{ apiName: null }, { NOT: callbackFilter }] }];
    }
    if (filters?.apiName) where.OR = [
      { apiName: { contains: filters.apiName } },
      { endpoint: { contains: filters.apiName } },
    ];
    if (filters?.traceId) where.traceId = filters.traceId;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return this.paginate(where, {
      page,
      pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Alert settings / events
  // ---------------------------------------------------------------------------

  async listAlertSettings(enabledOnly?: boolean) {
    const where: any = {};
    if (enabledOnly) where.enabled = true;
    const rows = await this.client.developerAlertSetting.findMany({
      where,
      select: {
        developerId: true,
        alertEmail: true,
        enabled: true,
        windowSeconds: true,
        errorThreshold: true,
        cooldownSeconds: true,
        logRetentionDays: true,
      },
    });
    return rows.map((r: any) => ({
      developerId: r.developerId,
      alertEmail: r.alertEmail,
      enabled: r.enabled,
      windowSeconds: r.windowSeconds,
      errorThreshold: r.errorThreshold,
      cooldownSeconds: r.cooldownSeconds,
      logRetentionDays: r.logRetentionDays,
    }));
  }

  async listAlertSettingDevelopers(): Promise<string[]> {
    const rows = await this.client.developerAlertSetting.findMany({
      select: { developerId: true },
    });
    return rows.map((r: any) => r.developerId);
  }

  async getLogRetentionDays(developerId: string): Promise<number> {
    const row = await this.client.developerAlertSetting.findUnique({
      where: { developerId },
      select: { logRetentionDays: true },
    });
    return row?.logRetentionDays ?? RAW_RETENTION_DAYS;
  }

  async upsertAlertSetting(data: { developerId: string; alertEmail: string | null; enabled: boolean; windowSeconds: number; errorThreshold: number; cooldownSeconds: number; logRetentionDays: number }) {
    await this.client.developerAlertSetting.upsert({
      where: { developerId: data.developerId },
      create: {
        developerId: data.developerId,
        alertEmail: data.alertEmail,
        enabled: data.enabled,
        windowSeconds: data.windowSeconds,
        errorThreshold: data.errorThreshold,
        cooldownSeconds: data.cooldownSeconds,
        logRetentionDays: data.logRetentionDays,
      },
      update: {
        alertEmail: data.alertEmail,
        enabled: data.enabled,
        windowSeconds: data.windowSeconds,
        errorThreshold: data.errorThreshold,
        cooldownSeconds: data.cooldownSeconds,
        logRetentionDays: data.logRetentionDays,
      },
    });
  }

  async getAlertEvents(developerId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.client.developerAlertEvent.findMany({
        where: { developerId },
        orderBy: { windowEnd: 'desc' },
        skip,
        take: pageSize,
        select: { windowEnd: true, errorCount: true, totalCount: true, sent: true, createdAt: true },
      }),
      this.client.developerAlertEvent.count({ where: { developerId } }),
    ]);
    return { list, total, page, pageSize };
  }

  async getAlertCooldownEnd(developerId: string): Promise<Date> {
    const last = await this.client.developerAlertEvent.findFirst({
      where: { developerId },
      orderBy: { windowEnd: 'desc' },
      select: { windowEnd: true },
    });
    if (!last) return new Date(0);
    const setting = await this.client.developerAlertSetting.findUnique({
      where: { developerId },
      select: { cooldownSeconds: true },
    });
    const cooldownMs = (setting?.cooldownSeconds ?? 3600) * 1000;
    return new Date(last.windowEnd.getTime() + cooldownMs);
  }

  async countErrorsInWindow(developerId: string, start: Date, end: Date) {
    // Raw SQL: the window bounds must serialize exactly like the rollup queries
    // (UTC wall clock). The Prisma query engine's Date handling for this table
    // differs from $queryRaw and would shift the window.
    // Callback pushes are excluded: this count drives the API error-rate alert,
    // which should not fire on webhook delivery failures.
    const rows = await this.queryRaw<{ error_count: bigint | number; total_count: bigint | number }>`
      SELECT
        SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS error_count,
        COUNT(*) AS total_count
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${start} AND created_at <= ${end}
        AND (api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE})
    `;
    const row = rows[0];
    return [{
      errorCount: Number(row?.error_count || 0),
      totalCount: Number(row?.total_count || 0),
    }];
  }

  async findRecentErrorsInWindow(developerId: string, start: Date, end: Date, limit: number) {
    return this.queryRaw<any[]>`
      SELECT endpoint, method, trace_id, response_status, created_at
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND is_error = 1
        AND created_at >= ${start} AND created_at <= ${end}
        AND (api_name IS NULL OR api_name NOT LIKE ${CALLBACK_LIKE})
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  async createAlertEvent(data: { developerId: string; windowEnd: Date; errorCount: number; totalCount: number; sampleErrors: unknown[]; sent: boolean }) {
    await this.client.developerAlertEvent.create({
      data: {
        developerId: data.developerId,
        windowEnd: data.windowEnd,
        errorCount: data.errorCount,
        totalCount: data.totalCount,
        sampleErrors: data.sampleErrors as any,
        sent: data.sent,
      },
    });
  }

  async markAlertSent(developerId: string, windowEnd: Date) {
    await this.client.developerAlertEvent.updateMany({
      where: { developerId, windowEnd },
      data: { sent: true },
    });
  }
}
