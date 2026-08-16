<template>
  <div class="subscription-plans-page flex flex-col">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">套餐管理</h2>
      <ElButton type="primary" @click="handleAdd">新增套餐</ElButton>
    </div>

    <!-- Active Packages - Card Layout -->
    <ElRow :gutter="20">
      <ElCol v-for="pkg in activePackages" :key="pkg.id" :sm="24" :md="12" :lg="6">
        <ElCard
          class="package-card cursor-pointer"
          :class="packageTypeClass(pkg.packageCode)"
          shadow="hover"
          @click="handleCardClick(pkg)"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="font-bold">{{ pkg.name }}</span>
              <ElTag :type="packageTagType(pkg.packageCode)">
                {{ packageTypeLabel(pkg.packageCode) }}
              </ElTag>
            </div>
          </template>
          <div class="price">
            <span class="text-3xl font-bold">
              {{ pkg.monthlyPrice === '0' ? '免费' : '¥' + pkg.monthlyPrice }}
            </span>
            <span v-if="pkg.monthlyPrice !== '0'" class="text-sm text-gray-500">/月</span>
          </div>
          <div v-if="pkg.yearlyPrice && pkg.yearlyPrice !== '0'" class="text-sm text-gray-500 mt-1">
            年付 ¥{{ pkg.yearlyPrice }} ({{ (pkg.yearlyDiscount * 10).toFixed(1) }}折)
          </div>
          <ElDivider />
          <div class="features">
            <p
              v-for="(f, i) in parseFeatures(pkg.features)"
              :key="i"
              class="text-sm text-gray-600 mb-1"
            >
              <span class="text-green-500 mr-1">&#10003;</span> {{ f }}
            </p>
          </div>
          <div class="mt-3 text-xs text-gray-400"> v{{ pkg.version || 1 }} </div>
        </ElCard>
      </ElCol>

      <!-- Empty state for card types without active packages -->
      <ElCol v-for="code in missingPackageTypes" :key="code" :sm="24" :md="12" :lg="6">
        <ElCard class="package-card package-card-empty" shadow="hover">
          <div class="flex flex-col items-center justify-center h-full py-8 text-gray-400">
            <p class="text-lg mb-2">{{ packageTypeLabel(code) }}</p>
            <p class="text-sm mb-4">暂无可用套餐</p>
            <ElButton type="primary" size="small" @click.stop="handleAddForType(code)"
              >新增套餐</ElButton
            >
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- History - Table Layout (always visible below cards) -->
    <div class="mt-8">
      <div class="mb-4">
        <ElSelect
          v-model="historyFilter"
          placeholder="筛选套餐类型"
          clearable
          style="width: 200px"
          @change="loadHistory"
        >
          <ElOption label="全部" value="" />
          <ElOption label="体验版 (TRIAL)" value="TRIAL" />
          <ElOption label="基础版 (BASIC)" value="BASIC" />
          <ElOption label="中小企业版 (PROFESSIONAL)" value="PROFESSIONAL" />
          <ElOption label="金融服务大型企业版 (ENTERPRISE)" value="ENTERPRISE" />
        </ElSelect>
      </div>
      <ElCard class="art-table-card">
        <ArtTable
          :loading="historyLoading"
          :data="historyData"
          :columns="historyColumns"
          :pagination="historyPagination"
          @pagination:size-change="handleHistorySizeChange"
          @pagination:current-change="handleHistoryCurrentChange"
        />
      </ElCard>
    </div>

    <!-- Add/Edit Dialog -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="120px">
        <ElFormItem label="套餐类型" prop="packageCode">
          <ElSelect
            v-model="formData.packageCode"
            :disabled="!!editingPackage"
            placeholder="选择套餐类型"
          >
            <ElOption label="体验版 (TRIAL)" value="TRIAL" />
            <ElOption label="基础版 (BASIC)" value="BASIC" />
            <ElOption label="中小企业版 (PROFESSIONAL)" value="PROFESSIONAL" />
            <ElOption label="金融服务大型企业版 (ENTERPRISE)" value="ENTERPRISE" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="套餐名称" prop="name">
          <ElInput v-model="formData.name" placeholder="如: 基础版" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput
            v-model="formData.description"
            type="textarea"
            :rows="2"
            placeholder="套餐描述"
          />
        </ElFormItem>
        <ElFormItem label="月价格 (¥)" prop="monthlyPrice">
          <ElInputNumber
            v-model="formData.monthlyPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="年价格 (¥)">
          <ElInputNumber
            v-model="formData.yearlyPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="年付折扣">
          <ElInputNumber
            v-model="formData.yearlyDiscount"
            :min="0.1"
            :max="1.0"
            :precision="2"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="每日API限额" prop="dailyApiLimit">
          <ElInputNumber v-model="formData.dailyApiLimit" :min="100" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="最大应用数" prop="maxApplications">
          <ElInputNumber v-model="formData.maxApplications" :min="1" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="功能列表">
          <ElInput
            v-model="formData.featuresText"
            type="textarea"
            :rows="6"
            placeholder="每行一个功能，例如：&#10;每日50,000次API调用&#10;3个应用&#10;邮件支持"
          />
        </ElFormItem>
        <ElFormItem label="体验套餐">
          <ElSwitch v-model="formData.isTrial" />
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

  import { fetchActivePackages, fetchPackageHistory, fetchCreatePackage } from '@/api/subscription'
  import { ElTag, ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'

  const VALID_PACKAGE_CODES = ['TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'] as const

  const PACKAGE_TYPE_LABELS: Record<string, string> = {
    TRIAL: '体验版',
    BASIC: '基础版',
    PROFESSIONAL: '中小企业版',
    ENTERPRISE: '金融服务大型企业版'
  }

  function packageTypeLabel(code: string): string {
    return PACKAGE_TYPE_LABELS[code] || code
  }

  function packageTypeClass(code: string): string {
    const map: Record<string, string> = {
      TRIAL: 'package-card-trial',
      BASIC: 'package-card-basic',
      PROFESSIONAL: 'package-card-pro',
      ENTERPRISE: 'package-card-enterprise'
    }
    return map[code] || ''
  }

  function packageTagType(code: string): 'success' | 'primary' | 'warning' | 'danger' {
    const map: Record<string, 'success' | 'primary' | 'warning' | 'danger'> = {
      TRIAL: 'success',
      BASIC: 'primary',
      PROFESSIONAL: 'warning',
      ENTERPRISE: 'danger'
    }
    return map[code] || 'info'
  }

  function parseFeatures(features: any): string[] {
    if (!features) return []
    if (Array.isArray(features)) return features
    if (typeof features === 'string') {
      try {
        return JSON.parse(features)
      } catch {
        return []
      }
    }
    return []
  }

  // Active packages state
  const activePackages = ref<any[]>([])

  // Missing package types - those without an active package
  const missingPackageTypes = computed(() => {
    const activeCodes = new Set(activePackages.value.map((p: any) => p.packageCode))
    return VALID_PACKAGE_CODES.filter((code) => !activeCodes.has(code))
  })

  async function loadActivePackages() {
    try {
      const res = await fetchActivePackages()
      activePackages.value = Array.isArray(res) ? res : (res || [])
    } catch {
      // interceptor handles error
    }
  }

  // History state
  const historyFilter = ref('')
  const historyLoading = ref(false)
  const historyData = ref<any[]>([])
  const historyPagination = reactive({
    current: 1,
    size: 10,
    total: 0
  })

  const historyColumns = [
    { type: 'index' as const, width: 60, label: '序号' },
    {
      prop: 'packageCode',
      label: '套餐类型',
      width: 100,
      formatter: (row: any) => packageTypeLabel(row.packageCode)
    },
    { prop: 'name', label: '套餐名称', width: 150 },
    {
      prop: 'monthlyPrice',
      label: '月价格',
      width: 120,
      formatter: (row: any) => `${row.monthlyPrice || 0} CNY`
    },
    {
      prop: 'yearlyPrice',
      label: '年价格',
      width: 120,
      formatter: (row: any) => (row.yearlyPrice ? `${row.yearlyPrice} CNY` : '-')
    },
    { prop: 'dailyApiLimit', label: '每日API限额', width: 130 },
    { prop: 'maxApplications', label: '最大应用数', width: 110 },
    {
      prop: 'version',
      label: '版本',
      width: 80,
      formatter: (row: any) => `v${row.version || 1}`
    },
    {
      prop: 'createdAt',
      label: '创建时间',
      width: 180,
      formatter: (row: any) => {
        if (!row.createdAt) return '-'
        const d = new Date(row.createdAt)
        return d.toLocaleString('zh-CN')
      }
    }
  ]

  async function loadHistory() {
    historyLoading.value = true
    try {
      const params: any = {
        page: historyPagination.current,
        pageSize: historyPagination.size
      }
      if (historyFilter.value) {
        params.packageCode = historyFilter.value
      }
      const res: any = await fetchPackageHistory(params)
      historyData.value = res.list || []
      historyPagination.total = res.total || 0
    } catch {
      // interceptor handles error
    } finally {
      historyLoading.value = false
    }
  }

  function handleHistorySizeChange(size: number) {
    historyPagination.size = size
    historyPagination.current = 1
    loadHistory()
  }

  function handleHistoryCurrentChange(page: number) {
    historyPagination.current = page
    loadHistory()
  }

  // Dialog state
  const dialogVisible = ref(false)
  const editingPackage = ref<any>(null)
  const submitLoading = ref(false)
  const formRef = ref<FormInstance>()

  const initialFormData = {
    packageCode: '',
    name: '',
    description: '',
    monthlyPrice: 0,
    yearlyPrice: null as number | null,
    yearlyDiscount: 1.0,
    dailyApiLimit: 1000,
    maxApplications: 1,
    isTrial: false,
    featuresText: ''
  }

  const formData = reactive({ ...initialFormData })

  const formRules: FormRules = {
    packageCode: [{ required: true, message: '请选择套餐类型', trigger: 'change' }],
    name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
    monthlyPrice: [{ required: true, message: '请输入月价格', trigger: 'blur' }],
    dailyApiLimit: [{ required: true, message: '请输入每日API限额', trigger: 'blur' }],
    maxApplications: [{ required: true, message: '请输入最大应用数', trigger: 'blur' }]
  }

  const dialogTitle = computed(() =>
    editingPackage.value ? '编辑套餐（将创建新版本）' : '新增套餐'
  )

  function handleAdd() {
    editingPackage.value = null
    Object.assign(formData, { ...initialFormData })
    dialogVisible.value = true
  }

  function handleAddForType(code: string) {
    editingPackage.value = null
    Object.assign(formData, { ...initialFormData, packageCode: code })
    dialogVisible.value = true
  }

  function handleCardClick(pkg: any) {
    editingPackage.value = pkg
    Object.assign(formData, {
      packageCode: pkg.packageCode || '',
      name: pkg.name || '',
      description: pkg.description || '',
      monthlyPrice: Number(pkg.monthlyPrice || 0),
      yearlyPrice: pkg.yearlyPrice ? Number(pkg.yearlyPrice) : null,
      yearlyDiscount: Number(pkg.yearlyDiscount || 1.0),
      dailyApiLimit: Number(pkg.dailyApiLimit || 1000),
      maxApplications: Number(pkg.maxApplications || 1),
      isTrial: pkg.isTrial || false,
      featuresText: parseFeatures(pkg.features).join('\n')
    })
    dialogVisible.value = true
  }

  async function handleSubmit() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (!valid) return
      submitLoading.value = true
      try {
        const features = formData.featuresText
          ? formData.featuresText.split('\n').filter((f) => f.trim())
          : null

        const payload = {
          packageCode: formData.packageCode,
          name: formData.name,
          description: formData.description || undefined,
          features,
          monthlyPrice: formData.monthlyPrice,
          yearlyPrice: formData.yearlyPrice,
          yearlyDiscount: formData.yearlyDiscount,
          dailyApiLimit: formData.dailyApiLimit,
          maxApplications: formData.maxApplications,
          isTrial: formData.isTrial
        }

        await fetchCreatePackage(payload as any)
        ElMessage.success(editingPackage.value ? '已创建新版本并停用旧版本' : '创建成功')
        dialogVisible.value = false
        loadActivePackages()
        loadHistory()
      } catch {
        // interceptor handles error
      } finally {
        submitLoading.value = false
      }
    })
  }

  function handleDialogClose() {
    formRef.value?.resetFields()
  }

  // Initial load
  onMounted(() => {
    loadActivePackages()
    loadHistory()
  })
</script>

<style scoped>
  .package-card {
    margin-bottom: 20px;
    border-radius: 8px;
    transition: all 0.3s ease;
    min-height: 320px;
  }

  .package-card:hover {
    transform: translateY(-4px);
  }

  .package-card-trial {
    border-top: 3px solid #67c23a;
  }

  .package-card-basic {
    border-top: 3px solid #409eff;
  }

  .package-card-pro {
    border-top: 3px solid #e6a23c;
  }

  .package-card-enterprise {
    border-top: 3px solid #f56c6c;
  }

  .package-card-empty {
    border: 1px dashed #d9d9d9;
    border-top: 3px dashed #d9d9d9;
    background: #fafafa;
    min-height: 320px;
  }

  .price {
    text-align: center;
    padding: 8px 0;
  }

  .features {
    min-height: 160px;
  }
</style>
