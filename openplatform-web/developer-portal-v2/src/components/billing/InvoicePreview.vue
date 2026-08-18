<script setup lang="ts">
import { computed } from 'vue'
import { Document, Printer, Close } from '@element-plus/icons-vue'
import type { InvoiceData } from '@/types/api/billing'
import { useI18n } from 'vue-i18n'
import { formatDate } from '@/utils/date'

interface Props {
  modelValue?: boolean
  invoice?: InvoiceData | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  invoice: null
})

const { t, locale } = useI18n()

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
    :title="t('developer.billing.invoice.title')"
    width="800px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="invoice-preview" id="invoice-content">
      <!-- Invoice Header -->
      <div class="invoice-header mb-8">
        <h2 class="text-2xl font-bold text-gray-900">INVOICE</h2>
        <p class="text-gray-500">{{ invoice?.invoiceId }}</p>
      </div>

      <!-- Invoice Date -->
      <div class="flex justify-between mb-8">
        <div>
          <p class="text-sm text-gray-500 mb-1">{{ t('developer.billing.invoice.date') }}</p>
          <p class="font-medium">{{ invoice ? formatDate(invoice.createdAt, undefined, locale.value) : '-' }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">{{ t('developer.billing.invoice.billingPeriod') }}</p>
          <p class="font-medium">
            {{ invoice?.billingPeriod.start }} ~ {{ invoice?.billingPeriod.end }}
          </p>
        </div>
      </div>

      <!-- Company Info -->
      <div class="company-info mb-8">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">{{ t('developer.billing.invoice.companyInfo') }}</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">{{ t('developer.billing.invoice.companyName') }}</p>
            <p class="font-medium">{{ invoice?.companyInfo.name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">{{ t('developer.billing.invoice.taxId') }}</p>
            <p class="font-medium">{{ invoice?.companyInfo.taxId }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-sm text-gray-500">{{ t('developer.billing.invoice.companyAddress') }}</p>
            <p class="font-medium">{{ invoice?.companyInfo.address }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">{{ t('developer.billing.invoice.contactEmail') }}</p>
            <p class="font-medium">{{ invoice?.companyInfo.email }}</p>
          </div>
        </div>
      </div>

      <!-- Usage Breakdown -->
      <div class="usage-breakdown mb-8">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">{{ t('developer.billing.invoice.costDetails') }}</h3>
        <el-table :data="invoice?.usageBreakdown" style="width: 100%" border>
          <el-table-column prop="item" :label="t('developer.billing.invoice.item')" min-width="150" />
          <el-table-column prop="quantity" :label="t('developer.billing.invoice.quantity')" width="100" align="right" />
          <el-table-column prop="unit_price" :label="t('developer.billing.invoice.unitPrice')" width="120" align="right">
            <template #default="{ row }">
              {{ formatCurrency(row.unit_price, row.currency) }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" :label="t('developer.billing.invoice.amount')" width="140" align="right">
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
              <span class="text-gray-600">{{ t('developer.billing.invoice.subtotal') }}</span>
              <span class="font-medium">{{ formatCurrency(invoice?.subtotal || 0, invoice?.currency) }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-gray-600">{{ t('developer.billing.invoice.taxRate') }} ({{ invoice?.taxRate }}%)</span>
              <span class="font-medium">{{ formatCurrency(invoice?.taxAmount || 0, invoice?.currency) }}</span>
            </div>
            <div class="flex justify-between py-3 border-t border-gray-200 mt-2">
              <span class="text-lg font-bold text-gray-900">{{ t('developer.billing.invoice.total') }}</span>
              <span class="text-lg font-bold text-brand">
                {{ formatCurrency(invoice?.totalAmount || 0, invoice?.currency) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <el-button @click="handleClose" :icon="Close">{{ t('developer.billing.invoice.close') }}</el-button>
        <div class="flex gap-3">
          <el-button :icon="Printer" @click="handlePrint">{{ t('developer.billing.invoice.print') }}</el-button>
          <el-button type="primary" :icon="Document" @click="handleDownload">{{ t('developer.billing.invoice.downloadPdf') }}</el-button>
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