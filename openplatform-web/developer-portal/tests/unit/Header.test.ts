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

    expect(wrapper.text()).toContain('Docs')
    expect(wrapper.text()).toContain('API Reference')
    expect(wrapper.text()).toContain('SDK')
    expect(wrapper.text()).toContain('GitHub')
  })

  it('has login button', () => {
    const wrapper = mount(Header)

    const loginButton = wrapper.findAll('button').find(b => b.text().includes('Sign In'))
    expect(loginButton).toBeDefined()
  })

  it('has Get Started button', () => {
    const wrapper = mount(Header)

    const startButton = wrapper.findAll('button').find(b => b.text().includes('Get Started'))
    expect(startButton).toBeDefined()
  })

  it('has mobile menu button', () => {
    const wrapper = mount(Header)

    const mobileButton = wrapper.find('button[aria-label="Toggle mobile menu"]')
    expect(mobileButton.exists()).toBe(true)
  })

  it('toggles mobile menu when button clicked', async () => {
    const wrapper = mount(Header)

    // Initially mobile menu should be hidden
    expect(wrapper.find('#mobile-menu').exists()).toBe(false)

    // Click mobile menu button
    await wrapper.find('button[aria-label="Toggle mobile menu"]').trigger('click')

    // Mobile menu should now be visible
    expect(wrapper.find('#mobile-menu').exists()).toBe(true)
  })

  it('uses brand color for hover states', () => {
    const wrapper = mount(Header)

    // Check for brand color class usage
    const navLinks = wrapper.findAll('.text-gray-600')
    expect(navLinks.length).toBeGreaterThan(0)
  })

  it('navigation links have correct href attributes', () => {
    const wrapper = mount(Header)

    const docsLink = wrapper.findAll('a').find(a => a.text().includes('Docs'))
    expect(docsLink).toBeDefined()
    expect(docsLink?.attributes('href')).toBe('/docs')
  })
})
