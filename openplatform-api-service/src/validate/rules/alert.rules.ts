import { Rule } from '../types';
import { validate, registerValidator } from '../middleware';

/**
 * Numeric lower-bound validator. Registered globally under `minValue` so the
 * declarative rule below can express ">= N" (the built-in `minLength` only
 * covers strings).
 */
registerValidator('minValue', (value: any, options: { min: number }) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= options.min;
});

const AlertSettingsRule: Rule = {
  body: {
    alertEmail: [
      { validator: 'email', message: 'Invalid email format', optional: true },
    ],
    enabled: [
      { validator: 'isBoolean', message: 'enabled must be a boolean', optional: true },
    ],
    windowSeconds: [
      { validator: 'isInt', message: 'windowSeconds must be an integer', optional: true },
      { validator: 'minValue', options: { min: 60 }, message: 'Window must be at least 60 seconds', optional: true },
    ],
    errorThreshold: [
      { validator: 'isInt', message: 'errorThreshold must be an integer', optional: true },
      { validator: 'minValue', options: { min: 1 }, message: 'Threshold must be at least 1', optional: true },
    ],
    cooldownSeconds: [
      { validator: 'isInt', message: 'cooldownSeconds must be an integer', optional: true },
      { validator: 'minValue', options: { min: 60 }, message: 'Cooldown must be at least 60 seconds', optional: true },
    ],
  },
};

export const validateAlertSettings = validate(AlertSettingsRule);
