<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DataLine, Timer, CircleCheck, Refresh, Wallet, OfficeBuilding, Location } from '@element-plus/icons-vue'
import apiService, { type UsageStats, type PeriodType } from '@/services/api'
import Button from '@/components/common/Button.vue'
import UsageTrendChart from '@/components/billing/UsageTrendChart.vue'
import EndpointBreakdown from '@/components/billing/EndpointBreakdown.vue'

const router = useRouter()

const loading = ref(false)
const refreshing = ref(false)
const stats = ref<UsageStats | null>(null)
const error = ref<string | null>(null)
const selectedPeriod = ref<PeriodType>('30days')

const periodOptions = [
  { label: '7 Days', value: '7days' },
  { label: '30 Days', value: '30days' },
  { label: '90 Days', value: '90days' }
] as const

const navItems = [
  { name: 'Home', path: '/applications', icon: OfficeBuilding },
  { name: 'Usage Statistics', path: '/usage-statistics', icon: DataLine, active: true }
]

// Prepaid mode: account balance info
const accountBalance = ref({
  balance: 5000.00,
  currency: 'USD',
  status: 'active' as 'active' | 'insufficient'
})

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

const isBalanceLow = computed(() => {
  return accountBalance.value.balance < 1000
})

const balanceStatusType = computed(() => {
  return isBalanceLow.value ? 'warning' : 'success'
})

const fetchStats = async (showRefreshing = false) => {
  if (showRefreshing) {
    refreshing.value = true
  } else {
    loading.value = true
  }
  error.value = null

  try {
    // Fetch usage statistics data
    stats.value = await apiService.getUsageStats(selectedPeriod.value)

    // Note: Account balance feature is not yet implemented
  } catch (e: any) {
    const code = e.response?.data?.code
    const status = e.response?.status
    const message = e.response?.data?.message || 'Network error, please try again later'

    if (status === 401 || code === 401) {
      error.value = 'Your session has expired, please log in again'
      ElMessage.error('Please log in first')
      router.push('/login')
    } else if (code === 'INSUFFICIENT_BALANCE') {
      error.value = 'Insufficient account balance, please recharge promptly to avoid service interruption'
      ElMessage.warning('Insufficient balance')
    } else {
      error.value = message
      ElMessage.error('Failed to fetch usage statistics')
    }
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const handlePeriodChange = () => {
  fetchStats()
}

const handleRefresh = () => {
  fetchStats(true)
}

const handleRetry = () => {
  error.value = null
  fetchStats()
}

const navigateTo = (path: string) => {
  router.push(path)
}

const navigateToRecharge = () => {
  router.push('/recharge')
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="w-full mx-auto px-8">
      <!-- Breadcrumb Navigation -->
      <nav class="mb-6" aria-label="Breadcrumb navigation">
        <ol class="flex items-center space-x-2 text-sm">
          <li v-for="(item, index) in navItems" :key="item.path">
            <div class="flex items-center">
              <el-icon v-if="index > 0" class="w-4 h-4 text-gray-400 mx-2">
                <component :is="item.icon" />
              </el-icon>
              <button
                v-if="item.active"
                class="text-gray-900 font-medium hover:text-brand"
                :disabled="item.active"
              >
                <component :is="item.icon" class="w-4 h-4 inline mr-1" />
                {{ item.name }}
              </button>
              <button
                v-else
                @click="navigateTo(item.path)"
                class="text-gray-500 hover:text-brand"
              >
                <component :is="item.icon" class="w-4 h-4 inline mr-1" />
                {{ item.name }}
              </button>
            </div>
          </li>
        </ol>
      </nav>

      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Usage Statistics</h1>
          <p class="mt-2 text-gray-600">View your resource usage and account balance</p>
        </div>
        <div class="flex gap-3">
          <Button @click="handleRefresh" :loading="refreshing" type="info">
            <el-icon class="mr-1"><Refresh /></el-icon>
            Refresh
          </Button>
        </div>
      </div>

      <!-- Prepaid mode: account balance warning -->
      <div v-if="isBalanceLow" class="mb-6" role="alert">
        <el-alert
          type="warning"
          title="Insufficient Balance"
          :description="`Current balance: ${formatCurrency(accountBalance.balance, accountBalance.currency)}, please recharge promptly to avoid service interruption`"
          show-icon
          closable
        >
          <template #default>
            <Button type="primary" size="small" @click="navigateToRecharge">
              Recharge Now
            </Button>
          </template>
        </el-alert>
      </div>

      <!-- Error State -->
      <div v-if="error" class="mb-6" role="alert">
        <el-alert
          type="error"
          :title="error"
          show-icon
          closable
          @close="error = null"
        >
          <template #default>
            <p>{{ error }}</p>
            <Button
              type="primary"
              size="small"
              class="mt-2"
              @click="handleRetry"
            >
              Retry
            </Button>
          </template>
        </el-alert>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-6" aria-busy="true" aria-label="Loading statistics">
        <!-- Summary Cards Skeleton -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="card p-6">
            <div class="animate-pulse">
              <div class="h-4 w-24 bg-gray-200 rounded mb-4"></div>
              <div class="h-8 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <!-- Chart Skeleton -->
        <div class="card p-6">
          <div class="animate-pulse">
            <div class="h-6 w-32 bg-gray-200 rounded mb-4"></div>
            <div class="h-80 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <template v-else-if="stats">
        <!-- Period Selector -->
        <div class="mb-6" role="tablist" aria-label="Time period selection">
          <el-radio-group v-model="selectedPeriod" @change="handlePeriodChange">
            <el-radio-button
              v-for="option in periodOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- Prepaid mode: account balance card -->
        <div class="mb-6" role="region" aria-label="Account balance">
          <el-card class="balance-card" :class="{ 'balance-warning': isBalanceLow }">
            <div class="balance-content">
              <div class="balance-info">
                <div class="balance-label">
                  <el-icon><Wallet /></el-icon>
                  <span>Account Balance</span>
                </div>
                <div class="balance-amount">
                  {{ formatCurrency(accountBalance.balance, accountBalance.currency) }}
                </div>
                <div class="balance-status">
                  <el-tag :type="balanceStatusType" size="small">
                    {{ accountBalance.status === 'active' ? 'Sufficient' : 'Insufficient' }}
                  </el-tag>
                </div>
              </div>
              <Button type="primary" @click="navigateToRecharge">
                Recharge Now
              </Button>
            </div>
          </el-card>
        </div>

        <!-- Prepaid dimension: resource usage statistics cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6" role="region" aria-label="Resource usage statistics">
          <!-- Treasury Units -->
          <div class="card p-6" role="group" aria-label="Treasury units count">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-blue-50 rounded-lg" aria-hidden="true">
                <el-icon class="w-6 h-6 text-brand">
                  <OfficeBuilding />
                </el-icon>
              </div>
              <div>
                <p class="text-sm text-gray-500 mb-1">Treasury Units</p>
                <p class="text-3xl font-bold text-gray-900">
                  {{ stats.treasuryUnits || 0 }}
                </p>
                <p class="text-xs text-gray-400 mt-1">units</p>
              </div>
            </div>
          </div>

          <!-- Address Count -->
          <div class="card p-6" role="group" aria-label="Address count">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-purple-50 rounded-lg" aria-hidden="true">
                <el-icon class="w-6 h-6 text-purple-600">
                  <Location />
                </el-icon>
              </div>
              <div>
                <p class="text-sm text-gray-500 mb-1">Addresses</p>
                <p class="text-3xl font-bold text-gray-900">
                  {{ stats.addressCount || 0 }}
                </p>
                <p class="text-xs text-gray-400 mt-1">addresses</p>
              </div>
            </div>
          </div>

          <!-- Total API Calls -->
          <div class="card p-6" role="group" aria-label="Total API calls">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-blue-50 rounded-lg" aria-hidden="true">
                <el-icon class="w-6 h-6 text-brand">
                  <DataLine />
                </el-icon>
              </div>
              <div>
                <p class="text-sm text-gray-500 mb-1">API Calls</p>
                <p class="text-3xl font-bold text-gray-900">
                  {{ stats?.totalCalls ? formatNumber(stats.totalCalls) : '0' }}
                </p>
                <p class="text-xs text-gray-400 mt-1">calls</p>
              </div>
            </div>
          </div>

          <!-- Amount Billed -->
          <div class="card p-6" role="group" aria-label="Amount billed">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-green-50 rounded-lg" aria-hidden="true">
                <el-icon class="w-6 h-6 text-success">
                  <Wallet />
                </el-icon>
              </div>
              <div>
                <p class="text-sm text-gray-500 mb-1">Billed Amount</p>
                <p class="text-3xl font-bold text-gray-900">
                  {{ formatCurrency(stats.billingCost || 0, 'USD') }}
                </p>
                <p class="text-xs text-gray-400 mt-1">Period total</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Trend Chart -->
        <div class="mb-6" role="region" aria-label="API usage trend chart">
          <UsageTrendChart
            :daily-data="stats.dailyBreakdown"
            :loading="loading"
          />
        </div>

        <!-- Endpoint Breakdown -->
        <div role="region" aria-label="Endpoint call distribution">
          <EndpointBreakdown
            :endpoints="stats.endpointBreakdown"
            :loading="loading"
          />
        </div>
      </template>

      <!-- Empty State -->
      <div v-else class="card p-12 text-center" role="status">
        <el-icon class="w-16 h-16 mx-auto text-gray-300 mb-4" aria-hidden="true">
          <DataLine />
        </el-icon>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Usage Data Yet</h3>
        <p class="text-gray-500">Once you start using the API, you'll be able to view your resource usage statistics</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.balance-card.balance-warning {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.balance-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.balance-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.balance-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.9;
}

.balance-amount {
  font-size: 32px;
  font-weight: bold;
}

.balance-status {
  margin-top: 4px;
}

@media (max-width: 768px) {
  .balance-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .balance-amount {
    font-size: 24px;
  }
}
</style>
