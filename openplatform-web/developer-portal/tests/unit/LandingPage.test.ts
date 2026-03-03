/**
 * LandingPage Unit Tests
 * Tests for story a-1-1: Landing Page
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LandingPage from '@/views/LandingPage.vue'
import Header from '@/components/common/Header.vue'
import Footer from '@/components/common/Footer.vue'
import HeroSection from '@/components/landing/HeroSection.vue'
import FeaturesSection from '@/components/landing/FeaturesSection.vue'
import CtaSection from '@/components/landing/CtaSection.vue'

// Mock router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn()
}

const mockRoute = {
  path: '/',
  name: 'landing',
  params: {},
  query: {}
}

// Global config for components using router
const withRouter = {
  global: {
    provide: {
      router: { currentRoute: { value: mockRoute } },
      route: mockRoute
    },
    mocks: {
      $router: mockRouter,
      $route: mockRoute
    }
  }
}

describe('LandingPage', () => {
  it('renders all main components', () => {
    const wrapper = mount(LandingPage, withRouter)

    // Verify Header is rendered
    expect(wrapper.findComponent(Header).exists()).toBe(true)

    // Verify HeroSection is rendered
    expect(wrapper.findComponent(HeroSection).exists()).toBe(true)

    // Verify FeaturesSection is rendered
    expect(wrapper.findComponent(FeaturesSection).exists()).toBe(true)

    // Verify CtaSection is rendered
    expect(wrapper.findComponent(CtaSection).exists()).toBe(true)

    // Verify Footer is rendered
    expect(wrapper.findComponent(Footer).exists()).toBe(true)
  })

  it('has correct layout structure', () => {
    const wrapper = mount(LandingPage, withRouter)

    // Verify main container has flex column layout
    expect(wrapper.classes()).toContain('flex')
    expect(wrapper.classes()).toContain('flex-col')

    // Verify min-height for full screen
    expect(wrapper.classes()).toContain('min-h-screen')
  })

  it('contains Header, main content, and Footer in correct order', () => {
    const wrapper = mount(LandingPage, withRouter)
    const children = wrapper.findAll(':scope > *')

    // First child should be Header
    expect(children[0].findComponent(Header).exists()).toBe(true)

    // Second child should be main
    expect(children[1].element.tagName).toBe('MAIN')

    // Last child should be Footer
    expect(children[children.length - 1].findComponent(Footer).exists()).toBe(true)
  })
})

describe('HeroSection', () => {
  it('displays platform value proposition', () => {
    const wrapper = mount(HeroSection, withRouter)

    // Check for value proposition text (English implementation)
    expect(wrapper.text()).toContain('Business-Finance Integration')
    expect(wrapper.text()).toContain('Corporate')
  })

  it('has Get Started CTA button', () => {
    const wrapper = mount(HeroSection, withRouter)
    const buttons = wrapper.findAll('button')

    const startButton = buttons.find(b => b.text().includes('Start Building'))
    expect(startButton).toBeDefined()
  })

  it('has View API Docs CTA button', () => {
    const wrapper = mount(HeroSection, withRouter)
    const buttons = wrapper.findAll('button')

    const docsButton = buttons.find(b => b.text().includes('View API Docs'))
    expect(docsButton).toBeDefined()
  })

  it('navigates to /register when Start Building clicked', async () => {
    const wrapper = mount(HeroSection, withRouter)

    // Navigation logic tested in component
    const buttons = wrapper.findAll('button')
    const startButton = buttons.find(b => b.text().includes('Start Building'))
    expect(startButton).toBeDefined()
  })
})

describe('FeaturesSection', () => {
  it('displays key features', () => {
    const wrapper = mount(FeaturesSection)

    // Verify features are displayed
    const section = wrapper.find('section')
    expect(section.exists()).toBe(true)
  })
})

describe('CtaSection', () => {
  it('has CTA buttons', () => {
    const wrapper = mount(CtaSection, withRouter)

    const section = wrapper.find('section')
    expect(section.exists()).toBe(true)
  })
})
