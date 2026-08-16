<!-- 管理员管理页面 -->
<template>
  <div class="admin-page art-full-height">
    <ElCard class="art-table-card">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="showAddDialog = true">新增管理员</ElButton>
        </template>
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

    <!-- 新增管理员对话框 -->
    <ElDialog v-model="showAddDialog" title="新增管理员" width="500px">
      <ElForm :model="newAdmin" label-width="100px">
        <ElFormItem label="姓名">
          <ElInput v-model="newAdmin.name" />
        </ElFormItem>
        <ElFormItem label="邮箱">
          <ElInput v-model="newAdmin.email" />
        </ElFormItem>
        <ElFormItem label="密码">
          <ElInput v-model="newAdmin.password" type="password" />
        </ElFormItem>
        <ElFormItem label="角色">
          <ElSelect v-model="newAdmin.role">
            <ElOption label="超级管理员" value="super_admin" />
            <ElOption label="管理员" value="admin" />
            <ElOption label="操作员" value="operator" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showAddDialog = false">取消</ElButton>
        <ElButton type="primary" @click="handleAddAdmin" :loading="adding">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useTable } from '@/hooks/core/useTable'
import { fetchAdmins, fetchCreateAdmin } from '@/api/settings'
import { ElTag, ElButton, ElMessage } from 'element-plus'

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

const showAddDialog = ref(false)
const adding = ref(false)
const newAdmin = reactive({
  name: '',
  email: '',
  password: '',
  role: 'admin',
})

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
      },
      {
        label: '操作',
        width: 120,
        fixed: 'right',
        formatter: (row: any) => {
          return h(ElButton, { type: 'primary', size: 'small', onClick: () => handleView(row) }, () => '查看')
        },
      },
    ]
  }
})

// 初始化加载数据
getData()

const handleView = (row: any) => {
  // Navigate to admin detail or show info
  console.log('View admin:', row)
}

const handleAddAdmin = async () => {
  if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
    ElMessage.warning('请填写完整信息')
    return
  }
  adding.value = true
  try {
    await fetchCreateAdmin({
      name: newAdmin.name,
      email: newAdmin.email,
      password: newAdmin.password,
      role: newAdmin.role,
    })
    ElMessage.success('管理员创建成功')
    showAddDialog.value = false
    newAdmin.name = ''
    newAdmin.email = ''
    newAdmin.password = ''
    newAdmin.role = 'admin'
    refreshData()
  } catch {
    // error handled by http interceptor
  } finally {
    adding.value = false
  }
}
</script>