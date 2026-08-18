import { Prisma, DeveloperAudit } from '@prisma/client'
import { BaseRepository } from './base.repository'

export class DeveloperAuditRepositoryImpl extends BaseRepository<Prisma.DeveloperAuditDelegate> {
  protected get modelName(): string {
    return 'developerAudit'
  }

  async findByDeveloperId(developerId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize
    const [list, total] = await Promise.all([
      this.model.findMany({
        where: { developerId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.model.count({ where: { developerId } }),
    ])
    return { list, total }
  }
}