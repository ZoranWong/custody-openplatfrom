/**
 * ISV User Repository Implementation
 */

import { PrismaClient, Prisma, IsvUser } from '@prisma/client'
import { ISVUserRepository } from '../repository.interfaces'

export class ISVUserRepositoryImpl implements ISVUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<IsvUser | null> {
    return this.prisma.isvUser.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<IsvUser | null> {
    return this.prisma.isvUser.findUnique({ where: { email } })
  }

  async findByIsvDeveloper(isvDeveloperId: string): Promise<IsvUser[]> {
    return this.prisma.isvUser.findMany({ where: { isvDeveloperId } })
  }

  async findByIsvDeveloperAndEmail(isvDeveloperId: string, email: string): Promise<IsvUser | null> {
    return this.prisma.isvUser.findFirst({ where: { isvDeveloperId, email } })
  }

  async create(data: Prisma.IsvUserCreateInput): Promise<IsvUser> {
    return this.prisma.isvUser.create({ data })
  }

  async update(id: string, data: Prisma.IsvUserUpdateInput): Promise<IsvUser> {
    return this.prisma.isvUser.update({ where: { id }, data })
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.isvUser.delete({ where: { id } })
    return true
  }
}
