import { PrismaClient, Prisma, Package } from '@prisma/client'

export class PackageRepositoryImpl {
  constructor(private readonly prisma: PrismaClient) {}

  async findByFilters(where: Prisma.PackageWhereInput, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize
    const [list, total] = await Promise.all([
      this.prisma.package.findMany({ where, skip, take: pageSize, orderBy: { sortOrder: 'asc' } }),
      this.prisma.package.count({ where }),
    ])
    return { list, total }
  }

  async findById(id: string) {
    return this.prisma.package.findUnique({ where: { id } })
  }

  async findByCodeAndStatus(packageCode: string, status: string) {
    return this.prisma.package.findFirst({ where: { packageCode, status } })
  }

  async findByStatus(status: string) {
    return this.prisma.package.findMany({ where: { status }, orderBy: { sortOrder: 'asc' } })
  }

  async getMaxVersion(packageCode: string): Promise<number> {
    const result = await this.prisma.package.aggregate({
      where: { packageCode },
      _max: { version: true },
    })
    return result._max.version || 0
  }

  async create(data: Prisma.PackageCreateInput) {
    return this.prisma.package.create({ data })
  }

  async update(id: string, data: Prisma.PackageUpdateInput) {
    return this.prisma.package.update({ where: { id }, data })
  }

  async delete(id: string) {
    return this.prisma.package.delete({ where: { id } })
  }
}