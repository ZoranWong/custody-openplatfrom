<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Link, ArrowLeft, Loading } from '@element-plus/icons-vue'
import apiService from '@/services/api'
import Button from '@/components/common/Button.vue'

interface ApplicationForm {
  name: string
  description: string
  callbackUrl: string
}

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const submitting = ref(false)
const applicationId = ref('')
const hasUnsavedChanges = ref(false)
const isCancelled = ref(false)

const form = reactive<ApplicationForm>({
  name: '',
  description: '',
  callbackUrl: ''
})

const errors = reactive<ApplicationForm>({
  name: '',
  description: '',
  callbackUrl: ''
})

// Fetch application data
const fetchApplication = async () => {
  applicationId.value = route.params.id as string
  loading.value = true

  try {
    const response = await apiService.getISVApplication(applicationId.value)
    const application = (response as any).data?.application || response
    form.name = application.name || ''
    form.description = application.description || ''
    form.callbackUrl = application.callbackUrl || ''
    // Store original values for change detection
    originalForm.name = form.name
    originalForm.description = form.description
    originalForm.callbackUrl = form.callbackUrl
  } catch (e: any) {
    const code = e.response?.data?.code
    const status = e.response?.status

    if (status === 404 || code === 1004) {
      ElMessage.error('应用不存在')
      router.push('/applications')
    } else if (status === 403 || code === 1003) {
      ElMessage.error('无权访问此应用')
      router.push('/applications')
    } else {
      ElMessage.error('获取应用信息失败')
    }
  } finally {
    loading.value = false
  }
}

// Validation functions
const validateName = () => {
  if (!form.name.trim()) {
    errors.name = '请输入应用名称'
    return false
  }
  if (form.name.length < 1 || form.name.length > 100) {
    errors.name = '应用名称长度为 1-100 个字符'
    return false
  }
  errors.name = ''
  return true
}

const validateDescription = () => {
  if (form.description.length > 500) {
    errors.description = '应用描述不能超过 500 个字符'
    return false
  }
  errors.description = ''
  return true
}

const validateCallbackUrl = () => {
  if (!form.callbackUrl) {
    errors.callbackUrl = ''
    return true // Optional field
  }
  try {
    new URL(form.callbackUrl)
    errors.callbackUrl = ''
    return true
  } catch (e) {
    errors.callbackUrl = '请输入有效的 URL 地址'
    return false
  }
}

const validateForm = () => {
  const nameValid = validateName()
  const descValid = validateDescription()
  const urlValid = validateCallbackUrl()
  return nameValid && descValid && urlValid
}

// Track form changes for unsaved changes guard
const originalForm = reactive<ApplicationForm>({
  name: '',
  description: '',
  callbackUrl: ''
})

// Navigation guard
const confirmNavigation = async (targetPath: string) => {
  if (hasUnsavedChanges.value && !isCancelled.value) {
    try {
      await ElMessageBox.confirm(
        '您有未保存的更改，确定要离开吗？',
        '提示',
        {
          confirmButtonText: '离开',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      // User confirmed, proceed with navigation
      hasUnsavedChanges.value = false
      router.push(targetPath)
    } catch {
      // User cancelled, stay on page
    }
  } else {
    router.push(targetPath)
  }
}

// Track unsaved changes
watch([() => form.name, () => form.description, () => form.callbackUrl], () => {
  hasUnsavedChanges.value =
    form.name !== originalForm.name ||
    form.description !== originalForm.description ||
    form.callbackUrl !== originalForm.callbackUrl
})

// Browser close guard
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  fetchApplication()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// Form handlers
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  submitting.value = true
  errors.name = ''
  errors.description = ''
  errors.callbackUrl = ''

  try {
    const params: Record<string, any> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined
    }
    if (form.callbackUrl.trim()) {
      params.callback_url = form.callbackUrl.trim()
    }

    await apiService.updateISVApplication(applicationId.value, params)
    ElMessage.success('应用信息已更新')
    hasUnsavedChanges.value = false
    router.push(`/applications/${applicationId.value}`)
  } catch (e: any) {
    const code = e.response?.data?.code
    const message = e.response?.data?.message || '保存失败，请稍后重试'

    if (code === 1001) {
      // Validation errors
      const validationErrors = e.response?.data?.errors
      if (validationErrors && Array.isArray(validationErrors)) {
        validationErrors.forEach((err: { field: string; message: string }) => {
          if (err.field === 'name') errors.name = err.message
          else if (err.field === 'description') errors.description = err.message
          else if (err.field === 'callback_url') errors.callbackUrl = err.message
          else if (err.field === 'callbackUrl') errors.callbackUrl = err.message
        })
      } else {
        errors.name = message
      }
    } else if (code === 1003) {
      ElMessage.error('无权修改此应用')
    } else if (code === 1004) {
      ElMessage.error('应用不存在')
      router.push('/applications')
    } else {
      ElMessage.error(message)
    }
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  isCancelled.value = true
  confirmNavigation(`/applications/${applicationId.value}`)
}

const handleBack = () => {
  confirmNavigation(`/applications/${applicationId.value}`)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Back Button -->
      <Button type="info" @click="handleBack" class="mb-6">
        <el-icon class="mr-1"><ArrowLeft /></el-icon>
        返回应用详情
      </Button>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">编辑应用</h1>
        <p class="mt-2 text-gray-600">修改应用信息</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="text-center">
          <el-icon class="is-loading w-8 h-8 text-brand mb-2">
            <Loading />
          </el-icon>
          <p class="text-gray-500">正在加载应用信息...</p>
        </div>
      </div>

      <!-- Edit Form -->
      <div v-else class="card p-6">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- App Name -->
          <div>
            <label for="app-name" class="block text-sm font-medium text-gray-700 mb-1">
              应用名称 <span class="text-red-500">*</span>
            </label>
            <el-input
              id="app-name"
              v-model="form.name"
              placeholder="请输入应用名称"
              size="large"
              class="h-10"
              :class="{ 'is-error': errors.name }"
              maxlength="100"
              show-word-limit
              aria-describedby="name-error"
              @blur="validateName"
              @input="errors.name = ''"
            >
              <template #prefix>
                <el-icon class="text-gray-400"><Document /></el-icon>
              </template>
            </el-input>
            <p v-if="errors.name" id="name-error" class="mt-1 text-sm text-red-500">{{ errors.name }}</p>
          </div>

          <!-- Description -->
          <div>
            <label for="app-description" class="block text-sm font-medium text-gray-700 mb-1">
              应用描述
              <span class="text-gray-400 text-xs ml-1">(可选)</span>
            </label>
            <el-input
              id="app-description"
              v-model="form.description"
              type="textarea"
              placeholder="请输入应用描述"
              size="large"
              class="h-10"
              :class="{ 'is-error': errors.description }"
              rows="4"
              maxlength="500"
              show-word-limit
              aria-describedby="description-error"
              @blur="validateDescription"
              @input="errors.description = ''"
            />
            <p v-if="errors.description" id="description-error" class="mt-1 text-sm text-red-500">{{ errors.description }}</p>
          </div>

          <!-- Callback URL -->
          <div>
            <label for="callback-url" class="block text-sm font-medium text-gray-700 mb-1">
              回调地址
              <span class="text-gray-400 text-xs ml-1">(可选)</span>
            </label>
            <el-input
              id="callback-url"
              v-model="form.callbackUrl"
              placeholder="https://example.com/callback"
              size="large"
              class="h-10"
              :class="{ 'is-error': errors.callbackUrl }"
              aria-describedby="callback-url-error"
              @blur="validateCallbackUrl"
              @input="errors.callbackUrl = ''"
            >
              <template #prefix>
                <el-icon class="text-gray-400"><Link /></el-icon>
              </template>
            </el-input>
            <p v-if="errors.callbackUrl" id="callback-url-error" class="mt-1 text-sm text-red-500">{{ errors.callbackUrl }}</p>
            <p class="mt-1 text-xs text-gray-400">
              用于接收 Webhook 通知，请确保为有效的 HTTPS 地址
            </p>
          </div>

          <!-- Buttons -->
          <div class="pt-4 flex gap-3">
            <Button
              type="primary"
              size="large"
              class="flex-1"
              :loading="submitting"
            >
              保存
            </Button>
            <Button
              type="info"
              size="large"
              class="flex-1"
              @click="handleCancel"
            >
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
