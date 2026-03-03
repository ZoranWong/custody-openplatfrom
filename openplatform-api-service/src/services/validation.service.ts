/**
 * Validation Service
 * Core validation logic for API request validation
 */

import {
  ValidationResult,
  ValidationError,
  ValidationRule,
  RequestValidationConfig,
  ValidationContext,
} from '../types/validation.types';
import { errorMapper } from './error-mapper.service';
import { basicFieldValidators } from './validators/request.validators';

/**
 * Validation service configuration
 */
export interface ValidationServiceConfig {
  config?: Partial<RequestValidationConfig>;
}

/**
 * Result of validating a specific field
 */
export interface FieldValidationResult {
  field: string;
  valid: boolean;
  error?: ValidationError;
}

/**
 * Request Validation Service
 * Handles all validation logic for API requests
 */
export class ValidationService {
  private config: RequestValidationConfig;
  private errorMapper = errorMapper;

  constructor(config?: ValidationServiceConfig) {
    this.config = {
      validateBasic: config?.config?.validateBasic ?? true,
      validateData: config?.config?.validateData ?? true,
      validateBusiness: config?.config?.validateBusiness ?? true,
    };
  }

  /**
   * Validate an object against a set of validation rules
   */
  validate(
    body: unknown,
    rules: ValidationRule[],
    _context?: Partial<ValidationContext>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate body exists and is an object
    if (!body || typeof body !== 'object') {
      return {
        valid: false,
        errors: [
          {
            field: 'body',
            code: 40001,
            message: 'Request body is required and must be an object',
          },
        ],
      };
    }

    const requestBody = body as Record<string, unknown>;

    // Check for missing required fields
    const requiredFields = rules.filter(
      (rule) => rule.required || rule.type === 'required'
    );

    for (const rule of requiredFields) {
      const value = requestBody[rule.field];
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: rule.field,
          code: 40001,
          message: rule.message || `${rule.field} is required`,
        });
      }
    }

    // Validate each field according to its rule
    for (const rule of rules) {
      const value = requestBody[rule.field];

      // Skip validation if field is empty and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }

      const error = this.validateField(value, rule);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single field against its rule
   */
  validateField(value: unknown, rule: ValidationRule): ValidationError | null {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message || `${rule.field} is required`,
          };
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `${rule.field} must be a string`,
          };
        }
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message ||
              `${rule.field} must be at least ${rule.minLength} characters`,
          };
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message ||
              `${rule.field} must be at most ${rule.maxLength} characters`,
          };
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `Invalid format for ${rule.field}`,
          };
        }
        break;

      case 'number':
        const num = Number(value);
        if (isNaN(num) || !isFinite(num)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `${rule.field} must be a valid number`,
          };
        }
        if (rule.min !== undefined && num < rule.min) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message ||
              `${rule.field} must be at least ${rule.min}`,
          };
        }
        if (rule.max !== undefined && num > rule.max) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message ||
              `${rule.field} must be at most ${rule.max}`,
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `${rule.field} must be a boolean`,
          };
        }
        break;

      case 'enum':
        if (rule.enum && !rule.enum.includes(value as string | number)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message ||
              `${rule.field} must be one of: ${rule.enum.join(', ')}`,
          };
        }
        break;

      case 'regex':
        if (typeof value !== 'string') {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `${rule.field} must be a string`,
          };
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `Invalid format for ${rule.field}`,
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `${rule.field} must be an array`,
          };
        }
        if (rule.min !== undefined && value.length < rule.min) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message ||
              `${rule.field} must have at least ${rule.min} items`,
          };
        }
        if (rule.max !== undefined && value.length > rule.max) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message ||
              `${rule.field} must have at most ${rule.max} items`,
          };
        }
        break;

      case 'custom':
        if (rule.custom && !rule.custom(value)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `Invalid value for ${rule.field}`,
          };
        }
        break;
    }

    return null;
  }

  /**
   * Validate basic fields (appid, nonce, timestamp, sign)
   */
  validateBasic(body: unknown): ValidationResult {
    if (!body || typeof body !== 'object') {
      return {
        valid: false,
        errors: [
          {
            field: 'body',
            code: 40001,
            message: 'Request body is required',
          },
        ],
      };
    }

    const requestBody = body as Record<string, unknown>;
    const errors: ValidationError[] = [];

    return this.validate(requestBody, basicFieldValidators);
  }

  /**
   * Validate data fields
   */
  validateData(data: unknown, rules: ValidationRule[]): ValidationResult {
    return this.validate(data, rules);
  }

  /**
   * Get error response from validation result
   */
  getErrorResponse(result: ValidationResult, traceId: string) {
    if (result.valid) {
      return null;
    }

    const firstError = result.errors[0];
    return this.errorMapper.mapError(
      {
        code: firstError.code,
        message: result.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join('; '),
      },
      traceId
    );
  }

  /**
   * Validate multiple fields and return results for each
   */
  validateFields(
    body: unknown,
    rules: Record<string, ValidationRule[]>
  ): Record<string, FieldValidationResult> {
    const results: Record<string, FieldValidationResult> = {};

    if (!body || typeof body !== 'object') {
      return results;
    }

    const requestBody = body as Record<string, unknown>;

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = requestBody[field];
      const errors: ValidationError[] = [];

      for (const rule of fieldRules) {
        const error = this.validateField(value, rule);
        if (error) {
          errors.push(error);
        }
      }

      results[field] = {
        field,
        valid: errors.length === 0,
        error: errors[0],
      };
    }

    return results;
  }

  /**
   * Check if a value passes a single rule
   */
  passes(
    value: unknown,
    rule: ValidationRule
  ): boolean {
    return this.validateField(value, rule) === null;
  }

  /**
   * Check if a value fails a single rule
   */
  fails(
    value: unknown,
    rule: ValidationRule
  ): boolean {
    return this.validateField(value, rule) !== null;
  }
}

/**
 * Create a validation service instance
 */
export function createValidationService(
  config?: ValidationServiceConfig
): ValidationService {
  return new ValidationService(config);
}
