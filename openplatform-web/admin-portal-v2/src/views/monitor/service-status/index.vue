<!-- 服务状态监控页面 -->
<template>
  <div v-loading="loading" class="service-status-page art-full-height">
    <!-- 服务健康卡片 -->
    <ElRow :gutter="20">
      <ElCol v-for="service in services" :key="service.name" :sm="12" :md="6" :lg="6">
        <div class="art-card p-5 mb-5">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-base font-medium">{{ service.name }}</h4>
              <p class="text-sm text-gray-500 mt-1">{{ service.label }}</p>
            </div>
            <ElTag
              :type="getStatusType(service.status)"
              size="small"
              effect="dark"
            >
              {{ getStatusText(service.status) }}
            </ElTag>
          </div>
        </div>
      </ElCol>
    </ElRow>

    <!-- 资源使用 -->
    <ElRow :gutter="20">
      <ElCol :span="24">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>资源使用</h4>
              <p>系统资源使用情况</p>
            </div>
          </div>
          <div class="mt-4">
            <div class="mb-4">
              <div class="flex justify-between mb-2">
                <span class="text-sm">CPU</span>
                <span class="text-sm text-gray-500">{{ resources.cpu ?? 0 }}%</span>
              </div>
              <ElProgress
                :percentage="resources.cpu ?? 0"
                :color="getProgressColor(resources.cpu ?? 0)"
                :stroke-width="12"
              />
            </div>
            <div>
              <div class="flex justify-between mb-2">
                <span class="text-sm">内存</span>
                <span class="text-sm text-gray-500">{{ resources.memory ?? 0 }}%</span>
              </div>
              <ElProgress
                :percentage="resources.memory ?? 0"
                :color="getProgressColor(resources.memory ?? 0)"
                :stroke-width="12"
              />
            </div>
          </div>
        </div>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
import { fetchHealthStatus, fetchServicesHealth, fetchResourceUsage } from '@/api/monitor'

defineOptions({ name: 'MonitorServiceStatus' })

const healthStatus = ref<Record<string, any>>({})
const services = ref<any[]>([])
const resources = ref<Record<string, any>>({})
const loading = ref(true)

const SERVICE_LABEL_MAP: Record<string, string> = {
  'api-gw': 'API 网关',
  'auth-svc': '认证服务',
  'kyb-svc': 'KYB 服务',
  'db-svc': '数据库服务',
}

const getStatusType = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    healthy: 'success',
    degraded: 'warning',
    down: 'danger',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    healthy: '正常',
    degraded: '降级',
    down: '异常',
  }
  return map[status] || status
}

const getProgressColor = (value: number): string => {
  if (value >= 80) return '#f56c6c'
  if (value >= 60) return '#e6a23c'
  return '#67c23a'
}

onMounted(async () => {
  try {
    const [healthData, servicesData, resourcesData] = await Promise.all([
      fetchHealthStatus(),
      fetchServicesHealth(),
      fetchResourceUsage()
    ])
    healthStatus.value = healthData
    services.value = (servicesData ?? []).map((svc: any) => ({
      ...svc,
      label: SERVICE_LABEL_MAP[svc.name] || svc.name,
    }))
    resources.value = resourcesData ?? {}
  } finally {
    loading.value = false
  }
})
</script>