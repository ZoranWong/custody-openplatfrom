<script setup lang="ts">
import { DataLine, Connection, CircleCheck } from '@element-plus/icons-vue'
import type { ApplicationApiUsage } from '@/services/api'

interface Props {
  apiUsage?: ApplicationApiUsage
}

defineProps<Props>()

const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return String(num)
}
</script>

<template>
  <div class="card p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">API 使用统计</h3>

    <div v-if="apiUsage" class="grid grid-cols-3 gap-4">
      <div class="text-center p-4 bg-gray-50 rounded-lg">
        <el-icon class="w-6 h-6 mx-auto text-brand mb-2"><DataLine /></el-icon>
        <p class="text-2xl font-bold text-gray-900">{{ formatNumber(apiUsage.totalCalls) }}</p>
        <p class="text-sm text-gray-500">总调用次数</p>
      </div>

      <div class="text-center p-4 bg-gray-50 rounded-lg">
        <el-icon class="w-6 h-6 mx-auto text-brand mb-2"><Connection /></el-icon>
        <p class="text-2xl font-bold text-gray-900">{{ formatNumber(apiUsage.last30Days) }}</p>
        <p class="text-sm text-gray-500">近30天调用</p>
      </div>

      <div class="text-center p-4 bg-gray-50 rounded-lg">
        <el-icon class="w-6 h-6 mx-auto text-success mb-2"><CircleCheck /></el-icon>
        <p class="text-2xl font-bold text-gray-900">{{ apiUsage.successRate }}%</p>
        <p class="text-sm text-gray-500">成功率</p>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <el-icon class="w-12 h-12 mx-auto text-gray-300 mb-2"><DataLine /></el-icon>
      <p>暂无 API 使用数据</p>
    </div>
  </div>
</template>
