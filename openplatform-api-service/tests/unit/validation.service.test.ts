/**
 * Validation Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ValidationService,
  createValidationService,
} from '../../src/services/validation.service';
import {
  basicFieldValidators,
  amountValidators,
  currencyValidators,
  enterpriseIdValidators,
} from '../../src/services/validators/request.validators';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = createValidationService();
  });

  describe('validate', () => {
    it('should return valid result for correct input', () => {
      const body = {
        name: 'Test Enterprise',
        amount: 100.5,
        currency: 'BTC',
      };

      const rules: any[] = [
        { field: 'name', type: 'string', required: true, message: 'name is required' },
        { field: 'amount', type: 'number', required: true, message: 'amount is required' },
        { field: 'currency', type: 'enum', enum: ['BTC', 'ETH'], message: 'Invalid currency' },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for missing required field', () => {
      const body = {
        name: 'Test Enterprise',
      };

      const rules: any[] = [
        { field: 'name', type: 'string', required: true, message: 'name is required' },
        { field: 'amount', type: 'number', required: true, message: 'amount is required' },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('amount');
      expect(result.errors[0].code).toBe(40001);
    });

    it('should fail for invalid string length', () => {
      const body = {
        name: 'A', // Too short
      };

      const rules: any[] = [
        { field: 'name', type: 'string', minLength: 3, maxLength: 100, message: 'name must be 3-100 characters' },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].code).toBe(40001);
    });

    it('should fail for invalid enum value', () => {
      const body = {
        currency: 'INVALID',
      };

      const rules: any[] = [
        { field: 'currency', type: 'enum', enum: ['BTC', 'ETH'], message: 'Invalid currency' },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('currency');
      expect(result.errors[0].code).toBe(40002);
    });

    it('should fail for invalid number range', () => {
      const body = {
        amount: -100, // Negative
      };

      const rules: any[] = [
        { field: 'amount', type: 'number', min: 0, message: 'amount must be positive' },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('amount');
    });

    it('should fail for invalid array', () => {
      const body = {
        items: 'not-an-array',
      };

      const rules: any[] = [
        { field: 'items', type: 'array', message: 'items must be an array' },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('items');
    });

    it('should fail for array too small', () => {
      const body = {
        items: [],
      };

      const rules: any[] = [
        { field: 'items', type: 'array', min: 1, message: 'items must have at least 1 item' },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('items');
    });

    it('should fail for null body', () => {
      const result = service.validate(null, []);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(40001);
    });

    it('should fail for non-object body', () => {
      const result = service.validate('string', []);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(40001);
    });

    it('should collect multiple errors', () => {
      const body = {};

      const rules: any[] = [
        { field: 'name', type: 'string', required: true, message: 'name required' },
        { field: 'email', type: 'string', required: true, message: 'email required' },
        { field: 'amount', type: 'number', required: true, message: 'amount required' },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });
  });

  describe('validateBasic', () => {
    it('should validate basic fields correctly', () => {
      const body = {
        appid: 'app_1234567890',
        nonce: 'abc1234567890',
        timestamp: 1700000000,
        sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      };

      const result = service.validateBasic(body);

      expect(result.valid).toBe(true);
    });

    it('should fail for missing appid', () => {
      const body = {
        nonce: 'abc1234567890',
        timestamp: 1700000000,
        sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      };

      const result = service.validateBasic(body);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('appid');
    });

    it('should fail for invalid timestamp', () => {
      const body = {
        appid: 'app_1234567890',
        nonce: 'abc1234567890',
        timestamp: 'invalid',
        sign: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      };

      const result = service.validateBasic(body);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('timestamp');
    });

    it('should fail for short signature', () => {
      const body = {
        appid: 'app_1234567890',
        nonce: 'abc1234567890',
        timestamp: 1700000000,
        sign: 'short',
      };

      const result = service.validateBasic(body);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('sign');
    });
  });

  describe('validateData', () => {
    it('should validate data fields', () => {
      const data = {
        amount: 100.5,
        currency: 'ETH',
      };

      const rules = amountValidators.concat(currencyValidators);

      const result = service.validateData(data, rules);

      expect(result.valid).toBe(true);
    });

    it('should validate enterprise_id format', () => {
      const data = {
        enterprise_id: 'ent_1234567890',
      };

      const result = service.validateData(data, enterpriseIdValidators);

      expect(result.valid).toBe(true);
    });

    it('should fail for short enterprise_id', () => {
      const data = {
        enterprise_id: 'short',
      };

      const result = service.validateData(data, enterpriseIdValidators);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('enterprise_id');
    });
  });

  describe('passes/fails', () => {
    it('should return true for passing validation', () => {
      const rule: any = { field: 'name', type: 'string', minLength: 3 };

      expect(service.passes('hello', rule)).toBe(true);
      expect(service.fails('hello', rule)).toBe(false);
    });

    it('should return false for failing validation', () => {
      const rule: any = { field: 'name', type: 'string', minLength: 10 };

      expect(service.passes('hi', rule)).toBe(false);
      expect(service.fails('hi', rule)).toBe(true);
    });
  });

  describe('custom validators', () => {
    it('should execute custom validation function', () => {
      const body = {
        password: 'Password123!',
      };

      const rules: any[] = [
        {
          field: 'password',
          type: 'custom',
          message: 'Password must contain uppercase, lowercase, and number',
          custom: (value: unknown) => {
            if (typeof value !== 'string') return false;
            return /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);
          },
        },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(true);
    });

    it('should fail custom validation', () => {
      const body = {
        password: 'password',
      };

      const rules: any[] = [
        {
          field: 'password',
          type: 'custom',
          message: 'Password must contain uppercase, lowercase, and number',
          custom: (value: unknown) => {
            if (typeof value !== 'string') return false;
            return /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);
          },
        },
      ];

      const result = service.validate(body, rules);

      expect(result.valid).toBe(false);
    });
  });
});

describe('Custom Validation Rules', () => {
  const service = createValidationService();

  describe('amount validation', () => {
    it('should accept valid amounts', () => {
      const amounts = [0.00000001, 1, 100.5, 999999999999];

      for (const amount of amounts) {
        const result = service.validate({ amount }, amountValidators);
        expect(result.valid).toBe(true, `Amount ${amount} should be valid`);
      }
    });

    it('should reject negative amounts', () => {
      const result = service.validate({ amount: -1 }, amountValidators);

      expect(result.valid).toBe(false);
    });

    it('should reject amounts with too many decimals', () => {
      const result = service.validate({ amount: 0.123456789 }, amountValidators);

      expect(result.valid).toBe(false);
    });
  });

  describe('currency validation', () => {
    it('should accept valid currencies', () => {
      const currencies = ['BTC', 'ETH', 'USDT', 'USDC', 'DAI', 'BCH', 'LTC', 'XRP'];

      for (const currency of currencies) {
        const result = service.validate({ currency }, currencyValidators);
        expect(result.valid).toBe(true, `Currency ${currency} should be valid`);
      }
    });

    it('should reject invalid currencies', () => {
      const result = service.validate({ currency: 'INVALID' }, currencyValidators);

      expect(result.valid).toBe(false);
    });
  });
});
