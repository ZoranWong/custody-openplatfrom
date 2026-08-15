<!-- Developer Portal Dashboard -->
<template>
  <div class="p-5">
    <div class="mb-8">
      <h1 class="text-2xl font-bold">Developer Dashboard</h1>
      <p class="mt-2 text-gray-500">Welcome to the Cregis Developer Portal</p>
    </div>

    <ElRow :gutter="20">
      <ElCol :sm="24" :md="8" :lg="8">
        <ElCard shadow="hover" class="cursor-pointer" @click="router.push('/applications')">
          <div class="flex items-center gap-4">
            <el-icon :size="36" color="var(--el-color-primary)">
              <Grid />
            </el-icon>
            <div>
              <div class="text-2xl font-bold">{{ appCount }}</div>
              <div class="text-gray-500">Applications</div>
            </div>
          </div>
        </ElCard>
      </ElCol>
      <ElCol :sm="24" :md="8" :lg="8">
        <ElCard shadow="hover" class="cursor-pointer" @click="router.push('/usage-statistics')">
          <div class="flex items-center gap-4">
            <el-icon :size="36" color="var(--el-color-success)">
              <DataAnalysis />
            </el-icon>
            <div>
              <div class="text-2xl font-bold">Usage</div>
              <div class="text-gray-500">Statistics</div>
            </div>
          </div>
        </ElCard>
      </ElCol>
      <ElCol :sm="24" :md="8" :lg="8">
        <ElCard shadow="hover" class="cursor-pointer" @click="router.push('/profile')">
          <div class="flex items-center gap-4">
            <el-icon :size="36" color="var(--el-color-warning)">
              <User />
            </el-icon>
            <div>
              <div class="text-2xl font-bold">Profile</div>
              <div class="text-gray-500">Account Info</div>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="20" class="mt-5">
      <ElCol :span="24">
        <ElCard shadow="never">
          <template #header>
            <div class="flex justify-between items-center">
              <span class="text-lg font-semibold">Quick Actions</span>
            </div>
          </template>
          <ElRow :gutter="16">
            <ElCol :span="6">
              <ElButton type="primary" class="w-full" @click="router.push('/applications/new')">
                <el-icon><Plus /></el-icon>
                Create Application
              </ElButton>
            </ElCol>
            <ElCol :span="6">
              <ElButton class="w-full" @click="router.push('/applications')">
                <el-icon><List /></el-icon>
                View Applications
              </ElButton>
            </ElCol>
            <ElCol :span="6">
              <ElButton class="w-full" @click="router.push('/usage-statistics')">
                <el-icon><TrendCharts /></el-icon>
                Usage Statistics
              </ElButton>
            </ElCol>
            <ElCol :span="6">
              <ElButton class="w-full" @click="router.push('/invoice-generation')">
                <el-icon><Document /></el-icon>
                Invoice Generation
              </ElButton>
            </ElCol>
          </ElRow>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import apiService from '@/api/api-service'

  defineOptions({ name: 'DeveloperDashboard' })

  const router = useRouter()
  const appCount = ref(0)

  onMounted(async () => {
    try {
      const response = await apiService.getISVApplications()
      if (response.code === 0 && response.data) {
        appCount.value = response.data.list?.length || 0
      }
    } catch (e) {
      // Silently fail - dashboard still works
    }
  })
</script>