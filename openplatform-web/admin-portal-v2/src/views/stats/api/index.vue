<!-- API 统计页面 -->
<template>
  <div class="api-stats-page">
    <ElCard>
      <template #header>
        <span class="text-lg font-medium">API 统计</span>
      </template>

      <div v-loading="loading">
        <ElDescriptions v-if="stats" :column="3" border>
          <ElDescriptionsItem label="总调用次数">{{ stats.totalCalls }}</ElDescriptionsItem>
          <ElDescriptionsItem label="今日调用">{{ stats.todayCalls }}</ElDescriptionsItem>
          <ElDescriptionsItem label="成功率">{{ stats.successRate }}%</ElDescriptionsItem>
          <ElDescriptionsItem label="平均响应时间">{{ stats.avgResponseTime }}ms</ElDescriptionsItem>
          <ElDescriptionsItem label="活跃开发者">{{ stats.activeDevelopers }}</ElDescriptionsItem>
          <ElDescriptionsItem label="总API数">{{ stats.totalApis }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElEmpty v-else description="暂无数据" />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { fetchAPIStatsSummary } from '@/api/stats'

  defineOptions({ name: 'APIStats' })

  const loading = ref(false)
  const stats = ref<any>(null)

  onMounted(async () => {
    loading.value = true
    try {
      const res = await fetchAPIStatsSummary()
      stats.value = res.data
    } catch (error) {
      console.error('[APIStats] Failed to fetch stats:', error)
    } finally {
      loading.value = false
    }
  })
</script>