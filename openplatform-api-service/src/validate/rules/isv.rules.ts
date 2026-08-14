import { Rule } from '../types'
import { validate } from '../middleware'

const RegisterRule: Rule = {
  body: {
    email: [
      { validator: 'required', message: 'Email is required' },
      { validator: 'email', message: 'Invalid email format' },
    ],
    password: [
      { validator: 'required', message: 'Password is required' },
      { validator: 'minLength', options: { min: 6 }, message: 'Password must be at least 6 characters' },
    ],
    legalName: [
      { validator: 'required', message: 'Company name is required' },
    ],
  },
}

const ISVLoginRule: Rule = {
  body: {
    email: [
      { validator: 'required', message: 'Email is required' },
      { validator: 'email', message: 'Invalid email format' },
    ],
    password: [
      { validator: 'required', message: 'Password is required' },
    ],
  },
}

const CreateApplicationRule: Rule = {
  body: {
    appName: [
      { validator: 'required', message: 'Application name is required' },
    ],
  },
}

export const validateRegister = validate(RegisterRule)
export const validateISVLogin = validate(ISVLoginRule)
export const validateCreateApplication = validate(CreateApplicationRule)