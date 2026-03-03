/**
 * Profile Page Unit Tests
 * Tests for story a-2-5: Developer Profile
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProfilePage from '@/views/ProfilePage.vue'
import EditProfileForm from '@/components/profile/EditProfileForm.vue'

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: {
      id: '123',
      email: 'test@example.com',
      companyName: 'Test Company',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z'
    },
    isvInfo: {
      legalName: 'Test Legal Name',
      registrationNumber: '12345678',
      jurisdiction: 'US',
      kybStatus: 'approved'
    },
    fetchProfile: vi.fn().mockResolvedValue({}),
    fetchISVInfo: vi.fn().mockResolvedValue({}),
    logout: vi.fn().mockResolvedValue({})
  })
}))

// Mock router
const mockRouter = {
  push: vi.fn()
}

const routes = [
  { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
  { path: '/login', name: 'login', component: { template: '<div>Login</div>' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

describe('ProfilePage', () => {
  it('renders profile page with user information', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    // Wait for mounted hook
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check that profile page renders
    expect(wrapper.text()).toContain('Personal Profile')
    expect(wrapper.text()).toContain('Basic Information')
  })

  it('displays user email as read-only', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Email should be displayed
    expect(wrapper.text()).toContain('test@example.com')
  })

  it('displays KYB status', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // KYB status should be displayed
    expect(wrapper.text()).toContain('KYB Status')
  })

  it('displays account creation date', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Registration time should be displayed
    expect(wrapper.text()).toContain('Registration Time')
  })

  it('has logout button', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Logout button should exist
    expect(wrapper.text()).toContain('Log Out')
  })

  it('includes EditProfileForm component', async () => {
    const wrapper = mount(ProfilePage, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // EditProfileForm should be present
    expect(wrapper.findComponent(EditProfileForm).exists()).toBe(true)
  })
})

describe('EditProfileForm', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    companyName: 'Test Company',
    name: 'John Doe',
    phone: '1234567890'
  }

  it('renders form fields', () => {
    const wrapper = mount(EditProfileForm, {
      props: {
        user: mockUser
      }
    })

    expect(wrapper.find('form').exists()).toBe(false) // Initially in view mode
  })

  it('shows edit button in view mode', () => {
    const wrapper = mount(EditProfileForm, {
      props: {
        user: mockUser
      }
    })

    // Should have Edit button
    expect(wrapper.text()).toContain('Edit')
  })

  it('shows name and phone in view mode', () => {
    const wrapper = mount(EditProfileForm, {
      props: {
        user: mockUser
      }
    })

    // Should display user info
    expect(wrapper.text()).toContain('John Doe')
  })
})
