<!-- KYB 历史记录页面 -->
<template>
  <div class="kyb-history-page art-full-height">
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
  import { fetchKYBHistory } from '@/api/kyb'
  import { ElTag } from 'element-plus'

  defineOptions({ name: 'KYBHistory' })

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
      apiFn: fetchKYBHistory,
      apiParams: {},
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        { prop: 'companyName', label: '公司名称' },
        { prop: 'businessLicense', label: '营业执照号' },
        {
          prop: 'status',
          label: '状态',
          formatter: (row: any) => {
            const statusMap: Record<string, { type: 'success' | 'warning' | 'info' | 'danger'; text: string }> = {
              approved: { type: 'success', text: '已通过' },
              rejected: { type: 'danger', text: '已驳回' }
            }
            const config = statusMap[row.status] || { type: 'info' as const, text: row.status }
            return h(ElTag, { type: config.type }, () => config.text)
          }
        },
        { prop: 'reviewedAt', label: '审核时间' },
        { prop: 'reviewerName', label: '审核人' }
      ]
    }
  })
</script>