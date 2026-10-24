import { Prisma, ApiLog } from '@prisma/client';
import { BaseRepository } from './base.repository';
import {
  ApiLogRepository,
  ApiLogStats,
  ApiLogDailyBreakdown,
  ApiLogDailySnapshot,
  ApiLogEndpointBreakdown,
} from '../repository.interfaces';

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
  // Lifecycle: slim → snapshot → delete
  // -----------------------------------------------------------------------

  /**
   * Null out large payload fields for logs older than N days.
   * Keeps endpoint, status, timing, and boolean fields so that all
   * dashboard / statistics queries remain accurate.
   */
  async slimOlderThan(days: number): Promise<{ count: number }> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await (this.model as any).updateMany({
      where: {
        createdAt: { lt: cutoff },
        // only touch rows that still carry a payload
        OR: [
          { requestBody: { not: null } },
          { responseBody: { not: null } },
          { requestHeaders: { not: null } },
        ],
      },
      data: {
        requestBody: null,
        responseBody: null,
        requestHeaders: null,
      },
    });
    return { count: result.count };
  }

  /**
   * Build daily aggregate snapshots for a date range.
   * Each row = (developerId, date) with totalCalls, errorCalls, avg/p95 RT,
   * and top 5 endpoints by call volume.  Idempotent via (date, developerId)
   * upsert.
   *
   * Stores snapshots in the `api_log_snapshots` table (must be added via
   * `prisma db push` or a migration).  Falls back gracefully when the table
   * does not yet exist.
   */
  async buildDailySnapshot(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Raw SQL so we can compute percentiles in one pass.
    const rows: any[] = await this.queryRaw`
      SELECT
        developer_id,
        DATE(created_at)          AS snap_date,
        COUNT(*)                  AS total_calls,
        SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS error_calls,
        ROUND(AVG(response_time), 0) AS avg_response_time,
        /* Approximate p95: take the value at the 95th percentile position */
        SUBSTRING_INDEX(
          SUBSTRING_INDEX(GROUP_CONCAT(response_time ORDER BY response_time SEPARATOR ','), ',',
            CEIL(COUNT(*) * 0.95)), ',', -1) AS p95_response_time,
        /* Top endpoints by volume */
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT('endpoint', ep_name, 'calls', ep_calls, 'error_rate',
              ROUND(ep_err * 100.0 / ep_calls, 1))
          ) FROM (
            SELECT COALESCE(api_name, CONCAT(endpoint, ' ', method)) AS ep_name,
                   COUNT(*) AS ep_calls,
                   SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) AS ep_err
            FROM api_logs a2
            WHERE a2.developer_id = api_logs.developer_id
              AND DATE(a2.created_at) = DATE(api_logs.created_at)
            GROUP BY ep_name ORDER BY ep_calls DESC LIMIT 5
          ) top_eps
        ) AS top_endpoints
      FROM api_logs
      WHERE created_at >= ${startDate} AND created_at < ${endDate}
      GROUP BY developer_id, DATE(created_at)
    `;

    let built = 0;
    for (const r of rows) {
      try {
        // The snapshot table is optional; skip gracefully when absent.
        await this.queryRaw`
          INSERT INTO api_log_snapshots
            (developer_id, date, total_calls, error_calls,
             avg_response_time, p95_response_time, top_endpoints, created_at)
          VALUES (${r.developer_id}, ${r.snap_date}, ${Number(r.total_calls)},
                  ${Number(r.error_calls)}, ${Number(r.avg_response_time) || 0},
                  ${Number(r.p95_response_time) || 0},
                  ${JSON.stringify(r.top_endpoints)}, NOW())
          ON DUPLICATE KEY UPDATE
            total_calls       = VALUES(total_calls),
            error_calls       = VALUES(error_calls),
            avg_response_time = VALUES(avg_response_time),
            p95_response_time = VALUES(p95_response_time),
            top_endpoints     = VALUES(top_endpoints)
        `;
        built++;
      } catch (err: any) {
        // Table does not exist yet — snapshot is optional; skip silently.
        if (err?.code === 'ER_NO_SUCH_TABLE') return 0;
        console.error('[ApiLog] Snapshot write error:', err?.message || err);
      }
    }
    return built;
  }

  /**
   * Read pre-built daily snapshots for a developer + date range.
   */
  async getDailySnapshots(
    developerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ApiLogDailySnapshot[]> {
    try {
      const rows: any[] = await this.queryRaw`
        SELECT date, developer_id, total_calls, error_calls,
               avg_response_time, p95_response_time, top_endpoints, created_at
        FROM api_log_snapshots
        WHERE developer_id = ${developerId}
          AND date >= ${startDate} AND date < ${endDate}
        ORDER BY date ASC
      `;
      return rows.map((r: any) => ({
        date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0],
        developerId: r.developer_id,
        totalCalls: Number(r.total_calls),
        errorCalls: Number(r.error_calls),
        avgResponseTime: Number(r.avg_response_time) || 0,
        p95ResponseTime: Number(r.p95_response_time) || 0,
        topEndpoints: typeof r.top_endpoints === 'string'
          ? JSON.parse(r.top_endpoints)
          : r.top_endpoints,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    } catch (err: any) {
      if (err?.code === 'ER_NO_SUCH_TABLE') return [];
      console.error('[ApiLog] Snapshot read error:', err?.message || err);
      return [];
    }
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
