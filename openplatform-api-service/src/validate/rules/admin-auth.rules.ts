import { Rule } from '../types'
import { validate } from '../middleware'

const LoginRule: Rule = {
  body: {
    email: [
      { validator: 'required', message: 'Email is required' },
      { validator: 'email', message: 'Invalid email format' },
    ],
    password: [
      { validator: 'required', message: 'Password is required' },
      { validator: 'minLength', options: { min: 6 }, message: 'Password must be at least 6 characters' },
    ],
  },
}

const RefreshTokenRule: Rule = {
  body: {
    refreshToken: [
      { validator: 'required', message: 'Refresh token is required' },
    ],
  },
}

const ChangePasswordRule: Rule = {
  body: {
    currentPassword: [
      { validator: 'required', message: 'Current password is required' },
    ],
    newPassword: [
      { validator: 'required', message: 'New password is required' },
      { validator: 'minLength', options: { min: 6 }, message: 'New password must be at least 6 characters' },
    ],
  },
}

const BanDeveloperRule: Rule = {
  body: {
    reason: [
      { validator: 'required', message: 'Reason is required' },
    ],
  },
}

const RejectKYBRule: Rule = {
  body: {
    comment: [
      { validator: 'required', message: 'Rejection reason is required' },
    ],
  },
}

export const validateLogin = validate(LoginRule)
export const validateRefreshToken = validate(RefreshTokenRule)
export const validateChangePassword = validate(ChangePasswordRule)
export const validateBanDeveloper = validate(BanDeveloperRule)
export const validateRejectKYB = validate(RejectKYBRule)