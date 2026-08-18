import { Prisma, Package } from '@prisma/client'
import { BaseRepository } from './base.repository'

export class PackageRepositoryImpl extends BaseRepository<Prisma.PackageDelegate> {
  protected get modelName(): string {
    return 'package'
  }

  async findByFilters(where: Prisma.PackageWhereInput, page: number, pageSize: number) {
    return this.paginate(where, {
      page,
      pageSize,
      orderBy: { sortOrder: 'asc' },
    })
  }

  async findByCodeAndStatus(packageCode: string, status: string) {
    return this.model.findFirst({ where: { packageCode, status } })
  }

  async findByStatus(status: string) {
    return this.model.findMany({ where: { status }, orderBy: { sortOrder: 'asc' } })
  }

  async getMaxVersion(packageCode: string): Promise<number> {
    const result = await this.model.aggregate({
      where: { packageCode },
      _max: { version: true },
    })
    return result._max.version || 0
  }
}