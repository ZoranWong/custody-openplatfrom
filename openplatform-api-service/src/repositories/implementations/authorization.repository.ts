/**
 * OauthResource Repository Implementation
 * Client obtained from db-client.getClient().
 */

import { Prisma, OauthResource } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { OauthResourceRepository } from '../repository.interfaces'

export class OauthResourceRepositoryImpl extends BaseRepository<Prisma.OauthResourceDelegate> implements OauthResourceRepository {
  protected get modelName(): string {
    return 'oauthResource'
  }

  async findByAppId(appId: string): Promise<OauthResource[]> {
    return this.model.findMany({ where: { appId } })
  }

  async findByAppAndResource(appId: string, resourceKey: string): Promise<OauthResource | null> {
    return this.model.findFirst({ where: { appId, resourceKey } })
  }

  async upsert(data: { appId: string; resourceKey: string | null; authorizedAt?: Date; expiresAt?: Date }): Promise<OauthResource> {
    // Atomic upsert using Prisma's upsert for non-null resourceKey
    // For null resourceKey, fallback to query+update/create (null can't be used in unique constraint lookup)
    if (data.resourceKey !== null) {
      return (this.model as any).upsert({
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
    const existing = await this.model.findFirst({ where: { appId: data.appId, resourceKey: null } })
    if (existing) {
      return this.model.update({
        where: { id: existing.id },
        data: {
          authorizedAt: data.authorizedAt || existing.authorizedAt,
          expiresAt: data.expiresAt,
          status: 'active',
        },
      })
    }
    return this.model.create({
      data: {
        appId: data.appId,
        resourceKey: null,
        authorizedAt: data.authorizedAt || new Date(),
        expiresAt: data.expiresAt,
        status: 'active',
      },
    })
  }
}