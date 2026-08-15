<template>
  <div class="developer-registration-page art-full-height">
    <ElCard class="art-table-card">
      <ElTabs v-model="activeTab" @tab-change="handleTabChange">
        <ElTabPane label="待审核" name="pending">
          <ArtTableHeader v-if="activeTab === 'pending'" v-model:columns="pendingColumnChecks" :loading="pendingLoading" @refresh="pendingRefreshData" />
          <ArtTable
            v-if="activeTab === 'pending'"
            :loading="pendingLoading"
            :data="(pendingData as Record<string, any>[])"
            :columns="pendingColumns"
            :pagination="pendingPagination"
            @pagination:size-change="pendingHandleSizeChange"
            @pagination:current-change="pendingHandleCurrentChange"
            @row-click="handlePendingRowClick"
          />
        </ElTabPane>

        <ElTabPane label="历史记录" name="history">
          <ArtTableHeader v-if="activeTab === 'history'" v-model:columns="historyColumnChecks" :loading="historyLoading" @refresh="historyRefreshData" />
          <ArtTable
            v-if="activeTab === 'history'"
            :loading="historyLoading"
            :data="(historyData as Record<string, any>[])"
            :columns="historyColumns"
            :pagination="historyPagination"
            @pagination:size-change="historyHandleSizeChange"
            @pagination:current-change="historyHandleCurrentChange"
            @row-click="handleHistoryRowClick"
          />
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DeveloperRegistration' })

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElTag, ElTabs, ElTabPane } from 'element-plus'
import type { TabPaneName } from 'element-plus'
import { useTable } from '@/hooks/core/useTable'
import { fetchDevelopers } from '@/api/developer'

const router = useRouter()
const activeTab = ref('pending')

const KYB_STATUS_MAP: Record<string, { type: 'warning' | 'success' | 'danger' | 'info'; text: string }> = {
  pending: { type: 'warning', text: '待审核' },
  approved: { type: 'success', text: '已通过' },
  rejected: { type: 'danger', text: '已拒绝' },
}

const sharedColumns = () => [
  { type: 'index' as const, width: 60, label: '序号' },
  { prop: 'legalName', label: '公司名称', minWidth: 200 },
  { prop: 'email', label: '邮箱', width: 220 },
  { prop: 'registrationNumber', label: '注册号', width: 160 },
  { prop: 'jurisdiction', label: '注册地', width: 120 },
  {
    prop: 'kybStatus',
    label: 'KYB状态',
    width: 100,
    formatter: (row: any) => {
      const config = KYB_STATUS_MAP[row.kybStatus] || { type: 'info' as const, text: row.kybStatus }
      return h(ElTag, { type: config.type }, () => config.text)
    },
  },
  { prop: 'createdAt', label: '申请时间', width: 180 },
] as any

// Pending tab
const pendingTable = useTable({
  core: {
    apiFn: fetchDevelopers,
    apiParams: {
      page: 1,
      pageSize: 20,
      kybStatus: 'pending',
    },
    paginationKey: {
      current: 'page',
      size: 'pageSize',
    },
    columnsFactory: sharedColumns,
  },
})

const {
  columns: pendingColumns,
  columnChecks: pendingColumnChecks,
  data: pendingData,
  loading: pendingLoading,
  pagination: pendingPagination,
  handleSizeChange: pendingHandleSizeChange,
  handleCurrentChange: pendingHandleCurrentChange,
  refreshData: pendingRefreshData,
} = pendingTable

// History tab
const historyTable = useTable({
  core: {
    apiFn: fetchDevelopers,
    apiParams: {
      page: 1,
      pageSize: 20,
      kybStatus: 'approved,rejected',
    },
    paginationKey: {
      current: 'page',
      size: 'pageSize',
    },
    columnsFactory: sharedColumns,
    immediate: false,
  },
})

const {
  columns: historyColumns,
  columnChecks: historyColumnChecks,
  data: historyData,
  loading: historyLoading,
  pagination: historyPagination,
  handleSizeChange: historyHandleSizeChange,
  handleCurrentChange: historyHandleCurrentChange,
  refreshData: historyRefreshData,
} = historyTable

const handleTabChange = (tabName: TabPaneName) => {
  if (tabName === 'history') {
    historyRefreshData()
  }
}

const handlePendingRowClick = (row: any) => {
  router.push({ name: 'DeveloperReview', params: { id: row.id } })
}

const handleHistoryRowClick = (row: any) => {
  router.push({ name: 'DeveloperDetail', params: { id: row.id } })
}
</script>