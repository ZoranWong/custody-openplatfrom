import { Prisma, Announcement } from '@prisma/client';
import { BaseRepository, PaginateOptions } from './base.repository';

export class AnnouncementRepositoryImpl extends BaseRepository<Prisma.AnnouncementDelegate> {
  protected get modelName(): string {
    return 'announcement';
  }

  async findByFilters(
    where: Prisma.AnnouncementWhereInput,
    page: number,
    pageSize: number,
  ) {
    return this.paginate(where, {
      page,
      pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }
}