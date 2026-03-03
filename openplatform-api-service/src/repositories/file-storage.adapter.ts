/**
 * File Storage Adapter
 * File-based storage with table concepts
 */

import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { StorageAdapter, Entity } from './storage.adapter'

const DATA_DIR = path.resolve(process.cwd(), 'data')

// Ensure data directory exists
async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch {
    // Directory exists
  }
}

/**
 * File-based storage adapter with table concepts
 */
export class FileStorageAdapter implements StorageAdapter {
  private readonly tableName: string
  private cache = new Map<string, Record<string, unknown>>()

  constructor(tableName: string) {
    this.tableName = tableName
  }

  getTableName(): string {
    return this.tableName
  }

  private getFilePath(): string {
    return path.join(DATA_DIR, `${this.tableName}.json`)
  }

  /**
   * Load table data from file
   */
  async load(): Promise<void> {
    try {
      const filePath = this.getFilePath()
      const content = await fs.readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      this.cache.clear()
      for (const [key, value] of Object.entries(data)) {
        this.cache.set(key, value as Record<string, unknown>)
      }
    } catch {
      // File doesn't exist, start with empty table
    }
  }

  /**
   * Save table data to file
   */
  async saveToFile(): Promise<void> {
    await ensureDir()
    const filePath = this.getFilePath()
    const data: Record<string, Record<string, unknown>> = {}
    for (const [key, value] of this.cache.entries()) {
      data[key] = value
    }
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Save (insert or update) an entity
   */
  async save<T extends Entity>(entity: T): Promise<T> {
    await this.load()
    this.cache.set(entity.id, entity as Record<string, unknown>)
    await this.saveToFile()
    return entity
  }

  /**
   * Insert a new entity (ID auto-generated)
   */
  async insert<T extends Omit<Entity, 'id'>>(data: T): Promise<T & { id: string }> {
    await this.load()
    const id = uuidv4()
    const entity = { ...data, id } as T & { id: string }
    this.cache.set(id, entity as Record<string, unknown>)
    await this.saveToFile()
    return entity
  }

  /**
   * Update an existing entity by ID
   */
  async update<T>(id: string, data: Partial<T>): Promise<T | null> {
    await this.load()
    const existing = this.cache.get(id)
    if (!existing) return null

    const updated = { ...(existing as T), ...data } as T
    this.cache.set(id, updated as Record<string, unknown>)
    await this.saveToFile()
    return updated
  }

  /**
   * Delete an entity by ID
   */
  async delete(id: string): Promise<boolean> {
    await this.load()
    const deleted = this.cache.delete(id)
    if (deleted) {
      await this.saveToFile()
    }
    return deleted
  }

  /**
   * Find entity by ID
   */
  async findById<T extends Entity>(id: string): Promise<T | null> {
    await this.load()
    const entity = this.cache.get(id)
    return (entity as T) || null
  }

  /**
   * Find single entity by condition
   */
  async findOne<T extends Entity>(condition: Partial<T>): Promise<T | null> {
    await this.load()
    for (const entity of this.cache.values()) {
      let match = true
      for (const [key, value] of Object.entries(condition)) {
        if ((entity as Record<string, unknown>)[key] !== value) {
          match = false
          break
        }
      }
      if (match) {
        return entity as T
      }
    }
    return null
  }

  /**
   * Find all entities matching condition
   */
  async findMany<T extends Entity>(condition?: Partial<T>): Promise<T[]> {
    await this.load()
    const results: T[] = []
    for (const entity of this.cache.values()) {
      if (!condition) {
        results.push(entity as T)
        continue
      }
      let match = true
      for (const [key, value] of Object.entries(condition)) {
        if ((entity as Record<string, unknown>)[key] !== value) {
          match = false
          break
        }
      }
      if (match) {
        results.push(entity as T)
      }
    }
    return results
  }

  /**
   * Find all entities
   */
  async findAll<T extends Entity>(): Promise<T[]> {
    await this.load()
    return Array.from(this.cache.values()) as T[]
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    await this.load()
    return this.cache.has(id)
  }

  /**
   * Count entities
   */
  async count(_condition?: Partial<Entity>): Promise<number> {
    await this.load()
    return this.cache.size
  }

  /**
   * Clear all data in table
   */
  async clear(): Promise<void> {
    this.cache.clear()
    await this.saveToFile()
  }
}

/**
 * Memory storage adapter (for testing)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly tableName: string
  private cache = new Map<string, Record<string, unknown>>()

  constructor(tableName: string) {
    this.tableName = tableName
  }

  getTableName(): string {
    return this.tableName
  }

  async save<T extends Entity>(entity: T): Promise<T> {
    this.cache.set(entity.id, entity as Record<string, unknown>)
    return entity
  }

  async insert<T extends Omit<Entity, 'id'>>(data: T): Promise<T & { id: string }> {
    const id = uuidv4()
    const entity = { ...data, id } as T & { id: string }
    this.cache.set(id, entity as Record<string, unknown>)
    return entity
  }

  async update<T>(id: string, data: Partial<T>): Promise<T | null> {
    const existing = this.cache.get(id)
    if (!existing) return null
    const updated = { ...(existing as T), ...data } as T
    this.cache.set(id, updated as Record<string, unknown>)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    return this.cache.delete(id)
  }

  async findById<T extends Entity>(id: string): Promise<T | null> {
    return (this.cache.get(id) as T) || null
  }

  async findOne<T extends Entity>(condition: Partial<T>): Promise<T | null> {
    for (const entity of this.cache.values()) {
      let match = true
      for (const [key, value] of Object.entries(condition)) {
        if ((entity as Record<string, unknown>)[key] !== value) {
          match = false
          break
        }
      }
      if (match) return entity as T
    }
    return null
  }

  async findMany<T extends Entity>(condition?: Partial<T>): Promise<T[]> {
    const results: T[] = []
    for (const entity of this.cache.values()) {
      if (!condition) {
        results.push(entity as T)
        continue
      }
      let match = true
      for (const [key, value] of Object.entries(condition)) {
        if ((entity as Record<string, unknown>)[key] !== value) {
          match = false
          break
        }
      }
      if (match) results.push(entity as T)
    }
    return results
  }

  async findAll<T extends Entity>(): Promise<T[]> {
    return Array.from(this.cache.values()) as T[]
  }

  async exists(id: string): Promise<boolean> {
    return this.cache.has(id)
  }

  async count(_condition?: Partial<Entity>): Promise<number> {
    return this.cache.size
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }
}
