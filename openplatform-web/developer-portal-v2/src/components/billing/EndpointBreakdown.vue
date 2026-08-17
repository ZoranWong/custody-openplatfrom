<script setup lang="ts">
import { computed } from 'vue'
import { DataLine } from '@element-plus/icons-vue'
import type { EndpointUsage } from '@/types/api/billing'
import { useI18n } from 'vue-i18n'

interface Props {
  endpoints: EndpointUsage[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const { t } = useI18n()

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

const methodColors: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
  GET: 'success', POST: 'warning', PUT: 'info', DELETE: 'danger'
}

const sortedEndpoints = computed(() => {
  return [...props.endpoints].sort((a, b) => b.calls - a.calls)
})

const hasData = computed(() => props.endpoints && props.endpoints.length > 0)
</script>

<template>
  <div class="card p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('developer.billing.endpointBreakdown.title') }}</h3>

    <div v-if="loading" class="space-y-3" role="status">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <div class="h-10 bg-gray-100 rounded"></div>
      </div>
    </div>

    <div v-else-if="!hasData" class="text-center py-8" role="status">
      <ElIcon class="w-12 h-12 mx-auto text-gray-300 mb-2"><DataLine /></ElIcon>
      <p class="text-gray-500">{{ $t('common.noData') }}</p>
    </div>

    <ElTable v-else :data="sortedEndpoints" stripe>
      <ElTableColumn :label="t('developer.billing.endpointBreakdown.path')" min-width="180">
        <template #default="{ row }">
          <code class="text-sm">{{ row.endpoint }}</code>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('developer.billing.endpointBreakdown.method')" width="90">
        <template #default="{ row }">
          <ElTag :type="methodColors[row.method] || 'info'" size="small">{{ row.method }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('developer.billing.endpointBreakdown.calls')" width="100" align="right">
        <template #default="{ row }">
          <span class="font-medium">{{ formatNumber(row.calls) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('developer.billing.endpointBreakdown.successCount')" width="100" align="right">
        <template #default="{ row }">
          <span>{{ row.successCount ?? row.calls }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('developer.billing.endpointBreakdown.successRate')" width="90" align="right">
        <template #default="{ row }">
          <span>{{ row.successRate ?? 100 }}%</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('developer.billing.endpointBreakdown.avgResponse')" width="110" align="right">
        <template #default="{ row }">
          <span>{{ row.avgResponseTime ?? '-' }}ms</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('developer.billing.endpointBreakdown.maxResponse')" width="110" align="right">
        <template #default="{ row }">
          <span>{{ row.maxResponseTime ?? '-' }}ms</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('developer.billing.endpointBreakdown.percentage')" width="130">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <ElProgress :percentage="row.percentage" :stroke-width="6" :show-text="false" style="width: 60px" />
            <span class="text-sm text-gray-500">{{ row.percentage?.toFixed(1) }}%</span>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>
  </div>
</template>