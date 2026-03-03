/**
 * ISV User Repository Implementation
 */

import { StorageAdapter } from '../storage.adapter'
import { ISVUser } from '../../types/isv.types'
import { ISVUserRepository } from '../repository.interfaces'
import { v4 as uuidv4 } from 'uuid'

export class ISVUserRepositoryImpl implements ISVUserRepository {
  constructor(private readonly db: StorageAdapter) {}

  async findById(id: string): Promise<ISVUser | null> {
    return this.db.findById<ISVUser>(id) as Promise<ISVUser | null>
  }

  async findOne(where: Partial<ISVUser>): Promise<ISVUser | null> {
    return this.db.findOne<ISVUser>(where) as Promise<ISVUser | null>
  }

  async findMany(where?: Partial<ISVUser>): Promise<ISVUser[]> {
    return this.db.findMany<ISVUser>(where) as Promise<ISVUser[]>
  }

  async findAll(): Promise<ISVUser[]> {
    return this.db.findAll<ISVUser>() as Promise<ISVUser[]>
  }

  async create(data: Omit<ISVUser, 'id'>): Promise<ISVUser> {
    const id = uuidv4()
    const now = new Date().toISOString()
    const user: ISVUser = {
      id,
      isvId: data.isvId,
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      role: data.role,
      status: data.status,
      allowedApplications: data.allowedApplications,
      createdAt: now,
      updatedAt: now
    }
    await this.db.insert(user)
    return user
  }

  async update(id: string, data: Partial<ISVUser>): Promise<ISVUser | null> {
    const now = new Date().toISOString()
    const result = await this.db.update(id, { ...data, updatedAt: now })
    return result as ISVUser | null
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return this.db.exists(id)
  }

  async count(where?: Partial<ISVUser>): Promise<number> {
    return this.db.count(where)
  }

  async findByEmail(email: string): Promise<ISVUser | null> {
    return this.db.findOne<ISVUser>({ email }) as Promise<ISVUser | null>
  }

  async findByISV(isvId: string): Promise<ISVUser[]> {
    return this.db.findMany<ISVUser>({ isvId }) as Promise<ISVUser[]>
  }

  async findByISVAndEmail(isvId: string, email: string): Promise<ISVUser | null> {
    const users = await this.db.findMany<ISVUser>({ isvId, email })
    return users[0] || null
  }
}
