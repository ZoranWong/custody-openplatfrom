<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { BillingPeriodType, DateRange } from '@/services/api'

interface Props {
  modelValue?: BillingPeriodType
  customDateRange?: { start: string; end: string } | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'current_month',
  customDateRange: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: BillingPeriodType): void
  (e: 'update:customDateRange', value: { start: string; end: string } | null): void
  (e: 'change', value: { period: BillingPeriodType; dateRange?: DateRange }): void
}>()

const selectedPeriod = ref<BillingPeriodType>(props.modelValue)
const customRange = ref<[Date, Date] | null>(null)

const periodOptions = [
  { label: 'This Month', value: 'current_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'Custom', value: 'custom' }
]

/**
 * Get date range based on selected period
 * @param period - The billing period type
 * @returns DateRange with start and end dates
 */
const getDateRange = (period: BillingPeriodType): DateRange => {
  const now = new Date()
  let start: Date
  let end: Date

  switch (period) {
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
      if (customRange.value && customRange.value.length === 2) {
        start = customRange.value[0]
        end = customRange.value[1]
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

const isCustomSelected = computed((): boolean => selectedPeriod.value === 'custom')

/**
 * Handle period selection change
 */
const handlePeriodChange = (): void => {
  emit('update:modelValue', selectedPeriod.value)

  if (selectedPeriod.value !== 'custom') {
    emit('update:customDateRange', null)
  }

  const dateRange = getDateRange(selectedPeriod.value)
  emit('change', { period: selectedPeriod.value, dateRange })
}

/**
 * Handle custom date range change
 * @param value - Selected date range
 */
const handleCustomDateChange = (value: [Date, Date] | null): void => {
  customRange.value = value

  if (value && value.length === 2) {
    const dateRange = {
      start: value[0].toISOString().split('T')[0],
      end: value[1].toISOString().split('T')[0]
    }
    emit('update:customDateRange', dateRange)
    emit('change', { period: 'custom', dateRange })
  }
}

// Watch for prop changes
watch(() => props.modelValue, (newVal) => {
  selectedPeriod.value = newVal
})

watch(() => props.customDateRange, (newVal) => {
  if (newVal && selectedPeriod.value === 'custom') {
    customRange.value = [
      new Date(newVal.start),
      new Date(newVal.end)
    ]
  }
})
</script>

<template>
  <div class="billing-period-selector" role="group" aria-label="Billing period selection">
    <el-radio-group
      v-model="selectedPeriod"
      @change="handlePeriodChange"
    >
      <el-radio-button
        v-for="option in periodOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </el-radio-button>
    </el-radio-group>

    <div
      v-if="isCustomSelected"
      class="custom-date-picker mt-4"
      role="group"
      aria-label="Custom date range"
    >
      <el-date-picker
        v-model="customRange"
        type="daterange"
        range-separator="to"
        start-placeholder="Start date"
        end-placeholder="End date"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        :disabled-date="(date: Date) => {
          const now = new Date()
          const twoYearsAgo = new Date()
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
          return date > now || date < twoYearsAgo
        }"
        @change="handleCustomDateChange"
      />
    </div>
  </div>
</template>
