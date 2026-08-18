/**
 * Application Repository Implementation
 * Client obtained from db-client.getClient().
 */

import { Prisma, Application } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { ApplicationRepository } from '../repository.interfaces';

export class ApplicationRepositoryImpl
  extends BaseRepository<Prisma.ApplicationDelegate>
  implements ApplicationRepository
{
  protected get modelName(): string {
    return 'application';
  }

  async findByAppId(appId: string): Promise<Application | null> {
    return this.model.findUnique({ where: { id: appId } });
  }

  async findByIsvDeveloper(isvDeveloperId: string): Promise<Application[]> {
    return this.model.findMany({ where: { isvDeveloperId } });
  }

  async countByDeveloperIds(
    developerIds: string[],
  ): Promise<Record<string, number>> {
    if (developerIds.length === 0) return {};
    const results = await (this.model as any).groupBy({
      by: ['isvDeveloperId'],
      where: { isvDeveloperId: { in: developerIds } },
      _count: { id: true },
    });
    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.isvDeveloperId] = r._count.id;
    }
    return counts;
  }
}