<template>
  <div class="subscription-plans-page">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ $t('package.title') }}</h2>
      <ElButton type="primary" @click="handleAdd">{{ $t('package.addPackage') }}</ElButton>
    </div>

    <!-- Active Packages - Card Layout -->
    <ElRow :gutter="20" class="package-card-row">
      <ElCol v-for="pkg in sortedPackages" :key="pkg.id" :sm="24" :md="12" :lg="6">
        <ElCard
          class="package-card"
          :class="packageTypeClass(pkg.packageCode)"
          shadow="hover"
          @click="handleCardClick(pkg)"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="font-bold">{{ pkg.name }}</span>
              <ElTag :type="packageTagType(pkg.packageCode)" size="small">
                {{ $t(`package.packageTypeLabels.${pkg.packageCode}`) }}
              </ElTag>
            </div>
          </template>

          <!-- Price section -->
          <div class="price-section">
            <template v-if="pkg.isTrial">
              <div class="text-3xl font-bold text-green-500">{{ $t('package.free') }}</div>
              <div class="text-sm text-gray-400">{{ $t('package.perMonth') }}</div>
              <div class="text-xs text-gray-400 mt-1">{{ $t('package.trialDays') }}</div>
            </template>
            <template v-else>
              <div class="text-3xl font-bold">${{ pkg.monthlyPrice }}</div>
              <div class="text-sm text-gray-400">{{ $t('package.perMonth') }}</div>
              <div v-if="pkg.yearlyPrice && Number(pkg.yearlyPrice) > 0" class="text-xs text-gray-400 mt-1">
                {{ $t('package.yearly') }}: ${{ pkg.yearlyPrice }}
                <span class="text-blue-500 ml-1">
                  ({{ Number((Number(pkg.yearlyDiscount) || 1) * 10).toFixed(1) }}{{ $t('package.discount') }})
                </span>
              </div>
            </template>
          </div>

          <ElDivider />

          <!-- Feature list -->
          <div class="features-section">
            <div
              v-for="category in featureCategories"
              :key="category.key"
              class="feature-category"
            >
              <div class="feature-category-title">
                {{ $t(`package.featuresCategory.${category.key}`) }}
              </div>
              <div
                v-for="feature in category.features"
                :key="feature.key"
                class="feature-item"
              >
                <span
                  v-if="feature.handler(pkg)"
                  class="feature-check feature-yes"
                >&#10003;</span>
                <span
                  v-else
                  class="feature-check feature-no"
                >&#10007;</span>
                <span class="feature-label">
                  {{ $t(`package.featureLabels.${feature.key}`) }}
                </span>
                <span v-if="feature.key === 'dailyApiLimit'" class="feature-value">
                  {{ formatNumber(pkg.dailyApiLimit) }}
                </span>
                <span v-else-if="feature.key === 'maxApplications'" class="feature-value">
                  {{ pkg.maxApplications >= 999 ? 'Unlimited' : pkg.maxApplications }}
                </span>
                <span v-else-if="feature.key === 'logRetention'" class="feature-value">
                  {{ pkg.logRetention }}{{ $t('package.featureLabels.logRetention').match(/\d/) ? '' : 'd' }}
                </span>
                <span v-else-if="feature.key === 'supportLevel'" class="feature-value">
                  {{ $t(`package.supportLevelLabels.${pkg.supportLevel || 'community'}`) }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-3 text-xs text-gray-400 text-right">
            v{{ pkg.version || 1 }}
          </div>
        </ElCard>
      </ElCol>

      <!-- Empty state for card types without active packages -->
      <ElCol v-for="code in missingPackageTypes" :key="code" :sm="24" :md="12" :lg="6">
        <ElCard class="package-card package-card-empty" shadow="hover">
          <div class="flex flex-col items-center justify-center h-full py-8 text-gray-400">
            <p class="text-lg mb-2">{{ $t(`package.packageTypeLabels.${code}`) }}</p>
            <p class="text-sm mb-4">{{ $t('package.noPackage') }}</p>
            <ElButton type="primary" size="small" @click.stop="handleAddForType(code)">
              {{ $t('package.addForType') }}
            </ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- History - Table Layout -->
    <div class="mt-8 history-section" style="min-height: 400px;">
      <div class="mb-4">
        <ElSelect
          v-model="historyFilter"
          :placeholder="$t('package.filterType')"
          clearable
          style="width: 200px"
          @change="loadHistory"
        >
          <ElOption :label="$t('package.all')" value="" />
          <ElOption
            v-for="code in VALID_PACKAGE_CODES"
            :key="code"
            :label="$t(`package.packageTypeLabels.${code}`)"
            :value="code"
          />
        </ElSelect>
      </div>
      <div class="bg-[var(--default-box-color)] rounded-xl border border-[var(--default-border)] overflow-hidden">
        <ArtTable
          :loading="historyLoading"
          :data="historyData"
          :columns="historyColumns"
          :pagination="historyPagination"
          @pagination:size-change="handleHistorySizeChange"
          @pagination:current-change="handleHistoryCurrentChange"
          style="height: auto; min-height: 300px;"
        />
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="140px">
        <ElFormItem :label="$t('package.packageCode')" prop="packageCode">
          <ElSelect
            v-model="formData.packageCode"
            :disabled="!!editingPackage"
            :placeholder="$t('package.packageCode')"
          >
            <ElOption
              v-for="code in VALID_PACKAGE_CODES"
              :key="code"
              :label="$t(`package.packageTypeLabels.${code}`)"
              :value="code"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="$t('package.name')" prop="name">
          <ElInput v-model="formData.name" />
        </ElFormItem>
        <ElFormItem :label="$t('package.description')">
          <ElInput
            v-model="formData.description"
            type="textarea"
            :rows="2"
          />
        </ElFormItem>
        <ElFormItem :label="$t('package.monthlyPrice') ($)" prop="monthlyPrice">
          <ElInputNumber
            v-model="formData.monthlyPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem :label="$t('package.yearlyPrice') ($)">
          <ElInputNumber
            v-model="formData.yearlyPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem :label="$t('package.yearlyDiscount')">
          <ElInputNumber
            v-model="formData.yearlyDiscount"
            :min="0.1"
            :max="1.0"
            :precision="2"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem :label="$t('package.dailyApiLimit')" prop="dailyApiLimit">
          <ElInputNumber v-model="formData.dailyApiLimit" :min="100" style="width: 100%" />
        </ElFormItem>
        <ElFormItem :label="$t('package.maxApplications')" prop="maxApplications">
          <ElInputNumber v-model="formData.maxApplications" :min="1" style="width: 100%" />
        </ElFormItem>
        <ElFormItem :label="$t('package.isTrial')">
          <ElSwitch v-model="formData.isTrial" />
        </ElFormItem>
        <ElDivider content-position="left">{{ $t('package.features') }}</ElDivider>
        <ElFormItem :label="$t('package.featureLabels.webhook')">
          <ElSwitch v-model="formData.webhook" />
        </ElFormItem>
        <ElFormItem :label="$t('package.featureLabels.customDomain')">
          <ElSwitch v-model="formData.customDomain" />
        </ElFormItem>
        <ElFormItem :label="$t('package.featureLabels.whiteLabel')">
          <ElSwitch v-model="formData.whiteLabel" />
        </ElFormItem>
        <ElFormItem :label="$t('package.featureLabels.sla')">
          <ElSwitch v-model="formData.sla" />
        </ElFormItem>
        <ElFormItem :label="$t('package.featureLabels.ipWhitelist')">
          <ElSwitch v-model="formData.ipWhitelist" />
        </ElFormItem>
        <ElFormItem :label="$t('package.featureLabels.autoRenew')">
          <ElSwitch v-model="formData.autoRenew" />
        </ElFormItem>
        <ElFormItem :label="$t('package.featureLabels.logRetention')">
          <ElInputNumber v-model="formData.logRetention" :min="1" :max="365" style="width: 100%" />
        </ElFormItem>
        <ElFormItem :label="$t('package.featureLabels.supportLevel')">
          <ElSelect v-model="formData.supportLevel">
            <ElOption label="Community" value="community" />
            <ElOption label="Email" value="email" />
            <ElOption label="Priority" value="priority" />
            <ElOption label="Dedicated" value="dedicated" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ $t('common.confirm') }}
        </ElButton>
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

  // Feature definitions with categories
  const ALL_FEATURES = [
    { key: 'dailyApiLimit', category: 'api', handler: (pkg: any) => true },
    { key: 'maxApplications', category: 'api', handler: (pkg: any) => true },
    { key: 'supportLevel', category: 'support', handler: (pkg: any) => true },
    { key: 'webhook', category: 'advanced', handler: (pkg: any) => !!pkg.webhook },
    { key: 'customDomain', category: 'advanced', handler: (pkg: any) => !!pkg.customDomain },
    { key: 'whiteLabel', category: 'advanced', handler: (pkg: any) => !!pkg.whiteLabel },
    { key: 'sla', category: 'advanced', handler: (pkg: any) => !!pkg.sla },
    { key: 'ipWhitelist', category: 'security', handler: (pkg: any) => !!pkg.ipWhitelist },
    { key: 'logRetention', category: 'data', handler: (pkg: any) => true },
    { key: 'autoRenew', category: 'billing', handler: (pkg: any) => !!pkg.autoRenew },
  ]

  const featureCategories = computed(() => {
    const categoryOrder = ['api', 'support', 'advanced', 'security', 'data', 'billing']
    const grouped: Record<string, typeof ALL_FEATURES> = {}
    for (const f of ALL_FEATURES) {
      if (!grouped[f.category]) grouped[f.category] = []
      grouped[f.category].push(f)
    }
    return categoryOrder
      .filter((c) => grouped[c])
      .map((c) => ({ key: c, features: grouped[c] }))
  })

  function formatNumber(n: number): string {
    if (!n) return '0'
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
    return String(n)
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

  // Active packages state
  const activePackages = ref<any[]>([])

  const sortedPackages = computed(() => {
    const order: Record<string, number> = { TRIAL: 0, BASIC: 1, PROFESSIONAL: 2, ENTERPRISE: 3 }
    return [...activePackages.value].sort(
      (a, b) => (order[a.packageCode] ?? 99) - (order[b.packageCode] ?? 99)
    )
  })

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
    { type: 'index' as const, width: 60, label: '#' },
    { prop: 'packageCode', label: 'Package Type', minWidth: 120 },
    { prop: 'name', label: 'Name', minWidth: 150 },
    { prop: 'monthlyPrice', label: 'Monthly', width: 100, formatter: (row: any) => `$${row.monthlyPrice || 0}` },
    { prop: 'yearlyPrice', label: 'Yearly', width: 100, formatter: (row: any) => (row.yearlyPrice ? `$${row.yearlyPrice}` : '-') },
    { prop: 'dailyApiLimit', label: 'API Limit', width: 100 },
    { prop: 'maxApplications', label: 'Apps', width: 80 },
    { prop: 'version', label: 'Ver', width: 60, formatter: (row: any) => `v${row.version || 1}` },
    { prop: 'createdAt', label: 'Created', width: 170, formatter: (row: any) => {
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
    webhook: false,
    customDomain: false,
    whiteLabel: false,
    sla: false,
    ipWhitelist: false,
    autoRenew: false,
    logRetention: 30,
    supportLevel: 'community',
  }

  const formData = reactive({ ...initialFormData })

  const formRules: FormRules = {
    packageCode: [{ required: true, message: 'Please select a package type', trigger: 'change' }],
    name: [{ required: true, message: 'Please enter a name', trigger: 'blur' }],
    monthlyPrice: [{ required: true, message: 'Please enter a monthly price', trigger: 'blur' }],
    dailyApiLimit: [{ required: true, message: 'Please enter daily API limit', trigger: 'blur' }],
    maxApplications: [{ required: true, message: 'Please enter max applications', trigger: 'blur' }]
  }

  const dialogTitle = computed(() =>
    editingPackage.value ? 'Edit Package (new version)' : 'Add Package'
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
      webhook: pkg.webhook || false,
      customDomain: pkg.customDomain || false,
      whiteLabel: pkg.whiteLabel || false,
      sla: pkg.sla || false,
      ipWhitelist: pkg.ipWhitelist || false,
      autoRenew: pkg.autoRenew || false,
      logRetention: pkg.logRetention || 30,
      supportLevel: pkg.supportLevel || 'community',
    })
    dialogVisible.value = true
  }

  async function handleSubmit() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (!valid) return
      submitLoading.value = true
      try {
        const payload = {
          packageCode: formData.packageCode,
          name: formData.name,
          description: formData.description || undefined,
          monthlyPrice: formData.monthlyPrice,
          yearlyPrice: formData.yearlyPrice,
          yearlyDiscount: formData.yearlyDiscount,
          dailyApiLimit: formData.dailyApiLimit,
          maxApplications: formData.maxApplications,
          isTrial: formData.isTrial,
          webhook: formData.webhook,
          customDomain: formData.customDomain,
          whiteLabel: formData.whiteLabel,
          sla: formData.sla,
          ipWhitelist: formData.ipWhitelist,
          autoRenew: formData.autoRenew,
          logRetention: formData.logRetention,
          supportLevel: formData.supportLevel,
        }

        await fetchCreatePackage(payload as any)
        ElMessage.success(editingPackage.value ? 'New version created, old version deactivated' : 'Package created')
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
  .subscription-plans-page {
    height: 100%;
    overflow-y: auto;
  }

  .package-card-row {
    display: flex;
    flex-wrap: wrap;
  }

  .package-card-row > .el-col {
    display: flex;
  }

  .package-card {
    width: 100%;
    margin-bottom: 20px;
    border-radius: 8px;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
  }

  .package-card :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
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
  }

  .price-section {
    text-align: center;
    padding: 8px 0;
  }

  .features-section {
    flex: 1;
  }

  .feature-category {
    margin-bottom: 10px;
  }

  .feature-category-title {
    font-size: 11px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    margin-bottom: 4px;
    padding-bottom: 2px;
    border-bottom: 1px solid #ebeef5;
  }

  .feature-item {
    display: flex;
    align-items: center;
    font-size: 13px;
    padding: 2px 0;
    line-height: 1.4;
  }

  .feature-check {
    width: 16px;
    font-size: 12px;
    flex-shrink: 0;
  }

  .feature-yes {
    color: #67c23a;
  }

  .feature-no {
    color: #c0c4cc;
  }

  .feature-label {
    margin-left: 6px;
    color: #606266;
    flex: 1;
  }

  .feature-value {
    color: #909399;
    font-size: 12px;
    margin-left: 4px;
    flex-shrink: 0;
  }

  .history-section {
    min-height: 300px;
  }
</style>