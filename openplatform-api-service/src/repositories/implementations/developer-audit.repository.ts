import { PrismaClient, Prisma } from '@prisma/client'

export class DeveloperAuditRepositoryImpl {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.DeveloperAuditCreateInput) {
    return this.prisma.developerAudit.create({ data })
  }

  async findByDeveloperId(developerId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize
    const [list, total] = await Promise.all([
      this.prisma.developerAudit.findMany({
        where: { developerId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.developerAudit.count({ where: { developerId } }),
    ])
    return { list, total }
  }
}