<template>
  <div class="subscription-orders-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSelect
            v-model="searchForm.status"
            placeholder="订单状态"
            clearable
            class="w-36"
            @change="handleSearch"
          >
            <ElOption label="待支付" value="pending" />
            <ElOption label="已支付" value="paid" />
            <ElOption label="已取消" value="cancelled" />
            <ElOption label="已退款" value="refunded" />
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
defineOptions({ name: 'SubscriptionOrders' })

import { useTable } from '@/hooks/core/useTable'
import { fetchOrders } from '@/api/subscription'
import { ElTag } from 'element-plus'

const ORDER_STATUS_MAP: Record<string, { type: 'warning' | 'success' | 'danger' | 'info'; text: string }> = {
  pending: { type: 'warning', text: '待支付' },
  paid: { type: 'success', text: '已支付' },
  cancelled: { type: 'info', text: '已取消' },
  refunded: { type: 'danger', text: '已退款' },
}

const PERIOD_MAP: Record<string, string> = {
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
    apiFn: fetchOrders,
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
      { prop: 'developerName', label: '开发者', minWidth: 160 },
      { prop: 'developerEmail', label: '开发者邮箱', width: 200 },
      { prop: 'packageName', label: '套餐', width: 130 },
      {
        prop: 'period',
        label: '周期',
        width: 80,
        formatter: (row: any) => PERIOD_MAP[row.period] || row.period,
      },
      {
        prop: 'amount',
        label: '金额',
        width: 120,
        formatter: (row: any) => `${row.amount || 0} ${row.currency || 'CNY'}`,
      },
      {
        prop: 'status',
        label: '状态',
        width: 100,
        formatter: (row: any) => {
          const config = ORDER_STATUS_MAP[row.status] || { type: 'info' as const, text: row.status }
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      { prop: 'createdAt', label: '创建时间', width: 180 },
      {
        prop: 'paidAt',
        label: '支付时间',
        width: 180,
        formatter: (row: any) => row.paidAt || '-',
      },
    ],
  },
})

const handleSearch = () => {
  replaceSearchParams({ status: searchForm.value.status })
}
</script>