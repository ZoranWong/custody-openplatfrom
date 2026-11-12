<!--
  API 调用统计面板：调用次数 / 流量 / 成功率 / 平均耗时 + 趋势 + 接口分布
-->
<template>
  <div class="api-log-stats">
    <ElRow :gutter="16" class="mb-4">
      <ElCol v-for="card in cards" :key="card.key" :xs="24" :sm="12" :lg="6">
        <ArtStatsCard
          :icon="card.icon"
          :icon-style="card.iconStyle"
          :title="card.title"
          :subtitle="card.subtitle"
          :description="card.description"
          :decimals="card.decimals ?? 0"
          separator=","
        />
      </ElCol>
    </ElRow>

    <div class="art-card p-5 mb-4">
      <div class="art-card-header mb-2 flex items-center justify-between">
        <div class="title">
          <h4>{{ $t('developer.usageStatistics.usageTrend') }}</h4>
          <p class="text-xs text-gray-400">{{ detailHint }}</p>
        </div>
        <ElRadioGroup v-model="range" size="small" @change="emit('range-change', range)">
          <ElRadioButton value="7days">{{ $t('developer.usageStatistics.range7d') }}</ElRadioButton>
          <ElRadioButton value="30days">{{ $t('developer.usageStatistics.range30d') }}</ElRadioButton>
          <ElRadioButton value="90days">{{ $t('developer.usageStatistics.range90d') }}</ElRadioButton>
          <ElRadioButton value="180days">{{ $t('developer.usageStatistics.range180d') }}</ElRadioButton>
        </ElRadioGroup>
      </div>
      <ArtLineChart
        v-if="seriesDates.length"
        height="280px"
        :data="seriesData"
        :x-axis-data="seriesDates"
        :show-legend="true"
        :show-area-color="true"
        :loading="loading"
      />
      <ElEmpty v-else :image-size="60" />
      <p v-if="trafficSinceText" class="text-xs text-gray-400 mt-2">{{ trafficSinceText }}</p>
    </div>

    <div class="art-card p-5">
      <div class="art-card-header mb-2">
        <h4>{{ $t('developer.usageStatistics.endpointBreakdown') }}</h4>
      </div>
      <ElTable :data="endpoints" size="small" stripe>
        <ElTableColumn
          prop="endpoint"
          :label="$t('developer.billing.endpointBreakdown.path')"
          min-width="220"
        />
        <ElTableColumn
          prop="method"
          :label="$t('developer.billing.endpointBreakdown.method')"
          width="80"
        />
        <ElTableColumn
          prop="calls"
          :label="$t('developer.usageStatistics.totalCalls')"
          width="110"
        />
        <ElTableColumn
          prop="totalBytes"
          :label="$t('developer.usageStatistics.traffic')"
          width="120"
        >
          <template #default="{ row }">{{ formatBytes(row.totalBytes) }}</template>
        </ElTableColumn>
        <ElTableColumn
          prop="successRate"
          :label="$t('developer.usageStatistics.successRate')"
          width="100"
        >
          <template #default="{ row }">{{ row.successRate }}%</template>
        </ElTableColumn>
        <ElTableColumn
          prop="avgResponseTime"
          :label="$t('developer.usageStatistics.avgResponse')"
          width="110"
        >
          <template #default="{ row }">{{ row.avgResponseTime }}ms</template>
        </ElTableColumn>
      </ElTable>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { formatBytes } from '@/utils/format'

  defineOptions({ name: 'ApiLogStatsPanel' })

  const props = defineProps<{ stats: Record<string, any> | null; loading?: boolean }>()
  const emit = defineEmits<{ (e: 'range-change', value: string): void }>()
  const range = ref('30days')
  const { t } = useI18n()

  const endpoints = computed(() => props.stats?.endpoint_breakdown ?? [])

  const seriesDates = computed(() => (props.stats?.daily_breakdown ?? []).map((d: any) => d.date))
  const seriesData = computed(() => [
    {
      name: t('developer.usageStatistics.totalCalls'),
      data: (props.stats?.daily_breakdown ?? []).map((d: any) => d.calls ?? 0)
    },
    {
      name: t('developer.usageStatistics.traffic'),
      data: (props.stats?.daily_breakdown ?? []).map((d: any) => d.bytes ?? 0)
    }
  ])

  const trafficSinceText = computed(() => {
    const since = props.stats?.bytes_tracked_since
    return since ? t('developer.usageStatistics.trafficSince', { date: since }) : ''
  })

  const detailHint = computed(() => {
    const days = props.stats?.retention_days
    return days
      ? t('developer.usageStatistics.detailHintDynamic', { days })
      : t('developer.usageStatistics.detailHint')
  })

  const cards = computed(() => {
    const s = props.stats ?? {}
    const hasBytes = (s.total_bytes ?? 0) > 0
    return [
      {
        key: 'calls',
        icon: 'ri:bar-chart-line',
        iconStyle: 'bg-blue-500',
        title: t('developer.usageStatistics.totalCalls'),
        subtitle: s.total_calls ?? 0,
        description: s.callback_calls
          ? t('developer.usageStatistics.callbackPushes') + ` ${s.callback_calls}`
          : t('developer.usageStatistics.statsTitle')
      },
      {
        key: 'traffic',
        icon: 'ri:exchange-dollar-line',
        iconStyle: 'bg-cyan-500',
        title: t('developer.usageStatistics.traffic'),
        subtitle: hasBytes ? formatBytes(s.total_bytes) : '—',
        description: hasBytes
          ? t('developer.usageStatistics.statsTitle')
          : t('developer.usageStatistics.noTrafficData')
      },
      {
        key: 'success',
        icon: 'ri:check-double-line',
        iconStyle: 'bg-green-500',
        title: t('developer.usageStatistics.successRate'),
        subtitle: s.success_rate ?? 0,
        description: '%',
        decimals: 1
      },
      {
        key: 'latency',
        icon: 'ri:timer-line',
        iconStyle: 'bg-purple-500',
        title: t('developer.usageStatistics.avgResponse'),
        subtitle: s.avg_response_time_ms ?? 0,
        description: 'ms'
      }
    ]
  })
</script>
