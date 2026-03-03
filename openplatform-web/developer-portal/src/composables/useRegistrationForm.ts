/**
 * useRegistrationForm Composable
 * Form state management for registration flow
 */

import { reactive, ref, computed, watch } from 'vue'

export interface AccountData {
  email: string
  password: string
  confirmPassword: string
}

export interface KYBData {
  company_name: string
  credit_code: string
  website: string
  industry: string
}

export interface UBO {
  name: string
  id_type: 'passport' | 'national_id'
  id_number: string
  nationality: string
  phone: string
}

export interface RegistrationFormData {
  account: AccountData
  kyb: KYBData
  ubos: UBO[]
}

export interface ValidationErrors {
  account?: Partial<Record<keyof AccountData, string>>
  kyb?: Partial<Record<keyof KYBData, string>>
  ubos?: string[]
}

export function useRegistrationForm() {
  const formData = reactive<RegistrationFormData>({
    account: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    kyb: {
      company_name: '',
      credit_code: '',
      website: '',
      industry: ''
    },
    ubos: [
      { name: '', id_type: 'national_id', id_number: '', nationality: '', phone: '' }
    ]
  })

  const errors = reactive<ValidationErrors>({})
  const touched = reactive<Record<string, boolean>>({})

  // Validation rules
  const validateEmail = (email: string): string | null => {
    if (!email) return '邮箱不能为空'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return '请输入有效的邮箱地址'
    return null
  }

  const validatePassword = (password: string): string | null => {
    if (!password) return '密码不能为空'
    if (password.length < 8) return '密码至少8位'
    if (!/[A-Z]/.test(password)) return '密码需包含大写字母'
    if (!/[a-z]/.test(password)) return '密码需包含小写字母'
    if (!/[0-9]/.test(password)) return '密码需包含数字'
    if (!/[!@#$%^&*]/.test(password)) return '密码需包含特殊字符'
    return null
  }

  const validateCreditCode = (code: string): string | null => {
    if (!code) return '统一社会信用代码不能为空'
    if (code.length !== 18) return '统一社会信用代码为18位'
    return null
  }

  const validateUBO = (ubo: UBO): string | null => {
    if (!ubo.name) return '姓名不能为空'
    if (!ubo.id_number) return '证件号码不能为空'
    if (!ubo.nationality) return '国籍不能为空'
    if (!ubo.phone) return '手机号不能为空'
    return null
  }

  const validateStep = (step: number): boolean => {
    errors.account = {}
    errors.kyb = {}
    errors.ubos = []

    if (step === 1) {
      const emailError = validateEmail(formData.account.email)
      if (emailError) errors.account!.email = emailError

      const pwError = validatePassword(formData.account.password)
      if (pwError) errors.account!.password = pwError

      if (formData.account.confirmPassword !== formData.account.password) {
        errors.account!.confirmPassword = '两次密码输入不一致'
      }

      return !Object.values(errors.account || {}).some(Boolean)
    }

    if (step === 2) {
      if (!formData.kyb.company_name) {
        errors.kyb!.company_name = '公司名称不能为空'
      }

      const creditError = validateCreditCode(formData.kyb.credit_code)
      if (creditError) errors.kyb!.credit_code = creditError

      if (!formData.kyb.industry) {
        errors.kyb!.industry = '所属行业不能为空'
      }

      return !Object.values(errors.kyb || {}).some(Boolean)
    }

    if (step === 3) {
      if (formData.ubos.length === 0) {
        errors.ubos!.push('至少需要添加一位受益人')
      }

      formData.ubos.forEach((ubo, index) => {
        const error = validateUBO(ubo)
        if (error) {
          errors.ubos![index] = error
        }
      })

      return !errors.ubos?.some(Boolean)
    }

    return true
  }

  const isStepValid = computed(() => {
    if (currentStep.value === 1) {
      return !!(
        formData.account.email &&
        formData.account.password.length >= 8 &&
        formData.account.confirmPassword === formData.account.password
      )
    }
    if (currentStep.value === 2) {
      return !!(
        formData.kyb.company_name &&
        formData.kyb.credit_code.length === 18 &&
        formData.kyb.industry
      )
    }
    if (currentStep.value === 3) {
      return (
        formData.ubos.length > 0 &&
        formData.ubos.every(ubo =>
          ubo.name && ubo.id_number && ubo.nationality && ubo.phone
        )
      )
    }
    return false
  })

  const resetForm = () => {
    formData.account = { email: '', password: '', confirmPassword: '' }
    formData.kyb = { company_name: '', credit_code: '', website: '', industry: '' }
    formData.ubos = [{ name: '', id_type: 'national_id', id_number: '', nationality: '', phone: '' }]
    errors.account = {}
    errors.kyb = {}
    errors.ubos = []
  }

  const addUBO = () => {
    formData.ubos.push({
      name: '',
      id_type: 'national_id',
      id_number: '',
      nationality: '',
      phone: ''
    })
  }

  const removeUBO = (index: number) => {
    if (formData.ubos.length > 1) {
      formData.ubos.splice(index, 1)
    }
  }

  const currentStep = ref(1)
  const totalSteps = 3

  return {
    formData,
    errors,
    touched,
    currentStep,
    totalSteps,
    isStepValid,
    validateStep,
    resetForm,
    addUBO,
    removeUBO
  }
}
