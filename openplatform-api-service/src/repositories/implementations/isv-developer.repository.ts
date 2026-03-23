/**
 * IsvDeveloper Repository Implementation
 */

import { StorageAdapter } from '../storage.adapter'
import { IsvDeveloper } from '../../types/isv.types'
import { IsvDeveloperRepository } from '../repository.interfaces'
import { v4 as uuidv4 } from 'uuid'

export class IsvDeveloperRepositoryImpl implements IsvDeveloperRepository {
  constructor(private readonly db: StorageAdapter) {}

  async findById(id: string): Promise<IsvDeveloper | null> {
    return this.db.findById<IsvDeveloper>(id) as Promise<IsvDeveloper | null>
  }

  async findOne(where: Partial<IsvDeveloper>): Promise<IsvDeveloper | null> {
    return this.db.findOne<IsvDeveloper>(where) as Promise<IsvDeveloper | null>
  }

  async findMany(where?: Partial<IsvDeveloper>): Promise<IsvDeveloper[]> {
    return this.db.findMany<IsvDeveloper>(where) as Promise<IsvDeveloper[]>
  }

  async create(data: Omit<IsvDeveloper, 'id'>): Promise<IsvDeveloper> {
    const id = uuidv4()
    const now = new Date().toISOString()
    const isvDeveloper: IsvDeveloper = {
      id,
      email: data.email,
      legalName: data.legalName,
      passwordHash: data.passwordHash,
      registrationNumber: data.registrationNumber,
      jurisdiction: data.jurisdiction,
      dateOfIncorporation: data.dateOfIncorporation,
      registeredAddress: data.registeredAddress,
      website: data.website,
      uboInfo: data.uboInfo,
      kybStatus: data.kybStatus || 'pending',
      status: data.status || 'active',
      createdAt: now,
      updatedAt: now
    }
    await (this.db as any).save(isvDeveloper)
    return isvDeveloper
  }

  async update(id: string, data: Partial<IsvDeveloper>): Promise<IsvDeveloper | null> {
    const now = new Date().toISOString()
    const result = await this.db.update(id, { ...data, updatedAt: now })
    return result as IsvDeveloper | null
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return this.db.exists(id)
  }

  async count(where?: Partial<IsvDeveloper>): Promise<number> {
    return this.db.count(where)
  }

  async findAll(): Promise<IsvDeveloper[]> {
    return this.db.findAll<IsvDeveloper>() as Promise<IsvDeveloper[]>
  }

  async findByEmail(email: string): Promise<IsvDeveloper | null> {
    return this.db.findOne<IsvDeveloper>({ email }) as Promise<IsvDeveloper | null>
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<IsvDeveloper | null> {
    return this.db.findOne<IsvDeveloper>({ registrationNumber }) as Promise<IsvDeveloper | null>
  }
}
