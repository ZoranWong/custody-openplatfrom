<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Message } from '@element-plus/icons-vue'
import apiService from '@/services/api'
import Button from '@/components/common/Button.vue'

const router = useRouter()
const loading = ref(false)

const form = reactive({
  email: ''
})

const error = ref('')

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email) {
    return '请输入邮箱地址'
  }
  if (!emailRegex.test(form.email)) {
    return '请输入有效的邮箱地址'
  }
  return ''
}

const handleSubmit = async () => {
  const emailError = validateEmail()
  if (emailError) {
    error.value = emailError
    return
  }

  loading.value = true
  error.value = ''

  try {
    await apiService.forgotPassword({ email: form.email })
    // Always show success message regardless of whether email exists (security)
    ElMessage.success('重置链接已发送至您的邮箱，请查收')
    router.push('/login')
  } catch (e: any) {
    // Don't reveal if email exists or not - show generic message
    ElMessage.success('重置链接已发送至您的邮箱，请查收')
    router.push('/login')
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
          <h2 class="text-2xl font-bold text-gray-900">找回密码</h2>
          <p class="mt-2 text-gray-600">请输入您的注册邮箱，我们将发送密码重置链接</p>
        </div>

        <!-- Error Alert -->
        <el-alert
          v-if="error"
          type="error"
          :closable="false"
          class="mb-6"
          show-icon
        >
          {{ error }}
        </el-alert>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              邮箱 <span class="text-red-500">*</span>
            </label>
            <el-input
              v-model="form.email"
              type="email"
              placeholder="请输入注册邮箱"
              size="large"
              :prefix-icon="Message"
              :class="{ 'is-error': error }"
              @input="error = ''"
            />
          </div>

          <!-- Submit Button -->
          <Button
            type="primary"
            size="large"
            class="w-full"
            :loading="loading"
          >
            发送重置链接
          </Button>
        </form>

        <!-- Back to Login -->
        <div class="mt-6 text-center">
          <p class="text-gray-600">
            想起密码了？
            <a href="/login" class="text-brand hover:underline font-medium">返回登录</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
