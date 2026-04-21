/**
 * IsvDeveloper Repository Implementation
 */

import { PrismaClient, Prisma, IsvDeveloper } from '@prisma/client'
import { IsvDeveloperRepository } from '../repository.interfaces'

export class IsvDeveloperRepositoryImpl implements IsvDeveloperRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<IsvDeveloper | null> {
    return this.prisma.isvDeveloper.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<IsvDeveloper | null> {
    return this.prisma.isvDeveloper.findUnique({ where: { email } })
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<IsvDeveloper | null> {
    return this.prisma.isvDeveloper.findFirst({ where: { registrationNumber } })
  }

  async findByFilters(where: Prisma.IsvDeveloperWhereInput, page = 1, pageSize = 10): Promise<IsvDeveloper[]> {
    return this.prisma.isvDeveloper.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    })
  }

  async count(where: Prisma.IsvDeveloperWhereInput = {}): Promise<number> {
    return this.prisma.isvDeveloper.count({ where })
  }

  async create(data: Prisma.IsvDeveloperCreateInput): Promise<IsvDeveloper> {
    return this.prisma.isvDeveloper.create({ data })
  }

  async update(id: string, data: Prisma.IsvDeveloperUpdateInput): Promise<IsvDeveloper> {
    return this.prisma.isvDeveloper.update({ where: { id }, data })
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.isvDeveloper.delete({ where: { id } })
    return true
  }
}
