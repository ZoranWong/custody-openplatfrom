<template>
  <div class="subscription-list-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSelect
            v-model="searchForm.status"
            placeholder="订阅状态"
            clearable
            class="w-36"
            @change="handleSearch"
          >
            <ElOption label="生效中" value="active" />
            <ElOption label="已过期" value="expired" />
            <ElOption label="已取消" value="cancelled" />
          </ElSelect>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="(data as Record<string, any>[])"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SubscriptionList' })

import { useTable } from '@/hooks/core/useTable'
import { fetchSubscriptions } from '@/api/subscription'
import { ElTag } from 'element-plus'

const STATUS_MAP: Record<string, { type: 'success' | 'warning' | 'danger' | 'info'; text: string }> = {
  active: { type: 'success', text: '生效中' },
  expired: { type: 'warning', text: '已过期' },
  cancelled: { type: 'danger', text: '已取消' },
}

const BILLING_CYCLE_MAP: Record<string, string> = {
  monthly: '月付',
  yearly: '年付',
}

const searchForm = ref({
  status: undefined as string | undefined,
})

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
  refreshData,
} = useTable({
  core: {
    apiFn: fetchSubscriptions,
    apiParams: {
      page: 1,
      pageSize: 20,
    },
    paginationKey: {
      current: 'page',
      size: 'pageSize',
    },
    columnsFactory: () => [
      { type: 'index' as const, width: 60, label: '序号' },
      { prop: 'developerName', label: '开发者名称', minWidth: 160 },
      { prop: 'developerEmail', label: '开发者邮箱', width: 200 },
      { prop: 'packageName', label: '套餐名称', width: 130 },
      {
        prop: 'billingCycle',
        label: '计费周期',
        width: 100,
        formatter: (row: any) => BILLING_CYCLE_MAP[row.billingCycle] || row.billingCycle,
      },
      { prop: 'startDate', label: '开始日期', width: 120 },
      { prop: 'endDate', label: '结束日期', width: 120 },
      { prop: 'dailyApiUsage', label: '今日API用量', width: 130 },
      {
        prop: 'autoRenew',
        label: '自动续费',
        width: 100,
        formatter: (row: any) => row.autoRenew ? '是' : '否',
      },
      {
        prop: 'status',
        label: '状态',
        width: 100,
        formatter: (row: any) => {
          const config = STATUS_MAP[row.status] || { type: 'info' as const, text: row.status }
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      { prop: 'createdAt', label: '创建时间', width: 180 },
    ],
  },
})

const handleSearch = () => {
  replaceSearchParams({ status: searchForm.value.status })
}
</script>