<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Document,
  Download,
  Refresh
} from '@element-plus/icons-vue'
import apiService, {
  type PaymentStatusFilter,
  type PaymentHistoryItem
} from '@/services/api'
import PaymentStatusBadge from '@/components/billing/PaymentStatusBadge.vue'
import PaymentFilters from '@/components/billing/PaymentFilters.vue'
import PaymentSummaryCard from '@/components/billing/PaymentSummaryCard.vue'
import Button from '@/components/common/Button.vue'

// Debounce helper
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const clearDebounceTimer = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

onUnmounted(() => {
  clearDebounceTimer()
})

const router = useRouter()

// State
const loading = ref(false)
const refreshing = ref(false)
const downloading = ref<string | null>(null)
const error = ref<string | null>(null)
const payments = ref<PaymentHistoryItem[]>([])
const selectedStatus = ref<PaymentStatusFilter>('all')
const dateRange = ref<[Date, Date] | null>(null)
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})
const summary = ref({
  total_amount: 0,
  currency: 'USD'
})

// Navigation items for breadcrumb
const navItems = [
  { name: 'Home', path: '/applications' },
  { name: 'Payment History', path: '/payment-history', active: true }
]

// Constants
const DEFAULT_CURRENCY = 'USD'
const ALLOWED_CURRENCIES = ['USD', 'CNY', 'EUR', 'GBP', 'JPY']

// Date validation: ensure date string is valid
const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) {
    return '-'
  }
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Currency validation: ensure valid currency code
const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    amount = 0
  }
  const validCurrency = ALLOWED_CURRENCIES.includes(currency) ? currency : DEFAULT_CURRENCY
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: validCurrency
  }).format(amount)
}

const hasData = computed(() => payments.value.length > 0)
const hasError = computed(() => error.value !== null)

const errorAlertType = computed((): 'warning' | 'error' => {
  if (error.value?.includes('login') || error.value?.includes('expired')) {
    return 'warning'
  }
  return 'error'
})

const getFilters = () => {
  const filters: Record<string, any> = {
    page: pagination.value.page,
    pageSize: pagination.value.pageSize
  }

  if (selectedStatus.value !== 'all') {
    filters.status = selectedStatus.value
  }

  if (dateRange.value && dateRange.value.length === 2) {
    filters.startDate = dateRange.value[0].toISOString().split('T')[0]
    filters.endDate = dateRange.value[1].toISOString().split('T')[0]
  }

  return filters
}

const fetchPayments = async (showRefreshing = false) => {
  if (showRefreshing) {
    refreshing.value = true
  } else {
    loading.value = true
  }
  error.value = null

  try {
    const response = await apiService.getPaymentHistory(getFilters())
    payments.value = response.list
    pagination.value.total = response.total
    summary.value = {
      total_amount: response.total_amount,
      currency: response.currency
    }
  } catch (e: any) {
    const code = e.response?.data?.code
    const status = e.response?.status
    const message = e.response?.data?.message || 'Network error, please try again later'

    if (status === 401 || code === 401) {
      error.value = 'Login status expired, please login again'
      ElMessage.error('Please login first')
      router.push('/login')
    } else {
      error.value = message
      ElMessage.error('Failed to get payment records')
    }
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const handleStatusChange = (data: { status: PaymentStatusFilter; dateRange?: [Date, Date] | null }) => {
  selectedStatus.value = data.status
  if (data.dateRange) {
    dateRange.value = data.dateRange as [Date, Date]
  } else {
    dateRange.value = null
  }
  pagination.value.page = 1

  // Debounce API calls (300ms)
  clearDebounceTimer()
  debounceTimer = setTimeout(() => {
    fetchPayments()
  }, 300)
}

const handleDateChange = (data: { status: PaymentStatusFilter; dateRange?: [Date, Date] | null }) => {
  handleStatusChange(data)
}

const handleRefresh = () => {
  fetchPayments(true)
}

const handleRetry = () => {
  error.value = null
  fetchPayments()
}

const handlePageChange = (page: number) => {
  pagination.value.page = page
  fetchPayments()
}

const handlePageSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
  fetchPayments()
}

const handleDownloadInvoice = async (payment: PaymentHistoryItem) => {
  let url: string | null = null
  downloading.value = payment.id

  try {
    const blob = await apiService.downloadPaymentInvoice(payment.id)

    // Validate Blob type
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('Invalid file received')
    }

    // Validate content type (PDF or fallback)
    const validTypes = ['application/pdf', 'application/octet-stream']
    if (blob.type && !validTypes.includes(blob.type)) {
      console.warn(`Unexpected content type: ${blob.type}, attempting download anyway`)
    }

    url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `invoice-${payment.id}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('Invoice downloaded successfully')
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Invoice download failed, please try again later'
    ElMessage.error(errorMessage)
  } finally {
    downloading.value = null
    if (url) {
      window.URL.revokeObjectURL(url)
    }
  }
}

const navigateTo = (path: string) => {
  router.push(path)
}

onMounted(() => {
  fetchPayments()
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
                <Document />
              </el-icon>
              <button
                v-if="item.active"
                class="text-gray-900 font-medium hover:text-brand"
                :disabled="item.active"
              >
                <Document class="w-4 h-4 inline mr-1" />
                {{ item.name }}
              </button>
              <button
                v-else
                @click="navigateTo(item.path)"
                class="text-gray-500 hover:text-brand"
              >
                <Document class="w-4 h-4 inline mr-1" />
                {{ item.name }}
              </button>
            </div>
          </li>
        </ol>
      </nav>

      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Payment History</h1>
          <p class="mt-2 text-gray-600">View your account payment records</p>
        </div>
        <Button @click="handleRefresh" :loading="refreshing" type="info">
          <el-icon class="mr-1"><Refresh /></el-icon>
          Refresh
        </Button>
      </div>

      <!-- Error State -->
      <div v-if="hasError" class="mb-6" role="alert">
        <el-alert
          :type="errorAlertType"
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
      <div v-if="loading" class="space-y-6" aria-busy="true" aria-label="Loading">
        <!-- Summary Card Skeleton -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="card p-6">
            <div class="animate-pulse">
              <div class="h-4 w-24 bg-gray-200 rounded mb-4"></div>
              <div class="h-8 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        <!-- Filters Skeleton -->
        <div class="card p-6">
          <div class="animate-pulse">
            <div class="h-6 w-32 bg-gray-200 rounded mb-4"></div>
            <div class="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>

        <!-- Table Skeleton -->
        <div class="card p-6">
          <div class="animate-pulse">
            <div class="h-6 w-32 bg-gray-200 rounded mb-4"></div>
            <div v-for="i in 5" :key="i" class="h-12 bg-gray-100 rounded mb-2"></div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <template v-else>
        <!-- Summary Card - Payment Summary -->
        <div class="card p-6 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="summary-item">
              <p class="summary-label">Total Payment Amount</p>
              <p class="summary-value text-green-600">
                {{ formatCurrency(summary.total_amount, summary.currency) }}
              </p>
            </div>
            <div class="summary-item">
              <p class="summary-label">Payment Count</p>
              <p class="summary-value">{{ pagination.total }}</p>
            </div>
            <div class="summary-item">
              <p class="summary-label">Currency</p>
              <p class="summary-value">{{ summary.currency }}</p>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="card p-6 mb-6">
          <PaymentFilters
            v-model="selectedStatus"
            :date-range="dateRange"
            @change="handleDateChange"
          />
        </div>

        <!-- Payment List -->
        <div v-if="hasData" class="card p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Payment Records</h3>

          <el-table
            :data="payments"
            style="width: 100%"
            stripe
            role="table"
            aria-label="Payment Records"
          >
            <el-table-column prop="id" label="Payment ID" min-width="180">
              <template #default="{ row }">
                <code class="text-sm text-gray-700">{{ row.id }}</code>
              </template>
            </el-table-column>

            <el-table-column prop="date" label="Payment Time" width="180">
              <template #default="{ row }">
                {{ formatDate(row.date) }}
              </template>
            </el-table-column>

            <el-table-column prop="amount" label="Payment Amount" width="140" align="right">
              <template #default="{ row }">
                <span class="font-medium text-green-600">{{ formatCurrency(row.amount, row.currency) }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="balance_after" label="Balance After" width="140" align="right">
              <template #default="{ row }">
                <span class="font-medium">{{ formatCurrency(row.balance_after || 0, row.currency) }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="payment_method" label="Payment Method" width="120">
              <template #default="{ row }">
                <el-tag size="small">{{ row.payment_method || 'Bank Transfer' }}</el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="status" label="Status" width="100" align="center">
              <template #default="{ row }">
                <PaymentStatusBadge :status="row.status" />
              </template>
            </el-table-column>

            <el-table-column prop="description" label="Remarks" min-width="200">
              <template #default="{ row }">
                <span class="text-gray-600">{{ row.description || 'Account Recharge' }}</span>
              </template>
            </el-table-column>

            <el-table-column label="Invoice" width="100" align="center">
              <template #default="{ row }">
                <Button
                  v-if="row.invoice_id"
                  type="primary"
                  link
                  size="small"
                  :loading="downloading === row.id"
                  @click="handleDownloadInvoice(row)"
                >
                  <el-icon class="mr-1"><Download /></el-icon>
                  Download
                </Button>
                <span v-else class="text-gray-400 text-sm">-</span>
              </template>
            </el-table-column>
          </el-table>

          <!-- Pagination -->
          <div class="mt-4 flex justify-end">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="card p-12 text-center" role="status">
          <el-icon class="w-16 h-16 mx-auto text-gray-300 mb-4" aria-hidden="true">
            <Document />
          </el-icon>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Payment Records</h3>
          <p class="text-gray-500">Your payment records will appear here</p>
        </div>
      </template>
    </div>
  </div>
</template>
