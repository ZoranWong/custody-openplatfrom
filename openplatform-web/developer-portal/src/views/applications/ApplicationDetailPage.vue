<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Edit, Delete, RefreshRight } from '@element-plus/icons-vue'
import apiService, { type Application } from '@/services/api'
import AppSecretDisplay from '@/components/applications/AppSecretDisplay.vue'
import ApiUsageCard from '@/components/applications/ApiUsageCard.vue'
import RegenerateSecretDialog from '@/components/applications/RegenerateSecretDialog.vue'
import DeleteApplicationDialog from '@/components/applications/DeleteApplicationDialog.vue'
import Button from '@/components/common/Button.vue'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const application = ref<Application | null>(null)
const error = ref<string | null>(null)

// Regenerate secret dialog state
const showRegenerateDialog = ref(false)

// Delete application dialog state
const showDeleteDialog = ref(false)

const openDeleteDialog = () => {
  if (application.value) {
    showDeleteDialog.value = true
  }
}

const handleApplicationDeleted = () => {
  // Redirect to application list after successful deletion
  router.push('/applications')
}

const openRegenerateDialog = () => {
  if (application.value) {
    showRegenerateDialog.value = true
  }
}

const handleSecretRegenerated = () => {
  // Refresh application data to get updated appSecret
  fetchApplication()
}

const appId = computed(() => application.value?.appId || '')
const copiedAppId = ref(false)

const statusConfig = computed(() => {
  const status = application.value?.status || 'pending_review'
  const configs: Record<string, { type: string; text: string }> = {
    pending_review: { type: 'warning', text: 'Pending Review' },
    active: { type: 'success', text: 'Active' },
    inactive: { type: 'info', text: 'Inactive' },
    suspended: { type: 'danger', text: 'Suspended' }
  }
  return configs[status] || configs.pending_review
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const copyAppId = async () => {
  if (!appId.value) return

  try {
    await navigator.clipboard.writeText(appId.value)
    copiedAppId.value = true
    ElMessage.success('Copied to clipboard')
    setTimeout(() => {
      copiedAppId.value = false
    }, 2000)
  } catch (e) {
    ElMessage.error('Copy failed, please copy manually')
  }
}

const handleBack = () => {
  router.push('/applications')
}

const handleEdit = () => {
  if (application.value) {
    router.push(`/applications/${application.value.id}/edit`)
  }
}

const handleDelete = () => {
  openDeleteDialog()
}

const handleRegenerateSecret = () => {
  openRegenerateDialog()
}

const fetchApplication = async () => {
  const id = route.params.id as string
  loading.value = true
  error.value = null

  try {
    const response = await apiService.getISVApplication(id)
    application.value = response.data?.application || null
  } catch (e: any) {
    const status = e.response?.status
    const code = e.response?.data?.code

    if (status === 404 || code === 1004) {
      error.value = 'Application not found'
      ElMessage.error('Application not found')
    } else if (status === 403 || code === 1003) {
      error.value = 'Access denied to this application'
      ElMessage.error('Access denied to this application')
    } else {
      error.value = 'Failed to fetch application information'
      ElMessage.error('Failed to fetch application information')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchApplication()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="w-full mx-auto px-8">
      <!-- Back Button -->
      <Button type="info" @click="handleBack" class="mb-6">
        <el-icon class="mr-1"><ArrowLeft /></el-icon>
        Back to Applications
      </Button>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <el-icon class="is-loading w-8 h-8 text-brand">
          <Loading />
        </el-icon>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="card p-12 text-center">
        <el-icon class="w-16 h-16 mx-auto text-gray-300 mb-4">
          <Warning />
        </el-icon>
        <h3 class="text-lg font-medium text-gray-900 mb-2">{{ error }}</h3>
        <Button type="primary" @click="handleBack">
          Back to Applications
        </Button>
      </div>

      <!-- Detail Content -->
      <template v-else-if="application">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-gray-900">{{ application.name }}</h1>
            <el-tag :type="statusConfig.type" size="large">
              {{ statusConfig.text }}
            </el-tag>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <Button type="warning" @click="handleRegenerateSecret">
              <el-icon class="mr-1"><RefreshRight /></el-icon>
              Reset Secret
            </Button>
            <Button type="info" @click="handleEdit">
              <el-icon class="mr-1"><Edit /></el-icon>
              Edit
            </Button>
            <Button type="danger" @click="handleDelete">
              <el-icon class="mr-1"><Delete /></el-icon>
              Delete
            </Button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left Column: App Info -->
          <div class="space-y-6">
            <!-- AppID -->
            <div class="card p-6">
              <label class="block text-sm font-medium text-gray-500 mb-2">AppID</label>
              <div class="flex gap-2">
                <el-input
                  :value="appId"
                  readonly
                  size="large"
                  class="font-mono flex-1 h-10"
                />
                <Button
                  :type="copiedAppId ? 'success' : 'primary'"
                  @click="copyAppId"
                >
                  {{ copiedAppId ? 'Copied' : 'Copy' }}
                </Button>
              </div>
            </div>

            <!-- AppSecret -->
            <div class="card p-6">
              <AppSecretDisplay
                :app-id="application.appId"
                :app-secret="application.appSecret"
              />
            </div>

            <!-- Status & Callback -->
            <div class="card p-6">
              <h3 class="text-sm font-medium text-gray-500 mb-4">Basic Information</h3>

              <div class="space-y-4">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Status</label>
                  <el-tag :type="statusConfig.type">{{ statusConfig.text }}</el-tag>
                </div>

                <div v-if="application.callbackUrl">
                  <label class="block text-xs text-gray-400 mb-1">Callback URL</label>
                  <p class="text-gray-900 break-all">{{ application.callbackUrl }}</p>
                </div>

                <div v-if="application.description">
                  <label class="block text-xs text-gray-400 mb-1">Description</label>
                  <p class="text-gray-900">{{ application.description }}</p>
                </div>
              </div>
            </div>

            <!-- Timestamps -->
            <div class="card p-6">
              <h3 class="text-sm font-medium text-gray-500 mb-4">Time Information</h3>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Created At</label>
                  <p class="text-gray-900">{{ formatDate(application.createdAt) }}</p>
                </div>

                <div>
                  <label class="block text-xs text-gray-400 mb-1">Last Updated</label>
                  <p class="text-gray-900">{{ formatDate(application.updatedAt) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: API Usage -->
          <div class="space-y-6">
            <ApiUsageCard :api-usage="application.apiUsage" />
          </div>
        </div>
      </template>
    </div>

    <!-- Regenerate Secret Dialog -->
    <RegenerateSecretDialog
      v-if="application"
      v-model="showRegenerateDialog"
      :application-id="application.id"
      :application-name="application.name"
      @regenerated="handleSecretRegenerated"
    />

    <!-- Delete Application Dialog -->
    <DeleteApplicationDialog
      v-if="application"
      v-model="showDeleteDialog"
      :application-id="application.id"
      :application-name="application.name"
      :app-id="application.appId"
      @deleted="handleApplicationDeleted"
    />
  </div>
</template>
