/**
 * Binding Type Definitions
 * Types for app-enterprise binding validation
 */

import { Entity } from '../repositories/storage.adapter'

/**
 * App-Enterprise Binding status
 */
export type BindingStatus = 'active' | 'expired' | 'revoked'

/**
 * App-Enterprise Binding record
 */
export interface AppEnterpriseBinding extends Entity {
  appid: string
  enterprise_id: string
  permissions: string[]
  status: BindingStatus
  expires_at: number | null
  created_at: number
  updated_at: number
}

/**
 * Binding validation result
 */
export interface BindingValidationResult {
  valid: boolean
  enterprise_id?: string
  permissions?: string[]
  error_code?: number
  error_message?: string
}

/**
 * Error codes for binding validation
 */
export enum BindingErrorCode {
  APP_NOT_BOUND = 40301,
  ENTERPRISE_NOT_FOUND = 40302,
  BINDING_EXPIRED = 40303,
  BINDING_REVOKED = 40304,
}
