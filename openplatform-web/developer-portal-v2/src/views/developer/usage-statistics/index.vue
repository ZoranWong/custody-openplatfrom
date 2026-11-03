<template>
  <div class="api-log-page art-full-height">
    <ApiLogStatsPanel
      :stats="stats"
      :loading="statsLoading"
      class="mb-4"
      @range-change="handleRangeChange"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElInput
              v-model="searchForm.traceId"
              :placeholder="$t('developer.usageStatistics.traceId')"
              clearable
              class="w-52"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <ElIcon><Search /></ElIcon>
              </template>
            </ElInput>
            <ElSelect
              v-model="searchForm.isError"
              :placeholder="$t('developer.billing.payment.status')"
              clearable
              class="w-32"
              @change="handleSearch"
            >
              <ElOption :label="$t('developer.billing.payment.success')" value="0" />
              <ElOption :label="$t('developer.billing.payment.failed')" value="1" />
            </ElSelect>
            <ElDatePicker
              v-model="searchForm.startDate"
              type="date"
              :placeholder="$t('developer.usageStatistics.startDate')"
              clearable
              class="w-36"
              value-format="YYYY-MM-DD"
              @change="handleSearch"
            />
            <ElDatePicker
              v-model="searchForm.endDate"
              type="date"
              :placeholder="$t('developer.usageStatistics.endDate')"
              clearable
              class="w-36"
              value-format="YYYY-MM-DD"
              @change="handleSearch"
            />
            <ElSwitch
              v-model="autoRefresh"
              :active-text="$t('developer.usageStatistics.autoRefresh')"
              :inactive-text="$t('developer.usageStatistics.autoRefreshOff')"
              @change="onAutoRefreshChange"
            />
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data as Record<string, any>[]"
        :columns="columns"
        :pagination="pagination"
        :empty-text="$t('common.noData')"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ApiLogDetailDrawer
      v-model="detailVisible"
      :log-id="selectedLogId"
      @closed="selectedLogId = undefined"
    />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ApiLog' })

  import { h, onBeforeUnmount } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useTable } from '@/hooks/core/useTable'
  import { ElButton, ElTag, ElIcon, ElInput, ElSelect, ElOption, ElDatePicker, ElSwitch, ElTooltip } from 'element-plus'
  import { Search, CopyDocument } from '@element-plus/icons-vue'
  import { formatDate } from '@/utils/date'
  import { fetchApiLogs, fetchUsageStats } from '@/api/billing'
  import ApiLogDetailDrawer from './modules/api-log-detail-drawer.vue'
  import ApiLogStatsPanel from './modules/api-log-stats-panel.vue'

  const { t, locale } = useI18n()

  const searchForm = ref({
    isError: undefined as string | undefined,
    traceId: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  })
  const autoRefresh = ref(false)
  let refreshTimer: ReturnType<typeof setInterval> | undefined
  const detailVisible = ref(false)
  const selectedLogId = ref<string | undefined>()
  const stats = ref<Record<string, any> | null>(null)
  const statsLoading = ref(false)

  const loadStats = async (period = '30days') => {
    statsLoading.value = true
    try {
      stats.value = await fetchUsageStats(period)
    } finally {
      statsLoading.value = false
    }
  }

  const handleRangeChange = (value: string) => loadStats(value)

  const onAutoRefreshChange = (val: string | number | boolean) => {
    if (val) {
      refreshTimer = setInterval(() => getData(), 15000)
    } else {
      clearInterval(refreshTimer)
      refreshTimer = undefined
    }
  }

  onBeforeUnmount(() => {
    if (refreshTimer) clearInterval(refreshTimer)
  })

  onMounted(() => {
    loadStats()
    // If the URL had an autoRefresh query, activate it
    const auto = (window as any).location?.search?.includes('autoRefresh')
    if (auto) {
      autoRefresh.value = true
      refreshTimer = setInterval(() => getData(), 15000)
    }
  })

  const openDetail = (row: any) => {
    selectedLogId.value = row.id
    detailVisible.value = true
  }

  const copyTraceId = (traceId: string) => {
    if (!traceId) return
    navigator.clipboard?.writeText(traceId).catch(() => {})
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: async (params: any) => {
        const result = await fetchApiLogs({
          page: params.page,
          pageSize: params.pageSize,
          isError: params.isError,
          traceId: params.traceId,
          startDate: params.startDate,
          endDate: params.endDate,
        })
        return result
      },
      apiParams: { page: 1, pageSize: 20 },
      paginationKey: { current: 'page', size: 'pageSize' },
      columnsFactory: () =>
        [
          { type: 'index' as const, width: 60, label: '#' },
          { prop: 'traceId', label: t('developer.usageStatistics.traceId'), width: 180,
            formatter: (row: any) => row.traceId
              ? h(ElTooltip, { content: 'Copy' }, () =>
                  h('span', { style: 'cursor:pointer; font-family:monospace; color:var(--el-color-primary)', onClick: () => copyTraceId(row.traceId) }, row.traceId.slice(0, 8) + '…')
                )
              : '-'
          },
          { prop: 'apiName', label: t('developer.billing.endpointBreakdown.path'), minWidth: 200 },
          { prop: 'endpoint', label: 'Endpoint', minWidth: 200 },
          { prop: 'method', label: t('developer.billing.endpointBreakdown.method'), width: 80 },
          {
            prop: 'responseTime',
            label: t('developer.usageStatistics.avgResponse'),
            width: 100,
            formatter: (row: any) => (row.responseTime ? `${row.responseTime}ms` : '-')
          },
          {
            prop: 'responseStatus',
            label: t('developer.billing.payment.status'),
            width: 100,
            formatter: (row: any) => {
              const isError = row.responseStatus >= 400
              return h(ElTag, { type: isError ? 'danger' : 'success', size: 'small' }, () =>
                String(row.responseStatus)
              )
            }
          },
          {
            prop: 'createdAt',
            label: t('developer.billing.payment.submittedAt'),
            width: 180,
            formatter: (row: any) => formatDate(row.createdAt, undefined, locale.value)
          },
          {
            prop: 'actions',
            label: t('package.actions'),
            width: 90,
            fixed: 'right' as const,
            formatter: (row: any) =>
              h(
                ElButton,
                { link: true, type: 'primary', size: 'small', onClick: () => openDetail(row) },
                () => t('developer.billing.apiLogDetail.title')
              )
          }
        ] as any
    },
    transform: {
      responseAdapter: (res: any) => ({
        records: res?.list || [],
        total: res?.total || 0,
        page: res?.page,
        pageSize: res?.pageSize
      })
    }
  })

  const handleSearch = () => {
    replaceSearchParams({ ...searchForm.value, page: undefined, pageSize: undefined })
    getData()
  }
</script>
