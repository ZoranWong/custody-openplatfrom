<template>
  <el-card class="trend-chart" shadow="hover">
    <template #header>
      <div class="chart-header">
        <span class="chart-title">{{ title }}</span>
        <div class="chart-actions">
          <el-radio-group v-model="timeRange" size="small" @change="onTimeRangeChange">
            <el-radio-button label="7d">7 Days</el-radio-button>
            <el-radio-button label="24h">24 Hours</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </template>
    <div ref="chartRef" class="chart-container"></div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

interface TrendData {
  timestamp: string
  value: number
}

const props = defineProps<{
  title: string
  data: TrendData[]
  color?: string
  areaStyle?: boolean
  showGrid?: boolean
}>()

const emit = defineEmits<{
  (e: 'timeRangeChange', range: string): void
}>()

const chartRef = ref<HTMLElement>()
let chart: ECharts | null = null
const timeRange = ref('7d')

const chartColor = computed(() => props.color || '#1677ff')

const chartOptions = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#f0f0f0',
    borderWidth: 1,
    textStyle: {
      color: '#1a1a1a'
    },
    formatter: (params: any) => {
      const data = params[0]
      const date = new Date(data.axisValue)
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      return `${formattedDate}<br/>Value: ${data.value.toLocaleString()}`
    }
  },
  grid: props.showGrid !== false ? {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  } : undefined,
  xAxis: {
    type: 'time',
    boundaryGap: false,
    axisLine: {
      lineStyle: {
        color: '#e8e8e8'
      }
    },
    axisLabel: {
      color: '#8c8c8c',
      formatter: (value: number) => {
        const date = new Date(value)
        return timeRange.value === '7d'
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleTimeString('en-US', { hour: '2-digit' })
      }
    },
    splitLine: {
      show: false
    }
  },
  yAxis: {
    type: 'value',
    axisLine: {
      show: false
    },
    axisLabel: {
      color: '#8c8c8c',
      formatter: (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
        return value.toString()
      }
    },
    splitLine: {
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    }
  },
  series: [{
    name: props.title,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    data: props.data.map(d => [d.timestamp, d.value]),
    lineStyle: {
      color: chartColor.value,
      width: 2
    },
    itemStyle: {
      color: chartColor.value,
      borderWidth: 2,
      borderColor: '#fff'
    },
    areaStyle: props.areaStyle ? {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: `${chartColor.value}40` },
        { offset: 1, color: `${chartColor.value}05` }
      ])
    } : undefined,
    emphasis: {
      scale: true,
      itemStyle: {
        color: chartColor.value,
        borderWidth: 2,
        borderColor: '#fff'
      }
    }
  }]
}))

function initChart() {
  if (!chartRef.value) return

  if (chart) {
    chart.dispose()
  }

  chart = echarts.init(chartRef.value)
  chart.setOption(chartOptions.value)
}

function resizeHandler() {
  chart?.resize()
}

function onTimeRangeChange(range: string) {
  emit('timeRangeChange', range)
}

watch(() => props.data, () => {
  chart?.setOption(chartOptions.value)
}, { deep: true })

watch(timeRange, () => {
  chart?.setOption(chartOptions.value)
})

onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler)
  chart?.dispose()
})
</script>

<style scoped>
.trend-chart {
  border-radius: 12px;
  height: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.chart-container {
  height: 280px;
  width: 100%;
}
</style>
