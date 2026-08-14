<!-- KYB 待审核页面 -->
<template>
  <div class="kyb-pending-page art-full-height">
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
  import { fetchKYBPending } from '@/api/kyb'
  import { ElTag } from 'element-plus'

  defineOptions({ name: 'KYBPending' })

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
      apiFn: fetchKYBPending,
      apiParams: {},
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        { prop: 'companyName', label: '公司名称' },
        { prop: 'businessLicense', label: '营业执照号' },
        { prop: 'applicantName', label: '申请人' },
        {
          prop: 'status',
          label: '状态',
          formatter: (row: any) => {
            const statusMap: Record<string, { type: 'success' | 'warning' | 'info' | 'danger'; text: string }> = {
              pending: { type: 'warning', text: '待审核' },
              approved: { type: 'success', text: '已通过' },
              rejected: { type: 'danger', text: '已驳回' }
            }
            const config = statusMap[row.status] || { type: 'info' as const, text: row.status }
            return h(ElTag, { type: config.type }, () => config.text)
          }
        },
        { prop: 'submittedAt', label: '提交时间' }
      ]
    }
  })
</script>