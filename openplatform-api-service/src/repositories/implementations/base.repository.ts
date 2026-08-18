/**
 * Base Repository
 *
 * All repository implementations extend this class.
 * Provides:
 *   - this.client  — the active Prisma client (default or transaction)
 *   - this.model   — the Prisma model delegate (auto-derived from modelName)
 *   - findById     — generic find by primary key
 *   - create       — generic create
 *   - update       — generic update by id
 *   - delete       — generic delete by id
 *   - paginate     — generic paginated query
 *
 * Generic parameter:
 *   ModelDelegate — the Prisma delegate type (e.g. Prisma.AdminDelegate),
 *                   used for type inference in subclasses
 */

import { getClient } from '../db-client';
import { Prisma, PrismaClient } from '@prisma/client';

export interface PaginateOptions {
  page?: number;
  pageSize?: number;
  orderBy?: any;
  include?: any;
  select?: any;
}

export interface PaginateResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export abstract class BaseRepository<ModelDelegate = any> {
  protected get client(): PrismaClient {
    return getClient();
  }

  protected abstract get modelName(): string;

  protected get model(): ModelDelegate {
    return (this.client as any)[this.modelName];
  }

  async findById(id: string) {
    return (this.model as any).findUnique({ where: { id } });
  }

  async create(data: any) {
    return (this.model as any).create({ data });
  }

  async update(id: string, data: any) {
    return (this.model as any).update({ where: { id }, data });
  }

  async delete(id: string) {
    return (this.model as any).delete({ where: { id } });
  }

  /**
   * Generic paginated query.
   *
   * Usage:
   *   const result = await repo.paginate({ where: { status: 'active' } }, { page: 1, pageSize: 20 })
   *   // result: { list: [...], total: 100, page: 1, pageSize: 20 }
   */
  async paginate(
    where: any = {},
    options: PaginateOptions = {},
  ): Promise<PaginateResult<any>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const findArgs: any = {
      where,
      skip,
      take: pageSize,
    };

    if (options.orderBy) {
      findArgs.orderBy = options.orderBy;
    }
    if (options.include) {
      findArgs.include = options.include;
    }
    if (options.select) {
      findArgs.select = options.select;
    }

    const [list, total] = await Promise.all([
      (this.model as any).findMany(findArgs),
      (this.model as any).count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  public async queryRaw<T = any>(
    query: Prisma.Sql | TemplateStringsArray,
    ...values: any[]
  ): Promise<T[]> {
    return this.client.$queryRaw<T[]>(query, ...values);
  }
}
