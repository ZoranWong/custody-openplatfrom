/**
 * EndpointPermission Repository Implementation
 */

import { PrismaClient, Prisma, EndpointPermission } from '@prisma/client'
import { EndpointPermissionRepository } from '../repository.interfaces'

export class EndpointPermissionRepositoryImpl implements EndpointPermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<EndpointPermission | null> {
    return this.prisma.endpointPermission.findUnique({ where: { id } })
  }

  async findByPathAndMethod(endpoint: string, method: string): Promise<EndpointPermission | null> {
    return this.prisma.endpointPermission.findFirst({ where: { endpoint, method } })
  }

  async findByIsvDeveloper(isvDeveloperId: string): Promise<EndpointPermission[]> {
    return this.prisma.endpointPermission.findMany({ where: { isvDeveloperId } })
  }

  async findAll(): Promise<EndpointPermission[]> {
    return this.prisma.endpointPermission.findMany()
  }

  async create(data: Prisma.EndpointPermissionCreateInput): Promise<EndpointPermission> {
    return this.prisma.endpointPermission.create({ data })
  }

  async update(id: string, data: Prisma.EndpointPermissionUpdateInput): Promise<EndpointPermission> {
    return this.prisma.endpointPermission.update({ where: { id }, data })
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.endpointPermission.delete({ where: { id } })
    return true
  }
}
