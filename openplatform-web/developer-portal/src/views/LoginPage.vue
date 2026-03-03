<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Message, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/common/Button.vue'

interface LoginForm {
  email: string
  password: string
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)

const form = reactive<LoginForm>({
  email: '',
  password: ''
})

const errors = reactive({
  email: '',
  password: '',
  general: ''
})

// Get redirect path from query params
const getRedirectPath = () => {
  const redirect = route.query.redirect as string
  return redirect || '/dashboard'
}

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  errors.email = emailRegex.test(form.email) ? '' : 'Please enter a valid email address'
}

const validatePassword = () => {
  errors.password = form.password ? '' : 'Please enter your password'
}

const handleSubmit = async () => {
  // Validate all fields
  validateEmail()
  validatePassword()

  if (errors.email || errors.password) {
    return
  }

  loading.value = true
  errors.general = ''

  try {
    await authStore.login(form.email, form.password)
    ElMessage.success('Login successful!')
    router.push(getRedirectPath())
  } catch (error: any) {
    const message = error.response?.data?.message || 'Login failed, please try again later'
    errors.general = message
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <a href="/" class="inline-block">
          <img src="/logo.svg" alt="Cregis" class="h-8 mx-auto" />
        </a>
      </div>

      <!-- Card -->
      <div class="card p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-gray-900">Sign In</h2>
          <p class="mt-2 text-gray-600">Sign in to your developer account</p>
        </div>

        <!-- General Error -->
        <el-alert
          v-if="errors.general"
          type="error"
          :closable="false"
          class="mb-6"
          show-icon
        >
          {{ errors.general }}
        </el-alert>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-6" role="form" aria-label="Login form">
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email <span class="text-red-500">*</span>
            </label>
            <el-input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="Enter your email"
              size="large"
              :prefix-icon="Message"
              :class="{ 'is-error': errors.email }"
              @blur="validateEmail"
              @input="errors.email = ''"
              aria-describedby="email-error"
            />
            <p v-if="errors.email" id="email-error" class="mt-1 text-sm text-red-500" role="alert">{{ errors.email }}</p>
          </div>

          <!-- Password -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <label for="password" class="block text-sm font-medium text-gray-700">
                Password <span class="text-red-500">*</span>
              </label>
              <a href="/forgot-password" class="text-sm text-brand hover:underline">
                Forgot password?
              </a>
            </div>
            <el-input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              size="large"
              show-password
              :prefix-icon="Lock"
              :class="{ 'is-error': errors.password }"
              @blur="validatePassword"
              @input="errors.password = ''"
              aria-describedby="password-error"
            />
            <p v-if="errors.password" id="password-error" class="mt-1 text-sm text-red-500" role="alert">{{ errors.password }}</p>
          </div>

          <!-- Submit Button -->
          <Button
            type="primary"
            size="large"
            class="w-full"
            :loading="loading"
            :loading-text="'Signing in...'"
            @click="handleSubmit"
          >
            Sign In
          </Button>
        </form>

        <!-- Register Link -->
        <div class="mt-6 text-center">
          <p class="text-gray-600">
            Don't have an account?
            <a href="/register" class="text-brand hover:underline font-medium">Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
