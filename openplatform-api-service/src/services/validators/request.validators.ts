/**
 * Request Validators
 * Validation rules specific to API request structures
 */

import {
  ValidationRule,
  SUPPORTED_CURRENCIES,
} from '../../types/validation.types';
import {
  createRequiredValidator,
  createStringValidator,
  createNumberValidator,
  createEnumValidator,
  createTimestampValidator,
  createAmountValidator,
  createCurrencyValidator,
  createAddressValidator,
  createNonceValidator,
  createSignatureValidator,
  createAppIdValidator,
  createMemoValidator,
} from './common.validators';

/**
 * API request basic fields validators
 * Validates the common fields required for all signed requests:
 * - appid: Application ID
 * - nonce: Unique request identifier (for replay protection)
 * - timestamp: Request timestamp
 * - sign: HMAC-SHA256 signature
 */
export const basicFieldValidators: ValidationRule[] = [
  createRequiredValidator('appid'),
  createAppIdValidator('appid'),
  createRequiredValidator('nonce'),
  createNonceValidator('nonce'),
  createRequiredValidator('timestamp'),
  createTimestampValidator('timestamp'),
  createRequiredValidator('sign'),
  createSignatureValidator('sign'),
];

/**
 * Enterprise ID validator
 */
export const enterpriseIdValidators: ValidationRule[] = [
  createRequiredValidator('enterprise_id'),
  createStringValidator({
    field: 'enterprise_id',
    minLength: 10,
    maxLength: 64,
    message: 'enterprise_id must be 10-64 characters',
  }),
];

/**
 * Optional enterprise ID validator (for optional fields)
 */
export const optionalEnterpriseIdValidators: ValidationRule[] = [
  createStringValidator({
    field: 'enterprise_id',
    minLength: 10,
    maxLength: 64,
    message: 'enterprise_id must be 10-64 characters',
  }),
];

/**
 * Amount validators for monetary fields
 */
export const amountValidators: ValidationRule[] = [
  createRequiredValidator('amount'),
  createAmountValidator({
    field: 'amount',
    min: 0.00000001,
    max: 999999999999,
    precision: 8,
    message: 'amount must be a valid positive number with at most 8 decimal places',
  }),
];

/**
 * Optional amount validator
 */
export const optionalAmountValidators: ValidationRule[] = [
  createAmountValidator({
    field: 'amount',
    min: 0.00000001,
    max: 999999999999,
    precision: 8,
    message: 'amount must be a valid positive number with at most 8 decimal places',
  }),
];

/**
 * Currency validator
 */
export const currencyValidators: ValidationRule[] = [
  createRequiredValidator('currency'),
  createCurrencyValidator('currency', SUPPORTED_CURRENCIES),
];

/**
 * Optional currency validator
 */
export const optionalCurrencyValidators: ValidationRule[] = [
  createCurrencyValidator('currency', SUPPORTED_CURRENCIES),
];

/**
 * Recipient address validator
 */
export const recipientAddressValidators: ValidationRule[] = [
  createRequiredValidator('recipient_address'),
  createAddressValidator('recipient_address', ['ETH', 'BTC']),
];

/**
 * Source unit ID validator
 */
export const sourceUnitIdValidators: ValidationRule[] = [
  createRequiredValidator('from_unit_id'),
  createStringValidator({
    field: 'from_unit_id',
    minLength: 10,
    maxLength: 64,
    message: 'from_unit_id must be 10-64 characters',
  }),
];

/**
 * Destination unit ID validator
 */
export const destUnitIdValidators: ValidationRule[] = [
  createRequiredValidator('to_unit_id'),
  createStringValidator({
    field: 'to_unit_id',
    minLength: 10,
    maxLength: 64,
    message: 'to_unit_id must be 10-64 characters',
  }),
];

/**
 * Source accounts array validator
 */
export const sourceAccountsValidators: ValidationRule[] = [
  createRequiredValidator('from_accounts'),
  {
    field: 'from_accounts',
    type: 'array',
    min: 1,
    message: 'from_accounts must be a non-empty array',
    custom: (value: unknown): boolean => {
      return Array.isArray(value) && value.length > 0;
    },
  },
];

/**
 * Destination account ID validator
 */
export const destAccountIdValidators: ValidationRule[] = [
  createRequiredValidator('to_account_id'),
  createStringValidator({
    field: 'to_account_id',
    minLength: 10,
    maxLength: 64,
    message: 'to_account_id must be 10-64 characters',
  }),
];

/**
 * Memo field validator
 */
export const memoValidators: ValidationRule[] = [
  createMemoValidator('memo', 200),
];

/**
 * Transaction ID validator
 */
export const transactionIdValidators: ValidationRule[] = [
  createRequiredValidator('transaction_id'),
  createStringValidator({
    field: 'transaction_id',
    minLength: 10,
    maxLength: 64,
    message: 'transaction_id must be 10-64 characters',
  }),
];

/**
 * Order ID validator
 */
export const orderIdValidators: ValidationRule[] = [
  createRequiredValidator('order_id'),
  createStringValidator({
    field: 'order_id',
    minLength: 8,
    maxLength: 64,
    message: 'order_id must be 8-64 characters',
  }),
];

/**
 * Pagination validators
 */
export const paginationValidators: ValidationRule[] = [
  {
    field: 'page',
    type: 'number',
    min: 1,
    message: 'page must be a positive integer',
    custom: (value: unknown): boolean => {
      const num = Number(value);
      return Number.isInteger(num) && num >= 1;
    },
  },
  {
    field: 'page_size',
    type: 'number',
    min: 1,
    max: 100,
    message: 'page_size must be between 1 and 100',
    custom: (value: unknown): boolean => {
      const num = Number(value);
      return Number.isInteger(num) && num >= 1 && num <= 100;
    },
  },
];

/**
 * Date range validators
 */
export const dateRangeValidators: ValidationRule[] = [
  {
    field: 'start_date',
    type: 'custom',
    message: 'start_date must be a valid date (YYYY-MM-DD)',
    custom: (value: unknown): boolean => {
      if (typeof value !== 'string') return false;
      return /^\d{4}-\d{2}-\d{2}$/.test(value);
    },
  },
  {
    field: 'end_date',
    type: 'custom',
    message: 'end_date must be a valid date (YYYY-MM-DD)',
    custom: (value: unknown): boolean => {
      if (typeof value !== 'string') return false;
      return /^\d{4}-\d{2}-\d{2}$/.test(value);
    },
  },
];

/**
 * Enterprise create validators
 */
export const enterpriseCreateValidators: ValidationRule[] = [
  createRequiredValidator('name'),
  createStringValidator({
    field: 'name',
    minLength: 2,
    maxLength: 200,
    message: 'name must be 2-200 characters',
  }),
  createRequiredValidator('business_license'),
  createStringValidator({
    field: 'business_license',
    minLength: 10,
    maxLength: 50,
    message: 'business_license must be 10-50 characters',
  }),
];

/**
 * Enterprise update validators
 */
export const enterpriseUpdateValidators: ValidationRule[] = [
  createStringValidator({
    field: 'name',
    minLength: 2,
    maxLength: 200,
    message: 'name must be 2-200 characters',
  }),
];

/**
 * Unit create validators
 */
export const unitCreateValidators: ValidationRule[] = [
  createRequiredValidator('name'),
  createStringValidator({
    field: 'name',
    minLength: 2,
    maxLength: 100,
    message: 'name must be 2-100 characters',
  }),
  createRequiredValidator('type'),
  createEnumValidator('type', ['PRIMARY', 'PAYIN', 'PAYOUT', 'QUARANTINE']),
];

/**
 * Payment create validators
 */
export const paymentCreateValidators: ValidationRule[] = [
  createRequiredValidator('unit_id'),
  createStringValidator({
    field: 'unit_id',
    minLength: 10,
    maxLength: 64,
    message: 'unit_id must be 10-64 characters',
  }),
  ...amountValidators,
  ...currencyValidators,
  ...recipientAddressValidators,
  ...memoValidators,
];

/**
 * Transfer create validators
 */
export const transferCreateValidators: ValidationRule[] = [
  ...sourceUnitIdValidators,
  ...destUnitIdValidators,
  ...amountValidators,
  ...currencyValidators,
  {
    field: 'memo',
    type: 'string',
    maxLength: 200,
    message: 'memo must be at most 200 characters',
  },
];

/**
 * Pooling create validators
 */
export const poolingCreateValidators: ValidationRule[] = [
  ...sourceAccountsValidators,
  ...destAccountIdValidators,
  ...currencyValidators,
];

/**
 * Webhook configuration validators
 */
export const webhookConfigValidators: ValidationRule[] = [
  createRequiredValidator('callback_url'),
  {
    field: 'callback_url',
    type: 'custom',
    message: 'callback_url must be a valid HTTPS URL',
    custom: (value: unknown): boolean => {
      if (typeof value !== 'string') return false;
      try {
        const url = new URL(value);
        return url.protocol === 'https:';
      } catch {
        return false;
      }
    },
  },
  createEnumValidator('event_types', [
    'task.created',
    'task.signed',
    'task.rejected',
    'payment.completed',
    'payment.failed',
    'transfer.completed',
    'transfer.failed',
    'pooling.completed',
    'pooling.failed',
  ]),
];

/**
 * Export all validator collections
 */
export const validatorCollections = {
  basic: basicFieldValidators,
  enterprise: {
    create: enterpriseCreateValidators,
    update: enterpriseUpdateValidators,
    id: enterpriseIdValidators,
  },
  unit: {
    create: unitCreateValidators,
  },
  payment: {
    create: paymentCreateValidators,
  },
  transfer: {
    create: transferCreateValidators,
  },
  pooling: {
    create: poolingCreateValidators,
  },
  pagination: paginationValidators,
  dateRange: dateRangeValidators,
  webhook: webhookConfigValidators,
};
