/**
 * Unified Repository Interface
 * Generic CRUD interface for all entities
 */

/**
 * Base entity interface
 */
export interface EntityBase {
  id: string
}

/**
 * Generic Repository interface for CRUD operations
 * All entity repositories should implement this interface
 */
export interface Repository<Entity extends EntityBase> {
  findById(id: string): Promise<Entity | null>
  findOne(where: Partial<Entity>): Promise<Entity | null>
  findMany(where?: Partial<Entity>): Promise<Entity[]>
  findAll(): Promise<Entity[]>
  create(data: Partial<Entity>): Promise<Entity>
  update(id: string, data: Partial<Entity>): Promise<Entity | null>
  delete(id: string): Promise<boolean>
  exists(id: string): Promise<boolean>
  count(where?: Partial<Entity>): Promise<number>
}
