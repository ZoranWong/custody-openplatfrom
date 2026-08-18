import { Prisma, ApiLog } from '@prisma/client';
import { BaseRepository } from './base.repository';
import {
  ApiLogRepository,
  ApiLogStats,
  ApiLogDailyBreakdown,
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

  async cleanup(retentionDays: number = 30) {
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
