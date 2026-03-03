/**
 * MySQL Storage Adapter
 * Prisma-based MySQL storage implementation
 */

import { v4 as uuidv4 } from 'uuid'
import { StorageAdapter, Entity } from './storage.adapter'
import { getPrismaClient } from '../database/prisma-client'
import { PrismaClient } from '@prisma/client'

type PrismaWhereInput = Record<string, unknown>

/**
 * Map plural table names to singular Prisma model names
 */
const TABLE_TO_MODEL_MAP: Record<string, string> = {
  developers: 'developer',
  applications: 'application',
  isv_enterprises: 'isvEnterprise',
  oauth_resources: 'oauthResource',
  webhooks: 'webhook',
  api_logs: 'apiLog',
  metrics: 'metric',
  traces: 'trace',
}

/**
 * MySQL storage adapter using Prisma
 */
export class MySQLStorageAdapter implements StorageAdapter {
  private readonly tableName: string
  private readonly prisma: PrismaClient

  constructor(tableName: string) {
    this.tableName = tableName
    this.prisma = getPrismaClient()
  }

  /**
   * Get the Prisma model name for this table
   */
  private getModelName(): string {
    return TABLE_TO_MODEL_MAP[this.tableName] || this.tableName
  }

  getTableName(): string {
    return this.tableName
  }

  /**
   * Get the Prisma model for operations
   */
  private getModel() {
    const modelName = this.getModelName()
    return this.prisma[modelName as keyof PrismaClient] as any
  }

  /**
   * Convert entity to Prisma where clause
   */
  private toWhereClause<T extends Entity>(condition: Partial<T>): PrismaWhereInput {
    return condition as PrismaWhereInput
  }

  /**
   * Save (insert or update) an entity
   */
  async save<T extends Entity>(entity: T): Promise<T> {
    const data = entity as Record<string, unknown>
    delete data.id

    await this.getModel().upsert({
      where: { id: entity.id },
      update: data,
      create: { ...data, id: entity.id },
    })

    return entity
  }

  /**
   * Insert a new entity (ID auto-generated)
   */
  async insert<T extends Omit<Entity, 'id'>>(data: T): Promise<T & { id: string }> {
    const id = uuidv4()
    const entity = { ...data, id } as T & { id: string }

    await this.getModel().create({
      data: entity,
    })

    return entity
  }

  /**
   * Update an existing entity by ID
   */
  async update<T>(id: string, data: Partial<T>): Promise<T | null> {
    try {
      const updated = await this.getModel().update({
        where: { id },
        data,
      })
      return updated as T
    } catch (error) {
      // Prisma throws P2025 when record not found
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        return null
      }
      throw error
    }
  }

  /**
   * Delete an entity by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.getModel().delete({
        where: { id },
      })
      return true
    } catch (error) {
      // Prisma throws P2025 when record not found
      if (error instanceof Error && error.message.includes('Record to delete not found')) {
        return false
      }
      throw error
    }
  }

  /**
   * Find entity by ID
   */
  async findById<T extends Entity>(id: string): Promise<T | null> {
    const result = await this.getModel().findUnique({
      where: { id },
    })
    return result as T | null
  }

  /**
   * Find single entity by condition
   */
  async findOne<T extends Entity>(condition: Partial<T>): Promise<T | null> {
    const result = await this.getModel().findFirst({
      where: this.toWhereClause(condition),
    })
    return result as T | null
  }

  /**
   * Find all entities matching condition
   */
  async findMany<T extends Entity>(condition?: Partial<T>): Promise<T[]> {
    const results = await this.getModel().findMany({
      where: condition ? this.toWhereClause(condition) : undefined,
    })
    return results as T[]
  }

  /**
   * Find all entities
   */
  async findAll<T extends Entity>(): Promise<T[]> {
    const results = await this.getModel().findMany()
    return results as T[]
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.getModel().findUnique({
      where: { id },
      select: { id: true },
    })
    return result !== null
  }

  /**
   * Count entities
   */
  async count(condition?: Partial<Entity>): Promise<number> {
    const count = await this.getModel().count({
      where: condition ? this.toWhereClause(condition) : undefined,
    })
    return count
  }

  /**
   * Clear all data in table
   */
  async clear(): Promise<void> {
    await this.getModel().deleteMany({})
  }
}
