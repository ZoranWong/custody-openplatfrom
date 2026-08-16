<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData" />
      <ArtTable
        :loading="loading"
        :data="(data as Record<string, any>[])"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
        @row-click="handleRowClick"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DeveloperHistory' })

import { useTable } from '@/hooks/core/useTable'
import { fetchDevelopers } from '@/api/developer'
import { useRouter } from 'vue-router'
import { ElTag, ElButton } from 'element-plus'

const router = useRouter()

const KYB_STATUS_MAP: Record<string, { type: 'success' | 'danger'; text: string }> = {
  approved: { type: 'success', text: '已通过' },
  rejected: { type: 'danger', text: '已拒绝' },
}

const {
  columns, columnChecks, data, loading, pagination,
  getData, refreshData, handleSizeChange, handleCurrentChange,
} = useTable({
  core: {
    apiFn: fetchDevelopers,
    apiParams: { page: 1, pageSize: 20, kybStatus: 'approved,rejected' },
    paginationKey: { current: 'page', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'index' as const, width: 60, label: '序号' },
      { prop: 'legalName', label: '公司名称', minWidth: 200 },
      { prop: 'contactEmail', label: '邮箱', width: 220 },
      { prop: 'registrationNumber', label: '注册号', width: 160 },
      { prop: 'jurisdiction', label: '注册地', width: 120 },
      {
        prop: 'kybStatus', label: '审核结果', width: 100,
        formatter: (row: any) => {
          const config = KYB_STATUS_MAP[row.kybStatus] || { type: 'info' as const, text: row.kybStatus }
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      { prop: 'createdAt', label: '申请时间', width: 180 },
      {
        label: '操作', width: 120, fixed: 'right',
        formatter: (row: any) => h(ElButton, { type: 'primary', size: 'small', onClick: () => router.push({ name: 'DeveloperDetail', params: { id: row.id } }) }, () => '查看'),
      },
    ] as any,
  },
})

const handleRowClick = (row: any) => {
  router.push({ name: 'DeveloperDetail', params: { id: row.id } })
}
</script>