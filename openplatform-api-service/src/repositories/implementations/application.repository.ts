/**
 * Application Repository Implementation
 */

import { StorageAdapter } from '../storage.adapter'
import { Application } from '../../types/isv.types'
import { ApplicationRepository } from '../repository.interfaces'
import { v4 as uuidv4 } from 'uuid'

export class ApplicationRepositoryImpl implements ApplicationRepository {
  constructor(private readonly db: StorageAdapter) {}

  async findById(id: string): Promise<Application | null> {
    return this.db.findById<Application>(id) as Promise<Application | null>
  }

  async findOne(where: Partial<Application>): Promise<Application | null> {
    return this.db.findOne<Application>(where) as Promise<Application | null>
  }

  async findMany(where?: Partial<Application>): Promise<Application[]> {
    return this.db.findMany<Application>(where) as Promise<Application[]>
  }

  async findAll(): Promise<Application[]> {
    return this.db.findAll<Application>() as Promise<Application[]>
  }

  async create(data: Omit<Application, 'id'>): Promise<Application> {
    const id = uuidv4()
    const appId = `app_${id.substring(0, 16)}`
    const appSecret = data.appSecret || `sk_${id.replace(/-/g, '').substring(0, 32)}`
    const now = new Date().toISOString()
    const app: Application = {
      id,
      isvDeveloperId: data.isvDeveloperId,
      name: data.name,
      appId,
      appSecret,
      description: data.description,
      callbackUrl: data.callbackUrl,
      type: data.type,
      status: data.status,
      permittedUsers: data.permittedUsers,
      createdAt: now,
      updatedAt: now
    }
    await this.db.insert(app)
    return app
  }

  async update(id: string, data: Partial<Application>): Promise<Application | null> {
    const now = new Date().toISOString()
    const result = await this.db.update(id, { ...data, updatedAt: now })
    return result as Application | null
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return this.db.exists(id)
  }

  async count(where?: Partial<Application>): Promise<number> {
    return this.db.count(where)
  }

  async findByAppId(appId: string): Promise<Application | null> {
    return this.db.findOne<Application>({ appId }) as Promise<Application | null>
  }

  async findByIsvDeveloper(isvDeveloperId: string): Promise<Application[]> {
    return this.db.findMany<Application>({ isvDeveloperId }) as Promise<Application[]>
  }
}
