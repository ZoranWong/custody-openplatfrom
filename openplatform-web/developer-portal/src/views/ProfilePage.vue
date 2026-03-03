<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  User,
  OfficeBuilding,
  Warning,
  Check,
  Close,
  Calendar,
  Location,
  Ticket
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import EditProfileForm from '@/components/profile/EditProfileForm.vue'
import Button from '@/components/common/Button.vue'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)

const user = computed(() => authStore.user)
const isvInfo = computed(() => authStore.isvInfo)

const kybStatusConfig = computed(() => {
  const status = isvInfo.value?.kybStatus || 'pending'
  const configs: Record<string, { type: string; text: string; icon: any }> = {
    pending: { type: 'warning', text: 'Under Review', icon: Warning },
    approved: { type: 'success', text: 'Approved', icon: Check },
    rejected: { type: 'danger', text: 'Rejected', icon: Close }
  }
  return configs[status] || configs.pending
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

const handleLogout = async () => {
  await authStore.logout()
  ElMessage.success('Logged out successfully')
  router.push('/')
}

const handleProfileUpdated = () => {
  ElMessage.success('Profile updated successfully')
}

onMounted(async () => {
  try {
    await authStore.fetchProfile()
    await authStore.fetchISVInfo()
  } catch (e) {
    ElMessage.error('Failed to fetch user information')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8" role="main" aria-label="User Profile">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Personal Profile</h1>
        <p class="mt-2 text-gray-600">Manage your account information</p>
      </div>

      <div v-if="loading" class="flex justify-center py-12" role="status" aria-live="polite">
        <el-icon class="is-loading w-8 h-8 text-brand">
          <Loading />
        </el-icon>
      </div>

      <template v-else-if="user">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column: User Info -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Basic Info Card -->
            <div class="card p-6" role="region" aria-labelledby="basic-info-heading">
              <h2 id="basic-info-heading" class="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

              <div class="space-y-4">
                <!-- Email (Read-only) -->
                <div>
                  <label id="email-label" class="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <div class="flex items-center gap-3" role="group" aria-labelledby="email-label">
                    <el-icon class="w-5 h-5 text-gray-400" aria-hidden="true"><User /></el-icon>
                    <span class="text-gray-900">{{ user.email }}</span>
                    <el-tag type="info" size="small" aria-label="Cannot be modified">Cannot be modified</el-tag>
                  </div>
                </div>
              </div>
            </div>

            <!-- Company Information Card -->
            <div class="card p-6" role="region" aria-labelledby="company-info-heading">
              <h2 id="company-info-heading" class="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>

              <div class="space-y-4">
                <!-- Legal Name -->
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Legal Name</label>
                  <div class="flex items-center gap-3">
                    <el-icon class="w-5 h-5 text-gray-400" aria-hidden="true"><OfficeBuilding /></el-icon>
                    <span class="text-gray-900">{{ isvInfo?.legalName || '-' }}</span>
                  </div>
                </div>

                <!-- Registration Number -->
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Registration Number</label>
                  <div class="flex items-center gap-3">
                    <el-icon class="w-5 h-5 text-gray-400" aria-hidden="true"><Ticket /></el-icon>
                    <span class="text-gray-900 font-mono">{{ isvInfo?.registrationNumber || '-' }}</span>
                  </div>
                </div>

                <!-- Jurisdiction -->
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Jurisdiction</label>
                  <div class="flex items-center gap-3">
                    <el-icon class="w-5 h-5 text-gray-400" aria-hidden="true"><Location /></el-icon>
                    <span class="text-gray-900">{{ isvInfo?.jurisdiction || '-' }}</span>
                  </div>
                </div>

                <!-- Date of Incorporation -->
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Date of Incorporation</label>
                  <div class="flex items-center gap-3">
                    <el-icon class="w-5 h-5 text-gray-400" aria-hidden="true"><Calendar /></el-icon>
                    <span class="text-gray-900">{{ isvInfo?.dateOfIncorporation || '-' }}</span>
                  </div>
                </div>

                <!-- Registered Address -->
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Registered Address</label>
                  <div class="flex items-center gap-3">
                    <el-icon class="w-5 h-5 text-gray-400" aria-hidden="true"><Location /></el-icon>
                    <span class="text-gray-900">{{ isvInfo?.registeredAddress || '-' }}</span>
                  </div>
                </div>

                <!-- KYB Status -->
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">KYB Status</label>
                  <div class="flex items-center gap-3">
                    <el-tag :type="kybStatusConfig.type" size="large" role="status" aria-live="polite">
                      <el-icon class="mr-1" aria-hidden="true"><component :is="kybStatusConfig.icon" /></el-icon>
                      {{ kybStatusConfig.text }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>

            <!-- Edit Profile Form -->
            <EditProfileForm :user="user" @updated="handleProfileUpdated" aria-label="Edit Profile Form" />
          </div>

          <!-- Right Column: Account Info -->
          <div class="space-y-6">
            <!-- Account Info Card -->
            <div class="card p-6" role="region" aria-labelledby="account-info-heading">
              <h2 id="account-info-heading" class="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Account ID</label>
                  <p class="text-gray-900 font-mono text-sm" aria-label="Account ID">{{ user.id }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Registration Time</label>
                  <div class="flex items-center gap-2">
                    <el-icon class="w-4 h-4 text-gray-400" aria-hidden="true"><Calendar /></el-icon>
                    <span class="text-gray-900">{{ formatDate(user.createdAt) }}</span>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                  <div class="flex items-center gap-2">
                    <el-icon class="w-4 h-4 text-gray-400" aria-hidden="true"><Calendar /></el-icon>
                    <span class="text-gray-900">{{ formatDate(user.updatedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Logout Card -->
            <div class="card p-6" role="region" aria-labelledby="security-actions-heading">
              <h2 id="security-actions-heading" class="text-lg font-semibold text-gray-900 mb-4">Security Actions</h2>
              <p class="text-sm text-gray-600 mb-4">After logging out, you will need to re-enter your credentials to access</p>
              <Button type="danger" size="default" class="w-full" @click="handleLogout" aria-label="Log out of your account">
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
