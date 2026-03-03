/**
 * Endpoint Permission Repository Implementation
 */

import { StorageAdapter } from '../storage.adapter'
import { EndpointPermissionConfig } from '../../types/permission.types'
import { EndpointPermissionRepository } from '../repository.interfaces'
import { v4 as uuidv4 } from 'uuid'

export class EndpointPermissionRepositoryImpl implements EndpointPermissionRepository {
  constructor(private readonly db: StorageAdapter) {}

  async findById(id: string): Promise<EndpointPermissionConfig | null> {
    return this.db.findById<EndpointPermissionConfig>(id) as Promise<EndpointPermissionConfig | null>
  }

  async findOne(where: Partial<EndpointPermissionConfig>): Promise<EndpointPermissionConfig | null> {
    return this.db.findOne<EndpointPermissionConfig>(where) as Promise<EndpointPermissionConfig | null>
  }

  async findMany(where?: Partial<EndpointPermissionConfig>): Promise<EndpointPermissionConfig[]> {
    return this.db.findMany<EndpointPermissionConfig>(where) as Promise<EndpointPermissionConfig[]>
  }

  async findAll(): Promise<EndpointPermissionConfig[]> {
    return this.db.findAll<EndpointPermissionConfig>() as Promise<EndpointPermissionConfig[]>
  }

  async create(data: Omit<EndpointPermissionConfig, 'id'>): Promise<EndpointPermissionConfig> {
    const id = uuidv4()
    const now = new Date().toISOString()
    const config: EndpointPermissionConfig = {
      id,
      path: data.path,
      method: data.method,
      required_permissions: data.required_permissions,
      description: data.description,
      is_active: data.is_active,
      created_at: now,
      updated_at: now
    }
    await this.db.insert(config)
    return config
  }

  async update(id: string, data: Partial<EndpointPermissionConfig>): Promise<EndpointPermissionConfig | null> {
    const now = new Date().toISOString()
    const result = await this.db.update(id, { ...data, updated_at: now })
    return result as EndpointPermissionConfig | null
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return this.db.exists(id)
  }

  async count(where?: Partial<EndpointPermissionConfig>): Promise<number> {
    return this.db.count(where)
  }

  async findByPathAndMethod(path: string, method: string): Promise<EndpointPermissionConfig | null> {
    const configs = await this.db.findMany<EndpointPermissionConfig>({ path, method })
    return configs[0] || null
  }
}
