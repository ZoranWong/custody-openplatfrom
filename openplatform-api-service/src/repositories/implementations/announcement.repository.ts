import { PrismaClient, Prisma, Announcement } from '@prisma/client'

export class AnnouncementRepositoryImpl {
  constructor(private readonly prisma: PrismaClient) {}

  async findByFilters(where: Prisma.AnnouncementWhereInput, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize
    const [list, total] = await Promise.all([
      this.prisma.announcement.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.announcement.count({ where }),
    ])
    return { list, total }
  }

  async findById(id: string) {
    return this.prisma.announcement.findUnique({ where: { id } })
  }

  async create(data: Prisma.AnnouncementCreateInput) {
    return this.prisma.announcement.create({ data })
  }

  async update(id: string, data: Prisma.AnnouncementUpdateInput) {
    return this.prisma.announcement.update({ where: { id }, data })
  }

  async delete(id: string) {
    return this.prisma.announcement.delete({ where: { id } })
  }
}