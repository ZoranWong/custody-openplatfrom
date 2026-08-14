import { Rule } from '../types'
import { validate } from '../middleware'

const OAuthTokenRule: Rule = {
  body: {
    grant_type: [
      { validator: 'required', message: 'grant_type is required' },
      { validator: 'isIn', options: { values: ['client_credentials', 'refresh_token'] }, message: 'Invalid grant_type' },
    ],
    appid: [
      { validator: 'required', message: 'appid is required' },
    ],
    appsecret: [
      { validator: 'required', message: 'appsecret is required', optional: true },
    ],
    refresh_token: [
      { validator: 'required', message: 'refresh_token is required', optional: true },
    ],
  },
}

const ValidateAppTokenRule: Rule = {
  body: {
    appId: [
      { validator: 'required', message: 'appId is required' },
    ],
    appToken: [
      { validator: 'required', message: 'appToken is required' },
    ],
  },
}

const OAuthRevokeRule: Rule = {
  body: {
    refresh_token: [
      { validator: 'required', message: 'refresh_token is required' },
    ],
  },
}

export const validateOAuthToken = validate(OAuthTokenRule)
export const validateAppToken = validate(ValidateAppTokenRule)
export const validateOAuthRevoke = validate(OAuthRevokeRule)