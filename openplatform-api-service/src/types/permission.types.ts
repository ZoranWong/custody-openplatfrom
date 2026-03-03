/**
 * Permission Type Definitions
 * Types for endpoint permission checking
 */

import { Entity } from '../repositories/storage.adapter'

/**
 * Permission error codes
 */
export enum PermissionErrorCode {
  INSUFFICIENT_PERMISSIONS = 40305,
  PERMISSION_CONFIG_NOT_FOUND = 40306,
}

/**
 * Endpoint permission configuration
 */
export interface EndpointPermissionConfig extends Entity {
  path: string
  method: string
  required_permissions: string[]
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean
  missing_permissions?: string[]
  error_code?: number
  error_message?: string
  matched_config?: EndpointPermissionConfig
}

/**
 * Repository interface for endpoint permissions
 */
export interface EndpointPermissionRepository {
  findById(id: string): Promise<EndpointPermissionConfig | null>
  findByPathAndMethod(path: string, method: string): Promise<EndpointPermissionConfig | null>
  findAll(): Promise<EndpointPermissionConfig[]>
  findMany(condition: Partial<EndpointPermissionConfig>): Promise<EndpointPermissionConfig[]>
  create(data: Omit<EndpointPermissionConfig, 'id' | 'created_at' | 'updated_at'>): Promise<EndpointPermissionConfig>
  update(id: string, data: Partial<EndpointPermissionConfig>): Promise<EndpointPermissionConfig | null>
  delete(id: string): Promise<boolean>
}
