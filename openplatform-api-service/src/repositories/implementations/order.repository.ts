import { Prisma, Order } from '@prisma/client'
import { BaseRepository } from './base.repository'

export class OrderRepositoryImpl extends BaseRepository<Prisma.OrderDelegate> {
  protected get modelName(): string {
    return 'order'
  }

  async findByFilters(where: Prisma.OrderWhereInput, page: number, pageSize: number) {
    return this.paginate(where, {
      page,
      pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          select: {
            id: true,
            developer: { select: { id: true, legalName: true, email: true } },
            package: { select: { id: true, name: true, packageCode: true } },
          },
        },
      },
    })
  }
}