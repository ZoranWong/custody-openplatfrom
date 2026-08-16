<!-- 仪表盘页面 -->
<template>
  <div v-loading="loading">
    <!-- 统计卡片区域 -->
    <ElRow :gutter="20">
      <ElCol v-for="item in statCards" :key="item.key" :sm="12" :md="6" :lg="6">
        <ArtStatsCard
          class="mb-5"
          :icon="item.icon"
          :icon-style="item.iconStyle"
          :title="item.title"
          :count="item.count"
          :description="item.description"
          :show-arrow="true"
          :separator="item.separator"
          :decimals="item.decimals"
        />
      </ElCol>
    </ElRow>

    <!-- 图表区域 -->
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="12">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>{{ $t('developer.usageStatistics.usageTrend') }}</h4>
              <p>{{ $t('developer.dashboard.usageTrendDesc') }}</p>
            </div>
          </div>
          <ArtLineChart
            v-if="trendData.length > 0"
            height="300px"
            :data="trendData"
            :x-axis-data="trendDates"
            :show-area-color="true"
            :show-axis-line="false"
          />
          <ElEmpty v-else :description="$t('common.noData')" />
        </div>
      </ElCol>
      <ElCol :sm="24" :md="24" :lg="12">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>{{ $t('developer.dashboard.endpointTop5') }}</h4>
              <p>{{ $t('developer.dashboard.endpointTop5Desc') }}</p>
            </div>
          </div>
          <ArtBarChart
            v-if="endpointData.length > 0"
            height="300px"
            :data="endpointData"
            :x-axis-data="endpointNames"
            :show-axis-line="false"
          />
          <ElEmpty v-else :description="$t('common.noData')" />
        </div>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchApplications } from '@/api/application'
import { fetchDeveloperInfo } from '@/api/developer'
import { fetchUsageStats } from '@/api/billing'

defineOptions({ name: 'DashboardConsole' })

const { t } = useI18n()
const loading = ref(true)
const appCount = ref(0)
const isvInfo = ref<any>(null)
const usageStats = ref<any>(null)

/** 格式化数字 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return num.toLocaleString()
  return String(num)
}

/** 统计卡片 */
const statCards = computed(() => [
  {
    key: 'apps',
    icon: 'ri:apps-line',
    iconStyle: 'bg-blue-500',
    title: t('menus.developer.applications'),
    count: appCount.value as number,
    description: t('developer.dashboard.stats.applications')
  },
  {
    key: 'apiCallsToday',
    icon: 'ri:bar-chart-line',
    iconStyle: 'bg-green-500',
    title: t('developer.usageStatistics.apiCalls'),
    count: usageStats.value?.dailyBreakdown?.length
      ? (usageStats.value.dailyBreakdown[usageStats.value.dailyBreakdown.length - 1]?.calls ?? 0)
      : 0,
    description: t('developer.dashboard.stats.todayCalls'),
    separator: ','
  },
  {
    key: 'successRate',
    icon: 'ri:check-double-line',
    iconStyle: 'bg-amber-500',
    title: t('developer.applications.apiUsage.successRate'),
    count: usageStats.value?.successRate ? usageStats.value.successRate * 100 : 0,
    description: t('developer.dashboard.stats.last30Days'),
    decimals: 1
  },
  {
    key: 'subscription',
    icon: 'ri:vip-crown-line',
    iconStyle: 'bg-purple-500',
    title: t('menus.developer.subscription'),
    count: 0,
    description: isvInfo.value?.subscriptionPlan || t('developer.dashboard.stats.freePlan')
  }
])

/** API 调用趋势数据 */
const trendData = computed(() => {
  if (!usageStats.value?.dailyBreakdown?.length) return []
  return [
    usageStats.value.dailyBreakdown.map((d: any) => d.calls ?? 0),
    usageStats.value.dailyBreakdown.map((d: any) => d.successCount ?? 0)
  ]
})

const trendDates = computed(() => {
  if (!usageStats.value?.dailyBreakdown) return []
  return usageStats.value.dailyBreakdown.map((d: any) => d.date)
})

/** 接口调用 Top 5 */
const endpointData = computed(() => {
  if (!usageStats.value?.endpointBreakdown?.length) return []
  return usageStats.value.endpointBreakdown
    .slice(0, 5)
    .map((e: any) => e.calls ?? 0)
})

const endpointNames = computed(() => {
  if (!usageStats.value?.endpointBreakdown?.length) return []
  return usageStats.value.endpointBreakdown
    .slice(0, 5)
    .map((e: any) => e.endpoint)
})

onMounted(async () => {
  try {
    const [apps, info, usage] = await Promise.all([
      fetchApplications(),
      fetchDeveloperInfo(),
      fetchUsageStats('30days')
    ])
    appCount.value = apps?.list?.length || apps?.length || 0
    isvInfo.value = info?.isv || info
    usageStats.value = usage
  } finally {
    loading.value = false
  }
})
</script>