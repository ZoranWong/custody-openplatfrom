<template>
  <div class="subscription-history-page art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData" />

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
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SubscriptionHistory' })

import { useI18n } from 'vue-i18n'
import { useTable } from '@/hooks/core/useTable'
import { ElTag } from 'element-plus'
import { fetchSubscriptionHistory } from '@/api/billing'
import { formatDate } from '@/utils/date'

const { t, locale } = useI18n()

const { columns, columnChecks, data, loading, pagination, handleSizeChange, handleCurrentChange, refreshData } = useTable({
  core: {
    apiFn: fetchSubscriptionHistory,
    apiParams: { page: 1, pageSize: 20 },
    paginationKey: { current: 'page', size: 'pageSize' },
    columnsFactory: () =>
      [
        { type: 'index' as const, width: 60, label: '#' },
        {
          prop: 'packageCode',
          label: t('package.packageCode'),
          minWidth: 120,
          formatter: (row: any) => t('package.packageTypeLabels.' + row.packageCode)
        },
        { prop: 'startDate', label: t('developer.subscription.startDate'), minWidth: 180, formatter: (row: any) => formatDate(row.startDate, undefined, locale) },
        { prop: 'endDate', label: t('developer.subscription.endDate'), minWidth: 180, formatter: (row: any) => formatDate(row.endDate, undefined, locale) },
        {
          prop: 'billingCycle',
          label: t('developer.subscription.billingCycle'),
          minWidth: 120,
          formatter: (row: any) => {
            if (row.billingCycle === 'trial') return t('developer.subscription.trial')
            if (row.billingCycle === 'yearly') return t('developer.subscription.yearly')
            return t('developer.subscription.monthly')
          }
        },
        {
          prop: 'status',
          label: t('developer.billing.payment.status'),
          minWidth: 100,
          formatter: (row: any) => {
            const map: Record<string, { type: 'success' | 'warning' | 'danger' | 'info'; text: string }> = {
              active: { type: 'success', text: t('developer.subscription.statusActive') },
              upgraded: { type: 'warning', text: t('developer.subscription.statusUpgraded') },
              expired: { type: 'info', text: t('developer.subscription.statusExpired') },
              inactive: { type: 'info', text: t('developer.subscription.statusInactive') }
            }
            const config = map[row.status] || { type: 'info' as const, text: row.status }
            return h(ElTag, { type: config.type }, () => config.text)
          }
        }
      ] as any
  },
  transform: {
    responseAdapter: (res: any) => ({ records: res?.list || [], total: res?.total || 0 })
  }
})
</script>