/**
 * DeveloperApplication Repository Implementation
 */

import { PrismaClient, Prisma, DeveloperApplication } from '@prisma/client'

export class DeveloperApplicationRepositoryImpl {
  constructor(private readonly prisma: PrismaClient) {}

  async findByFilters(
    where: Prisma.DeveloperApplicationWhereInput,
    page: number,
    pageSize: number
  ): Promise<{ list: DeveloperApplication[]; total: number }> {
    const skip = (page - 1) * pageSize
    const [list, total] = await Promise.all([
      this.prisma.developerApplication.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.developerApplication.count({ where }),
    ])
    return { list, total }
  }

  async findById(id: string): Promise<DeveloperApplication | null> {
    return this.prisma.developerApplication.findUnique({ where: { id } })
  }

  async update(
    id: string,
    data: Prisma.DeveloperApplicationUpdateInput
  ): Promise<DeveloperApplication> {
    return this.prisma.developerApplication.update({ where: { id }, data })
  }

  async count(where: Prisma.DeveloperApplicationWhereInput): Promise<number> {
    return this.prisma.developerApplication.count({ where })
  }
}