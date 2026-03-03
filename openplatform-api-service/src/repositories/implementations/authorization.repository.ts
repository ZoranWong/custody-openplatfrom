/**
 * OauthResource Repository Implementation
 * Implements OauthResourceRepository using file-based storage adapter
 * Note: For MySQL, use the Prisma-based implementation
 */

import { StorageAdapter } from '../storage.adapter';
import { OauthResource, Authorization } from '../../types/authorization.types';
import { OauthResourceRepository } from '../repository.interfaces';
import { v4 as uuidv4 } from 'uuid';

export class OauthResourceRepositoryImpl implements OauthResourceRepository {
  constructor(private readonly db: StorageAdapter) {}

  async findById(id: string): Promise<OauthResource | null> {
    return this.db.findById<OauthResource>(id) as Promise<OauthResource | null>;
  }

  async findOne(where: Partial<OauthResource>): Promise<OauthResource | null> {
    return this.db.findOne<OauthResource>(where) as Promise<OauthResource | null>;
  }

  async findMany(where?: Partial<OauthResource>): Promise<OauthResource[]> {
    return this.db.findMany<OauthResource>(where) as Promise<OauthResource[]>;
  }

  async findAll(): Promise<OauthResource[]> {
    return this.db.findAll<OauthResource>() as Promise<OauthResource[]>;
  }

  async create(data: Omit<OauthResource, 'id' | 'createdAt' | 'updatedAt'>): Promise<OauthResource> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const oauthResource: OauthResource = {
      ...data,
      id,
      authorizedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    return this.db.save<OauthResource>(oauthResource as any) as Promise<OauthResource>;
  }

  async update(id: string, data: Partial<OauthResource>): Promise<OauthResource | null> {
    const existing = await this.db.findById<OauthResource>(id);
    if (!existing) return null;

    const updated: OauthResource = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.db.save<OauthResource>(updated as any) as Promise<OauthResource>;
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.db.exists(id);
  }

  async count(where?: Partial<OauthResource>): Promise<number> {
    return this.db.count(where);
  }

  async findByAppId(appId: string): Promise<OauthResource[]> {
    return this.db.findMany<OauthResource>({ appId } as any) as Promise<OauthResource[]>;
  }

  /**
   * Find all authorizations for an appId
   * Returns array since one appId can have multiple authorizations (by resourceKey)
   */
  async findByApp(appId: string): Promise<OauthResource[]> {
    return this.db.findMany<OauthResource>({ appId } as any) as Promise<OauthResource[]>;
  }

  async findByAppAndResource(appId: string, resourceKey: string): Promise<OauthResource | null> {
    return this.db.findOne<OauthResource>({ appId, resourceKey } as any) as Promise<OauthResource | null>;
  }

  async upsert(data: Omit<OauthResource, 'id' | 'createdAt' | 'updatedAt' | 'authorizedAt'>): Promise<OauthResource> {
    // Check if exists
    const existing = await this.findByAppAndResource(data.appId, data.resourceKey || '');

    if (existing) {
      // Update existing
      return this.update(existing.id, data) as Promise<OauthResource>;
    }

    // Create new - create method will add authorizedAt
    return this.create(data as Omit<OauthResource, 'id' | 'createdAt' | 'updatedAt'>) as Promise<OauthResource>;
  }
}

// Legacy alias for backward compatibility
export { OauthResourceRepositoryImpl as AuthorizationRepositoryImpl };
