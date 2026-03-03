<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, View, Hide } from '@element-plus/icons-vue'
import apiService from '@/services/api'
import Button from '@/components/common/Button.vue'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const tokenValid = ref(true)

const form = reactive({
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  password: '',
  confirmPassword: ''
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const passwordStrength = computed(() => {
  const pwd = form.password
  let strength = 0
  if (pwd.length >= 8) strength++
  if (/[A-Z]/.test(pwd)) strength++
  if (/[a-z]/.test(pwd)) strength++
  if (/[0-9]/.test(pwd)) strength++
  if (/[@$!%*?&]/.test(pwd)) strength++
  return strength
})

const passwordStrengthText = computed(() => {
  const texts = ['弱', '一般', '中等', '较强', '强']
  return texts[passwordStrength.value - 1] || ''
})

const passwordStrengthClass = computed(() => {
  if (passwordStrength.value <= 1) return 'bg-red-500'
  if (passwordStrength.value <= 2) return 'bg-yellow-500'
  if (passwordStrength.value <= 3) return 'bg-blue-500'
  return 'bg-green-500'
})

const validatePassword = () => {
  const pwd = form.password
  if (!pwd) {
    errors.password = '请输入新密码'
    return false
  }
  if (pwd.length < 8) {
    errors.password = '密码至少需要8个字符'
    return false
  }
  if (!/[A-Z]/.test(pwd)) {
    errors.password = '密码需要包含大写字母'
    return false
  }
  if (!/[a-z]/.test(pwd)) {
    errors.password = '密码需要包含小写字母'
    return false
  }
  if (!/[0-9]/.test(pwd)) {
    errors.password = '密码需要包含数字'
    return false
  }
  if (!/[@$!%*?&]/.test(pwd)) {
    errors.password = '密码需要包含特殊字符 (@$!%*?&)'
    return false
  }
  errors.password = ''
  return true
}

const validateConfirmPassword = () => {
  if (!form.confirmPassword) {
    errors.confirmPassword = '请确认密码'
    return false
  }
  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = '两次输入的密码不一致'
    return false
  }
  errors.confirmPassword = ''
  return true
}

const getResetToken = () => {
  const token = route.query.token as string
  if (!token) {
    tokenValid.value = false
    return null
  }
  return token
}

const handleSubmit = async () => {
  const isPwdValid = validatePassword()
  const isConfirmValid = validateConfirmPassword()

  if (!isPwdValid || !isConfirmValid) {
    return
  }

  const token = getResetToken()
  if (!token) {
    ElMessage.error('重置链接无效或已过期')
    return
  }

  loading.value = true

  try {
    await apiService.resetPassword({ token, password: form.password })
    ElMessage.success('密码重置成功，请使用新密码登录')
    router.push('/login')
  } catch (e: any) {
    const message = e.response?.data?.message || '重置失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getResetToken()
})
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
          <h2 class="text-2xl font-bold text-gray-900">重置密码</h2>
          <p class="mt-2 text-gray-600">请设置您的新密码</p>
        </div>

        <!-- Invalid Token Alert -->
        <el-alert
          v-if="!tokenValid"
          type="error"
          :closable="false"
          class="mb-6"
          title="链接无效"
          description="重置链接无效或已过期，请重新申请"
          show-icon
        />

        <!-- Form -->
        <template v-else>
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                新密码 <span class="text-red-500">*</span>
              </label>
              <el-input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入新密码"
                size="large"
                :prefix-icon="Lock"
                :class="{ 'is-error': errors.password }"
                @blur="validatePassword"
                @input="errors.password = ''"
              >
                <template #suffix>
                  <component
                    :is="showPassword ? Hide : View"
                    class="w-4 h-4 cursor-pointer text-gray-400"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </el-input>
              <p v-if="errors.password" class="mt-1 text-sm text-red-500">{{ errors.password }}</p>

              <!-- Password Strength -->
              <div v-if="form.password" class="mt-2">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class="h-full transition-all duration-300"
                      :class="passwordStrengthClass"
                      :style="{ width: `${(passwordStrength / 5) * 100}%` }"
                    />
                  </div>
                  <span class="text-xs text-gray-500">{{ passwordStrengthText }}</span>
                </div>
                <p class="mt-1 text-xs text-gray-400">
                  密码要求：8位以上，包含大小写字母、数字、特殊字符
                </p>
              </div>
            </div>

            <!-- Confirm Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                确认密码 <span class="text-red-500">*</span>
              </label>
              <el-input
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="请再次输入新密码"
                size="large"
                :prefix-icon="Lock"
                :class="{ 'is-error': errors.confirmPassword }"
                @blur="validateConfirmPassword"
                @input="errors.confirmPassword = ''"
              >
                <template #suffix>
                  <component
                    :is="showConfirmPassword ? Hide : View"
                    class="w-4 h-4 cursor-pointer text-gray-400"
                    @click="showConfirmPassword = !showConfirmPassword"
                  />
                </template>
              </el-input>
              <p v-if="errors.confirmPassword" class="mt-1 text-sm text-red-500">{{ errors.confirmPassword }}</p>
            </div>

            <!-- Submit Button -->
            <Button
              type="primary"
              size="large"
              class="w-full"
              :loading="loading"
            >
              重置密码
            </Button>
          </form>

          <!-- Back to Login -->
          <div class="mt-6 text-center">
            <p class="text-gray-600">
              想起密码了？
              <a href="/login" class="text-brand hover:underline font-medium">返回登录</a>
            </p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
