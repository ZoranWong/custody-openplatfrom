<!-- 收入统计页面 -->
<template>
  <div class="revenue-stats-page">
    <ElCard class="mb-4">
      <template #header>
        <span class="text-lg font-medium">收入概览</span>
      </template>

      <div v-loading="summaryLoading">
        <ElDescriptions v-if="summary" :column="3" border>
          <ElDescriptionsItem label="总收入">{{ summary.totalRevenue }}</ElDescriptionsItem>
          <ElDescriptionsItem label="本月收入">{{ summary.monthlyRevenue }}</ElDescriptionsItem>
          <ElDescriptionsItem label="今日收入">{{ summary.todayRevenue }}</ElDescriptionsItem>
          <ElDescriptionsItem label="活跃客户">{{ summary.activeCustomers }}</ElDescriptionsItem>
          <ElDescriptionsItem label="API调用收入">{{ summary.apiRevenue }}</ElDescriptionsItem>
          <ElDescriptionsItem label="其他收入">{{ summary.otherRevenue }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElEmpty v-else description="暂无数据" />
      </div>
    </ElCard>

    <ElCard>
      <template #header>
        <span class="text-lg font-medium">收入趋势</span>
      </template>

      <div v-loading="trendsLoading">
        <div v-if="trends">
          <ElDescriptions :column="3" border>
            <ElDescriptionsItem
              v-for="(item, index) in trends"
              :key="index"
              :label="item.date || item.period"
            >
              {{ item.amount }}
            </ElDescriptionsItem>
          </ElDescriptions>
        </div>
        <ElEmpty v-else description="暂无数据" />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { fetchRevenueSummary, fetchRevenueTrends } from '@/api/stats'

  defineOptions({ name: 'RevenueStats' })

  const summaryLoading = ref(false)
  const trendsLoading = ref(false)
  const summary = ref<any>(null)
  const trends = ref<any>(null)

  onMounted(async () => {
    summaryLoading.value = true
    trendsLoading.value = true
    try {
      const [summaryRes, trendsRes] = await Promise.all([
        fetchRevenueSummary(),
        fetchRevenueTrends()
      ])
      summary.value = summaryRes.data
      trends.value = trendsRes.data
    } catch (error) {
      console.error('[RevenueStats] Failed to fetch revenue data:', error)
    } finally {
      summaryLoading.value = false
      trendsLoading.value = false
    }
  })
</script>