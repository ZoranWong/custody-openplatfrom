<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Document,
  Download,
  Refresh
} from '@element-plus/icons-vue'
import apiService, {
  type BillingPeriodType,
  type DateRange,
  type InvoiceData
} from '@/services/api'
import BillingPeriodSelector from '@/components/billing/BillingPeriodSelector.vue'
import InvoicePreview from '@/components/billing/InvoicePreview.vue'
import Button from '@/components/common/Button.vue'

const router = useRouter()

// State
const generating = ref(false)
const error = ref<string | null>(null)
const selectedPeriod = ref<BillingPeriodType>('current_month')
const customDateRange = ref<{ start: string; end: string } | null>(null)
const invoice = ref<InvoiceData | null>(null)
const showPreview = ref(false)

/**
 * Format currency for display
 */
const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

/**
 * Get current date range based on selected period
 */
const getCurrentDateRange = (): DateRange => {
  const now = new Date()
  let start: Date
  let end: Date

  switch (selectedPeriod.value) {
    case 'current_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = now
      break
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'last_3_months':
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      end = now
      break
    case 'custom':
      if (customDateRange.value) {
        start = new Date(customDateRange.value.start)
        end = new Date(customDateRange.value.end)
      } else {
        start = now
        end = now
      }
      break
    default:
      start = now
      end = now
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

/**
 * Handle period selection change
 */
const handlePeriodChange = (data: { period: BillingPeriodType; dateRange?: DateRange }) => {
  selectedPeriod.value = data.period
  if (data.dateRange) {
    customDateRange.value = {
      start: data.dateRange.start,
      end: data.dateRange.end
    }
  } else {
    customDateRange.value = null
  }
  // Clear existing invoice when period changes
  invoice.value = null
}

/**
 * Generate invoice from usage data
 */
const handleGenerateInvoice = async (): Promise<void> => {
  const dateRange = getCurrentDateRange()

  generating.value = true
  error.value = null

  try {
    invoice.value = await apiService.generateInvoice({
      periodStart: dateRange.start,
      periodEnd: dateRange.end
    })
    ElMessage.success('Invoice generated successfully')
  } catch (e: any) {
    const code = e.response?.data?.code
    const status = e.response?.status
    const message = e.response?.data?.message || 'Generation failed, please try again later'

    if (status === 401 || code === 401) {
      error.value = 'Login session has expired, please login again'
      ElMessage.error('Please login first')
      router.push({ name: 'login' })
    } else if (code === 'NO_USAGE_DATA') {
      error.value = 'No usage data available for the selected period'
      ElMessage.warning('No usage data available for the selected period')
    } else {
      error.value = message
      ElMessage.error(message)
    }
    invoice.value = null
  } finally {
    generating.value = false
  }
}

/**
 * Download generated invoice as PDF
 */
const handleDownloadPDF = async (): Promise<void> => {
  if (!invoice.value?.invoiceId) return

  try {
    const blob = await apiService.downloadInvoicePDF(invoice.value.invoiceId)

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoice.value.invoiceId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('Invoice downloaded successfully')
  } catch (e: any) {
    ElMessage.error('Download failed, please try again later')
  }
}

/**
 * Handle retry after error
 */
const handleRetry = (): void => {
  error.value = null
  handleGenerateInvoice()
}

/**
 * Preview invoice
 */
const handlePreview = (): void => {
  showPreview.value = true
}

/**
 * Close invoice preview
 */
const handleClosePreview = (): void => {
  showPreview.value = false
}

/**
 * Navigate to path
 */
const navigateTo = (path: string): void => {
  router.push(path)
}

onMounted(() => {
  // Optionally auto-generate invoice on mount
  // handleGenerateInvoice()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="w-full mx-auto px-8">
      <!-- Breadcrumb Navigation -->
      <nav class="mb-6" aria-label="Breadcrumb">
        <ol class="flex items-center space-x-2 text-sm">
          <li>
            <button @click="navigateTo('/applications')" class="text-gray-500 hover:text-brand">
              Home
            </button>
          </li>
          <li class="text-gray-400">/</li>
          <li>
            <button @click="navigateTo('/billing')" class="text-gray-500 hover:text-brand">
              Billing
            </button>
          </li>
          <li class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium">Invoice Generation</li>
        </ol>
      </nav>

      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Invoice Generation</h1>
          <p class="mt-2 text-gray-600">Generate and download invoices based on usage</p>
        </div>
        <div class="flex gap-3">
          <Button @click="handleGenerateInvoice" :loading="generating" type="primary">
            <el-icon class="mr-1"><Document /></el-icon>
            Generate Invoice
          </Button>
        </div>
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
      <div v-if="generating" class="card p-12 text-center" role="status" aria-busy="true">
        <el-icon class="w-12 h-12 mx-auto text-brand animate-spin mb-4">
          <Refresh />
        </el-icon>
        <p class="text-gray-600">Generating invoice...</p>
      </div>

      <!-- Main Content -->
      <template v-else>
        <!-- Period Selector -->
        <div class="card p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Select Billing Period</h3>
          <BillingPeriodSelector
            v-model="selectedPeriod"
            :custom-date-range="customDateRange"
            @change="handlePeriodChange"
          />
        </div>

        <!-- Invoice Actions -->
        <div class="card p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Invoice Actions</h3>

          <div v-if="invoice" class="space-y-4">
            <!-- Invoice Info -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-500">Invoice Number</span>
                <span class="font-medium">{{ invoice.invoiceId }}</span>
              </div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-500">Billing Period</span>
                <span class="font-medium">
                  {{ invoice.billingPeriod.start }} ~ {{ invoice.billingPeriod.end }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">Invoice Amount</span>
                <span class="text-xl font-bold text-brand">
                  {{ formatCurrency(invoice.totalAmount, invoice.currency) }}
                </span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <Button @click="handlePreview" type="primary">
                <el-icon class="mr-1"><Document /></el-icon>
                Preview Invoice
              </Button>
              <Button @click="handleDownloadPDF">
                <el-icon class="mr-1"><Download /></el-icon>
                Download PDF
              </Button>
            </div>
          </div>

          <!-- Empty State - No Invoice Generated -->
          <div v-else class="text-center py-8">
            <el-icon class="w-16 h-16 mx-auto text-gray-300 mb-4" aria-hidden="true">
              <Document />
            </el-icon>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No Invoice Yet</h3>
            <p class="text-gray-500 mb-4">Please select a billing period and generate an invoice</p>
            <Button type="primary" @click="handleGenerateInvoice">
              Generate Invoice
            </Button>
          </div>
        </div>

        <!-- Invoice Preview Modal -->
        <InvoicePreview
          v-model="showPreview"
          :invoice="invoice"
          @close="handleClosePreview"
          @download="handleDownloadPDF"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
