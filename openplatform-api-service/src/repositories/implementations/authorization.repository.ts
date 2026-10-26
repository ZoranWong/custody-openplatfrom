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

  async findByResourceKey(resourceKey: string): Promise<OauthResource | null> {
    return this.model.findFirst({ where: { resourceKey } })
  }

  async findByAppAndResource(appId: string, resourceKey: string): Promise<OauthResource | null> {
    return this.model.findFirst({ where: { appId, resourceKey } })
  }

  /**
   * Create or refresh the authorization record for (appId, resourceKey).
   *
   * Idempotent: the unique index `oauth_resources_app_id_resource_key_key`
   * is the single source of truth. A concurrent insert loses the race and
   * Prisma retries it as an update, so callers always observe one row per
   * (appId, resourceKey) — and therefore a stable id.
   *
   * `resourceKey` is required: a null key would fall outside that unique
   * index (MySQL allows duplicate NULLs), so two concurrent authorizations
   * could create distinct rows and hand out different ids. Reject it here
   * as a last line of defence, independent of the route-level validation.
   */
  async upsert(data: { appId: string; resourceKey: string; authorizedAt?: Date; expiresAt?: Date }): Promise<OauthResource> {
    if (!data.resourceKey) {
      throw new Error('resourceKey is required for authorization upsert');
    }

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
}