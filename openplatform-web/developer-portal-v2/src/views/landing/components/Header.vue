<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getAssetPath } from '@/utils/assets'
import { languageOptions } from '@/locales'
import { useUserStore } from '@/store/modules/user'
import { LanguageEnum } from '@/enums/appEnum'

const router = useRouter()
const { t, locale } = useI18n()
const userStore = useUserStore()
const isMobileMenuOpen = ref(false)

const navigation = [
  { name: t('landing.header.docs'), href: '/docs' },
  { name: t('landing.header.apiReference'), href: '/api' },
  { name: t('landing.header.sdk'), href: '/sdk' },
  { name: t('landing.header.github'), href: 'https://github.com/cregis' }
]

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const navigateTo = (path: string) => {
  router.push(path)
}

const changeLanguage = (lang: LanguageEnum) => {
  if (locale.value === lang) return
  locale.value = lang
  userStore.setLanguage(lang)
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-50" role="banner">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" role="navigation" aria-label="Main navigation">
      <div class="flex justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <a href="/" class="flex items-center space-x-2" aria-label="Cregis Home">
            <img :src="getAssetPath('logo.svg')" alt="Cregis" class="h-6" />
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

          <!-- Language Switcher -->
          <ElDropdown trigger="click" @command="changeLanguage">
            <button class="text-gray-600 hover:text-brand transition-colors duration-200 flex items-center gap-1" aria-label="Switch language">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span class="text-xs">{{ locale === 'zh' ? '中文' : 'EN' }}</span>
            </button>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem
                  v-for="item in languageOptions"
                  :key="item.value"
                  :command="item.value"
                  :class="{ 'is-selected': locale === item.value }"
                >
                  {{ item.label }}
                </ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>

        <!-- Auth Buttons -->
        <div class="hidden md:flex items-center space-x-4">
          <button
            @click="navigateTo('/login')"
            class="text-gray-600 hover:text-brand transition-colors duration-200"
            aria-label="Sign In"
          >
            {{ $t('landing.header.signIn') }}
          </button>
          <button
            @click="navigateTo('/register')"
            class="btn-primary"
            aria-label="Get Started"
          >
            {{ $t('landing.header.getStarted') }}
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

          <!-- Language Switcher (Mobile) -->
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">{{ $t('setting.theme.title') }}</span>
            <ElDropdown trigger="click" @command="changeLanguage">
              <button class="text-gray-600 hover:text-brand transition-colors duration-200 text-sm flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {{ locale === 'zh' ? '简体中文' : 'English' }}
              </button>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem
                    v-for="item in languageOptions"
                    :key="item.value"
                    :command="item.value"
                  >
                    {{ item.label }}
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>

          <hr class="border-gray-200" />
          <button
            @click="navigateTo('/login')"
            class="text-left text-gray-600 hover:text-brand transition-colors duration-200"
            role="menuitem"
            aria-label="Sign In"
          >
            {{ $t('landing.header.signIn') }}
          </button>
          <button
            @click="navigateTo('/register')"
            class="btn-primary text-center"
            role="menuitem"
            aria-label="Get Started"
          >
            {{ $t('landing.header.getStarted') }}
          </button>
        </div>
      </div>
    </nav>
  </header>
</template>