/**
 * Validation Rules Configuration
 * Pre-defined validation rules for API endpoints
 */

import { ValidationRule } from '../types/validation.types';
import {
  createRequiredValidator,
  createStringValidator,
  createNumberValidator,
  createEnumValidator,
  createAmountValidator,
  createCurrencyValidator,
  createAddressValidator,
  createMemoValidator,
} from '../services/validators/common.validators';

/**
 * Enterprise management validation rules
 */
export const enterpriseValidationRules = {
  create: [
    createRequiredValidator('name'),
    createStringValidator({
      field: 'name',
      minLength: 2,
      maxLength: 200,
      message: 'Enterprise name must be 2-200 characters',
    }),
    createRequiredValidator('business_license'),
    createStringValidator({
      field: 'business_license',
      minLength: 10,
      maxLength: 50,
      message: 'Business license must be 10-50 characters',
    }),
  ] as ValidationRule[],

  update: [
    createStringValidator({
      field: 'name',
      minLength: 2,
      maxLength: 200,
      message: 'Enterprise name must be 2-200 characters',
    }),
  ] as ValidationRule[],
};

/**
 * Treasury unit validation rules
 */
export const unitValidationRules = {
  create: [
    createRequiredValidator('name'),
    createStringValidator({
      field: 'name',
      minLength: 2,
      maxLength: 100,
      message: 'Unit name must be 2-100 characters',
    }),
    createRequiredValidator('type'),
    createEnumValidator('type', [
      'PRIMARY',
      'PAYIN',
      'PAYOUT',
      'QUARANTINE',
    ]),
  ] as ValidationRule[],

  update: [
    createStringValidator({
      field: 'name',
      minLength: 2,
      maxLength: 100,
      message: 'Unit name must be 2-100 characters',
    }),
  ] as ValidationRule[],
};

/**
 * Payment validation rules
 */
export const paymentValidationRules = {
  create: [
    createRequiredValidator('unit_id'),
    createStringValidator({
      field: 'unit_id',
      minLength: 10,
      maxLength: 64,
      message: 'unit_id must be 10-64 characters',
    }),
    createRequiredValidator('amount'),
    createAmountValidator({
      field: 'amount',
      min: 0.00000001,
      max: 999999999999,
      precision: 8,
      message: 'Amount must be a valid positive number with at most 8 decimal places',
    }),
    createRequiredValidator('currency'),
    createCurrencyValidator('currency'),
    createRequiredValidator('recipient_address'),
    createAddressValidator('recipient_address', ['ETH', 'BTC']),
    createMemoValidator('memo', 200),
  ] as ValidationRule[],
};

/**
 * Transfer validation rules
 */
export const transferValidationRules = {
  create: [
    createRequiredValidator('from_unit_id'),
    createStringValidator({
      field: 'from_unit_id',
      minLength: 10,
      maxLength: 64,
      message: 'from_unit_id must be 10-64 characters',
    }),
    createRequiredValidator('to_unit_id'),
    createStringValidator({
      field: 'to_unit_id',
      minLength: 10,
      maxLength: 64,
      message: 'to_unit_id must be 10-64 characters',
    }),
    createRequiredValidator('amount'),
    createAmountValidator({
      field: 'amount',
      min: 0.00000001,
      max: 999999999999,
      precision: 8,
      message: 'Amount must be a valid positive number with at most 8 decimal places',
    }),
    createRequiredValidator('currency'),
    createCurrencyValidator('currency'),
    createMemoValidator('memo', 200),
  ] as ValidationRule[],
};

/**
 * Pooling validation rules
 */
export const poolingValidationRules = {
  create: [
    {
      field: 'from_accounts',
      type: 'required' as const,
      message: 'from_accounts is required',
    },
    {
      field: 'from_accounts',
      type: 'array' as const,
      min: 1,
      message: 'from_accounts must be a non-empty array',
      custom: (value: unknown): boolean => Array.isArray(value) && value.length > 0,
    },
    createRequiredValidator('to_account_id'),
    createStringValidator({
      field: 'to_account_id',
      minLength: 10,
      maxLength: 64,
      message: 'to_account_id must be 10-64 characters',
    }),
    createRequiredValidator('currency'),
    createCurrencyValidator('currency'),
  ] as ValidationRule[],
};

/**
 * Signature task validation rules
 */
export const signatureTaskValidationRules = {
  create: [
    createRequiredValidator('operation'),
    createEnumValidator('operation', [
      'transfer',
      'payment',
      'pooling',
      'release',
      'approve',
    ]),
    createRequiredValidator('signers'),
    {
      field: 'signers',
      type: 'array' as const,
      min: 1,
      max: 10,
      message: 'signers must be 1-10 addresses',
      custom: (value: unknown): boolean => {
        if (!Array.isArray(value)) return false;
        if (value.length < 1 || value.length > 10) return false;
        return value.every((v) => typeof v === 'string' && v.length >= 20);
      },
    },
    createNumberValidator({
      field: 'threshold',
      min: 1,
      max: 10,
      message: 'threshold must be between 1 and 10',
    }),
    createRequiredValidator('data'),
    {
      field: 'data',
      type: 'object' as const,
      message: 'data must be an object',
      custom: (value: unknown): boolean => value !== null && typeof value === 'object',
    },
  ] as ValidationRule[],
};

/**
 * Webhook configuration validation rules
 */
export const webhookValidationRules = {
  create: [
    {
      field: 'callback_url',
      type: 'required' as const,
      message: 'callback_url is required',
    },
    {
      field: 'callback_url',
      type: 'custom' as const,
      message: 'callback_url must be a valid HTTPS URL',
      custom: (value: unknown): boolean => {
        if (typeof value !== 'string') return false;
        try {
          const url = new URL(value);
          return url.protocol === 'https:' && url.hostname.length > 0;
        } catch {
          return false;
        }
      },
    },
    {
      field: 'event_types',
      type: 'array' as const,
      message: 'event_types must be an array',
      custom: (value: unknown): boolean => Array.isArray(value),
    },
  ] as ValidationRule[],
};

/**
 * Pagination validation rules
 */
export const paginationValidationRules = {
  page: [
    {
      field: 'page',
      type: 'number' as const,
      message: 'page must be a positive integer',
      custom: (value: unknown): boolean => {
        const num = Number(value);
        return Number.isInteger(num) && num >= 1;
      },
    },
  ] as ValidationRule[],

  pageSize: [
    {
      field: 'page_size',
      type: 'number' as const,
      message: 'page_size must be between 1 and 100',
      custom: (value: unknown): boolean => {
        const num = Number(value);
        return Number.isInteger(num) && num >= 1 && num <= 100;
      },
    },
  ] as ValidationRule[],
};

/**
 * Date range validation rules
 */
export const dateRangeValidationRules = {
  startDate: [
    {
      field: 'start_date',
      type: 'custom' as const,
      message: 'start_date must be YYYY-MM-DD format',
      custom: (value: unknown): boolean => {
        if (typeof value !== 'string') return false;
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
      },
    },
  ] as ValidationRule[],

  endDate: [
    {
      field: 'end_date',
      type: 'custom' as const,
      message: 'end_date must be YYYY-MM-DD format',
      custom: (value: unknown): boolean => {
        if (typeof value !== 'string') return false;
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
      },
    },
  ] as ValidationRule[],
};

/**
 * Query filter validation rules
 */
export const filterValidationRules = {
  status: [
    createEnumValidator('status', [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
    ]),
  ] as ValidationRule[],

  currency: [createCurrencyValidator('currency')] as ValidationRule[],

  enterpriseId: [
    createStringValidator({
      field: 'enterprise_id',
      minLength: 10,
      maxLength: 64,
      message: 'enterprise_id must be 10-64 characters',
    }),
  ] as ValidationRule[],
};

/**
 * Export all validation rules
 */
export const validationRules = {
  enterprise: enterpriseValidationRules,
  unit: unitValidationRules,
  payment: paymentValidationRules,
  transfer: transferValidationRules,
  pooling: poolingValidationRules,
  signature: signatureTaskValidationRules,
  webhook: webhookValidationRules,
  pagination: paginationValidationRules,
  dateRange: dateRangeValidationRules,
  filter: filterValidationRules,
};
