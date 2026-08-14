const builtinValidators: Record<string, Function> = {
  required: (value: any) => value !== undefined && value !== null && value !== '',
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  isUUID: (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  minLength: (value: string, options: { min: number }) => typeof value === 'string' && value.length >= options.min,
  maxLength: (value: string, options: { max: number }) => typeof value === 'string' && value.length <= options.max,
  isIn: (value: any, options: { values: any[] }) => options.values.includes(value),
  isNumber: (value: any) => !isNaN(Number(value)),
  isInt: (value: any) => Number.isInteger(Number(value)),
  isBoolean: (value: any) => typeof value === 'boolean',
  isArray: (value: any) => Array.isArray(value),
  isString: (value: any) => typeof value === 'string',
  notEmpty: (value: string) => typeof value === 'string' && value.trim().length > 0,
}

const customValidators: Record<string, Function> = {}

export function registerValidator(name: string, fn: Function) {
  customValidators[name] = fn
}

export function getValidator(name: string): Function | undefined {
  return customValidators[name] || builtinValidators[name]
}