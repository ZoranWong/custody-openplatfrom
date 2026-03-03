<script setup lang="ts">
import { computed } from 'vue'
import { DataLine } from '@element-plus/icons-vue'
import type { EndpointUsage } from '@/services/api'

interface Props {
  endpoints: EndpointUsage[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const methodColors: Record<string, string> = {
  GET: 'success',
  POST: 'warning',
  PUT: 'info',
  DELETE: 'danger'
}

const methodLabels: Record<string, string> = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE'
}

const sortedEndpoints = computed(() => {
  return [...props.endpoints].sort((a, b) => b.calls - a.calls)
})

const hasData = computed(() => props.endpoints && props.endpoints.length > 0)
</script>

<template>
  <div class="card p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">接口调用分布</h3>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3" role="status" aria-label="加载中">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <div class="h-10 bg-gray-100 rounded"></div>
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
        <DataLine />
      </el-icon>
      <p class="text-gray-500">暂无接口调用数据</p>
    </div>

    <!-- Data Table -->
    <el-table
      v-else
      :data="sortedEndpoints"
      style="width: 100%"
      stripe
      role="table"
      aria-label="接口调用分布"
    >
      <el-table-column label="接口路径" min-width="200">
        <template #default="{ row }">
          <code class="text-sm text-gray-700">{{ row.endpoint }}</code>
        </template>
      </el-table-column>

      <el-table-column label="方法" width="100">
        <template #default="{ row }">
          <el-tag
            :type="methodColors[row.method] || 'info'"
            size="small"
            :aria-label="`HTTP 方法: ${methodLabels[row.method] || row.method}`"
          >
            {{ row.method }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="调用次数" width="120" align="right">
        <template #default="{ row }">
          <span class="font-medium">{{ formatNumber(row.calls) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="占比" width="120">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <el-progress
              :percentage="row.percentage"
              :stroke-width="6"
              :show-text="false"
              style="width: 60px"
              role="progressbar"
              :aria-valuenow="row.percentage"
              aria-valuemin="0"
              aria-valuemax="100"
            />
            <span class="text-sm text-gray-500">{{ row.percentage.toFixed(1) }}%</span>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
