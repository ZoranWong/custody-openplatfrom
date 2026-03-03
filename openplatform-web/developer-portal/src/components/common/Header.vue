<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isMobileMenuOpen = ref(false)

const navigation = [
  { name: 'Docs', href: '/docs' },
  { name: 'API Reference', href: '/api' },
  { name: 'SDK', href: '/sdk' },
  { name: 'GitHub', href: 'https://github.com/cregis' }
]

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-50" role="banner">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" role="navigation" aria-label="Main navigation">
      <div class="flex justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <a href="/" class="flex items-center space-x-2" aria-label="Cregis Home">
            <img src="/logo.svg" alt="Cregis" class="h-6" />
          </a>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <a
            v-for="item in navigation"
            :key="item.name"
            :href="item.href"
            class="text-gray-600 hover:text-brand transition-colors duration-200"
            :target="item.href.startsWith('http') ? '_blank' : undefined"
            :rel="item.href.startsWith('http') ? 'noopener noreferrer' : undefined"
          >
            {{ item.name }}
          </a>
        </div>

        <!-- Auth Buttons -->
        <div class="hidden md:flex items-center space-x-4">
          <button
            @click="navigateTo('/login')"
            class="text-gray-600 hover:text-brand transition-colors duration-200"
            aria-label="Sign In"
          >
            Sign In
          </button>
          <button
            @click="navigateTo('/register')"
            class="btn-primary"
            aria-label="Get Started"
          >
            Get Started
          </button>
        </div>

        <!-- Mobile menu button -->
        <div class="flex items-center md:hidden">
          <button
            @click="toggleMobileMenu"
            class="text-gray-600 hover:text-brand p-2"
            aria-label="Toggle mobile menu"
            :aria-expanded="isMobileMenuOpen"
            aria-controls="mobile-menu"
          >
            <svg v-if="!isMobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="isMobileMenuOpen" id="mobile-menu" class="md:hidden py-4 border-t border-gray-200" role="menu">
        <div class="flex flex-col space-y-4">
          <a
            v-for="item in navigation"
            :key="item.name"
            :href="item.href"
            class="text-gray-600 hover:text-brand transition-colors duration-200"
            :target="item.href.startsWith('http') ? '_blank' : undefined"
            :rel="item.href.startsWith('http') ? 'noopener noreferrer' : undefined"
            role="menuitem"
          >
            {{ item.name }}
          </a>
          <hr class="border-gray-200" />
          <button
            @click="navigateTo('/login')"
            class="text-left text-gray-600 hover:text-brand transition-colors duration-200"
            role="menuitem"
            aria-label="Sign In"
          >
            Sign In
          </button>
          <button
            @click="navigateTo('/register')"
            class="btn-primary text-center"
            role="menuitem"
            aria-label="Get Started"
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  </header>
</template>
