<template>
  <div class="invoice-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <BillingPeriodSelector v-model="period" @change="handlePeriodChange" />
          </ElSpace>
        </template>
        <template #right>
          <ElButton type="primary" @click="handleGenerate">
            <ElIcon><Document /></ElIcon>
            {{ $t('developer.invoiceGeneration.generateBtn') }}
          </ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="(data as Record<string, any>[])"
        :columns="columns"
        :pagination="pagination"
        :empty-text="$t('common.noData')"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <InvoicePreview v-model="showPreview" :invoice="previewInvoice" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'InvoiceGeneration' })

import { useI18n } from 'vue-i18n'
import { useTable } from '@/hooks/core/useTable'
import { fetchInvoiceHistory, fetchGenerateInvoice, fetchDownloadInvoicePDF } from '@/api/billing'
import { ElButton } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import { formatDate } from '@/utils/date'
import BillingPeriodSelector from '@/components/billing/BillingPeriodSelector.vue'
import InvoicePreview from '@/components/billing/InvoicePreview.vue'

const { t, locale } = useI18n()

import type { BillingPeriodType } from '@/types/api/billing'

const period = ref<BillingPeriodType>('current_month')
const showPreview = ref(false)
const previewInvoice = ref<any>(null)

const { columns, columnChecks, data, loading, pagination, getData, handleSizeChange, handleCurrentChange, refreshData } = useTable({
  core: {
    apiFn: fetchInvoiceHistory,
    apiParams: { page: 1, pageSize: 20 },
    paginationKey: { current: 'page', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'index' as const, width: 60, label: '#' },
      { prop: 'invoiceId', label: 'Invoice ID', minWidth: 200 },
      { prop: 'totalAmount', label: t('developer.paymentHistory.totalAmount'), minWidth: 140 },
      { prop: 'currency', label: 'Currency', minWidth: 100 },
      { prop: 'status', label: 'Status', minWidth: 100 },
      { prop: 'createdAt', label: t('package.createdAt'), minWidth: 180, formatter: (row: any) => formatDate(row.createdAt, undefined, locale.value) },
      {
        label: t('package.actions'),
        minWidth: 120,
        fixed: 'right',
        formatter: (row: any) => {
          return h(ElButton, { type: 'primary', size: 'small', onClick: () => handleDownload(row) }, () => t('developer.invoiceGeneration.download'))
        }
      }
    ] as any
  },
  transform: { responseAdapter: (res: any) => ({ records: res?.list || [], total: res?.total || 0 }) }
})

const handlePeriodChange = () => {
  getData()
}

const handleGenerate = async () => {
  try {
    const result = await fetchGenerateInvoice({ periodStart: '', periodEnd: '' })
    previewInvoice.value = result
    showPreview.value = true
  } catch {
    // error handled by http
  }
}

const handleDownload = async (row: any) => {
  try {
    await fetchDownloadInvoicePDF(row.invoiceId)
  } catch {
    // error handled by http
  }
}
</script>