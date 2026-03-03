/**
 * Forgot Password Page Unit Tests
 * Tests for forgot password functionality with Vue Test Utils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ForgotPasswordPage from '@/views/ForgotPasswordPage.vue'
import apiService from '@/services/api'

// Mock the API service
vi.mock('@/services/api', () => ({
  default: {
    forgotPassword: vi.fn()
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

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/login', name: 'login' }]
})

describe('ForgotPasswordPage', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(ForgotPasswordPage, {
      global: {
        plugins: [router],
        stubs: {
          'el-input': {
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" class="el-input-stub" />',
            props: ['modelValue', 'type', 'placeholder', 'size', 'prefix-icon', 'class']
          },
          'el-alert': {
            template: '<div class="el-alert-stub"><slot /></div>',
            props: ['type', 'closable', 'class', 'show-icon']
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
    it('renders the form correctly', () => {
      expect(wrapper.find('h2').text()).toBe('找回密码')
      expect(wrapper.find('form').exists()).toBe(true)
    })

    it('renders email input field', () => {
      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      expect(emailInput.exists()).toBe(true)
    })

    it('renders submit button', () => {
      const button = wrapper.find('button.button-stub')
      expect(button.exists()).toBe(true)
      expect(button.text()).toBe('发送重置链接')
    })

    it('renders back to login link', () => {
      expect(wrapper.text()).toContain('返回登录')
    })
  })

  describe('Email Validation', () => {
    it('shows error for empty email on submit', async () => {
      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')

      expect(wrapper.vm.error).toBe('请输入邮箱地址')
    })

    it('shows error for invalid email format', async () => {
      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      await emailInput.setValue('invalid-email')

      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')

      expect(wrapper.vm.error).toBe('请输入有效的邮箱地址')
    })

    it('accepts valid email format', async () => {
      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      await emailInput.setValue('test@example.com')

      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')

      expect(wrapper.vm.error).toBe('')
    })

    it('accepts email with subdomain', async () => {
      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      await emailInput.setValue('test@mail.example.com')

      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')

      expect(wrapper.vm.error).toBe('')
    })

    it('accepts email with plus sign', async () => {
      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      await emailInput.setValue('test+tag@example.com')

      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')

      expect(wrapper.vm.error).toBe('')
    })
  })

  describe('API Integration', () => {
    it('calls forgotPassword API with email on submit', async () => {
      ;(apiService.forgotPassword as any).mockResolvedValue({ code: 0 })

      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      await emailInput.setValue('test@example.com')

      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')

      expect(apiService.forgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' })
    })

    it('sets loading state during API call', async () => {
      ;(apiService.forgotPassword as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      await emailInput.setValue('test@example.com')

      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')

      expect(wrapper.vm.loading).toBe(true)
    })

    it('navigates to login on success', async () => {
      ;(apiService.forgotPassword as any).mockResolvedValue({ code: 0 })

      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      await emailInput.setValue('test@example.com')

      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')

      // Check navigation was called (router.push)
      expect(router.currentRoute.value.path).toBe('/login')
    })

    it('always navigates to login even on API error (security)', async () => {
      ;(apiService.forgotPassword as any).mockRejectedValue(new Error('API Error'))

      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      await emailInput.setValue('test@example.com')

      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')

      // Should still navigate to login for security (don't reveal if email exists)
      expect(router.currentRoute.value.path).toBe('/login')
    })
  })

  describe('Error Handling', () => {
    it('clears error when user types', async () => {
      const button = wrapper.find('button.button-stub')
      await button.trigger('submit.prevent')
      expect(wrapper.vm.error).toBeTruthy()

      const emailInput = wrapper.find('input[type="email"], .el-input-stub input')
      await emailInput.setValue('newvalue')

      expect(wrapper.vm.error).toBe('')
    })
  })
})
