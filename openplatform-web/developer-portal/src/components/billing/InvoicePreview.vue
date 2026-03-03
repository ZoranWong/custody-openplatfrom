<script setup lang="ts">
import { computed } from 'vue'
import { Document, Printer, Close } from '@element-plus/icons-vue'
import type { InvoiceData } from '@/services/api'

interface Props {
  modelValue?: boolean
  invoice?: InvoiceData | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  invoice: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'download'): void
}>()

const visible = computed({
  get: (): boolean => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string
 */
const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

/**
 * Format a date string for display
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const handleClose = (): void => {
  visible.value = false
  emit('close')
}

const handleDownload = (): void => {
  emit('download')
}

const handlePrint = (): void => {
  window.print()
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="发票预览"
    width="800px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="invoice-preview" id="invoice-content">
      <!-- Invoice Header -->
      <div class="invoice-header mb-8">
        <h2 class="text-2xl font-bold text-gray-900">INVOICE</h2>
        <p class="text-gray-500">{{ invoice?.invoice_id }}</p>
      </div>

      <!-- Invoice Date -->
      <div class="flex justify-between mb-8">
        <div>
          <p class="text-sm text-gray-500 mb-1">发票日期</p>
          <p class="font-medium">{{ invoice ? formatDate(invoice.created_at) : '-' }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">账单周期</p>
          <p class="font-medium">
            {{ invoice?.billing_period.start }} ~ {{ invoice?.billing_period.end }}
          </p>
        </div>
      </div>

      <!-- Company Info -->
      <div class="company-info mb-8">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">开票信息</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">公司名称</p>
            <p class="font-medium">{{ invoice?.company_info.name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">纳税人识别号</p>
            <p class="font-medium">{{ invoice?.company_info.tax_id }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-sm text-gray-500">公司地址</p>
            <p class="font-medium">{{ invoice?.company_info.address }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">联系邮箱</p>
            <p class="font-medium">{{ invoice?.company_info.email }}</p>
          </div>
        </div>
      </div>

      <!-- Usage Breakdown -->
      <div class="usage-breakdown mb-8">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">费用明细</h3>
        <el-table :data="invoice?.usage_breakdown" style="width: 100%" border>
          <el-table-column prop="item" label="项目" min-width="150" />
          <el-table-column prop="quantity" label="数量" width="100" align="right" />
          <el-table-column prop="unit_price" label="单价" width="120" align="right">
            <template #default="{ row }">
              {{ formatCurrency(row.unit_price, row.currency) }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="140" align="right">
            <template #default="{ row }">
              {{ formatCurrency(row.amount, row.currency) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Totals -->
      <div class="totals-section">
        <div class="flex justify-end">
          <div class="w-64">
            <div class="flex justify-between py-2">
              <span class="text-gray-600">小计</span>
              <span class="font-medium">{{ formatCurrency(invoice?.subtotal || 0, invoice?.currency) }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-gray-600">税率 ({{ invoice?.tax_rate }}%)</span>
              <span class="font-medium">{{ formatCurrency(invoice?.tax_amount || 0, invoice?.currency) }}</span>
            </div>
            <div class="flex justify-between py-3 border-t border-gray-200 mt-2">
              <span class="text-lg font-bold text-gray-900">合计</span>
              <span class="text-lg font-bold text-brand">
                {{ formatCurrency(invoice?.total_amount || 0, invoice?.currency) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <el-button @click="handleClose" :icon="Close">关闭</el-button>
        <div class="flex gap-3">
          <el-button :icon="Printer" @click="handlePrint">打印</el-button>
          <el-button type="primary" :icon="Document" @click="handleDownload">下载 PDF</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.invoice-preview {
  padding: 24px;
  background: white;
}

.invoice-header {
  border-bottom: 2px solid var(--color-brand, #00BE78);
  padding-bottom: 16px;
}

.company-info,
.usage-breakdown {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.totals-section {
  margin-top: 24px;
}

@media print {
  .invoice-preview {
    padding: 0;
  }

  :deep(.el-dialog__footer) {
    display: none;
  }
}
</style>
