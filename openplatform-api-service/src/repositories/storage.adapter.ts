/**
 * Storage Adapter Interface
 * Database-like interface for storage operations
 */

export type StorageDriver = 'file' | 'memory' | 'mysql'

/**
 * Generic entity interface
 */
export interface Entity {
  id: string
}

/**
 * Storage Adapter Interface
 * Provides database-like operations
 */
export interface StorageAdapter {
  /**
   * Get the table/collection name
   */
  getTableName(): string

  /**
   * Save (insert or update) an entity
   */
  save<T extends Entity>(entity: T): Promise<T>

  /**
   * Insert a new entity (ID auto-generated)
   */
  insert<T extends Omit<Entity, 'id'>>(data: T): Promise<T & { id: string }>

  /**
   * Update an existing entity by ID
   */
  update<T>(id: string, data: Partial<T>): Promise<T | null>

  /**
   * Delete an entity by ID
   */
  delete(id: string): Promise<boolean>

  /**
   * Find entity by ID
   */
  findById<T extends Entity>(id: string): Promise<T | null>

  /**
   * Find single entity by condition
   */
  findOne<T extends Entity>(condition: Partial<T>): Promise<T | null>

  /**
   * Find all entities matching condition
   */
  findMany<T extends Entity>(condition?: Partial<T>): Promise<T[]>

  /**
   * Find all entities
   */
  findAll<T extends Entity>(): Promise<T[]>

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>

  /**
   * Count entities
   */
  count(condition?: Partial<Entity>): Promise<number>

  /**
   * Clear all data in table
   */
  clear(): Promise<void>
}
