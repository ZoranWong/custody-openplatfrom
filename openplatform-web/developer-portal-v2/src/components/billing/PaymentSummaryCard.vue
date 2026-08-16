<script setup lang="ts">
import { computed } from 'vue'
import { Wallet, List, Loading, Money } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

interface Props {
  totalAmount: number
  paymentCount: number
  currency?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currency: 'USD',
  loading: false
})

const { t } = useI18n()

const formattedAmount = computed(() => {
  if (props.loading) {
    return 'Loading...'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency
  }).format(props.totalAmount)
})

const displayCount = computed(() => {
  if (props.loading) {
    return '-'
  }
  return props.paymentCount
})

const displayCurrency = computed(() => {
  if (props.loading) {
    return '-'
  }
  return props.currency
})
</script>

<template>
  <div class="payment-summary-card grid grid-cols-1 md:grid-cols-3 gap-6" role="region" :aria-label="t('developer.billing.payment.summary')">
    <!-- Total Amount -->
    <div class="card p-6" role="group" :aria-label="t('developer.billing.payment.totalPayment')">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-blue-50 rounded-lg" aria-hidden="true">
          <el-icon v-if="loading" class="w-6 h-6 text-brand animate-spin">
            <Loading />
          </el-icon>
          <el-icon v-else class="w-6 h-6 text-brand">
            <Wallet />
          </el-icon>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1" id="total-amount-label">{{ t('developer.billing.payment.totalPayment') }}</p>
          <p class="text-3xl font-bold text-gray-900" aria-labelledby="total-amount-label">
            {{ formattedAmount }}
          </p>
        </div>
      </div>
    </div>

    <!-- Payment Count -->
    <div class="card p-6" role="group" :aria-label="t('developer.billing.payment.paymentCount')">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-green-50 rounded-lg" aria-hidden="true">
          <el-icon v-if="loading" class="w-6 h-6 text-success animate-spin">
            <Loading />
          </el-icon>
          <el-icon v-else class="w-6 h-6 text-success">
            <List />
          </el-icon>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1" id="payment-count-label">{{ t('developer.billing.payment.paymentCount') }}</p>
          <p class="text-3xl font-bold text-gray-900" aria-labelledby="payment-count-label">
            {{ displayCount }}
          </p>
        </div>
      </div>
    </div>

    <!-- Currency Info -->
    <div class="card p-6" role="group" :aria-label="t('developer.billing.payment.currency')">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-orange-50 rounded-lg" aria-hidden="true">
          <el-icon v-if="loading" class="w-6 h-6 text-warning animate-spin">
            <Loading />
          </el-icon>
          <el-icon v-else class="w-6 h-6 text-warning">
            <Money />
          </el-icon>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1" id="currency-label">{{ t('developer.billing.payment.currency') }}</p>
          <p class="text-3xl font-bold text-gray-900" aria-labelledby="currency-label">
            {{ displayCurrency }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
