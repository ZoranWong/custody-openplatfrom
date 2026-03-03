<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, Key, CircleCheck, Warning } from '@element-plus/icons-vue'
import apiService from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const passwordRules = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/
}

// Password strength calculation
const passwordStrength = computed(() => {
  const password = newPassword.value
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= passwordRules.minLength) score++
  if (passwordRules.hasUppercase.test(password)) score++
  if (passwordRules.hasLowercase.test(password)) score++
  if (passwordRules.hasNumber.test(password)) score++
  if (passwordRules.hasSpecial.test(password)) score++

  if (score <= 2) return { score, label: 'Weak', color: '#ff4d4f' }
  if (score <= 4) return { score, label: 'Medium', color: '#fa8c16' }
  return { score, label: 'Strong', color: '#52c41a' }
})

const passwordMatchError = computed(() => {
  return confirmPassword.value && newPassword.value !== confirmPassword.value
})

const isFormValid = computed(() => {
  return (
    currentPassword.value.length > 0 &&
    newPassword.value.length >= passwordRules.minLength &&
    passwordStrength.value.score >= 3 &&
    !passwordMatchError.value
  )
})

const validatePassword = (password: string): string[] => {
  const errors: string[] = []
  if (password.length < passwordRules.minLength) {
    errors.push(`Password must be at least ${passwordRules.minLength} characters`)
  }
  if (!passwordRules.hasUppercase.test(password)) {
    errors.push('Password must contain an uppercase letter')
  }
  if (!passwordRules.hasLowercase.test(password)) {
    errors.push('Password must contain a lowercase letter')
  }
  if (!passwordRules.hasNumber.test(password)) {
    errors.push('Password must contain a number')
  }
  if (!passwordRules.hasSpecial.test(password)) {
    errors.push('Password must contain a special character')
  }
  return errors
}

const handleSubmit = async () => {
  if (!isFormValid.value) {
    ElMessage.error('Please fill in all password information')
    return
  }

  const validationErrors = validatePassword(newPassword.value)
  if (validationErrors.length > 0) {
    ElMessage.error(validationErrors[0])
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    ElMessage.error('Passwords do not match')
    return
  }

  loading.value = true

  try {
    const response = await apiService.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })

    if (response.code === 0) {
      ElMessage.success('Password changed successfully. Please log in again.')

      // Clear form
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''

      // Redirect to login after a short delay
      setTimeout(() => {
        authStore.logout()
      }, 1500)
    } else {
      ElMessage.error(response.message || 'Failed to change password')
    }
  } catch (e: any) {
    const message = e.response?.data?.message || 'Failed to change password. Please try again.'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="w-full mx-auto px-8">
      <!-- Breadcrumb Navigation -->
      <nav class="mb-6" aria-label="Breadcrumb">
        <ol class="flex items-center space-x-2 text-sm">
          <li>
            <button @click="navigateTo('/')" class="text-gray-500 hover:text-brand">
              Home
            </button>
          </li>
          <li class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium">Change Password</li>
        </ol>
      </nav>

      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Change Password</h1>
          <p class="mt-2 text-gray-600">Regularly changing your password helps protect your account security</p>
        </div>
      </div>

      <!-- Password Change Form -->
      <div class="max-w-2xl">
        <el-card class="form-card">
          <el-form
            :model="{
              currentPassword,
              newPassword,
              confirmPassword
            }"
            label-position="top"
            @submit.prevent="handleSubmit"
          >
            <!-- Current Password -->
            <el-form-item label="Current Password" required>
              <el-input
                v-model="currentPassword"
                type="password"
                placeholder="Enter your current password"
                show-password
                autocomplete="off"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <!-- New Password -->
            <el-form-item label="New Password" required>
              <el-input
                v-model="newPassword"
                type="password"
                placeholder="Enter your new password"
                show-password
                autocomplete="new-password"
              >
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>

              <!-- Password Strength Indicator -->
              <div v-if="newPassword" class="password-strength">
                <div class="strength-bar">
                  <div
                    class="strength-fill"
                    :style="{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: passwordStrength.color
                    }"
                  ></div>
                </div>
                <span :style="{ color: passwordStrength.color }">
                  Strength: {{ passwordStrength.label }}
                </span>
              </div>

              <!-- Password Requirements -->
              <div class="password-requirements">
                <p class="requirements-title">Password Requirements:</p>
                <ul class="requirements-list">
                  <li :class="{ met: newPassword.length >= passwordRules.minLength }">
                    <el-icon v-if="newPassword.length >= passwordRules.minLength"><CircleCheck /></el-icon>
                    <el-icon v-else><Warning /></el-icon>
                    At least {{ passwordRules.minLength }} characters
                  </li>
                  <li :class="{ met: passwordRules.hasUppercase.test(newPassword) }">
                    <el-icon v-if="passwordRules.hasUppercase.test(newPassword)"><CircleCheck /></el-icon>
                    <el-icon v-else><Warning /></el-icon>
                    Contains uppercase letter
                  </li>
                  <li :class="{ met: passwordRules.hasLowercase.test(newPassword) }">
                    <el-icon v-if="passwordRules.hasLowercase.test(newPassword)"><CircleCheck /></el-icon>
                    <el-icon v-else><Warning /></el-icon>
                    Contains lowercase letter
                  </li>
                  <li :class="{ met: passwordRules.hasNumber.test(newPassword) }">
                    <el-icon v-if="passwordRules.hasNumber.test(newPassword)"><CircleCheck /></el-icon>
                    <el-icon v-else><Warning /></el-icon>
                    Contains a number
                  </li>
                  <li :class="{ met: passwordRules.hasSpecial.test(newPassword) }">
                    <el-icon v-if="passwordRules.hasSpecial.test(newPassword)"><CircleCheck /></el-icon>
                    <el-icon v-else><Warning /></el-icon>
                    Contains special character
                  </li>
                </ul>
              </div>
            </el-form-item>

            <!-- Confirm Password -->
            <el-form-item label="Confirm New Password" required>
              <el-input
                v-model="confirmPassword"
                type="password"
                placeholder="Enter your new password again"
                show-password
                autocomplete="new-password"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
              <el-alert
                v-if="passwordMatchError"
                type="error"
                :closable="false"
                show-icon
                class="password-mismatch"
              >
                Passwords do not match
              </el-alert>
            </el-form-item>

            <!-- Submit Button -->
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                :disabled="!isFormValid || passwordMatchError"
                size="large"
                @click="handleSubmit"
              >
                Change Password
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- Security Tips -->
        <el-card class="tips-card">
          <template #header>
            <span class="card-title">Security Tips</span>
          </template>
          <ul class="tips-list">
            <li>Use a password manager to generate and store strong passwords</li>
            <li>Do not use the same password on other websites or platforms</li>
            <li>Change your password regularly, recommended every 90 days</li>
            <li>After changing your password, you will need to log in again</li>
          </ul>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-card {
  border-radius: 12px;
  margin-bottom: 24px;
}

.tips-card {
  border-radius: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.password-requirements {
  margin-top: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.requirements-title {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.requirements-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.requirements-list li.met {
  color: #22c55e;
}

.requirements-list li .el-icon {
  font-size: 14px;
}

.password-mismatch {
  margin-top: 8px;
}

.tips-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.tips-list li {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
}

.tips-list li:last-child {
  margin-bottom: 0;
}
</style>
