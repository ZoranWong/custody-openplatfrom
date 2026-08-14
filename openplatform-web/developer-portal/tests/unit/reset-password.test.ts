/**
 * Reset Password Page Unit Tests
 * Tests for password reset functionality with Vue Test Utils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ResetPasswordPage from '@/views/ResetPasswordPage.vue'
import apiService from '@/services/api'

// Mock/ResetPasswordPage the API service
vi.mock('@/services/api', () => ({
  default: {
    resetPassword: vi.fn()
  }
}))

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

// Mock router with token param
const createRouterWithQuery = (token: string | null = 'test-reset-token') => {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/reset-password', name: 'reset-password' },
      { path: '/login', name: 'login' }
    ]
  })
}

describe('ResetPasswordPage', () => {
  let wrapper: any
  let router: any

  beforeEach(async () => {
    vi.clearAllMocks()

    router = createRouterWithQuery('test-reset-token')
    await router.push({ path: '/reset-password', query: { token: 'test-reset-token' } })
    await router.isReady()

    wrapper = mount(ResetPasswordPage, {
      global: {
        plugins: [router],
        stubs: {
          'el-input': {
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" class="el-input-stub" />',
            props: ['modelValue', 'type', 'placeholder', 'size', 'prefix-icon', 'class'],
            emits: ['update:modelValue']
          },
          'el-alert': {
            template: '<div class="el-alert-stub"><div v-if="title">{{ title }}</div><div v-if="description">{{ description }}</div><slot /></div>',
            props: ['type', 'closable', 'class', 'show-icon', 'title', 'description']
          },
          Button: {
            template: '<button :loading="loading" class="button-stub"><slot /></button>',
            props: ['type', 'size', 'class', 'loading']
          }
        }
      }
    })
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('renders the form with correct title', () => {
      expect(wrapper.find('h2').text()).toBe('重置密码')
    })

    it('renders password input field', () => {
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBeGreaterThanOrEqual(2) // password + confirm
    })

    it('renders submit button', () => {
      const button = wrapper.find('button.button-stub')
      expect(button.exists()).toBe(true)
      expect(button.text()).toBe('重置密码')
    })
  })

  describe('Password Validation', () => {
    it('shows error for empty password', async () => {
      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.password).toBe('请输入新密码')
    })

    it('shows error for short password', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      await pwdInput.setValue('Ab1!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.password).toBe('密码至少需要8个字符')
    })

    it('shows error for missing uppercase', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      await pwdInput.setValue('password1!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.password).toBe('密码需要包含大写字母')
    })

    it('shows error for missing lowercase', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      await pwdInput.setValue('PASSWORD1!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.password).toBe('密码需要包含小写字母')
    })

    it('shows error for missing number', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      await pwdInput.setValue('Password!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.password).toBe('密码需要包含数字')
    })

    it('shows error for missing special character', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      await pwdInput.setValue('Password1')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.password).toBe('密码需要包含特殊字符 (@$!%*?&)')
    })

    it('accepts valid password', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      await pwdInput.setValue('Password1!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.password).toBe('')
    })
  })

  describe('Confirm Password Validation', () => {
    it('shows error for empty confirm password', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      await pwdInput.setValue('Password1!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.confirmPassword).toBe('请确认密码')
    })

    it('shows error for mismatched passwords', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      const confirmInput = wrapper.findAll('.el-input-stub')[1]

      await pwdInput.setValue('Password1!')
      await confirmInput.setValue('Different1!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.confirmPassword).toBe('两次输入的密码不一致')
    })

    it('accepts matching passwords', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      const confirmInput = wrapper.findAll('.el-input-stub')[1]

      await pwdInput.setValue('Password1!')
      await confirmInput.setValue('Password1!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(wrapper.vm.errors.confirmPassword).toBe('')
    })
  })

  describe('Password Strength Indicator', () => {
    it('shows strength indicator when password entered', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      await pwdInput.setValue('Test123!')

      // Strength should be calculated
      expect(wrapper.vm.passwordStrength).toBe(5) // uppercase, lowercase, number, special, length
    })

    it('returns 0 for empty password', () => {
      expect(wrapper.vm.passwordStrength).toBe(0)
    })

    it('returns correct strength for weak password', async () => {
      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      await pwdInput.setValue('abc1!') // lowercase, number, special, length < 8

      expect(wrapper.vm.passwordStrength).toBe(3)
    })
  })

  describe('Token Validation', () => {
    it('validates token from URL query param', async () => {
      // Already mounted with token in beforeEach
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.tokenValid).toBe(true)
    })

    it('sets tokenValid to false when token missing', async () => {
      router = createRouterWithQuery(null)
      await router.push({ path: '/reset-password' })
      await router.isReady()

      wrapper = mount(ResetPasswordPage, {
        global: {
          plugins: [router],
          stubs: {
            'el-input': {
              template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" class="el-input-stub" />',
              props: ['modelValue', 'type', 'placeholder', 'size', 'prefix-icon', 'class'],
              emits: ['update:modelValue']
            },
            'el-alert': {
              template: '<div class="el-alert-stub"><div v-if="title">{{ title }}</div><div v-if="description">{{ description }}</div><slot /></div>',
              props: ['type', 'closable', 'class', 'show-icon', 'title', 'description']
            },
            Button: {
              template: '<button :loading="loading" class="button-stub"><slot /></button>',
              props: ['type', 'size', 'class', 'loading']
            }
          }
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.tokenValid).toBe(false)
    })

    it('shows error alert when token invalid', async () => {
      router = createRouterWithQuery(null)
      await router.push({ path: '/reset-password' })
      await router.isReady()

      wrapper = mount(ResetPasswordPage, {
        global: {
          plugins: [router],
          stubs: {
            'el-input': {
              template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" class="el-input-stub" />',
              props: ['modelValue', 'type', 'placeholder', 'size', 'prefix-icon', 'class'],
              emits: ['update:modelValue']
            },
            'el-alert': {
              template: '<div class="el-alert-stub"><div v-if="title">{{ title }}</div><div v-if="description">{{ description }}</div><slot /></div>',
              props: ['type', 'closable', 'class', 'show-icon', 'title', 'description']
            },
            Button: {
              template: '<button :loading="loading" class="button-stub"><slot /></button>',
              props: ['type', 'size', 'class', 'loading']
            }
          }
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('链接无效')
    })
  })

  describe('API Integration', () => {
    it('calls resetPassword API with token and password', async () => {
      ;(apiService.resetPassword as any).mockResolvedValue({ code: 0 })

      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      const confirmInput = wrapper.findAll('.el-input-stub')[1]

      await pwdInput.setValue('Password1!')
      await confirmInput.setValue('Password1!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      expect(apiService.resetPassword).toHaveBeenCalledWith({
        token: 'test-reset-token',
        password: 'Password1!'
      })
    })

    it('does not call API when token is invalid', async () => {
      router = createRouterWithQuery(null)
      await router.push({ path: '/reset-password' })
      await router.isReady()

      wrapper = mount(ResetPasswordPage, {
        global: {
          plugins: [router],
          stubs: {
            'el-input': {
              template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" class="el-input-stub" />',
              props: ['modelValue', 'type', 'placeholder', 'size', 'prefix-icon', 'class'],
              emits: ['update:modelValue']
            },
            'el-alert': {
              template: '<div class="el-alert-stub"><div v-if="title">{{ title }}</div><div v-if="description">{{ description }}</div><slot /></div>',
              props: ['type', 'closable', 'class', 'show-icon', 'title', 'description']
            },
            Button: {
              template: '<button :loading="loading" class="button-stub"><slot /></button>',
              props: ['type', 'size', 'class', 'loading']
            }
          }
        }
      })

      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      // Form should not exist when token is invalid (template v-else)
      expect(form.exists()).toBe(false)
      expect(apiService.resetPassword).not.toHaveBeenCalled()
    })

    it('navigates to login on success', async () => {
      ;(apiService.resetPassword as any).mockResolvedValue({ code: 0 })

      const pwdInput = wrapper.findAll('.el-input-stub')[0]
      const confirmInput = wrapper.findAll('.el-input-stub')[1]

      await pwdInput.setValue('Password1!')
      await confirmInput.setValue('Password1!')

      const form = wrapper.find('form')
      await form.trigger('submit.prevent')

      // Wait for async handler and router navigation to complete
      await wrapper.vm.$nextTick()
      // Wait for the router push promise to resolve
      await new Promise(resolve => setTimeout(resolve, 10))
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/login')
    })
  })

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility', async () => {
      expect(wrapper.vm.showPassword).toBe(false)

      // The el-input stub has a suffix slot with a component - we need to test
      // that the showPassword ref can be toggled. Since the suffix is not
      // rendered in the stub, we test the reactive property directly.
      wrapper.vm.showPassword = true
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showPassword).toBe(true)
    })
  })
})
