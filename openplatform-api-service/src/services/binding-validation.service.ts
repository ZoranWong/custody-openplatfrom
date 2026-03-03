/**
 * Binding Validation Service
 * Validates app-enterprise bindings and manages permissions
 */

import {
  BindingValidationResult,
  BindingErrorCode,
  AppEnterpriseBinding,
  BindingStatus,
} from '../types/binding.types';
import { BindingRepository } from '../repositories/repository.interfaces';

/**
 * Simple structured logger
 */
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', message, ...data }));
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...data }));
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...data }));
  },
};

/**
 * Validate input parameters
 */
function validateInput(appid: string, enterpriseId: string): void {
  if (!appid || typeof appid !== 'string' || appid.trim() === '') {
    throw new Error('Invalid appid: must be a non-empty string');
  }
  if (!enterpriseId || typeof enterpriseId !== 'string' || enterpriseId.trim() === '') {
    throw new Error('Invalid enterpriseId: must be a non-empty string');
  }
}

/**
 * Binding Validation Service
 * Handles app-enterprise binding validation
 */
export class BindingValidationService {
  constructor(private readonly repository: BindingRepository) {}

  /**
   * Validate app-enterprise binding
   */
  async validateBinding(
    appid: string,
    enterpriseId: string
  ): Promise<BindingValidationResult> {
    validateInput(appid, enterpriseId);

    // Query database
    const binding = await this.repository.findByAppAndEnterprise(
      appid,
      enterpriseId
    );

    // Handle binding not found
    if (!binding) {
      logger.warn('binding_validation_failed', { appid, enterpriseId, reason: 'not_found' });
      return {
        valid: false,
        error_code: BindingErrorCode.APP_NOT_BOUND,
        error_message: 'Application not authorized for this enterprise',
      };
    }

    // Check binding status
    return this.checkBindingStatus(binding);
  }

  /**
   * Check binding status (expired, revoked, etc.)
   */
  private checkBindingStatus(binding: AppEnterpriseBinding): BindingValidationResult {
    // Check if binding is revoked
    if (binding.status === 'revoked') {
      return {
        valid: false,
        error_code: BindingErrorCode.BINDING_REVOKED,
        error_message: 'Application binding has been revoked',
      };
    }

    // Check if binding is expired
    if (binding.expires_at !== null && binding.expires_at < Date.now()) {
      return {
        valid: false,
        error_code: BindingErrorCode.BINDING_EXPIRED,
        error_message: 'Application binding has expired',
      };
    }

    // Binding is valid
    return {
      valid: true,
      enterprise_id: binding.enterprise_id,
      permissions: binding.permissions,
    };
  }

  /**
   * Get permissions for a binding
   */
  async getPermissions(
    appid: string,
    enterpriseId: string
  ): Promise<string[] | null> {
    validateInput(appid, enterpriseId);

    const binding = await this.repository.findByAppAndEnterprise(
      appid,
      enterpriseId
    );

    if (!binding) {
      return null;
    }

    const statusResult = this.checkBindingStatus(binding);
    if (!statusResult.valid) {
      return null;
    }

    return binding.permissions;
  }

  /**
   * Get binding record
   */
  async getBinding(
    appid: string,
    enterpriseId: string
  ): Promise<AppEnterpriseBinding | null> {
    validateInput(appid, enterpriseId);
    return this.repository.findByAppAndEnterprise(appid, enterpriseId);
  }

  /**
   * Validate permissions array
   */
  private validatePermissions(permissions: string[]): void {
    if (!Array.isArray(permissions)) {
      throw new Error('Permissions must be an array');
    }
    for (const perm of permissions) {
      if (typeof perm !== 'string' || perm.trim() === '') {
        throw new Error('Each permission must be a non-empty string');
      }
    }
  }

  /**
   * Create a new binding
   */
  async createBinding(
    appid: string,
    enterpriseId: string,
    permissions: string[],
    expiresAt: number | null = null
  ): Promise<AppEnterpriseBinding> {
    validateInput(appid, enterpriseId);
    this.validatePermissions(permissions);

    const now = Date.now();
    return this.repository.create({
      appid,
      enterprise_id: enterpriseId,
      permissions,
      status: 'active',
      expires_at: expiresAt,
    });
  }

  /**
   * Update binding permissions
   */
  async updatePermissions(
    appid: string,
    enterpriseId: string,
    permissions: string[]
  ): Promise<boolean> {
    validateInput(appid, enterpriseId);
    this.validatePermissions(permissions);

    const binding = await this.repository.findByAppAndEnterprise(appid, enterpriseId);
    if (!binding) {
      return false;
    }

    return this.repository.update(binding.id, { permissions }).then(r => r !== null);
  }

  /**
   * Revoke a binding
   */
  async revokeBinding(
    appid: string,
    enterpriseId: string
  ): Promise<boolean> {
    validateInput(appid, enterpriseId);

    const binding = await this.repository.findByAppAndEnterprise(appid, enterpriseId);
    if (!binding) {
      return false;
    }

    return this.repository.update(binding.id, { status: 'revoked' }).then(Boolean);
  }

  /**
   * Expire a binding
   */
  async expireBinding(
    appid: string,
    enterpriseId: string
  ): Promise<boolean> {
    validateInput(appid, enterpriseId);

    const binding = await this.repository.findByAppAndEnterprise(appid, enterpriseId);
    if (!binding) {
      return false;
    }

    return this.repository.update(binding.id, { status: 'expired' }).then(Boolean);
  }

  /**
   * Delete a binding
   */
  async deleteBinding(
    appid: string,
    enterpriseId: string
  ): Promise<boolean> {
    validateInput(appid, enterpriseId);

    const binding = await this.repository.findByAppAndEnterprise(appid, enterpriseId);
    if (!binding) {
      return false;
    }

    return this.repository.delete(binding.id);
  }
}

/**
 * Create binding validation service
 */
export function createBindingValidationService(
  repository: BindingRepository
): BindingValidationService {
  return new BindingValidationService(repository);
}
