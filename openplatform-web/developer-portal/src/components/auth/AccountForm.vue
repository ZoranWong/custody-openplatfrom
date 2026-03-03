<script setup lang="ts">
import { reactive } from 'vue'

const form = defineModel<{
  email: string
  password: string
  confirmPassword: string
}>({
  default: {
    email: '',
    password: '',
    confirmPassword: ''
  }
})


const errors = reactive({
  email: '',
  password: '',
  confirmPassword: ''
})

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  errors.email = form.value && emailRegex.test(form.value.email) ? '' : 'Please enter a valid email address'
}

const validatePassword = () => {
  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  errors.password = form.value && pwdRegex.test(form.value.password)
    ? ''
    : 'Password must contain uppercase, lowercase, numbers, and special characters'
}

const validateConfirmPassword = () => {
  errors.confirmPassword = form.value && form.value.confirmPassword === form.value.password ? '' : 'Passwords do not match'
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-medium text-gray-900">Account Information</h3>

    <!-- Email -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Email <span class="text-red-500">*</span>
      </label>
      <el-input
        v-model="form.email"
        type="email"
        placeholder="Enter your email"
        class="h-10"
        @blur="validateEmail"
        @input="errors.email = ''"
      />
      <p v-if="errors.email" class="mt-1 text-sm text-red-500">{{ errors.email }}</p>
    </div>

    <!-- Password -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Password <span class="text-red-500">*</span>
      </label>
      <el-input
        v-model="form.password"
        type="password"
        placeholder="Include uppercase, lowercase, numbers, and special characters"
        show-password
        class="h-10"
        @blur="validatePassword"
        @input="errors.password = ''"
      />
      <p class="mt-1 text-xs text-gray-500">Minimum 8 characters with uppercase, lowercase, numbers, and special characters</p>
      <p v-if="errors.password" class="mt-1 text-sm text-red-500">{{ errors.password }}</p>
    </div>

    <!-- Confirm Password -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Confirm Password <span class="text-red-500">*</span>
      </label>
      <el-input
        v-model="form.confirmPassword"
        type="password"
        placeholder="Enter password again"
        show-password
        class="h-10"
        @blur="validateConfirmPassword"
        @input="errors.confirmPassword = ''"
      />
      <p v-if="errors.confirmPassword" class="mt-1 text-sm text-red-500">{{ errors.confirmPassword }}</p>
    </div>
  </div>
</template>
