<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Link, ArrowLeft, Loading, OfficeBuilding, CreditCard, UserFilled, CircleCheck } from '@element-plus/icons-vue'
import apiService from '@/services/api'
import Button from '@/components/common/Button.vue'

interface ApplicationForm {
  appName: string
  appDescription: string
  appType: 'corporate' | 'payment' | 'custody' | ''
  callbackUrl: string
}

interface ErrorForm {
  appName: string
  appDescription: string
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
  appName: '',
  appDescription: '',
  appType: '',
  callbackUrl: ''
})

const errors = reactive<ErrorForm>({
  appName: '',
  appDescription: '',
  callbackUrl: ''
})

const appTypes = [
  {
    value: 'corporate',
    title: 'Corporate Treasury',
    description: 'Provides bank-grade cryptocurrency settlement solutions for cross-border trading companies and corporate finance departments.',
    icon: OfficeBuilding,
    features: ['Multi-approval Workflows', 'Automated Receivables Collection', 'Compliance Audit Trail']
  },
  {
    value: 'payment',
    title: 'Payment Processing',
    description: 'Provides cryptocurrency payment acceptance capabilities for merchants. Automated accounting processing and streamlined payout processes.',
    icon: CreditCard,
    features: ['High-concurrency Transaction Processing', 'Real-time Risk Control Engine', 'Automated Reconciliation']
  },
  {
    value: 'custody',
    title: 'Individual Custody',
    description: 'Provides cryptocurrency wallet services for retail users to banks and financial institutions (B2B2C).',
    icon: UserFilled,
    features: ['Isolated Deposit Addresses', 'White-label Integration Support', 'Multi-chain Asset Management']
  }
]

// Fetch application data
const fetchApplication = async () => {
  applicationId.value = route.params.id as string
  loading.value = true

  try {
    const response = await apiService.getISVApplication(applicationId.value)
    const application = (response as any).data?.application || response
    form.appName = application.appName || ''
    form.appDescription = application.appDescription || ''
    form.appType = application.appType || ''
    form.callbackUrl = application.callbackUrl || ''
    // Store original values for change detection
    originalForm.appName = form.appName
    originalForm.appDescription = form.appDescription
    originalForm.appType = form.appType
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
const validateAppName = () => {
  if (!form.appName.trim()) {
    errors.appName = '请输入应用名称'
    return false
  }
  if (form.appName.length < 1 || form.appName.length > 100) {
    errors.appName = '应用名称长度为 1-100 个字符'
    return false
  }
  errors.appName = ''
  return true
}

const validateAppDescription = () => {
  if (form.appDescription.length > 500) {
    errors.appDescription = '应用描述不能超过 500 个字符'
    return false
  }
  errors.appDescription = ''
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
  const nameValid = validateAppName()
  const descValid = validateAppDescription()
  const urlValid = validateCallbackUrl()
  return nameValid && descValid && urlValid
}

// Track form changes for unsaved changes guard
const originalForm = reactive<ApplicationForm>({
  appName: '',
  appDescription: '',
  appType: '',
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
watch([() => form.appName, () => form.appDescription, () => form.callbackUrl], () => {
  hasUnsavedChanges.value =
    form.appName !== originalForm.appName ||
    form.appDescription !== originalForm.appDescription ||
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
  errors.appName = ''
  errors.appDescription = ''
  errors.callbackUrl = ''

  try {
    const params: Record<string, any> = {
      appName: form.appName.trim(),
      appDescription: form.appDescription.trim() || undefined,
      callbackUrl: form.callbackUrl.trim() || undefined
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
          if (err.field === 'appName') errors.appName = err.message
          else if (err.field === 'appDescription') errors.appDescription = err.message
          else if (err.field === 'callbackUrl') errors.callbackUrl = err.message
          else if (err.field === 'callback_url') errors.callbackUrl = err.message
        })
      } else {
        errors.appName = message
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
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
              v-model="form.appName"
              placeholder="请输入应用名称"
              size="large"
              class="h-10"
              :class="{ 'is-error': errors.appName }"
              maxlength="100"
              show-word-limit
              aria-describedby="name-error"
              :validate-event="false"
              @blur="validateAppName"
              @input="errors.appName = ''"
            >
              <template #prefix>
                <el-icon class="text-gray-400"><Document /></el-icon>
              </template>
            </el-input>
            <p v-if="errors.appName" id="name-error" class="mt-1 text-sm text-red-500">{{ errors.appName }}</p>
          </div>

          <!-- Description -->
          <div>
            <label for="app-description" class="block text-sm font-medium text-gray-700 mb-1">
              应用描述
              <span class="text-gray-400 text-xs ml-1">(可选)</span>
            </label>
            <el-input
              id="app-description"
              v-model="form.appDescription"
              type="textarea"
              placeholder="请输入应用描述"
              size="large"
              class="h-10"
              :class="{ 'is-error': errors.appDescription }"
              rows="4"
              maxlength="500"
              show-word-limit
              aria-describedby="description-error"
              @blur="validateAppDescription"
              @input="errors.appDescription = ''"
            />
            <p v-if="errors.appDescription" id="description-error" class="mt-1 text-sm text-red-500">{{ errors.appDescription }}</p>
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

          <!-- App Type (Read-only) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">
              应用类型 <span class="text-gray-400 text-xs font-normal">(只读)</span>
            </label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pointer-events-none">
              <div
                v-for="type in appTypes"
                :key="type.value"
                class="relative border-2 rounded-lg p-4 transition-all select-none"
                :class="[
                  form.appType === type.value
                    ? 'border-brand bg-brand/5'
                    : 'border-gray-200 opacity-50'
                ]"
              >
                <div class="flex items-center gap-3 mb-3">
                  <el-icon class="w-6 h-6" :class="form.appType === type.value ? 'text-brand' : 'text-gray-400'">
                    <component :is="type.icon" />
                  </el-icon>
                  <span class="font-medium text-gray-900">{{ type.title }}</span>
                </div>
                <p class="text-sm text-gray-600 mb-3">{{ type.description }}</p>
                <ul class="space-y-1">
                  <li
                    v-for="feature in type.features"
                    :key="feature"
                    class="flex items-center gap-2 text-xs text-gray-500"
                  >
                    <el-icon class="text-brand w-3 h-3"><CircleCheck /></el-icon>
                    {{ feature }}
                  </li>
                </ul>
                <el-icon
                  v-if="form.appType === type.value"
                  class="absolute top-2 right-2 text-brand w-5 h-5"
                >
                  <CircleCheck />
                </el-icon>
              </div>
            </div>
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
