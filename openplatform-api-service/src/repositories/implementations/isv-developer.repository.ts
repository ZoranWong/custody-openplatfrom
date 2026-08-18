import { BaseRepository } from './base.repository'
import { Prisma, IsvDeveloper } from '@prisma/client'
import { IsvDeveloperRepository } from '../repository.interfaces'

export class IsvDeveloperRepositoryImpl extends BaseRepository<Prisma.IsvDeveloperDelegate> implements IsvDeveloperRepository {
  protected get modelName(): string {
    return 'isvDeveloper'
  }

  async findByEmail(email: string): Promise<IsvDeveloper | null> {
    return this.model.findUnique({ where: { email } })
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<IsvDeveloper | null> {
    return this.model.findFirst({ where: { registrationNumber } })
  }

  async findByFilters(where: Prisma.IsvDeveloperWhereInput, page = 1, pageSize = 10): Promise<IsvDeveloper[]> {
    return this.model.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    })
  }

  async count(where: Prisma.IsvDeveloperWhereInput = {}): Promise<number> {
    return this.model.count({ where })
  }
}