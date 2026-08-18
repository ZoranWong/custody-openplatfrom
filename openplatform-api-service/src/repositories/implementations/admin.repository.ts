/**
 * Admin Repository Implementation
 * Client obtained from db-client.getClient().
 */

import { Prisma, Admin } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { AdminRepository } from '../repository.interfaces'

export class AdminRepositoryImpl extends BaseRepository<Prisma.AdminDelegate> implements AdminRepository {
  protected get modelName(): string {
    return 'admin'
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.model.findUnique({ where: { email } })
  }

  async findByRole(role: string): Promise<Admin[]> {
    return this.model.findMany({ where: { role } })
  }

  async findActive(): Promise<Admin[]> {
    return this.model.findMany({ where: { status: 'active' } })
  }

  async findAll(): Promise<Admin[]> {
    return this.model.findMany()
  }
}