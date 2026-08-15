<script setup lang="ts">
  import { onMounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { useAuthStore } from '@/stores/auth'
  import apiService from '@/api/api-service'

  defineOptions({ name: 'DeveloperProfile' })

  const router = useRouter()
  const authStore = useAuthStore()
  const loading = ref(true)

  const user = computed(() => authStore.user)
  const isvInfo = computed(() => authStore.isvInfo)

  const kybStatusConfig = computed(() => {
    const status = isvInfo.value?.kybStatus || 'pending'
    const configs: Record<string, { type: 'primary' | 'success' | 'warning' | 'info' | 'danger'; text: string }> = {
      pending: { type: 'warning', text: 'Under Review' },
      approved: { type: 'success', text: 'Approved' },
      rejected: { type: 'danger', text: 'Rejected' }
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
  <div class="p-5">
    <div class="mb-8">
      <h1 class="text-2xl font-bold">Personal Profile</h1>
      <p class="mt-2 text-gray-500">Manage your account information</p>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <el-icon class="is-loading" :size="32">
        <Loading />
      </el-icon>
    </div>

    <template v-else-if="user">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Basic Info Card -->
          <ElCard shadow="never">
            <template #header>
              <h2 class="text-lg font-semibold">Basic Information</h2>
            </template>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <div class="flex items-center gap-3">
                  <el-icon><Message /></el-icon>
                  <span>{{ user.email }}</span>
                  <ElTag type="info" size="small">Cannot be modified</ElTag>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <div class="flex items-center gap-3">
                  <el-icon><User /></el-icon>
                  <span>{{ user.name || '-' }}</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Role</label>
                <ElTag :type="user.role === 'owner' ? 'warning' : 'info'">
                  {{ user.role }}
                </ElTag>
              </div>
            </div>
          </ElCard>

          <!-- Company Information Card -->
          <ElCard v-if="isvInfo" shadow="never">
            <template #header>
              <h2 class="text-lg font-semibold">Company Information</h2>
            </template>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Legal Name</label>
                <div class="flex items-center gap-3">
                  <el-icon><OfficeBuilding /></el-icon>
                  <span>{{ isvInfo.legalName || '-' }}</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Registration Number</label>
                <div class="flex items-center gap-3">
                  <el-icon><Ticket /></el-icon>
                  <span class="font-mono">{{ isvInfo.registrationNumber || '-' }}</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Jurisdiction</label>
                <div class="flex items-center gap-3">
                  <el-icon><Location /></el-icon>
                  <span>{{ isvInfo.jurisdiction || '-' }}</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Date of Incorporation</label>
                <div class="flex items-center gap-3">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ isvInfo.dateOfIncorporation || '-' }}</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Registered Address</label>
                <div class="flex items-center gap-3">
                  <el-icon><Location /></el-icon>
                  <span>{{ isvInfo.registeredAddress || '-' }}</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">KYB Status</label>
                <ElTag :type="kybStatusConfig.type" size="large">
                  {{ kybStatusConfig.text }}
                </ElTag>
              </div>
            </div>
          </ElCard>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">
          <ElCard shadow="never">
            <template #header>
              <h2 class="text-lg font-semibold">Account Information</h2>
            </template>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Account ID</label>
                <p class="font-mono text-sm">{{ user.id }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Registration Time</label>
                <div class="flex items-center gap-2">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDate(user.createdAt) }}</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                <div class="flex items-center gap-2">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDate(user.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </ElCard>

          <ElCard shadow="never">
            <template #header>
              <h2 class="text-lg font-semibold">Security Actions</h2>
            </template>
            <p class="text-sm text-gray-500 mb-4">After logging out, you will need to re-enter your credentials</p>
            <ElButton type="danger" class="w-full" @click="handleLogout">
              Log Out
            </ElButton>
          </ElCard>
        </div>
      </div>
    </template>
  </div>
</template>