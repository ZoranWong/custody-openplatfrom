import { PrismaClient, Prisma, Order } from '@prisma/client'

export class OrderRepositoryImpl {
  constructor(private readonly prisma: PrismaClient) {}

  async findByFilters(where: Prisma.OrderWhereInput, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
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
      }),
      this.prisma.order.count({ where }),
    ])
    return { list, total }
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
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

  async create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({ data })
  }

  async update(id: string, data: Prisma.OrderUpdateInput) {
    return this.prisma.order.update({ where: { id }, data })
  }
}