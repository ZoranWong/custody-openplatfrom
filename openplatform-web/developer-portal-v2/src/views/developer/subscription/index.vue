<template>
  <div class="subscription-page" style="padding: 24px; overflow-y: auto; height: 100%">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">{{ $t('menus.developer.subscription') }}</h2>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <ElIcon class="is-loading text-3xl text-gray-400"><Loading /></ElIcon>
    </div>

    <template v-else>
      <!-- Current Subscription -->
      <template v-if="subscription">
        <ElRow :gutter="20" class="mb-6">
          <ElCol :span="6">
            <ArtStatsCard
              class="mb-5"
              icon="ri:vip-crown-line"
              icon-style="bg-purple-500"
              :title="$t('developer.subscription.currentPlan')"
              :description="subscription.package?.name || '-'"
              :show-arrow="false"
            />
          </ElCol>
          <ElCol :span="6">
            <ArtStatsCard
              class="mb-5"
              icon="ri:calendar-check-line"
              icon-style="bg-blue-500"
              :title="$t('developer.subscription.startDate')"
              :description="formatDate(subscription.startDate, undefined, locale.value)"
              :show-arrow="false"
            />
          </ElCol>
          <ElCol :span="6">
            <ArtStatsCard
              class="mb-5"
              icon="ri:calendar-event-line"
              icon-style="bg-orange-500"
              :title="$t('developer.subscription.endDate')"
              :description="formatDate(subscription.endDate, undefined, locale.value)"
              :show-arrow="false"
            />
          </ElCol>
          <ElCol :span="6">
            <ArtStatsCard
              class="mb-5"
              icon="ri:refresh-line"
              icon-style="bg-green-500"
              :title="$t('developer.subscription.billingCycle')"
              :description="billingCycleLabel"
              :show-arrow="false"
            />
          </ElCol>
        </ElRow>
      </template>

      <ElCard v-else class="mb-6">
        <ElEmpty :description="$t('developer.subscription.noSubscription')" />
      </ElCard>

      <!-- Available Packages -->
      <div class="mt-8">
        <h3 class="text-lg font-semibold mb-4">{{
          $t('developer.subscription.availablePlans')
        }}</h3>
        <ElRow :gutter="20">
          <ElCol v-for="pkg in sortedPackages" :key="pkg.id" :sm="24" :md="12" :lg="6" class="mb-5">
            <ElCard
              class="package-card h-full"
              :class="[packageTypeClass(pkg.packageCode), { locked: isPackageLocked(pkg) }]"
              shadow="hover"
            >
              <template #header>
                <div class="flex justify-between items-center">
                  <span class="font-bold">{{
                    $t('package.packageTypeLabels.' + pkg.packageCode)
                  }}</span>
                  <ElTag :type="packageTagType(pkg.packageCode)" size="small">
                    {{ $t('package.packageTypeLabels.' + pkg.packageCode) }}
                  </ElTag>
                </div>
              </template>

              <!-- Price -->
              <div class="mb-4">
                <template v-if="pkg.isTrial">
                  <div class="text-3xl font-bold text-green-500">{{ $t('package.free') }}</div>
                  <div class="text-sm text-gray-400">{{ $t('package.perMonth') }}</div>
                  <div class="text-xs text-gray-400 mt-1">{{ $t('package.trialDays') }}</div>
                </template>
                <template v-else>
                  <div class="text-3xl font-bold">${{ pkg.monthlyPrice }}</div>
                  <div class="text-sm text-gray-400">{{ $t('package.perMonth') }}</div>
                  <div
                    v-if="pkg.yearlyPrice && Number(pkg.yearlyPrice) > 0"
                    class="text-xs text-gray-400 mt-1"
                  >
                    {{ $t('package.yearly') }}: ${{ pkg.yearlyPrice }}
                  </div>
                </template>
              </div>

              <ElDivider />

              <!-- Features -->
              <div class="features-section">
                <div
                  v-for="category in featureCategories"
                  :key="category.key"
                  class="feature-category"
                >
                  <div class="feature-category-title">{{
                    $t(`package.featuresCategory.${category.key}`)
                  }}</div>
                  <div v-for="feature in category.features" :key="feature.key" class="feature-item">
                    <span v-if="feature.handler(pkg)" class="feature-check feature-yes"
                      >&#10003;</span
                    >
                    <span v-else class="feature-check feature-no">&#10007;</span>
                    <span class="feature-label">{{
                      $t(`package.featureLabels.${feature.key}`)
                    }}</span>
                    <span v-if="feature.key === 'dailyApiLimit'" class="feature-value">{{
                      formatNumber(pkg.dailyApiLimit)
                    }}</span>
                    <span v-else-if="feature.key === 'maxApplications'" class="feature-value">{{
                      pkg.maxApplications
                    }}</span>
                    <span v-else-if="feature.key === 'logRetention'" class="feature-value"
                      >{{ pkg.logRetention }}d</span
                    >
                    <span v-else-if="feature.key === 'supportLevel'" class="feature-value">{{
                      $t(`package.supportLevelLabels.${pkg.supportLevel || 'community'}`)
                    }}</span>
                  </div>
                </div>
              </div>

              <div class="mt-4">
                <ElButton v-if="isCurrentPackage(pkg)" type="success" class="w-full" disabled
                  >当前套餐</ElButton
                >
                <ElButton v-else-if="isPackageLocked(pkg)" type="info" class="w-full" disabled plain
                  >已锁定</ElButton
                >
                <ElButton
                  v-else-if="!subscription && pkg.isTrial"
                  type="success"
                  class="w-full"
                  @click="handleTrial(pkg)"
                >
                  {{ $t('developer.subscription.trial') }}
                </ElButton>
                <ElButton v-else type="primary" class="w-full" @click="handlePurchase(pkg)">
                  {{ getButtonLabel(pkg) }}
                </ElButton>
              </div>
            </ElCard>
          </ElCol>
        </ElRow>
      </div>
    </template>

    <!-- Purchase Dialog -->
    <ElDialog
      v-model="purchaseDialogVisible"
      :title="$t('developer.subscription.purchase')"
      width="560px"
      :close-on-click-modal="false"
      @close="resetPurchase"
    >
      <ElForm :model="purchaseForm" label-width="160px">
        <ElFormItem :label="$t('package.packageCode')">
          <ElInput
            :model-value="$t('package.packageTypeLabels.' + purchaseTarget?.packageCode)"
            disabled
          />
        </ElFormItem>
        <ElFormItem :label="$t('developer.paymentHistory.totalAmount')">
          <ElInput
            :model-value="
              purchaseForm.period === 'yearly'
                ? '$' + (purchaseTarget?.yearlyPrice || purchaseTarget?.monthlyPrice)
                : '$' + (purchaseTarget?.monthlyPrice || 0)
            "
            disabled
          />
        </ElFormItem>
        <ElFormItem :label="$t('developer.subscription.billingCycle')" required>
          <ElRadioGroup v-model="purchaseForm.period">
            <ElRadio value="monthly">{{ $t('developer.subscription.monthly') }}</ElRadio>
            <ElRadio value="yearly" v-if="purchaseTarget?.yearlyPrice">{{
              $t('developer.subscription.yearly')
            }}</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem :label="$t('developer.billing.payment.paymentMethod')" required>
          <ElSelect v-model="purchaseForm.paymentMethod">
            <ElOption :label="$t('developer.billing.payment.bankTransfer')" value="bank_transfer" />
            <ElOption :label="$t('developer.billing.payment.web3')" value="web3" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="purchaseDialogVisible = false">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="purchasing" @click="confirmPurchase">
          {{ $t('developer.subscription.submitOrder') }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'DeveloperSubscription' })

  import { useI18n } from 'vue-i18n'
  import { ElMessage } from 'element-plus'
  import { Loading } from '@element-plus/icons-vue'
  import { fetchCurrentSubscription, fetchAvailablePackages, fetchCreateOrder } from '@/api/billing'
  import { formatDate } from '@/utils/date'

  const { t, locale } = useI18n()
  const router = useRouter()
  const loading = ref(true)
  const subscription = ref<any>(null)
  const packages = ref<any[]>([])
  const purchaseDialogVisible = ref(false)
  const purchaseTarget = ref<any>(null)
  const purchasing = ref(false)

  const purchaseForm = reactive({
    period: 'monthly',
    paymentMethod: 'bank_transfer'
  })

  const PACKAGE_ORDER: Record<string, number> = {
    TRIAL: 0,
    BASIC: 1,
    PROFESSIONAL: 2,
    ENTERPRISE: 3
  }

  const sortedPackages = computed(() =>
    [...packages.value].sort(
      (a, b) => (PACKAGE_ORDER[a.packageCode] ?? 99) - (PACKAGE_ORDER[b.packageCode] ?? 99)
    )
  )

  const currentPackageCode = computed(() => subscription.value?.package?.packageCode || '')

  const billingCycleLabel = computed(() => {
    if (!subscription.value) return '-'
    switch (subscription.value.billingCycle) {
      case 'trial':
        return t('developer.subscription.trial')
      case 'yearly':
        return t('developer.subscription.yearly')
      default:
        return t('developer.subscription.monthly')
    }
  })

  function isCurrentPackage(pkg: any) {
    return subscription.value?.packageId === pkg.id
  }

  function isPackageLocked(pkg: any) {
    if (!subscription.value) return false
    // 试用版不可续费，体验后只能升级
    if (currentPackageCode.value === 'TRIAL' && pkg.packageCode === 'TRIAL') return true
    const current = PACKAGE_ORDER[currentPackageCode.value] ?? 99
    const target = PACKAGE_ORDER[pkg.packageCode] ?? 99
    return target < current
  }

  function getButtonLabel(pkg: any) {
    if (!subscription.value) return t('developer.subscription.purchase')
    // 试用版中，其他套餐都是升级
    if (currentPackageCode.value === 'TRIAL') return t('developer.subscription.upgrade')
    const current = PACKAGE_ORDER[currentPackageCode.value] ?? 99
    const target = PACKAGE_ORDER[pkg.packageCode] ?? 99
    if (target > current) return t('developer.subscription.upgrade')
    return t('developer.subscription.renew')
  }

  const ALL_FEATURES = [
    { key: 'dailyApiLimit', category: 'api', handler: (_pkg: any) => true },
    { key: 'maxApplications', category: 'api', handler: (_pkg: any) => true },
    { key: 'supportLevel', category: 'support', handler: (_pkg: any) => true },
    { key: 'webhook', category: 'advanced', handler: (pkg: any) => !!pkg.webhook },
    { key: 'customDomain', category: 'advanced', handler: (pkg: any) => !!pkg.customDomain },
    { key: 'whiteLabel', category: 'advanced', handler: (pkg: any) => !!pkg.whiteLabel },
    { key: 'sla', category: 'advanced', handler: (pkg: any) => !!pkg.sla },
    { key: 'ipWhitelist', category: 'security', handler: (pkg: any) => !!pkg.ipWhitelist },
    { key: 'logRetention', category: 'data', handler: (_pkg: any) => true },
    { key: 'autoRenew', category: 'billing', handler: (pkg: any) => !!pkg.autoRenew }
  ]

  const featureCategories = computed(() => {
    const categoryOrder = ['api', 'support', 'advanced', 'security', 'data', 'billing']
    const grouped: Record<string, typeof ALL_FEATURES> = {}
    for (const f of ALL_FEATURES) {
      if (!grouped[f.category]) grouped[f.category] = []
      grouped[f.category].push(f)
    }
    return categoryOrder.filter((c) => grouped[c]).map((c) => ({ key: c, features: grouped[c] }))
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

  const handleTrial = async (pkg: any) => {
    try {
      // TODO: call API to activate trial
      await new Promise((r) => setTimeout(r, 300))
      ElMessage.success(t('developer.subscription.trialActivated'))
      loading.value = true
      subscription.value = await fetchCurrentSubscription()
      loading.value = false
    } catch (e: any) {
      ElMessage.error(e?.message || 'Failed')
    }
  }

  const handlePurchase = (pkg: any) => {
    purchaseTarget.value = pkg
    purchaseForm.period = 'monthly'
    purchaseForm.paymentMethod = 'bank_transfer'
    purchaseDialogVisible.value = true
  }

  const resetPurchase = () => {
    purchaseTarget.value = null
  }

  const confirmPurchase = async () => {
    if (!purchaseTarget.value) return
    purchasing.value = true
    try {
      const res = await fetchCreateOrder({
        packageId: purchaseTarget.value.id,
        period: purchaseForm.period,
        paymentMethod: purchaseForm.paymentMethod
      })
      purchaseDialogVisible.value = false
      ElMessage.success(t('developer.subscription.orderCreated'))
      router.push({
        name: 'DeveloperPaymentHistory',
        query: { openSubmit: '1', paymentId: res.id }
      })
    } catch (e: any) {
      ElMessage.error(e?.message || 'Failed')
    } finally {
      purchasing.value = false
    }
  }

  onMounted(async () => {
    try {
      const [sub, pkgs] = await Promise.all([fetchCurrentSubscription(), fetchAvailablePackages()])
      subscription.value = sub
      packages.value = pkgs || []
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped>
  .package-card {
    transition: transform 0.2s;
    width: 100%;
  }
  .package-card:hover {
    transform: translateY(-2px);
  }
  .package-card.locked {
    opacity: 0.5;
  }
  .package-card.locked:hover {
    transform: none;
  }

  .features-section {
    font-size: 13px;
  }
  .feature-category {
    margin-bottom: 12px;
  }
  .feature-category-title {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  .feature-item {
    display: flex;
    align-items: center;
    padding: 3px 0;
  }
  .feature-check {
    width: 16px;
    margin-right: 8px;
    font-weight: bold;
  }
  .feature-yes {
    color: var(--el-color-success);
  }
  .feature-no {
    color: var(--el-text-color-placeholder);
  }
  .feature-label {
    flex: 1;
    color: var(--el-text-color-regular);
  }
  .feature-value {
    color: var(--el-text-color-secondary);
    margin-left: 4px;
  }
</style>
