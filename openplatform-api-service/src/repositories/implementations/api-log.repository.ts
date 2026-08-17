import { PrismaClient } from '@prisma/client';

export class ApiLogRepositoryImpl {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    appId: string;
    developerId?: string;
    subscriptionId?: string;
    apiName?: string;
    endpoint: string;
    method: string;
    requestHeaders?: any;
    requestBody?: any;
    responseStatus?: number;
    responseBody?: any;
    responseTime?: number;
    ipAddress?: string;
    userAgent?: string;
    isError?: boolean;
  }) {
    return this.prisma.apiLog.create({ data: data as any });
  }

  async findRecentErrors(developerId: string, limit: number = 5) {
    const logs = await this.prisma.apiLog.findMany({
      where: { developerId, isError: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { apiName: true, endpoint: true, responseStatus: true, createdAt: true },
    });
    return logs.map((l) => ({
      apiName: l.apiName || l.endpoint,
      endpoint: l.endpoint,
      responseStatus: l.responseStatus,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async countByDeveloper(developerId: string, startDate?: Date, isError?: boolean) {
    return this.prisma.apiLog.count({
      where: {
        developerId,
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
        ...(isError !== undefined ? { isError } : {}),
      },
    });
  }

  async queryRaw(sql: string) {
    return this.prisma.$queryRawUnsafe(sql);
  }

  async cleanup(retentionDays: number = 30) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    return this.prisma.apiLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  }
}