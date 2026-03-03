<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { apiStatsApiService, type APIStatsSummary, type ResponseTimeTrend, type ErrorTrend, type APITopApp } from '@/services/api-stats-api'
import { usePermissionStore } from '@/stores/permission.store'
import { Resource } from '@/shared/admin-permissions'
import {
  Connection,
  TrendCharts,
  Timer,
  Warning,
  Top,
  Download,
  Refresh,
  Loading
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

const permissionStore = usePermissionStore()

// State
const loading = ref(true)
const refreshing = ref(false)
const summary = ref<APIStatsSummary | null>(null)
const responseTimeTrend = ref<ResponseTimeTrend[]>([])
const errorTrend = ref<ErrorTrend[]>([])
const topApps = ref<APITopApp[]>([])
const error = ref<string | null>(null)

// Time range
const timeRange = ref('7d')
const timeRangeOptions = [
  { label: '24 Hours', value: '24h' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' }
]

// Auto-refresh
let refreshInterval: ReturnType<typeof setInterval> | null = null
const REFRESH_INTERVAL = 60000 // 1 minute

// Chart refs
const responseTimeChartRef = ref<HTMLElement>()
const errorChartRef = ref<HTMLElement>()
let responseTimeChart: ECharts | null = null
let errorChart: ECharts | null = null

// Computed
const hasAnalyticsPermission = computed(() => {
  return permissionStore.hasPermission(Resource.ANALYTICS_VIEW)
})

// Format numbers
function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

function formatResponseTime(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}

// Fetch all API stats data
async function fetchAPIStats() {
  if (!hasAnalyticsPermission.value) {
    error.value = 'You do not have permission to view API statistics'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    const days = timeRange.value === '24h' ? 1 : timeRange.value === '7d' ? 7 : timeRange.value === '30d' ? 30 : 90

    const [summaryRes, responseTimeRes, errorRes, topAppsRes] = await Promise.all([
      apiStatsApiService.getAPIStatsSummary(),
      apiStatsApiService.getAPIResponseTimeTrend(days),
      apiStatsApiService.getAPIErrorTrend(days),
      apiStatsApiService.getAPITopApps(10)
    ])

    if (summaryRes.code === 0 && summaryRes.data) {
      summary.value = summaryRes.data
    }

    if (responseTimeRes.code === 0 && responseTimeRes.data) {
      responseTimeTrend.value = responseTimeRes.data
      updateResponseTimeChart()
    }

    if (errorRes.code === 0 && errorRes.data) {
      errorTrend.value = errorRes.data
      updateErrorChart()
    }

    if (topAppsRes.code === 0 && topAppsRes.data) {
      topApps.value = topAppsRes.data
    }
  } catch (err: any) {
    console.error('Failed to fetch API stats:', err)
    error.value = err.message || 'Failed to load API statistics'
  } finally {
    loading.value = false
  }
}

// Handle time range change
function onTimeRangeChange() {
  fetchAPIStats()
}

// Refresh data
async function refreshStats() {
  try {
    refreshing.value = true
    await fetchAPIStats()
  } catch (err: any) {
    console.error('Failed to refresh stats:', err)
  } finally {
    refreshing.value = false
  }
}

// Export to CSV
async function exportToCSV() {
  try {
    const blob = await apiStatsApiService.exportAPIStats(timeRange.value)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `api-stats-${timeRange.value}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (err: any) {
    console.error('Failed to export:', err)
  }
}

// Response time chart
function updateResponseTimeChart() {
  if (!responseTimeChartRef.value || !responseTimeChart) return

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#f0f0f0',
      borderWidth: 1,
      textStyle: { color: '#1a1a1a' },
      formatter: (params: any) => {
        const date = new Date(params[0].axisValue)
        const formatted = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit'
        })
        let result = `${formatted}<br/>`
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${formatResponseTime(p.value[1])}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['P50', 'P95', 'P99'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: number) => {
          const date = new Date(value)
          return timeRange.value === '24h'
            ? date.toLocaleTimeString('en-US', { hour: '2-digit' })
            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: number) => formatResponseTime(value)
      },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [
      {
        name: 'P50',
        type: 'line',
        smooth: true,
        data: responseTimeTrend.value.map(d => [d.timestamp, d.p50]),
        lineStyle: { color: '#52c41a', width: 2 },
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'P95',
        type: 'line',
        smooth: true,
        data: responseTimeTrend.value.map(d => [d.timestamp, d.p95]),
        lineStyle: { color: '#fa8c16', width: 2 },
        itemStyle: { color: '#fa8c16' }
      },
      {
        name: 'P99',
        type: 'line',
        smooth: true,
        data: responseTimeTrend.value.map(d => [d.timestamp, d.p99]),
        lineStyle: { color: '#ff4d4f', width: 2 },
        itemStyle: { color: '#ff4d4f' }
      }
    ]
  }

  responseTimeChart.setOption(option)
}

// Error rate chart
function updateErrorChart() {
  if (!errorChartRef.value || !errorChart) return

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#f0f0f0',
      borderWidth: 1,
      textStyle: { color: '#1a1a1a' },
      formatter: (params: any) => {
        const date = new Date(params[0].axisValue)
        const formatted = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit'
        })
        return `${formatted}<br/>${params[0].marker} Errors: ${params[0].value[1].toLocaleString()}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: number) => {
          const date = new Date(value)
          return timeRange.value === '24h'
            ? date.toLocaleTimeString('en-US', { hour: '2-digit' })
            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: number) => value.toLocaleString()
      },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [{
      name: 'Errors',
      type: 'bar',
      data: errorTrend.value.map(d => [d.timestamp, d.total]),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#ff4d4f80' },
          { offset: 1, color: '#ff4d4f30' }
        ])
      }
    }]
  }

  errorChart.setOption(option)
}

// Stats cards
const statsCards = computed(() => [
  {
    label: 'API Calls Today',
    value: summary.value?.todayCalls || 0,
    icon: 'connection',
    iconBgColor: '#e6f4ff',
    iconColor: '#1677ff'
  },
  {
    label: 'Avg Response Time',
    value: formatResponseTime(summary.value?.avgResponseTime || 0),
    icon: 'timer',
    iconBgColor: '#f6ffed',
    iconColor: '#52c41a'
  },
  {
    label: 'P95 Response Time',
    value: formatResponseTime(summary.value?.p95ResponseTime || 0),
    icon: 'trend',
    iconBgColor: '#fff7e6',
    iconColor: '#fa8c16'
  },
  {
    label: 'Error Rate',
    value: `${(summary.value?.errorRate || 0).toFixed(2)}%`,
    icon: 'warning',
    iconBgColor: '#fff1f0',
    iconColor: '#ff4d4f'
  }
])

// Start auto-refresh
function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(() => {
    fetchAPIStats()
  }, REFRESH_INTERVAL)
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// Init charts
function initCharts() {
  if (responseTimeChartRef.value) {
    responseTimeChart = echarts.init(responseTimeChartRef.value)
    updateResponseTimeChart()
  }
  if (errorChartRef.value) {
    errorChart = echarts.init(errorChartRef.value)
    updateErrorChart()
  }
}

// Resize handler
function handleResize() {
  responseTimeChart?.resize()
  errorChart?.resize()
}

// Lifecycle
onMounted(async () => {
  await permissionStore.loadPermissions()
  await fetchAPIStats()
  startAutoRefresh()
  initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  stopAutoRefresh()
  window.removeEventListener('resize', handleResize)
  responseTimeChart?.dispose()
  errorChart?.dispose()
})
</script>

<template>
  <div class="api-stats-container">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">API Statistics</h1>
        <p class="page-subtitle">Monitor API usage, performance, and error trends</p>
      </div>
      <div class="header-right">
        <el-select v-model="timeRange" style="width: 120px" @change="onTimeRangeChange">
          <el-option
            v-for="option in timeRangeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-button :icon="Download" @click="exportToCSV">Export CSV</el-button>
        <el-button type="primary" :icon="Refresh" :loading="refreshing" @click="refreshStats">
          Refresh
        </el-button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !summary" class="loading-container">
      <el-icon class="loading-spinner" :size="40"><Loading /></el-icon>
      <p>Loading API statistics...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <el-alert
        title="Failed to load API statistics"
        :description="error"
        type="error"
        show-icon
        :closable="false"
      />
      <el-button type="primary" @click="fetchAPIStats">Retry</el-button>
    </div>

    <!-- Stats Content -->
    <template v-else-if="summary">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div v-for="(card, index) in statsCards" :key="index" class="stat-card">
          <div class="stat-icon" :style="{ backgroundColor: card.iconBgColor }">
            <el-icon :size="24" :color="card.iconColor">
              <Timer v-if="card.icon === 'timer'" />
              <Connection v-else-if="card.icon === 'connection'" />
              <TrendCharts v-else-if="card.icon === 'trend'" />
              <Warning v-else />
            </el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">Response Time Trends</span>
          </template>
          <div ref="responseTimeChartRef" class="chart-container"></div>
        </el-card>

        <el-card class="chart-card">
          <template #header>
            <span class="card-title">Error Rate Trends</span>
          </template>
          <div ref="errorChartRef" class="chart-container"></div>
        </el-card>
      </div>

      <!-- Top Applications Table -->
      <el-card class="top-apps-card">
        <template #header>
          <div class="card-header">
            <span class="card-title"><Top /> Top Applications by API Usage</span>
          </div>
        </template>
        <el-table :data="topApps" style="width: 100%" stripe>
          <el-table-column prop="appName" label="Application" min-width="200" />
          <el-table-column prop="calls" label="API Calls" width="150">
            <template #default="{ row }">
              {{ row.calls.toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column prop="avgResponseTime" label="Avg Response Time" width="150">
            <template #default="{ row }">
              {{ formatResponseTime(row.avgResponseTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="errorRate" label="Error Rate" width="120">
            <template #default="{ row }">
              <span :class="{ 'error-high': row.errorRate > 2 }">
                {{ row.errorRate.toFixed(2) }}%
              </span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Summary Stats -->
      <div class="summary-stats">
        <el-card class="summary-card">
          <template #header>
            <span class="card-title">Summary</span>
          </template>
          <div class="summary-content">
            <div class="summary-item">
              <span class="summary-label">This Week</span>
              <span class="summary-value">{{ formatNumber(summary.weekCalls) }} calls</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">This Month</span>
              <span class="summary-value">{{ formatNumber(summary.monthCalls) }} calls</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">P50 Response</span>
              <span class="summary-value">{{ formatResponseTime(summary.p50ResponseTime) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">P99 Response</span>
              <span class="summary-value">{{ formatResponseTime(summary.p99ResponseTime) }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.api-stats-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 16px;
  color: #8c8c8c;
}

.loading-spinner {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
}

.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  border-radius: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.top-apps-card {
  border-radius: 12px;
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-high {
  color: #ff4d4f;
  font-weight: 500;
}

.summary-stats {
  margin-bottom: 24px;
}

.summary-card {
  border-radius: 12px;
}

.summary-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 24px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 13px;
  color: #8c8c8c;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }

  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
