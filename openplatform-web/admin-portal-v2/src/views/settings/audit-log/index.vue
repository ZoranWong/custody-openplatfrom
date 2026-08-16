<!-- 操作日志页面 -->
<template>
  <div class="audit-log-page art-full-height">
    <ElCard class="art-table-card">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="(data as Record<string, any>[])"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import { fetchAuditLogs } from '@/api/settings'
import { ElTag } from 'element-plus'

defineOptions({ name: 'SettingsAuditLog' })

const OPERATION_TYPE_MAP: Record<string, { type: 'success' | 'warning' | 'danger' | 'info'; text: string }> = {
  CREATE: { type: 'success', text: '创建' },
  UPDATE: { type: 'warning', text: '更新' },
  DELETE: { type: 'danger', text: '删除' },
  LOGIN: { type: 'info', text: '登录' },
  LOGOUT: { type: 'info', text: '登出' },
}

const {
  columns,
  columnChecks,
  data,
  loading,
  pagination,
  getData,
  handleSizeChange,
  handleCurrentChange,
  refreshData,
} = useTable({
  core: {
    apiFn: fetchAuditLogs,
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
      { prop: 'createdAt', label: '操作时间', width: 180 },
      { prop: 'operatorName', label: '操作人', width: 120 },
      {
        prop: 'operationType',
        label: '操作类型',
        width: 100,
        formatter: (row: any) => {
          const config = OPERATION_TYPE_MAP[row.operationType] || { type: 'info' as const, text: row.operationType }
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      { prop: 'resource', label: '资源', width: 160 },
      { prop: 'detail', label: '详情', minWidth: 200 },
    ] as any,
  },
})

// 初始化加载数据
getData()
</script>