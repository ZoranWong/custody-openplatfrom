<script setup lang="ts">
import { computed } from 'vue'
import type { UsageBreakdownItem } from '@/services/api'
import { Document, Timer, Connection } from '@element-plus/icons-vue'

interface Props {
  items: UsageBreakdownItem[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
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
 * Format a number with K/M suffix
 * @param num - The number to format
 * @returns Formatted number string
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const totalAmount = computed((): number => {
  return props.items.reduce((sum, item) => sum + item.amount, 0)
})

const currency = computed((): string => {
  return props.items[0]?.currency || 'USD'
})

/**
 * Get the appropriate icon for an item
 * @param item - The item name
 * @returns The icon component
 */
const getItemIcon = (item: string): typeof Connection | typeof Document | typeof Timer => {
  const lowerItem = item.toLowerCase()
  if (lowerItem.includes('api') || lowerItem.includes('call')) {
    return Connection
  } else if (lowerItem.includes('bandwidth') || lowerItem.includes('data')) {
    return Document
  }
  return Timer
}

const hasData = computed((): boolean => props.items && props.items.length > 0)
</script>

<template>
  <div class="usage-breakdown">
    <h4 class="text-lg font-semibold text-gray-900 mb-4">用量明细</h4>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3" role="status" aria-label="加载中">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="h-12 bg-gray-100 rounded"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!hasData"
      class="text-center py-8"
      role="status"
      aria-label="暂无数据"
    >
      <el-icon class="w-12 h-12 mx-auto text-gray-300 mb-2" aria-hidden="true">
        <Document />
      </el-icon>
      <p class="text-gray-500">暂无用量明细数据</p>
    </div>

    <!-- Data Table -->
    <el-table
      v-else
      :data="items"
      style="width: 100%"
      stripe
      role="table"
      aria-label="用量明细"
    >
      <el-table-column prop="item" label="项目" min-width="180">
        <template #default="{ row }">
          <div class="flex items-center gap-3">
            <el-icon class="text-gray-400">
              <component :is="getItemIcon(row.item)" />
            </el-icon>
            <span class="font-medium">{{ row.item }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="quantity" label="数量" width="120" align="right">
        <template #default="{ row }">
          <span>{{ formatNumber(row.quantity) }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="unit_price" label="单价" width="120" align="right">
        <template #default="{ row }">
          <span>{{ formatCurrency(row.unit_price, row.currency) }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="amount" label="金额" width="140" align="right">
        <template #default="{ row }">
          <span class="font-semibold">{{ formatCurrency(row.amount, row.currency) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- Total -->
    <div v-if="hasData" class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex justify-end">
        <div class="text-right">
          <p class="text-sm text-gray-500 mb-1">合计</p>
          <p class="text-2xl font-bold text-gray-900">
            {{ formatCurrency(totalAmount, currency) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
