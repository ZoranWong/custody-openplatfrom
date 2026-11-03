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

export class ApiLogRepositoryImpl
  extends BaseRepository<Prisma.ApiLogDelegate>
  implements ApiLogRepository
{
  protected get modelName(): string {
    return 'apiLog';
  }

  async findRecentErrors(developerId: string, limit: number = 5) {
    const logs = await this.model.findMany({
      where: { developerId, isError: true },
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
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
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
      GROUP BY endpoint, method
      ORDER BY calls DESC
    `;

    const samples: any[] = await this.queryRaw`
      SELECT response_time AS rt
      FROM api_logs
      WHERE developer_id = ${developerId}
        AND created_at >= ${start} AND created_at < ${end}
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
      if (endpointRows.length > 0) {
        await tx.apiLogEndpointDaily.deleteMany({
          where: {
            developerId,
            date: dayLabel,
            endpoint: { notIn: endpointRows.map((r) => r.endpoint) },
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

  /** Format a `@db.Date` value (Date or driver string) as YYYY-MM-DD in UTC. */
  private dayLabelOf(value: unknown): string {
    return value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);
  }

  /** Aggregate raw logs for one developer over a day range (today's slice). */
  async aggregateRawRange(
    developerId: string,
    startIso: Date,
    endIso: Date,
  ): Promise<{
    calls: number; errorCalls: number; totalBytes: number; avgResponseTime: number;
    byEndpoint: ApiLogEndpointDailyRow[]; byDay: ApiLogRawDayAggregate[];
  }> {
    const [summary]: any[] = await this.queryRaw`
      SELECT COUNT(*) AS calls,
             SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS errors,
             SUM(COALESCE(request_bytes, 0) + COALESCE(response_bytes, 0)) AS total_bytes,
             ROUND(AVG(response_time), 0) AS avg_rt
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
      GROUP BY DATE(created_at)
      ORDER BY d ASC
    `;
    return {
      calls: Number(summary?.calls || 0),
      errorCalls: Number(summary?.errors || 0),
      totalBytes: Number(summary?.total_bytes || 0),
      avgResponseTime: Number(summary?.avg_rt || 0),
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

  /** Delete raw rows older than `day` (YYYY-MM-DD, exclusive). */
  async deleteRawBefore(day: string): Promise<{ count: number }> {
    const cutoff = startOfDay(day);
    const result = await this.model.deleteMany({ where: { createdAt: { lt: cutoff } } });
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

  /** List developer ids that still have daily snapshots in the given month (YYYY-MM). */
  async listDevelopersWithDailySnapshots(month: string): Promise<string[]> {
    const start = startOfDay(`${month}-01`);
    const rows: any[] = await this.queryRaw`
      SELECT DISTINCT developer_id FROM api_log_snapshots
      WHERE date >= ${start} AND date < DATE_ADD(${start}, INTERVAL 1 MONTH)
    `;
    return rows.map((r) => r.developer_id);
  }

  /** Delete daily snapshots / endpoint rows older than `day`; returns deleted counts. */
  async pruneDailyOlderThan(day: string): Promise<{ snapshots: number; endpoints: number }> {
    const cutoff = startOfDay(day);
    const snaps = await this.client.apiLogSnapshot.deleteMany({ where: { date: { lt: cutoff } } });
    const eps = await this.client.apiLogEndpointDaily.deleteMany({ where: { date: { lt: cutoff } } });
    return { snapshots: snaps.count, endpoints: eps.count };
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
    filters?: { isError?: boolean; apiName?: string; startDate?: Date; endDate?: Date },
  ) {
    const where: any = {};
    if (developerId && developerId !== '__admin__') where.developerId = developerId;
    if (filters?.isError !== undefined) where.isError = filters.isError;
    if (filters?.apiName) where.apiName = { contains: filters.apiName };
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
}
