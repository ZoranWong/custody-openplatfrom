import { Request, Response, NextFunction } from 'express'
import { Rule } from './types'
import { getValidator } from './validators'

export { registerValidator } from './validators'

export function validate(rule: Rule) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const errors: { field: string; message: string }[] = []

    for (const source of ['body', 'params', 'query'] as const) {
      const fields = rule[source]
      if (!fields) continue

      for (const [field, fieldRules] of Object.entries(fields)) {
        const value = req[source]?.[field]

        for (const r of fieldRules) {
          if (r.optional && (value === undefined || value === null || value === '')) {
            continue
          }

          const validator = getValidator(r.validator)
          if (!validator) {
            errors.push({ field, message: `Unknown validator: ${r.validator}` })
            continue
          }

          const result = r.options ? validator(value, r.options) : validator(value)
          if (!result) {
            errors.push({ field, message: r.message || `${field} validation failed` })
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ code: 40001, message: 'Validation failed', errors })
    }
    next()
  }
}