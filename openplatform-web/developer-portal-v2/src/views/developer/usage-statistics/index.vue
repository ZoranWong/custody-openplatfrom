<template>
  <div v-loading="loading">
    <!-- 统计卡片 -->
    <ElRow :gutter="20">
      <ElCol v-for="item in statCards" :key="item.key" :sm="12" :md="8" :lg="8">
        <ArtStatsCard
          class="mb-5"
          :icon="item.icon"
          :icon-style="item.iconStyle"
          :title="item.title"
          :count="item.count"
          :description="item.description"
          :show-arrow="false"
          :decimals="item.decimals"
          :separator="item.separator"
        />
      </ElCol>
    </ElRow>

    <!-- 趋势图表 -->
    <ElRow :gutter="20">
      <ElCol :span="24">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>{{ $t('developer.usageStatistics.usageTrend') }}</h4>
              <p>{{ $t('developer.dashboard.usageTrendDesc') }}</p>
            </div>
          </div>
          <ArtLineChart
            v-if="chartData.length > 0"
            height="320px"
            :data="chartData"
            :x-axis-data="chartDates"
            :show-area-color="true"
            :show-axis-line="false"
          />
          <ElEmpty v-else :description="$t('common.noData')" />
        </div>
      </ElCol>
    </ElRow>

    <!-- 接口分布 -->
    <ElRow :gutter="20">
      <ElCol :span="24">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>{{ $t('developer.usageStatistics.endpointBreakdown') }}</h4>
              <p>{{ $t('developer.dashboard.endpointTop5Desc') }}</p>
            </div>
          </div>
          <EndpointBreakdown v-if="usageStats?.endpointBreakdown?.length" :endpoints="usageStats.endpointBreakdown" :loading="loading" />
          <ElEmpty v-else :description="$t('common.noData')" />
        </div>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'UsageStatistics' })

import { useI18n } from 'vue-i18n'
import { fetchUsageStats } from '@/api/billing'
import type { UsageStats } from '@/types/api/billing'
import EndpointBreakdown from '@/components/billing/EndpointBreakdown.vue'

const { t } = useI18n()
const loading = ref(true)
const usageStats = ref<UsageStats | null>(null)

const statCards = computed(() => [
  {
    key: 'totalCalls',
    icon: 'ri:bar-chart-line',
    iconStyle: 'bg-blue-500',
    title: t('developer.usageStatistics.apiCalls'),
    count: usageStats.value?.totalCalls ?? 0,
    description: t('developer.billing.usageBreakdown.total'),
    separator: ','
  },
  {
    key: 'successRate',
    icon: 'ri:check-double-line',
    iconStyle: 'bg-green-500',
    title: t('developer.applications.apiUsage.successRate'),
    count: usageStats.value?.successRate ? (usageStats.value.successRate * 100) : 0,
    description: '%',
    decimals: 1
  },
  {
    key: 'avgResponse',
    icon: 'ri:timer-line',
    iconStyle: 'bg-purple-500',
    title: 'Avg Response',
    count: usageStats.value?.avgResponseTimeMs ?? 0,
    description: 'ms'
  }
])

const chartData = computed(() => {
  if (!usageStats.value?.dailyBreakdown) return []
  return usageStats.value.dailyBreakdown.map((d: any) => d.calls)
})

const chartDates = computed(() => {
  if (!usageStats.value?.dailyBreakdown) return []
  return usageStats.value.dailyBreakdown.map((d: any) => d.date)
})

onMounted(async () => {
  try {
    usageStats.value = await fetchUsageStats('30days')
  } finally {
    loading.value = false
  }
})
</script>