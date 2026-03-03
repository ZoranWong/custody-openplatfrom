/**
 * Admin Repository Implementation
 * Manages admin users with file-based storage
 */

import { StorageAdapter } from '../storage.adapter'
import { Admin, AdminRepository } from '../repository.interfaces'

export class AdminRepositoryImpl implements AdminRepository {
  constructor(private readonly db: StorageAdapter) {}

  async findById(id: string): Promise<Admin | null> {
    return this.db.findById<Admin>(id) as Promise<Admin | null>
  }

  async findOne(where: Partial<Admin>): Promise<Admin | null> {
    return this.db.findOne<Admin>(where) as Promise<Admin | null>
  }

  async findMany(where?: Partial<Admin>): Promise<Admin[]> {
    return this.db.findMany<Admin>(where) as Promise<Admin[]>
  }

  async findAll(): Promise<Admin[]> {
    return this.db.findAll<Admin>() as Promise<Admin[]>
  }

  async create(data: Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>): Promise<Admin> {
    const id = `admin-${Date.now()}`
    const now = new Date().toISOString()
    const admin: Admin = {
      id,
      email: data.email,
      name: data.name,
      password: data.password,
      role: data.role,
      status: data.status,
      createdAt: now,
      updatedAt: now
    }
    await (this.db as any).save(admin)
    return admin
  }

  async update(id: string, data: Partial<Admin>): Promise<Admin | null> {
    const now = new Date().toISOString()
    const result = await this.db.update(id, { ...data, updatedAt: now })
    return result as Admin | null
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return this.db.exists(id)
  }

  async count(where?: Partial<Admin>): Promise<number> {
    return this.db.count(where)
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.db.findOne<Admin>({ email }) as Promise<Admin | null>
  }

  async findByRole(role: 'super_admin' | 'admin' | 'operator'): Promise<Admin[]> {
    return this.db.findMany<Admin>({ role }) as Promise<Admin[]>
  }

  async findActive(): Promise<Admin[]> {
    return this.db.findMany<Admin>({ status: 'active' }) as Promise<Admin[]>
  }
}
