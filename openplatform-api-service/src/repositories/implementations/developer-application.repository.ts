/**
 * DeveloperApplication Repository Implementation
 * Pure data access — only the developer_applications table.
 * Client obtained from db-client.getClient().
 */

import { Prisma, DeveloperApplication } from '@prisma/client'
import { BaseRepository } from './base.repository'

export class DeveloperApplicationRepositoryImpl extends BaseRepository<Prisma.DeveloperApplicationDelegate> {
  protected get modelName(): string {
    return 'developerApplication'
  }

  async findByFilters(
    where: Prisma.DeveloperApplicationWhereInput,
    page: number,
    pageSize: number
  ): Promise<{ list: DeveloperApplication[]; total: number }> {
    return this.paginate(where, {
      page,
      pageSize,
      orderBy: { createdAt: 'desc' },
    })
  }

  async count(where: Prisma.DeveloperApplicationWhereInput): Promise<number> {
    return this.model.count({ where })
  }
}