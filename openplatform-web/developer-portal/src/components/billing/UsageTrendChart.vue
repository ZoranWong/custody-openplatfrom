<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { Loading, DataLine } from '@element-plus/icons-vue'
import {
  CanvasRenderer
} from 'echarts/renderers'
import {
  LineChart
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components'
import type { DailyUsage } from '@/services/api'

// Chart color constants
const CHART_COLORS = {
  primary: '#3b82f6',
  primaryArea: 'rgba(59, 130, 246, 0.2)',
  success: '#10b981',
  grid: '#f3f4f6',
  axisLine: '#e5e7eb',
  text: '#6b7280',
  tooltipBg: 'rgba(255, 255, 255, 0.95)',
  tooltipText: '#374151',
  crossStyle: '#9ca3af'
}

// Register ECharts components
import { use } from 'echarts/core'
use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent
])

interface Props {
  dailyData: DailyUsage[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const hasData = computed(() => props.dailyData && props.dailyData.length > 0)

const chartOption = computed(() => {
  if (!hasData.value) {
    return {}
  }

  const dates = props.dailyData.map(d => formatDate(d.date))
  const calls = props.dailyData.map(d => d.calls)
  const successCalls = props.dailyData.map(d => d.success_count)

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: CHART_COLORS.tooltipBg,
      borderColor: CHART_COLORS.axisLine,
      borderWidth: 1,
      textStyle: {
        color: CHART_COLORS.tooltipText
      },
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: CHART_COLORS.crossStyle
        }
      }
    },
    legend: {
      data: ['总调用次数', '成功次数'],
      bottom: 0,
      textStyle: {
        color: CHART_COLORS.text
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: CHART_COLORS.axisLine
        }
      },
      axisLabel: {
        color: CHART_COLORS.text,
        formatter: (value: string) => value
      }
    },
    yAxis: {
      type: 'value',
      name: '调用次数',
      nameTextStyle: {
        color: CHART_COLORS.text,
        padding: [0, 0, 0, 40]
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: CHART_COLORS.grid
        }
      },
      axisLabel: {
        color: CHART_COLORS.text,
        formatter: (value: number) => formatNumber(value)
      }
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        bottom: 0,
        height: 20,
        borderColor: CHART_COLORS.axisLine,
        fillerColor: 'rgba(59, 130, 246, 0.2)',
        handleStyle: {
          color: CHART_COLORS.primary
        },
        textStyle: {
          color: CHART_COLORS.text
        }
      }
    ],
    series: [
      {
        name: '总调用次数',
        type: 'line',
        data: calls,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: CHART_COLORS.primary
        },
        itemStyle: {
          color: CHART_COLORS.primary
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: CHART_COLORS.primaryArea },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' }
            ]
          }
        }
      },
      {
        name: '成功次数',
        type: 'line',
        data: successCalls,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: CHART_COLORS.success
        },
        itemStyle: {
          color: CHART_COLORS.success
        }
      }
    ]
  }
})

const loadingOption = {
  text: '加载中...',
  color: CHART_COLORS.primary,
  textColor: CHART_COLORS.text,
  maskColor: 'rgba(255, 255, 255, 0.9)'
}
</script>

<template>
  <div class="card p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">API 调用趋势</h3>

    <!-- Loading State -->
    <div v-if="loading" class="h-80 flex items-center justify-center bg-gray-50 rounded-lg" role="status" aria-label="加载中">
      <div class="text-center">
        <el-icon class="is-loading w-8 h-8 text-brand mb-2">
          <Loading />
        </el-icon>
        <p class="text-gray-500">正在加载统计数据...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!hasData"
      class="h-80 flex items-center justify-center bg-gray-50 rounded-lg"
      role="status"
      aria-label="暂无数据"
    >
      <div class="text-center">
        <el-icon class="w-12 h-12 mx-auto text-gray-300 mb-2" aria-hidden="true">
          <DataLine />
        </el-icon>
        <p class="text-gray-500">暂无使用趋势数据</p>
      </div>
    </div>

    <!-- Chart -->
    <div v-else class="h-80" role="img" aria-label="API调用趋势图">
      <v-chart
        class="chart"
        :option="chartOption"
        :loading="loading"
        :loading-options="loadingOption"
        autoresize
      />
    </div>
  </div>
</template>

<style scoped>
.chart {
  width: 100%;
  height: 100%;
}
</style>
