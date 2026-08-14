<!-- 系统健康页面 -->
<template>
  <div class="system-health-page">
    <ElCard>
      <template #header>
        <span class="text-lg font-medium">系统健康状态</span>
      </template>

      <div v-loading="loading">
        <ElDescriptions v-if="health" :column="2" border>
          <ElDescriptionsItem label="系统状态">
            <ElTag :type="health.status === 'healthy' ? 'success' : 'danger'">
              {{ health.status === 'healthy' ? '正常' : '异常' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="数据库状态">
            <ElTag :type="health.database === 'connected' ? 'success' : 'danger'">
              {{ health.database === 'connected' ? '正常' : '异常' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="Redis状态">
            <ElTag :type="health.redis === 'connected' ? 'success' : 'danger'">
              {{ health.redis === 'connected' ? '正常' : '异常' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="运行时间">{{ health.uptime }}</ElDescriptionsItem>
          <ElDescriptionsItem label="CPU使用率">{{ health.cpuUsage }}%</ElDescriptionsItem>
          <ElDescriptionsItem label="内存使用率">{{ health.memoryUsage }}%</ElDescriptionsItem>
          <ElDescriptionsItem label="磁盘使用率">{{ health.diskUsage }}%</ElDescriptionsItem>
          <ElDescriptionsItem label="最后检查时间">{{ health.lastCheckedAt }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElEmpty v-else description="暂无数据" />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { fetchHealthStatus } from '@/api/stats'
  import { ElTag } from 'element-plus'

  defineOptions({ name: 'SystemHealth' })

  const loading = ref(false)
  const health = ref<any>(null)

  onMounted(async () => {
    loading.value = true
    try {
      const res = await fetchHealthStatus()
      health.value = res.data
    } catch (error) {
      console.error('[SystemHealth] Failed to fetch health status:', error)
    } finally {
      loading.value = false
    }
  })
</script>