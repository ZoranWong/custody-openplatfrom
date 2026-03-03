<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Document, Link, Notebook, OfficeBuilding, CreditCard, UserFilled, CircleCheck } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import apiService, { type Application } from '@/services/api'
import AppSecretDialog from '@/components/applications/AppSecretDialog.vue'
import Button from '@/components/common/Button.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const showAppSecretDialog = ref(false)
const createdApplication = ref<Application | null>(null)

const form = reactive({
  name: '',
  description: '',
  callbackUrl: '',
  type: '' as 'corporate' | 'payment' | 'custody' | ''
})

const errors = reactive({
  name: '',
  description: '',
  callbackUrl: '',
  type: ''
})

const appTypes = [
  {
    value: 'corporate',
    title: 'Corporate Treasury',
    description: 'Provides bank-grade cryptocurrency settlement solutions for cross-border trading companies and corporate finance departments. Automates financial processes and reduces operational costs.',
    icon: OfficeBuilding,
    features: ['Multi-approval Workflows', 'Automated Receivables Collection', 'Compliance Audit Trail']
  },
  {
    value: 'payment',
    title: 'Payment Processing',
    description: 'Provides cryptocurrency payment acceptance capabilities for merchants. Automated accounting processing, large-value risk isolation, and streamlined payout processes.',
    icon: CreditCard,
    features: ['High-concurrency Transaction Processing', 'Real-time Risk Control Engine', 'Automated Reconciliation']
  },
  {
    value: 'custody',
    title: 'Individual Custody',
    description: 'Provides cryptocurrency wallet services for retail users to banks and financial institutions (B2B2C). We handle custody, you focus on the experience.',
    icon: UserFilled,
    features: ['Isolated Deposit Addresses', 'White-label Integration Support', 'Multi-chain Asset Management']
  }
]

// KYB Status and ownership check
const kybStatus = computed(() => authStore.user?.isvInfo?.kybStatus || authStore.isvInfo?.kybStatus || 'pending')
const isOwner = computed(() => authStore.user?.role === 'owner' || authStore.isOwner)
const canCreateApp = computed(() => kybStatus.value === 'approved' && isOwner.value)

const kybStatusMessage = computed(() => {
  if (kybStatus.value === 'pending') {
    return 'Your enterprise verification is under review. You can create applications after approval.'
  }
  if (kybStatus.value === 'rejected') {
    return 'Enterprise verification was rejected. Please contact customer support.'
  }
  return ''
})

const roleMessage = computed(() => {
  if (!isOwner.value) {
    return 'Only enterprise administrators can create applications. Please contact your administrator.'
  }
  return ''
})

const handleBack = () => {
  router.push('/applications')
}

// Validation
const validateName = () => {
  if (!form.name.trim()) {
    errors.name = 'Please enter an application name'
    return false
  }
  if (form.name.length < 1 || form.name.length > 50) {
    errors.name = 'Application name must be 1-50 characters'
    return false
  }
  errors.name = ''
  return true
}

const validateDescription = () => {
  if (form.description.length > 500) {
    errors.description = 'Application description cannot exceed 500 characters'
    return false
  }
  errors.description = ''
  return true
}

const validateType = () => {
  if (!form.type) {
    errors.type = 'Please select an application type'
    return false
  }
  errors.type = ''
  return true
}

const validateCallbackUrl = () => {
  if (!form.callbackUrl.trim()) {
    errors.callbackUrl = 'Please enter a callback URL'
    return false
  }
  try {
    new URL(form.callbackUrl)
    errors.callbackUrl = ''
    return true
  } catch (e) {
    errors.callbackUrl = 'Please enter a valid URL'
    return false
  }
}

const validateForm = () => {
  const nameValid = validateName()
  const descValid = validateDescription()
  const typeValid = validateType()
  const urlValid = validateCallbackUrl()
  return nameValid && descValid && typeValid && urlValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  errors.name = ''
  errors.description = ''
  errors.callbackUrl = ''
  errors.type = ''

  try {
    const params = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      callbackUrl: form.callbackUrl.trim() || undefined,
      type: form.type as 'corporate' | 'payment' | 'custody'
    }

    createdApplication.value = (await apiService.createISVApplication(params)).data?.application
    showAppSecretDialog.value = true
  } catch (e: any) {
    const code = e.response?.data?.code
    const message = e.response?.data?.message || 'Creation failed. Please try again later.'

    if (code === 1002 || e.response?.status === 409) {
      errors.name = 'Application name already exists. Please use a different name.'
    } else if (code === 40303) {
      // KYB not approved
      await authStore.fetchISVInfo()
      ElMessage.error('Enterprise verification must be approved before creating applications')
    } else if (code === 40302) {
      // Not owner
      ElMessage.error('Only enterprise administrators can create applications')
    } else {
      ElMessage.error(message)
    }
  } finally {
    loading.value = false
  }
}

const handleAppSecretConfirm = () => {
  router.push('/applications')
}

onMounted(async () => {
  // Ensure user profile and ISV info are loaded to get latest KYB status
  // Always refresh to get the most recent KYB status after backend review
  if (!authStore.user) {
    await authStore.fetchProfile()
  }
  await authStore.fetchISVInfo()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Back Button -->
      <Button type="info" @click="handleBack" class="mb-6">
        <el-icon class="mr-1"><ArrowLeft /></el-icon>
        Back to Applications
      </Button>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Create Application</h1>
        <p class="mt-2 text-gray-600">Fill in the information below to create your application</p>
      </div>

      <!-- KYB Status or Role Warning -->
      <div v-if="!canCreateApp" class="card p-6 mb-6">
        <div class="flex items-start gap-3">
          <el-icon class="w-6 h-6 text-warning mt-0.5"><Notebook /></el-icon>
          <div>
            <h3 class="font-medium text-gray-900">Unable to Create Application</h3>
            <p class="text-gray-600 mt-1">{{ roleMessage || kybStatusMessage }}</p>
          </div>
        </div>
      </div>

      <!-- Creation Form -->
      <div v-else class="card p-6">
        <form @submit.prevent="handleSubmit" class="space-y-8">
          <!-- App Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Application Name <span class="text-red-500">*</span>
            </label>
            <el-input
              v-model="form.name"
              placeholder="Enter application name"
              size="large"
              class="h-10"
              :class="{ 'is-error': errors.name }"
              maxlength="50"
              show-word-limit
              @blur="validateName"
              @input="errors.name = ''"
            >
              <template #prefix>
                <el-icon class="text-gray-400"><Document /></el-icon>
              </template>
            </el-input>
            <p v-if="errors.name" class="mt-1 text-sm text-red-500">{{ errors.name }}</p>
          </div>

          <!-- App Type Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Application Type <span class="text-red-500">*</span>
            </label>
            <p class="text-sm text-gray-500 mb-4">Select your business model. We will provide corresponding API and feature support based on the type.</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                v-for="type in appTypes"
                :key="type.value"
                class="relative border-2 rounded-lg p-4 cursor-pointer transition-all"
                :class="[
                  form.type === type.value
                    ? 'border-brand bg-brand/5'
                    : 'border-gray-200 hover:border-brand/30'
                ]"
                @click="form.type = type.value as any; errors.type = ''"
              >
                <div class="flex items-center gap-3 mb-3">
                  <el-icon class="w-6 h-6" :class="form.type === type.value ? 'text-brand' : 'text-gray-400'">
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
                  v-if="form.type === type.value"
                  class="absolute top-2 right-2 text-brand w-5 h-5"
                >
                  <CircleCheck />
                </el-icon>
              </div>
            </div>
            <p v-if="errors.type" class="mt-2 text-sm text-red-500">{{ errors.type }}</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Application Description <span class="text-red-500">*</span>
            </label>
            <el-input
              v-model="form.description"
              type="textarea"
              placeholder="Enter application description"
              size="large"
              class="h-10"
              :class="{ 'is-error': errors.description }"
              :rows="4"
              maxlength="500"
              show-word-limit
              @blur="validateDescription"
              @input="errors.description = ''"
            />
            <p v-if="errors.description" class="mt-1 text-sm text-red-500">{{ errors.description }}</p>
          </div>

          <!-- Callback URL -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Callback URL <span class="text-red-500">*</span>
            </label>
            <el-input
              v-model="form.callbackUrl"
              placeholder="https://example.com/callback"
              size="large"
              class="h-10"
              :class="{ 'is-error': errors.callbackUrl }"
              @blur="validateCallbackUrl"
              @input="errors.callbackUrl = ''"
            >
              <template #prefix>
                <el-icon class="text-gray-400"><Link /></el-icon>
              </template>
            </el-input>
            <p v-if="errors.callbackUrl" class="mt-1 text-sm text-red-500">{{ errors.callbackUrl }}</p>
            <p class="mt-1 text-xs text-gray-400">
              Used to receive Webhook notifications. Please ensure it is a valid HTTPS URL.
            </p>
          </div>

          <!-- Submit Button -->
          <div class="pt-4">
            <Button
              type="primary"
              size="large"
              native-type="submit"
              class="w-full"
              :loading="loading"
            >
              Create Application
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- AppSecret Dialog -->
    <AppSecretDialog
      v-model="showAppSecretDialog"
      :application="createdApplication"
      @confirm="handleAppSecretConfirm"
    />
  </div>
</template>
