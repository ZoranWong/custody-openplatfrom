import { PrismaClient, Prisma, Ticket } from '@prisma/client'

export class TicketRepositoryImpl {
  constructor(private readonly prisma: PrismaClient) {}

  async findByFilters(where: Prisma.TicketWhereInput, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize
    const [list, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          replies: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ])
    return { list, total }
  }

  async findById(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  async create(data: Prisma.TicketCreateInput) {
    return this.prisma.ticket.create({ data })
  }

  async update(id: string, data: Prisma.TicketUpdateInput) {
    return this.prisma.ticket.update({ where: { id }, data })
  }

  async createReply(data: Prisma.TicketReplyCreateInput) {
    return this.prisma.ticketReply.create({ data })
  }
}