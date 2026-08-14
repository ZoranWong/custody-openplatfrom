import { Rule } from '../types'
import { validate } from '../middleware'

const VerifyOAuthTokenRule: Rule = {
  body: {
    resourceKey: [
      { validator: 'required', message: 'resourceKey is required' },
    ],
    oauthToken: [
      { validator: 'required', message: 'oauthToken is required' },
    ],
  },
}

export const validateVerifyOAuthToken = validate(VerifyOAuthTokenRule)