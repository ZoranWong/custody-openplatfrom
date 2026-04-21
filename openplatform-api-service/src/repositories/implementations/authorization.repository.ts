/**
 * OauthResource Repository Implementation
 */

import { PrismaClient, Prisma, OauthResource } from '@prisma/client'
import { OauthResourceRepository } from '../repository.interfaces'

export class OauthResourceRepositoryImpl implements OauthResourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<OauthResource | null> {
    return this.prisma.oauthResource.findUnique({ where: { id } })
  }

  async findByAppId(appId: string): Promise<OauthResource[]> {
    return this.prisma.oauthResource.findMany({ where: { appId } })
  }

  async findByAppAndResource(appId: string, resourceKey: string): Promise<OauthResource | null> {
    return this.prisma.oauthResource.findFirst({ where: { appId, resourceKey } })
  }

  async upsert(data: { appId: string; resourceKey: string | null; authorizedAt?: Date; expiresAt?: Date }): Promise<OauthResource> {
    // Atomic upsert using Prisma's upsert for non-null resourceKey
    // For null resourceKey, fallback to query+update/create (null can't be used in unique constraint lookup)
    if (data.resourceKey !== null) {
      return this.prisma.oauthResource.upsert({
        where: {
          appId_resourceKey: {
            appId: data.appId,
            resourceKey: data.resourceKey,
          },
        },
        update: {
          authorizedAt: data.authorizedAt || new Date(),
          expiresAt: data.expiresAt,
          status: 'active',
        },
        create: {
          appId: data.appId,
          resourceKey: data.resourceKey,
          authorizedAt: data.authorizedAt || new Date(),
          expiresAt: data.expiresAt,
          status: 'active',
        },
      })
    }

    // Fallback for null resourceKey: find first, update or create
    const existing = await this.prisma.oauthResource.findFirst({ where: { appId: data.appId, resourceKey: null } })
    if (existing) {
      return this.prisma.oauthResource.update({
        where: { id: existing.id },
        data: {
          authorizedAt: data.authorizedAt || existing.authorizedAt,
          expiresAt: data.expiresAt,
          status: 'active',
        },
      })
    }
    return this.prisma.oauthResource.create({
      data: {
        appId: data.appId,
        resourceKey: null,
        authorizedAt: data.authorizedAt || new Date(),
        expiresAt: data.expiresAt,
        status: 'active',
      },
    })
  }

  async create(data: Prisma.OauthResourceCreateInput): Promise<OauthResource> {
    return this.prisma.oauthResource.create({ data })
  }

  async update(id: string, data: Prisma.OauthResourceUpdateInput): Promise<OauthResource> {
    return this.prisma.oauthResource.update({ where: { id }, data })
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.oauthResource.delete({ where: { id } })
    return true
  }
}
