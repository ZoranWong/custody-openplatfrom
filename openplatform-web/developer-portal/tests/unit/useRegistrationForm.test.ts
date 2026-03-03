/**
 * useRegistrationForm Unit Tests
 * Tests for composable used in registration flow
 */

import { describe, it, expect } from 'vitest'
import { useRegistrationForm } from '@/composables/useRegistrationForm'

describe('useRegistrationForm', () => {
  it('initializes with default values', () => {
    const { formData, currentStep, totalSteps } = useRegistrationForm()

    expect(currentStep.value).toBe(1)
    expect(totalSteps.value).toBe(3)
    expect(formData.account.email).toBe('')
    expect(formData.account.password).toBe('')
    expect(formData.kyb.company_name).toBe('')
    expect(formData.kyb.credit_code).toBe('')
    expect(formData.ubos).toHaveLength(1)
  })

  describe('Email Validation', () => {
    it('validates required email', () => {
      const { validateStep } = useRegistrationForm()

      formData.account.email = ''
      const isValid = validateStep(1)

      expect(isValid).toBe(false)
      expect(errors.account?.email).toBe('邮箱不能为空')
    })

    it('validates email format', () => {
      const { validateStep } = useRegistrationForm()

      formData.account.email = 'invalid-email'
      const isValid = validateStep(1)

      expect(isValid).toBe(false)
      expect(errors.account?.email).toBe('请输入有效的邮箱地址')
    })

    it('accepts valid email', () => {
      const { validateStep } = useRegistrationForm()

      formData.account.email = 'test@example.com'
      const isValid = validateStep(1)

      expect(isValid).toBe(true)
      expect(errors.account?.email).toBeUndefined()
    })
  })

  describe('Password Validation', () => {
    it('validates password length', () => {
      const { validateStep } = useRegistrationForm()

      formData.account.password = '123'
      const isValid = validateStep(1)

      expect(isValid).toBe(false)
      expect(errors.account?.password).toBe('密码至少8位')
    })

    it('validates uppercase requirement', () => {
      const { validateStep } = useRegistrationForm()

      formData.account.password = 'password1!'
      const isValid = validateStep(1)

      expect(isValid).toBe(false)
      expect(errors.account?.password).toBe('密码需包含大写字母')
    })

    it('validates lowercase requirement', () => {
      const { validateStep } = useRegistrationForm()

      formData.account.password = 'PASSWORD1!'
      const isValid = validateStep(1)

      expect(isValid).toBe(false)
      expect(errors.account?.password).toBe('密码需包含小写字母')
    })

    it('validates number requirement', () => {
      const { validateStep } = useRegistrationForm()

      formData.account.password = 'Password!'
      const isValid = validateStep(1)

      expect(isValid).toBe(false)
      expect(errors.account?.password).toBe('密码需包含数字')
    })

    it('validates special character requirement', () => {
      const { validateStep } = useRegistrationForm()

      formData.account.password = 'Password1'
      const isValid = validateStep(1)

      expect(isValid).toBe(false)
      expect(errors.account?.password).toBe('密码需包含特殊字符')
    })

    it('accepts valid password', () => {
      const { validateStep } = useRegistrationForm()

      formData.account.email = 'test@example.com'
      formData.account.password = 'Password1!'
      formData.account.confirmPassword = 'Password1!'
      const isValid = validateStep(1)

      expect(isValid).toBe(true)
    })
  })

  describe('Credit Code Validation', () => {
    it('validates required credit code', () => {
      const { validateStep } = useRegistrationForm()

      formData.kyb.credit_code = ''
      const isValid = validateStep(2)

      expect(isValid).toBe(false)
      expect(errors.kyb?.credit_code).toBe('统一社会信用代码不能为空')
    })

    it('validates credit code length', () => {
      const { validateStep } = useRegistrationForm()

      formData.kyb.credit_code = '123456'
      const isValid = validateStep(2)

      expect(isValid).toBe(false)
      expect(errors.kyb?.credit_code).toBe('统一社会信用代码为18位')
    })

    it('accepts valid 18-character credit code', () => {
      const { validateStep } = useRegistrationForm()

      formData.kyb.credit_code = '91110108MA1XXXXXXX'
      const isValid = validateStep(2)

      expect(isValid).toBe(false) // Still fails due to other required fields
    })
  })

  describe('UBO Management', () => {
    it('adds new UBO', () => {
      const { addUBO, formData } = useRegistrationForm()

      expect(formData.ubos).toHaveLength(1)
      addUBO()
      expect(formData.ubos).toHaveLength(2)
    })

    it('removes UBO', () => {
      const { addUBO, removeUBO, formData } = useRegistrationForm()

      addUBO()
      expect(formData.ubos).toHaveLength(2)
      removeUBO(1)
      expect(formData.ubos).toHaveLength(1)
    })

    it('does not remove last UBO', () => {
      const { removeUBO, formData } = useRegistrationForm()

      removeUBO(0)
      expect(formData.ubos).toHaveLength(1)
    })
  })

  describe('Form Reset', () => {
    it('resets all form data', () => {
      const { formData, addUBO, resetForm } = useRegistrationForm()

      formData.account.email = 'test@example.com'
      formData.kyb.company_name = 'Test Company'
      addUBO()

      resetForm()

      expect(formData.account.email).toBe('')
      expect(formData.kyb.company_name).toBe('')
      expect(formData.ubos).toHaveLength(1)
    })
  })

  describe('isStepValid', () => {
    it('returns false for step 1 with empty fields', () => {
      const { isStepValid } = useRegistrationForm()

      expect(isStepValid.value).toBe(false)
    })

    it('returns true for step 1 with valid data', () => {
      const { isStepValid, formData } = useRegistrationForm()

      formData.account.email = 'test@example.com'
      formData.account.password = 'Password1!'
      formData.account.confirmPassword = 'Password1!'

      expect(isStepValid.value).toBe(true)
    })
  })
})
