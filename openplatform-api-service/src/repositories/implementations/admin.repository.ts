/**
 * Admin Repository Implementation
 * Uses Prisma Client directly
 */

import { PrismaClient, Prisma, Admin } from '@prisma/client'
import { AdminRepository } from '../repository.interfaces'

export class AdminRepositoryImpl implements AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({ where: { email } })
  }

  async findByRole(role: string): Promise<Admin[]> {
    return this.prisma.admin.findMany({ where: { role } })
  }

  async findActive(): Promise<Admin[]> {
    return this.prisma.admin.findMany({ where: { status: 'active' } })
  }

  async findAll(): Promise<Admin[]> {
    return this.prisma.admin.findMany()
  }

  async create(data: Prisma.AdminCreateInput): Promise<Admin> {
    return this.prisma.admin.create({ data })
  }

  async update(id: string, data: Prisma.AdminUpdateInput): Promise<Admin> {
    return this.prisma.admin.update({ where: { id }, data })
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.admin.delete({ where: { id } })
    return true
  }
}
