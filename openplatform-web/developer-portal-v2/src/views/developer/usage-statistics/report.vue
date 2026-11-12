<!--
  API 调用统计报表：调用次数 / 流量 / 成功率 / 平均耗时 + 趋势 + 接口分布
  只展示按天聚合后的报表数据，不包含原始调用明细。
-->
<template>
  <div class="api-log-report art-full-height">
    <ApiLogStatsPanel :stats="stats" :loading="loading" @range-change="handleRangeChange" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ApiLogReport' })

  import { fetchUsageStats } from '@/api/billing'
  import ApiLogStatsPanel from './modules/api-log-stats-panel.vue'

  const stats = ref<Record<string, any> | null>(null)
  const loading = ref(false)

  const loadStats = async (period = '30days') => {
    loading.value = true
    try {
      stats.value = await fetchUsageStats(period)
    } finally {
      loading.value = false
    }
  }

  const handleRangeChange = (value: string) => loadStats(value)

  onMounted(() => loadStats())
</script>
