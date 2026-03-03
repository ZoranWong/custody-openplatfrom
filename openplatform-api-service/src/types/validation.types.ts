/**
 * Validation Types
 * Type definitions for request validation system
 */

/**
 * Validation rule types
 */
export type ValidationType =
  | 'required'
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'regex'
  | 'array'
  | 'custom';

/**
 * Validation rule interface
 */
export interface ValidationRule {
  field: string;
  type: ValidationType;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: readonly (string | number)[];
  message: string;
  custom?: (value: unknown) => boolean;
  customMessage?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  code: number;
  message: string;
}

/**
 * Request validation configuration
 */
export interface RequestValidationConfig {
  validateBasic: boolean;
  validateData: boolean;
  validateBusiness: boolean;
}

/**
 * Validation context for custom validators
 */
export interface ValidationContext {
  path: string;
  fullBody: Record<string, unknown>;
  getField: (field: string) => unknown;
}

/**
 * Supported cryptocurrency currencies
 */
export const SUPPORTED_CURRENCIES = [
  'BTC',
  'ETH',
  'USDT',
  'USDC',
  'DAI',
  'BCH',
  'LTC',
  'XRP',
] as const;

export type Currency = typeof SUPPORTED_CURRENCIES[number];

/**
 * API request basic fields validation rules
 */
export const BASIC_REQUIRED_FIELDS = ['appid', 'nonce', 'timestamp', 'sign'] as const;

/**
 * Address validation patterns (simplified for major chains)
 */
export const ADDRESS_PATTERNS = {
  BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{25,90}$/,
  ETH: /^0x[a-fA-F0-9]{40}$/,
  USDT: /^0x[a-fA-F0-9]{40}$/,
  USDC: /^0x[a-fA-F0-9]{40}$/,
};
