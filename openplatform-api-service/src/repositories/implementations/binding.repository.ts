/**
 * Binding Repository Implementation
 */

import { StorageAdapter } from '../storage.adapter'
import { AppEnterpriseBinding, BindingStatus } from '../../types/binding.types'
import { BindingRepository } from '../repository.interfaces'
import { v4 as uuidv4 } from 'uuid'

export class BindingRepositoryImpl implements BindingRepository {
  constructor(private readonly db: StorageAdapter) {}

  private getKey(id: string): string {
    return `binding:${id}`
  }

  async findById(id: string): Promise<AppEnterpriseBinding | null> {
    return this.db.findById<AppEnterpriseBinding>(this.getKey(id)) as Promise<AppEnterpriseBinding | null>
  }

  async findOne(where: Partial<AppEnterpriseBinding>): Promise<AppEnterpriseBinding | null> {
    return this.db.findOne<AppEnterpriseBinding>(where) as Promise<AppEnterpriseBinding | null>
  }

  async findMany(where?: Partial<AppEnterpriseBinding>): Promise<AppEnterpriseBinding[]> {
    return this.db.findMany<AppEnterpriseBinding>(where) as Promise<AppEnterpriseBinding[]>
  }

  async findAll(): Promise<AppEnterpriseBinding[]> {
    return this.db.findAll<AppEnterpriseBinding>() as Promise<AppEnterpriseBinding[]>
  }

  async create(data: Omit<AppEnterpriseBinding, 'id'>): Promise<AppEnterpriseBinding> {
    const id = uuidv4()
    const now = Date.now()
    const binding: AppEnterpriseBinding = {
      id,
      appid: data.appid,
      enterprise_id: data.enterprise_id,
      permissions: data.permissions,
      status: data.status,
      expires_at: data.expires_at,
      created_at: now,
      updated_at: now
    }
    await this.db.insert(binding)
    return binding
  }

  async update(id: string, data: Partial<AppEnterpriseBinding>): Promise<AppEnterpriseBinding | null> {
    const now = Date.now()
    const result = await this.db.update(id, { ...data, updated_at: now })
    return result as AppEnterpriseBinding | null
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return this.db.exists(id)
  }

  async count(where?: Partial<AppEnterpriseBinding>): Promise<number> {
    return this.db.count(where)
  }

  async findByAppAndEnterprise(appid: string, enterpriseId: string): Promise<AppEnterpriseBinding | null> {
    const bindings = await this.db.findMany<AppEnterpriseBinding>({ appid, enterprise_id: enterpriseId })
    return bindings[0] || null
  }

  async findByAppid(appid: string): Promise<AppEnterpriseBinding[]> {
    return this.db.findMany<AppEnterpriseBinding>({ appid }) as Promise<AppEnterpriseBinding[]>
  }

  async findByEnterpriseId(enterpriseId: string): Promise<AppEnterpriseBinding[]> {
    return this.db.findMany<AppEnterpriseBinding>({ enterprise_id: enterpriseId }) as Promise<AppEnterpriseBinding[]>
  }
}
