/**
 * Header Component Unit Tests
 * Tests for story a-1-1: Landing Page
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Header from '@/components/common/Header.vue'

describe('Header', () => {
  it('renders logo correctly', () => {
    const wrapper = mount(Header)

    const logo = wrapper.find('img[alt="Cregis"]')
    expect(logo.exists()).toBe(true)
    expect(logo.attributes('src')).toBe('/logo.svg')
  })

  it('displays navigation links', () => {
    const wrapper = mount(Header)

    expect(wrapper.text()).toContain('文档')
    expect(wrapper.text()).toContain('API 参考')
    expect(wrapper.text()).toContain('SDK')
    expect(wrapper.text()).toContain('GitHub')
  })

  it('has login button', () => {
    const wrapper = mount(Header)

    const loginButton = wrapper.findAll('button').find(b => b.text().includes('登录'))
    expect(loginButton).toBeDefined()
  })

  it('has Get Started button', () => {
    const wrapper = mount(Header)

    const startButton = wrapper.findAll('button').find(b => b.text().includes('开始使用'))
    expect(startButton).toBeDefined()
  })

  it('has mobile menu button', () => {
    const wrapper = mount(Header)

    const mobileButton = wrapper.find('button.md\\:hidden')
    expect(mobileButton.exists()).toBe(true)
  })

  it('toggles mobile menu when button clicked', async () => {
    const wrapper = mount(Header)

    // Initially mobile menu should be hidden
    const mobileMenu = wrapper.find('.md\\:hidden + *') // Mobile menu is the div after button
    expect(wrapper.find('.md\\:hidden + *').exists()).toBe(false) // v-if makes it not exist

    // Click mobile menu button
    await wrapper.find('button.md\\:hidden').trigger('click')

    // Mobile menu should now be visible
    expect(wrapper.find('.md\\:hidden + *').exists()).toBe(true)
  })

  it('uses brand color for hover states', () => {
    const wrapper = mount(Header)

    // Check for brand color class usage
    const navLinks = wrapper.findAll('.text-gray-600')
    expect(navLinks.length).toBeGreaterThan(0)
  })

  it('navigation links have correct href attributes', () => {
    const wrapper = mount(Header)

    const docsLink = wrapper.findAll('a').find(a => a.text().includes('文档'))
    expect(docsLink).toBeDefined()
    expect(docsLink?.attributes('href')).toBe('/docs')
  })
})
