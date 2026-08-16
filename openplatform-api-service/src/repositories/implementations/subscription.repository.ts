import { PrismaClient, Prisma, Subscription } from '@prisma/client'

export class SubscriptionRepositoryImpl {
  constructor(private readonly prisma: PrismaClient) {}

  async findByFilters(where: Prisma.SubscriptionWhereInput, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize
    const [list, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          developer: {
            select: { id: true, legalName: true, email: true },
          },
          package: {
            select: { id: true, name: true, packageCode: true },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ])
    return { list, total }
  }

  async findById(id: string) {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: {
        developer: {
          select: { id: true, legalName: true, email: true },
        },
        package: {
          select: { id: true, name: true, packageCode: true, monthlyPrice: true, yearlyPrice: true },
        },
      },
    })
  }

  async findByDeveloperId(developerId: string) {
    return this.prisma.subscription.findFirst({
      where: { developerId, status: 'active' },
      include: {
        package: {
          select: { id: true, name: true, packageCode: true, monthlyPrice: true, yearlyPrice: true },
        },
      },
    })
  }

  async create(data: Prisma.SubscriptionCreateInput) {
    return this.prisma.subscription.create({ data })
  }

  async update(id: string, data: Prisma.SubscriptionUpdateInput) {
    return this.prisma.subscription.update({ where: { id }, data })
  }
}