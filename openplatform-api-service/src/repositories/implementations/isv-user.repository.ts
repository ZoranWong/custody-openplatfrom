/**
 * ISV User Repository Implementation
 * Client obtained from db-client.getClient().
 */

import { Prisma, IsvUser } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { ISVUserRepository } from '../repository.interfaces'

export class ISVUserRepositoryImpl extends BaseRepository<Prisma.IsvUserDelegate> implements ISVUserRepository {
  protected get modelName(): string {
    return 'isvUser'
  }

  async findByEmail(email: string): Promise<IsvUser | null> {
    return this.model.findUnique({ where: { email } })
  }

  async findByIsvDeveloper(isvDeveloperId: string): Promise<IsvUser[]> {
    return this.model.findMany({ where: { isvDeveloperId } })
  }

  async findByIsvDeveloperAndEmail(isvDeveloperId: string, email: string): Promise<IsvUser | null> {
    return this.model.findFirst({ where: { isvDeveloperId, email } })
  }
}