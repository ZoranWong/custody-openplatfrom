<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import type { PaymentStatusFilter } from '@/services/api'

interface Props {
  modelValue?: PaymentStatusFilter
  dateRange?: [Date, Date] | null
}

// Constants for date range validation
const DATE_RANGE_MIN_YEARS = 2

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'all',
  dateRange: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: PaymentStatusFilter): void
  (e: 'update:dateRange', value: [Date, Date] | null): void
  (e: 'change', filters: { status: PaymentStatusFilter; dateRange?: [Date, Date] | null }): void
}>()

const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Success', value: 'success' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' }
]

const isStatusSelected = computed(() => props.modelValue !== 'all')
const isDateRangeSelected = computed(() => props.dateRange !== null)

// Date validation helper
const isDateDisabled = (date: Date): boolean => {
  const now = new Date()
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - DATE_RANGE_MIN_YEARS)
  return date > now || date < minDate
}

const handleClearFilters = () => {
  emit('update:modelValue', 'all')
  emit('update:dateRange', null)
  emit('change', { status: 'all', dateRange: null })
}

onUnmounted(() => {
  // Cleanup if needed
})
</script>

<template>
  <div
    class="payment-filters flex flex-wrap items-center gap-4"
    role="group"
    aria-label="Payment filters"
    aria-labelledby="filters-heading"
  >
    <h3 id="filters-heading" class="sr-only">Payment Filters</h3>

    <!-- Status Filter -->
    <div class="flex items-center gap-2">
      <label for="status-filter" class="text-sm text-gray-600">Status:</label>
      <el-select
        id="status-filter"
        :model-value="modelValue"
        placeholder="Select status"
        size="default"
        @change="emit('update:modelValue', $event as PaymentStatusFilter); emit('change', { status: $event as PaymentStatusFilter, dateRange })"
        style="width: 120px"
        aria-label="Filter by status"
      >
        <el-option
          v-for="option in statusOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </div>

    <!-- Date Range Filter -->
    <div class="flex items-center gap-2">
      <label for="date-range-filter" class="text-sm text-gray-600">Date:</label>
      <el-date-picker
        id="date-range-filter"
        :model-value="dateRange"
        type="daterange"
        range-separator="to"
        start-placeholder="Start date"
        end-placeholder="End date"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        size="default"
        :disabled-date="isDateDisabled"
        @update:modelValue="emit('update:dateRange', $event); emit('change', { status: modelValue, dateRange: $event })"
        style="width: 280px"
        aria-label="Filter by date range"
      />
    </div>

    <!-- Clear Filters Button -->
    <el-button
      v-if="isStatusSelected || isDateRangeSelected"
      size="default"
      @click="handleClearFilters"
      aria-label="Clear all filters"
    >
      Clear Filters
    </el-button>
  </div>
</template>
