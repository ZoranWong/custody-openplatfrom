import { Prisma, Ticket } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class TicketRepositoryImpl extends BaseRepository<Prisma.TicketDelegate> {
  protected get modelName(): string {
    return 'ticket';
  }

  async findByFilters(
    where: Prisma.TicketWhereInput,
    page: number,
    pageSize: number,
  ) {
    return this.paginate(where, {
      page,
      pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createReply(data: Prisma.TicketReplyCreateInput) {
    return (this.client as any).ticketReply.create({ data });
  }
}
