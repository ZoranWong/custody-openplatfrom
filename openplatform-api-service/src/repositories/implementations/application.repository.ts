/**
 * Application Repository Implementation
 */

import { PrismaClient, Prisma, Application } from '@prisma/client'
import { ApplicationRepository } from '../repository.interfaces'

export class ApplicationRepositoryImpl implements ApplicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Application | null> {
    return this.prisma.application.findUnique({ where: { id } })
  }

  async findByAppId(appId: string): Promise<Application | null> {
    return this.prisma.application.findUnique({ where: { id: appId } })
  }

  async findByIsvDeveloper(isvDeveloperId: string): Promise<Application[]> {
    return this.prisma.application.findMany({ where: { isvDeveloperId } })
  }

  async create(data: Prisma.ApplicationCreateInput): Promise<Application> {
    return this.prisma.application.create({ data })
  }

  async update(id: string, data: Prisma.ApplicationUpdateInput): Promise<Application> {
    return this.prisma.application.update({ where: { id }, data })
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.application.delete({ where: { id } })
    return true
  }
}
