<template>
  <div class="api-log-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElSelect v-model="searchForm.isError" :placeholder="$t('developer.billing.payment.status')" clearable class="w-32" @change="handleSearch">
              <ElOption :label="$t('developer.billing.payment.success')" value="0" />
              <ElOption :label="$t('developer.billing.payment.failed')" value="1" />
            </ElSelect>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="(data as Record<string, any>[])"
        :columns="columns"
        :pagination="pagination"
        :empty-text="$t('common.noData')"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ApiLog' })

import { useI18n } from 'vue-i18n'
import { useTable } from '@/hooks/core/useTable'
import { ElTag } from 'element-plus'
import { formatDate } from '@/utils/date'

const { t } = useI18n()

const searchForm = ref({ isError: undefined as string | undefined })

const { columns, columnChecks, data, loading, pagination, getData, replaceSearchParams, handleSizeChange, handleCurrentChange, refreshData } = useTable({
  core: {
    apiFn: async (params: any) => {
      // TODO: replace with real API
      const { fetchUsageStats } = await import('@/api/billing')
      const result = await fetchUsageStats('30days')
      return { records: result?.recent_errors || [], total: result?.total_calls || 0 }
    },
    apiParams: { page: 1, pageSize: 20 },
    paginationKey: { current: 'page', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'index' as const, width: 60, label: '#' },
      { prop: 'apiName', label: t('developer.billing.endpointBreakdown.path'), minWidth: 260 },
      { prop: 'endpoint', label: 'Endpoint', minWidth: 280 },
      {
        prop: 'responseStatus',
        label: t('developer.billing.payment.status'),
        width: 100,
        formatter: (row: any) => {
          const isError = row.responseStatus >= 400
          return h(ElTag, { type: isError ? 'danger' : 'success', size: 'small' }, () => String(row.responseStatus))
        }
      },
      { prop: 'createdAt', label: t('developer.billing.payment.submittedAt'), width: 180, formatter: (row: any) => formatDate(row.createdAt) }
    ] as any
  },
  transform: { responseAdapter: (res: any) => ({ records: res?.records || [], total: res?.total || 0 }) }
})

const handleSearch = () => {
  replaceSearchParams({ ...searchForm.value, page: undefined, pageSize: undefined })
  getData()
}
</script>