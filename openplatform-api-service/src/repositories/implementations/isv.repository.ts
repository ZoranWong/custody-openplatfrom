/**
 * ISV Repository Implementation
 */

import { StorageAdapter } from '../storage.adapter'
import { ISV } from '../../types/isv.types'
import { ISVRepository } from '../repository.interfaces'
import { v4 as uuidv4 } from 'uuid'

export class ISVRepositoryImpl implements ISVRepository {
  constructor(private readonly db: StorageAdapter) {}

  async findById(id: string): Promise<ISV | null> {
    return this.db.findById<ISV>(id) as Promise<ISV | null>
  }

  async findOne(where: Partial<ISV>): Promise<ISV | null> {
    return this.db.findOne<ISV>(where) as Promise<ISV | null>
  }

  async findMany(where?: Partial<ISV>): Promise<ISV[]> {
    return this.db.findMany<ISV>(where) as Promise<ISV[]>
  }

  async create(data: Omit<ISV, 'id'>): Promise<ISV> {
    const id = uuidv4()
    const now = new Date().toISOString()
    const isv: ISV = {
      id,
      legalName: data.legalName,
      registrationNumber: data.registrationNumber,
      jurisdiction: data.jurisdiction,
      dateOfIncorporation: data.dateOfIncorporation,
      registeredAddress: data.registeredAddress,
      website: data.website,
      kybStatus: data.kybStatus,
      status: data.status,
      uboInfo: data.uboInfo,
      createdAt: now,
      updatedAt: now
    }
    await (this.db as any).save(isv) // insert() would generate a new uuid
    return isv
  }

  async update(id: string, data: Partial<ISV>): Promise<ISV | null> {
    const now = new Date().toISOString()
    const result = await this.db.update(id, { ...data, updatedAt: now })
    return result as ISV | null
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return this.db.exists(id)
  }

  async count(where?: Partial<ISV>): Promise<number> {
    return this.db.count(where)
  }

  async findAll(): Promise<ISV[]> {
    return this.db.findAll<ISV>() as Promise<ISV[]>
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<ISV | null> {
    return this.db.findOne<ISV>({ registrationNumber }) as Promise<ISV | null>
  }
}
