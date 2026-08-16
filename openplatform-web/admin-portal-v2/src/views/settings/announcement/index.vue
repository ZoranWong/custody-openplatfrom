<!-- 公告管理页面 -->
<template>
  <div class="announcement-page art-full-height">
    <ElCard class="art-table-card">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="handleAdd">新增公告</ElButton>
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

    <!-- 新增/编辑公告对话框 -->
    <ElDialog v-model="showDialog" :title="isEdit ? '编辑公告' : '新增公告'" width="600px">
      <ElForm :model="formData" label-width="80px">
        <ElFormItem label="标题">
          <ElInput v-model="formData.title" placeholder="请输入公告标题" />
        </ElFormItem>
        <ElFormItem label="内容">
          <ElInput v-model="formData.content" type="textarea" :rows="5" placeholder="请输入公告内容" />
        </ElFormItem>
        <ElFormItem label="类型">
          <ElSelect v-model="formData.type">
            <ElOption label="系统公告" value="system" />
            <ElOption label="维护公告" value="maintenance" />
            <ElOption label="功能更新" value="feature" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="formData.status">
            <ElOption label="草稿" value="draft" />
            <ElOption label="已发布" value="published" />
            <ElOption label="已归档" value="archived" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showDialog = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit" :loading="submitting">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h } from 'vue'
import { useTable } from '@/hooks/core/useTable'
import { ElTag, ElButton, ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchAnnouncements,
  fetchCreateAnnouncement,
  fetchUpdateAnnouncement,
  fetchDeleteAnnouncement,
} from '@/api/settings'

defineOptions({ name: 'SettingsAnnouncement' })

const TYPE_CONFIG: Record<string, { type: 'success' | 'warning' | 'info'; text: string }> = {
  system: { type: 'info', text: '系统公告' },
  maintenance: { type: 'warning', text: '维护公告' },
  feature: { type: 'success', text: '功能更新' },
}

const STATUS_CONFIG: Record<string, { type: 'info' | 'success' | 'warning' | 'danger'; text: string }> = {
  draft: { type: 'info', text: '草稿' },
  published: { type: 'success', text: '已发布' },
  archived: { type: 'warning', text: '已归档' },
}

const getTypeConfig = (type: string) => {
  return TYPE_CONFIG[type] || { type: 'info' as const, text: type }
}

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status] || { type: 'info' as const, text: status }
}

const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref('')
const submitting = ref(false)
const formData = reactive({
  title: '',
  content: '',
  type: 'system',
  status: 'draft',
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
  refreshData,
} = useTable({
  core: {
    apiFn: fetchAnnouncements,
    apiParams: {
      page: 1,
      pageSize: 20,
    },
    columnsFactory: () => [
      { type: 'index', width: 60, label: '序号' },
      {
        prop: 'title',
        label: '标题',
        minWidth: 200,
      },
      {
        prop: 'content',
        label: '内容',
        minWidth: 300,
        formatter: (row: any) => {
          const text = row.content || ''
          return text.length > 50 ? text.substring(0, 50) + '...' : text
        },
      },
      {
        prop: 'type',
        label: '类型',
        width: 120,
        formatter: (row: any) => {
          const config = getTypeConfig(row.type)
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      {
        prop: 'status',
        label: '状态',
        width: 100,
        formatter: (row: any) => {
          const config = getStatusConfig(row.status)
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      {
        prop: 'createdAt',
        label: '创建时间',
        width: 180,
      },
      {
        prop: 'updatedAt',
        label: '更新时间',
        width: 180,
      },
      {
        label: '操作',
        width: 180,
        fixed: 'right',
        formatter: (row: any) => {
          return h('div', { style: { display: 'flex', gap: '8px' } }, [
            h(ElButton, { type: 'primary', size: 'small', onClick: () => handleEdit(row) }, () => '编辑'),
            h(ElButton, { type: 'danger', size: 'small', onClick: () => handleDelete(row) }, () => '删除'),
          ])
        },
      },
    ],
  },
})

// 初始化加载数据
getData()

const handleAdd = () => {
  isEdit.value = false
  editId.value = ''
  formData.title = ''
  formData.content = ''
  formData.type = 'system'
  formData.status = 'draft'
  showDialog.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  editId.value = row.id
  formData.title = row.title
  formData.content = row.content
  formData.type = row.type
  formData.status = row.status
  showDialog.value = true
}

const handleSubmit = async () => {
  if (!formData.title || !formData.content) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await fetchUpdateAnnouncement(editId.value, {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        status: formData.status,
      })
      ElMessage.success('公告更新成功')
    } else {
      await fetchCreateAnnouncement({
        title: formData.title,
        content: formData.content,
        type: formData.type,
        status: formData.status,
      })
      ElMessage.success('公告创建成功')
    }
    showDialog.value = false
    refreshData()
  } catch {
    // error handled by http interceptor
  } finally {
    submitting.value = false
  }
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除该公告吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await fetchDeleteAnnouncement(row.id)
        ElMessage.success('公告删除成功')
        refreshData()
      } catch {
        // error handled by http interceptor
      }
    })
    .catch(() => {
      // cancel
    })
}
</script>