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
defineOptions({ name: 'DeveloperPending' })

import { useTable } from '@/hooks/core/useTable'
import { fetchDevelopers } from '@/api/developer'
import { useRouter } from 'vue-router'
import { ElTag, ElButton } from 'element-plus'

const router = useRouter()

const {
  columns, columnChecks, data, loading, pagination,
  getData, refreshData, handleSizeChange, handleCurrentChange,
} = useTable({
  core: {
    apiFn: fetchDevelopers,
    apiParams: { page: 1, pageSize: 20, kybStatus: 'pending' },
    paginationKey: { current: 'page', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'index' as const, width: 60, label: '序号' },
      { prop: 'legalName', label: '公司名称', minWidth: 200 },
      { prop: 'contactEmail', label: '邮箱', width: 220 },
      { prop: 'registrationNumber', label: '注册号', width: 160 },
      { prop: 'jurisdiction', label: '注册地', width: 120 },
      {
        prop: 'kybStatus', label: '状态', width: 100,
        formatter: (row: any) => h(ElTag, { type: 'warning' }, () => '待审核'),
      },
      { prop: 'createdAt', label: '申请时间', width: 180 },
      {
        label: '操作', width: 120, fixed: 'right',
        formatter: (row: any) => h(ElButton, { type: 'primary', size: 'small', onClick: () => router.push({ name: 'DeveloperReview', params: { id: row.id } }) }, () => '审核'),
      },
    ] as any,
  },
})

const handleRowClick = (row: any) => {
  router.push({ name: 'DeveloperReview', params: { id: row.id } })
}
</script>