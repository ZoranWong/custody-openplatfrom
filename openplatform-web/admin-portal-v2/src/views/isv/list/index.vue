<!-- ISV 列表页面 -->
<template>
  <div class="isv-list-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData" />

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
  import { useTable } from '@/hooks/core/useTable'
  import { fetchISVStatus } from '@/api/isv'
  import { ElTag } from 'element-plus'

  defineOptions({ name: 'ISVList' })

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchISVStatus,
      apiParams: '' as any,
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        { prop: 'name', label: 'ISV名称' },
        { prop: 'appId', label: 'App ID' },
        {
          prop: 'status',
          label: '状态',
          formatter: (row: any) => {
            const statusMap: Record<string, { type: 'success' | 'warning' | 'info' | 'danger'; text: string }> = {
              active: { type: 'success', text: '已激活' },
              suspended: { type: 'warning', text: '已暂停' },
              banned: { type: 'danger', text: '已封禁' }
            }
            const config = statusMap[row.status] || { type: 'info' as const, text: row.status }
            return h(ElTag, { type: config.type }, () => config.text)
          }
        },
        { prop: 'createdAt', label: '创建时间' }
      ]
    }
  })
</script>