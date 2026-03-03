<script setup lang="ts">
const currentYear = new Date().getFullYear()

const footerLinks = {
  Product: [
    { name: 'API Reference', href: '/api' },
    { name: 'SDK', href: '/sdk' },
    { name: 'Pricing', href: '/pricing' }
  ],
  Resources: [
    { name: 'Documentation', href: '/docs' },
    { name: 'Quick Start', href: '/quickstart' },
    { name: 'Examples', href: '/examples' }
  ],
  Company: [
    { name: 'About Us', href: '/about' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'Privacy Policy', href: '/privacy' }
  ]
}
</script>

<template>
  <footer class="bg-gray-50 border-t border-gray-200" role="contentinfo">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        <!-- Brand -->
        <div class="col-span-2 md:col-span-1">
          <div class="flex items-center space-x-2 mb-4">
            <img src="/logo.svg" alt="Cregis" class="h-6" />
          </div>
          <p class="text-gray-500 text-sm mb-4">
            Enterprise-Grade Cryptocurrency Custody Infrastructure
          </p>
          <a
            href="https://github.com/cregis"
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-400 hover:text-brand transition-colors duration-200"
            aria-label="Cregis GitHub (opens in new tab)"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>

        <!-- Links -->
        <div v-for="(links, category) in footerLinks" :key="category">
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4" :id="'footer-' + category.toLowerCase()">
            {{ category }}
          </h3>
          <ul class="space-y-3" :aria-labelledby="'footer-' + category.toLowerCase()">
            <li v-for="link in links" :key="link.name">
              <a
                :href="link.href"
                class="text-gray-500 hover:text-brand transition-colors duration-200 text-sm"
              >
                {{ link.name }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
        <p class="text-gray-400 text-sm">
          &copy; {{ currentYear }} Cregis. All rights reserved.
        </p>
        <div class="flex space-x-6 mt-4 md:mt-0">
          <a href="/terms" class="text-gray-400 hover:text-brand text-sm transition-colors duration-200">
            Terms of Service
          </a>
          <a href="/privacy" class="text-gray-400 hover:text-brand text-sm transition-colors duration-200">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>
