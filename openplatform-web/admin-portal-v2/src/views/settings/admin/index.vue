<!-- 管理员管理页面 -->
<template>
  <div class="admin-page art-full-height">
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
import { fetchAdmins } from '@/api/settings'
import { ElTag } from 'element-plus'

defineOptions({ name: 'SettingsAdmin' })

const ROLE_CONFIG: Record<string, { type: 'danger' | 'warning' | 'info'; text: string }> = {
  super_admin: { type: 'danger', text: '超级管理员' },
  admin: { type: 'warning', text: '管理员' },
  operator: { type: 'info', text: '操作员' }
}

const STATUS_CONFIG: Record<string, { type: 'success' | 'info'; text: string }> = {
  active: { type: 'success', text: '正常' },
  disabled: { type: 'info', text: '禁用' }
}

const getRoleConfig = (role: string) => {
  return ROLE_CONFIG[role] || { type: 'info' as const, text: role }
}

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status] || { type: 'info' as const, text: status }
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
  refreshData
} = useTable({
  core: {
    apiFn: fetchAdmins,
    apiParams: {
      current: 1,
      size: 20
    },
    columnsFactory: () => [
      { type: 'index', width: 60, label: '序号' },
      {
        prop: 'name',
        label: '姓名',
        minWidth: 120
      },
      {
        prop: 'email',
        label: '邮箱',
        minWidth: 180
      },
      {
        prop: 'role',
        label: '角色',
        width: 120,
        formatter: (row: any) => {
          const config = getRoleConfig(row.role)
          return h(ElTag, { type: config.type }, () => config.text)
        }
      },
      {
        prop: 'status',
        label: '状态',
        width: 100,
        formatter: (row: any) => {
          const config = getStatusConfig(row.status)
          return h(ElTag, { type: config.type }, () => config.text)
        }
      },
      {
        prop: 'lastLoginAt',
        label: '最后登录',
        width: 180,
        formatter: (row: any) => {
          return row.lastLoginAt || '-'
        }
      },
      {
        prop: 'createdAt',
        label: '创建时间',
        width: 180
      }
    ]
  }
})

// 初始化加载数据
getData()
</script>