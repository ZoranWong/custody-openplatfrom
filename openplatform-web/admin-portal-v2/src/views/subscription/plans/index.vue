<template>
  <div class="subscription-plans-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="handleAdd">添加套餐</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="(data as Record<string, any>[])"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- Dialog -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="120px">
        <ElFormItem label="套餐编码" prop="packageCode">
          <ElInput v-model="formData.packageCode" placeholder="如: basic, pro, enterprise" :disabled="isEdit" />
        </ElFormItem>
        <ElFormItem label="套餐名称" prop="name">
          <ElInput v-model="formData.name" placeholder="如: 基础版" />
        </ElFormItem>
        <ElFormItem label="描述" prop="description">
          <ElInput v-model="formData.description" type="textarea" :rows="2" placeholder="套餐描述" />
        </ElFormItem>
        <ElFormItem label="月价格" prop="monthlyPrice">
          <ElInput v-model="formData.monthlyPrice" type="number" placeholder="月价格" />
        </ElFormItem>
        <ElFormItem label="年价格" prop="yearlyPrice">
          <ElInput v-model="formData.yearlyPrice" type="number" placeholder="年价格（可选）" />
        </ElFormItem>
        <ElFormItem label="年折扣" prop="yearlyDiscount">
          <ElInput v-model="formData.yearlyDiscount" type="number" placeholder="如: 0.8 表示8折" />
        </ElFormItem>
        <ElFormItem label="每日API限额" prop="dailyApiLimit">
          <ElInput v-model="formData.dailyApiLimit" type="number" placeholder="每日API调用次数限制" />
        </ElFormItem>
        <ElFormItem label="最大应用数" prop="maxApplications">
          <ElInput v-model="formData.maxApplications" type="number" placeholder="允许创建的应用数量" />
        </ElFormItem>
        <ElFormItem label="是否试用套餐" prop="isTrial">
          <ElSwitch v-model="formData.isTrial" />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElSelect v-model="formData.status">
            <ElOption label="启用" value="active" />
            <ElOption label="停用" value="inactive" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="排序" prop="sortOrder">
          <ElInput v-model="formData.sortOrder" type="number" placeholder="排序值，越小越靠前" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SubscriptionPlans' })

import { useTable } from '@/hooks/core/useTable'
import { fetchPackages, fetchCreatePackage, fetchUpdatePackage, fetchDeletePackage } from '@/api/subscription'
import { ElTag, ElButton, ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const STATUS_MAP: Record<string, { type: 'success' | 'danger' | 'info'; text: string }> = {
  active: { type: 'success', text: '启用' },
  inactive: { type: 'danger', text: '停用' },
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
    apiFn: fetchPackages,
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
      { prop: 'packageCode', label: '套餐编码', width: 120 },
      { prop: 'name', label: '套餐名称', width: 150 },
      {
        prop: 'monthlyPrice',
        label: '月价格',
        width: 120,
        formatter: (row: any) => `${row.monthlyPrice || 0} ${row.currency || 'CNY'}`,
      },
      {
        prop: 'yearlyPrice',
        label: '年价格',
        width: 120,
        formatter: (row: any) => row.yearlyPrice ? `${row.yearlyPrice} ${row.currency || 'CNY'}` : '-',
      },
      { prop: 'dailyApiLimit', label: '每日API限额', width: 130 },
      { prop: 'maxApplications', label: '最大应用数', width: 110 },
      {
        prop: 'isTrial',
        label: '试用套餐',
        width: 100,
        formatter: (row: any) => {
          return h(ElTag, { type: row.isTrial ? 'warning' : 'info' }, () => row.isTrial ? '是' : '否')
        },
      },
      {
        prop: 'status',
        label: '状态',
        width: 80,
        formatter: (row: any) => {
          const config = STATUS_MAP[row.status] || { type: 'info' as const, text: row.status }
          return h(ElTag, { type: config.type }, () => config.text)
        },
      },
      {
        prop: 'sortOrder',
        label: '排序',
        width: 80,
      },
      {
        label: '操作',
        width: 160,
        fixed: 'right',
        formatter: (row: any) => {
          return h('span', [
            h(ElButton, { type: 'primary', size: 'small', onClick: () => handleEdit(row) }, () => '编辑'),
            h(ElButton, { type: 'danger', size: 'small', style: { marginLeft: '8px' }, onClick: () => handleDelete(row) }, () => '删除'),
          ])
        },
      },
    ],
  },
})

// Dialog state
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const initialFormData = {
  packageCode: '',
  name: '',
  description: '',
  monthlyPrice: '0',
  yearlyPrice: '',
  yearlyDiscount: '1.0',
  dailyApiLimit: '1000',
  maxApplications: '1',
  isTrial: false,
  status: 'active',
  sortOrder: '0',
}

const formData = reactive({ ...initialFormData })

const formRules: FormRules = {
  packageCode: [{ required: true, message: '请输入套餐编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
}

const dialogTitle = computed(() => isEdit.value ? '编辑套餐' : '添加套餐')

const handleAdd = () => {
  isEdit.value = false
  editId.value = ''
  Object.assign(formData, { ...initialFormData })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  editId.value = row.id
  Object.assign(formData, {
    packageCode: row.packageCode || '',
    name: row.name || '',
    description: row.description || '',
    monthlyPrice: String(row.monthlyPrice || '0'),
    yearlyPrice: row.yearlyPrice ? String(row.yearlyPrice) : '',
    yearlyDiscount: String(row.yearlyDiscount || '1.0'),
    dailyApiLimit: String(row.dailyApiLimit || '1000'),
    maxApplications: String(row.maxApplications || '1'),
    isTrial: row.isTrial || false,
    status: row.status || 'active',
    sortOrder: String(row.sortOrder || '0'),
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      const payload = {
        ...formData,
        monthlyPrice: parseFloat(formData.monthlyPrice) || 0,
        yearlyPrice: formData.yearlyPrice ? parseFloat(formData.yearlyPrice) : null,
        yearlyDiscount: parseFloat(formData.yearlyDiscount) || 1.0,
        dailyApiLimit: parseInt(formData.dailyApiLimit) || 1000,
        maxApplications: parseInt(formData.maxApplications) || 1,
        sortOrder: parseInt(formData.sortOrder) || 0,
      }
      if (isEdit.value) {
        await fetchUpdatePackage(editId.value, payload)
        ElMessage.success('更新成功')
      } else {
        await fetchCreatePackage(payload as any)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      refreshData()
    } catch (error) {
      // error handled by interceptor
    } finally {
      submitLoading.value = false
    }
  })
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除套餐"${row.name}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await fetchDeletePackage(row.id)
    ElMessage.success('删除成功')
    refreshData()
  } catch (error) {
    if (error !== 'cancel') {
      // error handled by interceptor
    }
  }
}

const handleDialogClose = () => {
  formRef.value?.resetFields()
}
</script>