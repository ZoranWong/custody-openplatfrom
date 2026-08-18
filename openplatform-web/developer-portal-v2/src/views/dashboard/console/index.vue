<!-- 仪表盘页面 -->
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
          :subtitle="item.subtitle"
          :description="item.description"
          :show-arrow="true"
          :separator="item.separator"
          :decimals="item.decimals"
        />
      </ElCol>
    </ElRow>

    <!-- 图表 + 错误报告 -->
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
          <ElEmpty v-else :image-size="60" />
        </div>
      </ElCol>
      <ElCol :sm="24" :md="24" :lg="12">
        <div class="art-card p-5 mb-5">
          <div class="art-card-header">
            <div class="title">
              <h4>{{ $t('developer.dashboard.recentErrors') }}</h4>
              <p>{{ $t('developer.dashboard.recentErrorsDesc') }}</p>
            </div>
          </div>
          <ElTable v-if="recentErrors.length > 0" :data="recentErrors" size="small" stripe>
            <ElTableColumn
              prop="endpoint"
              :label="$t('developer.billing.endpointBreakdown.path')"
              min-width="160"
            />
            <ElTableColumn
              prop="responseStatus"
              :label="$t('developer.billing.payment.status')"
              width="90"
            >
              <template #default="{ row }">
                <ElTag type="danger" size="small">{{ row.responseStatus }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn
              prop="createdAt"
              :label="$t('developer.billing.payment.submittedAt')"
              width="110"
            >
              <template #default="{ row }">{{
                formatDate(row.createdAt, 'date', locale)
              }}</template>
            </ElTableColumn>
          </ElTable>
          <ElEmpty v-else :image-size="60" />
        </div>
      </ElCol>
    </ElRow>

    <!-- 接口分布 -->
    <ElRow :gutter="20">
      <ElCol :span="24">
        <EndpointBreakdown
          v-if="usageStats?.endpoint_breakdown?.length"
          :endpoints="usageStats.endpoint_breakdown"
          :loading="loading"
          class="mb-5 art-card"
        />
        <ElEmpty v-else :image-size="60" />
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { fetchApplications } from '@/api/application'
  import { fetchUsageStats, fetchCurrentSubscription } from '@/api/billing'
  import { formatDate } from '@/utils/date'
  import EndpointBreakdown from '@/components/billing/EndpointBreakdown.vue'

  defineOptions({ name: 'DashboardConsole' })

  const { t, locale } = useI18n()
  const loading = ref(true)
  const appCount = ref(0)
  const subscription = ref<any>(null)
  const usageStats = ref<any>(null)

  const subDesc = computed(() => {
    if (!subscription.value?.endDate) return ''
    const expired = new Date(subscription.value.endDate).getTime() < Date.now()
    const label = expired
      ? t('developer.dashboard.stats.expired')
      : t('developer.dashboard.stats.expiresAt')
    return `${label} ${formatDate(subscription.value.endDate, 'date', locale.value)}`
  })

  const subPackageLabel = computed(() => {
    if (!subscription.value?.package?.packageCode) return ''
    const code = subscription.value.package.packageCode
    return t(`package.packageTypeLabels.${code}`) as string
  })

  const statCards = computed(() => [
    {
      key: 'apps',
      icon: 'ri:apps-line',
      iconStyle: 'bg-blue-500',
      title: t('menus.developer.applications'),
      subtitle: appCount.value as number,
      description: t('developer.dashboard.stats.applications')
    },
    {
      key: 'todayCalls',
      icon: 'ri:bar-chart-line',
      iconStyle: 'bg-green-500',
      title: t('developer.usageStatistics.todayCalls'),
      subtitle: usageStats.value?.today_calls ?? 0,
      description: `${t('developer.dashboard.stats.dailyQuota')}: ${usageStats.value?.daily_limit ?? 0}`,
      separator: ','
    },
    {
      key: 'remainingCalls',
      icon: 'ri:contrast-drop-2-line',
      iconStyle: 'bg-orange-500',
      title: t('developer.usageStatistics.remainingCalls'),
      subtitle: Math.max(
        0,
        (usageStats.value?.daily_limit ?? 0) - (usageStats.value?.today_calls ?? 0)
      ),
      description: `${usageStats.value?.today_calls ?? 0}/${usageStats.value?.daily_limit ?? 0}`,
      separator: ','
    },
    {
      key: 'successRate',
      icon: 'ri:check-double-line',
      iconStyle: 'bg-amber-500',
      title: t('developer.applications.apiUsage.successRate'),
      subtitle: usageStats.value?.success_rate ?? 0,
      description: t('developer.dashboard.stats.last30Days'),
      decimals: 1
    },
    {
      key: 'avgResponse',
      icon: 'ri:timer-line',
      iconStyle: 'bg-purple-500',
      title: t('developer.usageStatistics.avgResponse'),
      subtitle: usageStats.value?.avg_response_time_ms ?? 0,
      description: 'ms'
    },
    {
      key: 'subscription',
      icon: 'ri:vip-crown-line',
      iconStyle: 'bg-indigo-500',
      title: t('menus.developer.subscription'),
      subtitle: subPackageLabel.value,
      description: subDesc.value
    }
  ])

  const trendData = computed(() => {
    if (!usageStats.value?.daily_breakdown?.length) return []
    return [
      {
        name: t('developer.usageStatistics.apiCalls'),
        data: usageStats.value.daily_breakdown.map((d: any) => d.calls ?? 0)
      },
      {
        name: t('developer.billing.endpointBreakdown.successCount'),
        data: usageStats.value.daily_breakdown.map((d: any) => d.success_count ?? 0)
      }
    ]
  })

  const trendDates = computed(() => {
    if (!usageStats.value?.daily_breakdown) return []
    return usageStats.value.daily_breakdown.map((d: any) => d.date)
  })

  const recentErrors = computed(() => {
    if (!usageStats.value?.recent_errors?.length) return []
    return usageStats.value.recent_errors.slice(0, 8)
  })

  onMounted(async () => {
    try {
      const [apps, usage, sub] = await Promise.all([
        fetchApplications(),
        fetchUsageStats('30days'),
        fetchCurrentSubscription().catch(() => null)
      ])
      appCount.value = apps?.list?.length || apps?.length || 0
      usageStats.value = usage
      subscription.value = sub
    } finally {
      loading.value = false
    }
  })
</script>
