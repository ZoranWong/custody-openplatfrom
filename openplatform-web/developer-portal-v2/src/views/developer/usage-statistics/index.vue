<template>
  <div class="api-log-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
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

  import { h } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useTable } from '@/hooks/core/useTable'
  import { ElButton, ElTag } from 'element-plus'
  import { formatDate } from '@/utils/date'
  import { fetchApiLogs } from '@/api/billing'
  import ApiLogDetailDrawer from './modules/api-log-detail-drawer.vue'

  const { t, locale } = useI18n()

  const searchForm = ref({ isError: undefined as string | undefined })
  const detailVisible = ref(false)
  const selectedLogId = ref<string | undefined>()

  const openDetail = (row: any) => {
    selectedLogId.value = row.id
    detailVisible.value = true
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
          isError: params.isError
        })
        return result
      },
      apiParams: { page: 1, pageSize: 20 },
      paginationKey: { current: 'page', size: 'pageSize' },
      columnsFactory: () =>
        [
          { type: 'index' as const, width: 60, label: '#' },
          { prop: 'apiName', label: t('developer.billing.endpointBreakdown.path'), minWidth: 200 },
          { prop: 'endpoint', label: 'Endpoint', minWidth: 260 },
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
