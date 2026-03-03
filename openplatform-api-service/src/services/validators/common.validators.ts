/**
 * Common Field Validators
 * Reusable validation functions for common field types
 */

import {
  ValidationRule,
  ValidationError,
  ADDRESS_PATTERNS,
  SUPPORTED_CURRENCIES,
} from '../../types/validation.types';

/**
 * Create a required field validator
 */
export function createRequiredValidator(
  field: string,
  message?: string
): ValidationRule {
  return {
    field,
    type: 'required',
    required: true,
    message: message || `${field} is required`,
  };
}

/**
 * Create a string validator
 */
export function createStringValidator(options: {
  field: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
}): ValidationRule {
  return {
    field: options.field,
    type: 'string',
    minLength: options.minLength,
    maxLength: options.maxLength,
    pattern: options.pattern,
    message:
      options.message ||
      (options.pattern
        ? `Invalid format for ${options.field}`
        : `${options.field} must be between ${options.minLength} and ${options.maxLength} characters`),
  };
}

/**
 * Create a number validator
 */
export function createNumberValidator(options: {
  field: string;
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
  message?: string;
}): ValidationRule {
  return {
    field: options.field,
    type: 'number',
    min: options.min,
    max: options.max,
    message:
      options.message ||
      `${options.field} must be a valid number${
        options.min !== undefined ? ` (min: ${options.min})` : ''
      }${options.max !== undefined ? ` (max: ${options.max})` : ''}`,
  };
}

/**
 * Create an enum validator
 */
export function createEnumValidator<T extends string | number>(
  field: string,
  allowedValues: readonly T[],
  message?: string
): ValidationRule {
  return {
    field,
    type: 'enum',
    enum: allowedValues,
    message:
      message ||
      `${field} must be one of: ${allowedValues.join(', ')}`,
  };
}

/**
 * Create a regex validator
 */
export function createRegexValidator(
  field: string,
  pattern: RegExp,
  message?: string
): ValidationRule {
  return {
    field,
    type: 'regex',
    pattern,
    message: message || `Invalid format for ${field}`,
  };
}

/**
 * Create an array validator
 */
export function createArrayValidator(options: {
  field: string;
  minLength?: number;
  maxLength?: number;
  itemValidator?: ValidationRule;
  message?: string;
}): ValidationRule {
  return {
    field: options.field,
    type: 'array',
    min: options.minLength,
    max: options.maxLength,
    message:
      options.message ||
      `${options.field} must be a valid array${
        options.minLength ? ` with at least ${options.minLength} items` : ''
      }${options.maxLength ? ` with at most ${options.maxLength} items` : ''}`,
  };
}

/**
 * Create an amount validator for cryptocurrency amounts
 */
export function createAmountValidator(options: {
  field?: string;
  min?: number;
  max?: number;
  precision?: number;
  message?: string;
}): ValidationRule {
  const field = options.field || 'amount';
  return {
    field,
    type: 'custom',
    min: options.min ?? 0,
    max: options.max,
    message:
      options.message ||
      `Amount must be a valid number${
        options.min !== undefined ? ` (min: ${options.min})` : ''
      }${options.max !== undefined ? ` (max: ${options.max})` : ''}${
        options.precision !== undefined
          ? ` with at most ${options.precision} decimal places`
          : ''
      }`,
    custom: (value: unknown): boolean => {
      if (value === undefined || value === null) {
        return false;
      }

      const num =
        typeof value === 'string' ? parseFloat(value) : Number(value);

      if (isNaN(num) || !isFinite(num)) {
        return false;
      }

      if (options.min !== undefined && num < options.min) {
        return false;
      }

      if (options.max !== undefined && num > options.max) {
        return false;
      }

      if (options.precision !== undefined) {
        const decimalStr = num.toString().split('.')[1];
        const decimals = decimalStr ? decimalStr.length : 0;
        if (decimals > options.precision) {
          return false;
        }
      }

      return true;
    },
  };
}

/**
 * Create a timestamp validator
 */
export function createTimestampValidator(
  field: string = 'timestamp',
  message?: string
): ValidationRule {
  return {
    field,
    type: 'custom',
    message:
      message ||
      `${field} must be a valid Unix timestamp (seconds or milliseconds)`,
    custom: (value: unknown): boolean => {
      if (value === undefined || value === null) {
        return false;
      }

      const ts = Number(value);
      if (isNaN(ts) || !isFinite(ts)) {
        return false;
      }

      // Accept timestamps in seconds (10 digits) or milliseconds (13 digits)
      const tsStr = String(ts);
      if (tsStr.length === 10) {
        // Seconds - valid range: 2000-01-01 to 2100-12-31
        return ts >= 946684800 && ts <= 4102444800;
      } else if (tsStr.length === 13) {
        // Milliseconds - valid range
        return ts >= 946684800000 && ts <= 4102444800000;
      }

      return false;
    },
  };
}

/**
 * Create a currency validator
 */
export function createCurrencyValidator(
  field: string = 'currency',
  allowedCurrencies: readonly string[] = SUPPORTED_CURRENCIES,
  message?: string
): ValidationRule {
  return {
    field,
    type: 'enum',
    enum: allowedCurrencies as string[],
    message:
      message ||
      `${field} must be one of: ${allowedCurrencies.join(', ')}`,
  };
}

/**
 * Create an address validator for cryptocurrency addresses
 */
export function createAddressValidator(
  field: string = 'address',
  allowedChains: string[] = ['ETH', 'BTC'],
  message?: string
): ValidationRule {
  return {
    field,
    type: 'custom',
    message:
      message ||
      `Invalid address format for ${field} (supported: ${allowedChains.join(', ')})`,
    custom: (value: unknown): boolean => {
      if (typeof value !== 'string') {
        return false;
      }

      const address = value.trim().toUpperCase();

      for (const chain of allowedChains) {
        const pattern = ADDRESS_PATTERNS[chain as keyof typeof ADDRESS_PATTERNS];
        if (pattern && pattern.test(address)) {
          return true;
        }
      }

      // Allow any string between 20-60 characters as fallback
      return address.length >= 20 && address.length <= 60;
    },
  };
}

/**
 * Create a nonce validator
 */
export function createNonceValidator(
  field: string = 'nonce',
  message?: string
): ValidationRule {
  return {
    field,
    type: 'string',
    minLength: 8,
    maxLength: 128,
    message: message || `${field} must be 8-128 characters`,
  };
}

/**
 * Create a signature validator
 */
export function createSignatureValidator(
  field: string = 'sign',
  message?: string
): ValidationRule {
  return {
    field,
    type: 'string',
    minLength: 64,
    maxLength: 128,
    pattern: /^[a-fA-F0-9]+$/,
    message: message || `${field} must be 64-128 hexadecimal characters`,
  };
}

/**
 * Create a memo validator
 */
export function createMemoValidator(
  field: string = 'memo',
  maxLength: number = 200,
  message?: string
): ValidationRule {
  return {
    field,
    type: 'string',
    maxLength,
    message: message || `${field} must be at most ${maxLength} characters`,
  };
}

/**
 * Create an appid validator
 */
export function createAppIdValidator(
  field: string = 'appid',
  message?: string
): ValidationRule {
  return {
    field,
    type: 'string',
    minLength: 10,
    maxLength: 64,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message:
      message ||
      `${field} must be 10-64 alphanumeric characters (允许 - 和 _)`,
  };
}

/**
 * Create a boolean validator
 */
export function createBooleanValidator(
  field: string,
  message?: string
): ValidationRule {
  return {
    field,
    type: 'boolean',
    message: message || `${field} must be a boolean value`,
  };
}
