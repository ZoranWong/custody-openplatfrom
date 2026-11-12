<!--
  API 日志追踪页：按 traceId / 状态 / 日期检索单次调用，点开查看请求体与响应体。
  原始日志只保留数天（右上角“日志设置”可调），统计报表在“调用统计”页。
-->
<template>
  <div class="api-log-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElInput
              v-model="searchForm.traceId"
              :placeholder="$t('developer.apiLogTrace.traceId')"
              clearable
              class="w-52"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <ElIcon><Search /></ElIcon>
              </template>
            </ElInput>
            <ElSelect
              v-model="searchForm.category"
              :placeholder="$t('developer.apiLogTrace.logType')"
              clearable
              class="w-32"
              @change="handleSearch"
            >
              <ElOption :label="$t('developer.apiLogTrace.categoryApi')" value="api" />
              <ElOption :label="$t('developer.apiLogTrace.categoryCallback')" value="callback" />
            </ElSelect>
            <ElSelect
              v-model="searchForm.isError"
              :placeholder="$t('developer.apiLogTrace.status')"
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
              :placeholder="$t('developer.apiLogTrace.startDate')"
              clearable
              class="w-36"
              value-format="YYYY-MM-DD"
              @change="handleSearch"
            />
            <ElDatePicker
              v-model="searchForm.endDate"
              type="date"
              :placeholder="$t('developer.apiLogTrace.endDate')"
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
        <template #right>
          <ElButton text bg @click="settingsVisible = true">
            <ElIcon class="mr-1"><Setting /></ElIcon>
            {{ $t('developer.apiLogTrace.settings') }}
          </ElButton>
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

    <ApiLogSettingsDrawer v-model="settingsVisible" @saved="handleSettingsSaved" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ApiLogTrace' })

  import { h, onBeforeUnmount } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useTable } from '@/hooks/core/useTable'
  import { ElButton, ElTag, ElIcon, ElInput, ElSelect, ElOption, ElDatePicker, ElSwitch, ElTooltip } from 'element-plus'
  import { Search, Setting } from '@element-plus/icons-vue'
  import { formatDate } from '@/utils/date'
  import { fetchApiLogs } from '@/api/billing'
  import ApiLogDetailDrawer from './modules/api-log-detail-drawer.vue'
  import ApiLogSettingsDrawer from './modules/api-log-settings-drawer.vue'

  const { t, locale } = useI18n()

  const searchForm = ref({
    category: undefined as 'api' | 'callback' | undefined,
    isError: undefined as string | undefined,
    traceId: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  })
  const autoRefresh = ref(false)
  let refreshTimer: ReturnType<typeof setInterval> | undefined
  const detailVisible = ref(false)
  const selectedLogId = ref<string | undefined>()
  const settingsVisible = ref(false)

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
    // If the URL had an autoRefresh query, activate it
    const auto = (window as any).location?.search?.includes('autoRefresh')
    if (auto) {
      autoRefresh.value = true
      refreshTimer = setInterval(() => getData(), 15000)
    }
  })

  const handleSettingsSaved = () => {
    // A shorter retention only affects future prunes, but refresh so the
    // developer sees the new window immediately.
    getData()
  }

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
          category: params.category,
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
          { prop: 'traceId', label: t('developer.apiLogTrace.traceId'), width: 180,
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
            label: t('developer.apiLogTrace.status'),
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
