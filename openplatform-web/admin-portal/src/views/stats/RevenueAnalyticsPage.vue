<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { revenueStatsApiService, type RevenueStatsSummary, type RevenueTrend, type RevenueForecast, type RevenueByDeveloper, SERVICE_TYPE_API_CALLS, SERVICE_TYPE_TRANSACTION_FEES, SERVICE_TYPE_SUBSCRIPTION } from '@/services/revenue-stats-api'
import { usePermissionStore } from '@/stores/permission.store'
import { Resource } from '@/shared/admin-permissions'
import {
  Money,
  TrendCharts,
  Timer,
  Top,
  Download,
  Refresh,
  Loading,
  DataLine
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

const router = useRouter()
const permissionStore = usePermissionStore()

// State
const loading = ref(true)
const refreshing = ref(false)
const summary = ref<RevenueStatsSummary | null>(null)
const revenueTrend = ref<RevenueTrend[]>([])
const forecast = ref<RevenueForecast[]>([])
const topDevelopers = ref<RevenueByDeveloper[]>([])
const error = ref<string | null>(null)

// Time range
const timeRange = ref('7d')
const timeRangeOptions = [
  { label: '24 Hours', value: '24h' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' }
]

// Forecast days
const forecastDays = ref(7)
const forecastOptions = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 }
]

// Auto-refresh
let refreshInterval: ReturnType<typeof setInterval> | null = null
const REFRESH_INTERVAL = 60000 // 1 minute

// Chart refs
const trendChartRef = ref<HTMLElement>()
const forecastChartRef = ref<HTMLElement>()
let trendChart: ECharts | null = null
let forecastChart: ECharts | null = null

// Computed
const hasAnalyticsPermission = computed(() => {
  return permissionStore.hasPermission(Resource.ANALYTICS_VIEW)
})

// Format numbers
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatGrowth(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function formatGrowthClass(value: number): string {
  return value >= 0 ? 'growth-positive' : 'growth-negative'
}

// Fetch all revenue data
async function fetchRevenueStats() {
  if (!hasAnalyticsPermission.value) {
    error.value = 'You do not have permission to view revenue analytics'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    const days = timeRange.value === '24h' ? 1 : timeRange.value === '7d' ? 7 : timeRange.value === '30d' ? 30 : 90

    const [summaryRes, trendRes, forecastRes, developersRes] = await Promise.all([
      revenueStatsApiService.getRevenueSummary(),
      revenueStatsApiService.getRevenueTrend(days),
      revenueStatsApiService.getRevenueForecast(forecastDays.value),
      revenueStatsApiService.getRevenueByDeveloper(10, timeRange.value)
    ])

    if (summaryRes.code === 0 && summaryRes.data) {
      summary.value = summaryRes.data
    }

    if (trendRes.code === 0 && trendRes.data) {
      revenueTrend.value = trendRes.data
      updateTrendChart()
    }

    if (forecastRes.code === 0 && forecastRes.data) {
      forecast.value = forecastRes.data
      updateForecastChart()
    }

    if (developersRes.code === 0 && developersRes.data) {
      topDevelopers.value = developersRes.data
    }
  } catch (err: any) {
    console.error('Failed to fetch revenue stats:', err)
    error.value = err.message || 'Failed to load revenue analytics'
  } finally {
    loading.value = false
  }
}

// Handle time range change
function onTimeRangeChange() {
  fetchRevenueStats()
}

// Handle forecast days change
function onForecastDaysChange() {
  fetchRevenueStats()
}

// Handle developer row click - drill down to developer detail
function handleDeveloperClick(row: RevenueByDeveloper) {
  router.push({
    path: `/stats/revenue/developer/${row.developerId}`,
    query: { name: row.developerName }
  })
}

// Refresh data
async function refreshStats() {
  try {
    refreshing.value = true
    await fetchRevenueStats()
  } catch (err: any) {
    console.error('Failed to refresh stats:', err)
  } finally {
    refreshing.value = false
  }
}

// Export to CSV
async function exportToCSV() {
  try {
    const blob = await revenueStatsApiService.exportRevenueStats(timeRange.value)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `revenue-stats-${timeRange.value}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (err: any) {
    console.error('Failed to export:', err)
  }
}

// Revenue trend chart
function updateTrendChart() {
  if (!trendChartRef.value || !trendChart) return

  // Aggregate by day
  const dailyData = new Map<string, { revenue: number; transactions: number }>()
  for (const item of revenueTrend.value) {
    const date = item.timestamp.split('T')[0]
    const existing = dailyData.get(date) || { revenue: 0, transactions: 0 }
    existing.revenue += item.revenue
    existing.transactions += item.transactionCount
    dailyData.set(date, existing)
  }

  const sortedDates = Array.from(dailyData.keys()).sort()
  const revenues = sortedDates.map(date => dailyData.get(date)?.revenue || 0)

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
          day: 'numeric'
        })
        return `${formatted}<br/>${params[0].marker} Revenue: ${formatCurrency(params[0].value)}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: sortedDates,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: string) => {
          const date = new Date(value)
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: number) => formatCurrency(value)
      },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [{
      name: 'Revenue',
      type: 'line',
      smooth: true,
      data: revenues,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#1677ff80' },
          { offset: 1, color: '#1677ff10' }
        ])
      },
      lineStyle: { color: '#1677ff', width: 2 },
      itemStyle: { color: '#1677ff' }
    }]
  }

  trendChart.setOption(option)
}

// Forecast chart
function updateForecastChart() {
  if (!forecastChartRef.value || !forecastChart) return

  const dates = forecast.value.map(f => f.date)
  const predicted = forecast.value.map(f => f.predictedRevenue)
  const lowerBounds = forecast.value.map(f => f.lowerBound)
  const upperBounds = forecast.value.map(f => f.upperBound)

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
          day: 'numeric'
        })
        let result = `${formatted}<br/>`
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${formatCurrency(p.value)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['Predicted', 'Upper Bound', 'Lower Bound'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: string) => {
          const date = new Date(value)
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: number) => formatCurrency(value)
      },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [
      {
        name: 'Lower Bound',
        type: 'line',
        data: lowerBounds,
        lineStyle: { show: false },
        itemStyle: { show: false },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#52c41a20' },
            { offset: 1, color: '#52c41a05' }
          ])
        },
        stack: 'confidence-band'
      },
      {
        name: 'Upper Bound',
        type: 'line',
        data: upperBounds,
        lineStyle: { show: false },
        itemStyle: { show: false },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#52c41a05' },
            { offset: 1, color: '#52c41a20' }
          ])
        },
        stack: 'confidence-band'
      },
      {
        name: 'Predicted',
        type: 'line',
        smooth: true,
        data: predicted,
        lineStyle: { color: '#722ed1', width: 2 },
        itemStyle: { color: '#722ed1' },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  }

  forecastChart.setOption(option)
}

// Stats cards
const statsCards = computed(() => [
  {
    label: 'Today Revenue',
    value: formatCurrency(summary.value?.todayRevenue || 0),
    growth: summary.value?.todayGrowth || 0,
    icon: 'money',
    iconBgColor: '#e6f4ff',
    iconColor: '#1677ff'
  },
  {
    label: 'This Week',
    value: formatCurrency(summary.value?.weekRevenue || 0),
    growth: summary.value?.weekGrowth || 0,
    icon: 'trend',
    iconBgColor: '#f6ffed',
    iconColor: '#52c41a'
  },
  {
    label: 'This Month',
    value: formatCurrency(summary.value?.monthRevenue || 0),
    growth: summary.value?.monthGrowth || 0,
    icon: 'chart',
    iconBgColor: '#fff7e6',
    iconColor: '#fa8c16'
  },
  {
    label: 'Total Revenue',
    value: formatCurrency(summary.value?.totalRevenue || 0),
    icon: 'data',
    iconBgColor: '#f9f0ff',
    iconColor: '#722ed1'
  }
])

// Start auto-refresh
function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(() => {
    fetchRevenueStats()
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
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (forecastChartRef.value) {
    forecastChart = echarts.init(forecastChartRef.value)
  }
}

// Resize handler
function handleResize() {
  trendChart?.resize()
  forecastChart?.resize()
}

// Lifecycle
onMounted(async () => {
  await permissionStore.loadPermissions()
  await fetchRevenueStats()
  startAutoRefresh()
  initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  stopAutoRefresh()
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  forecastChart?.dispose()
})
</script>

<template>
  <div class="revenue-analytics-container">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Revenue Analytics</h1>
        <p class="page-subtitle">Monitor platform revenue, trends, and forecasts</p>
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
      <p>Loading revenue analytics...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <el-alert
        title="Failed to load revenue analytics"
        :description="error"
        type="error"
        show-icon
        :closable="false"
      />
      <el-button type="primary" @click="fetchRevenueStats">Retry</el-button>
    </div>

    <!-- Stats Content -->
    <template v-else-if="summary">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div v-for="(card, index) in statsCards" :key="index" class="stat-card">
          <div class="stat-icon" :style="{ backgroundColor: card.iconBgColor }">
            <el-icon :size="24" :color="card.iconColor">
              <Money v-if="card.icon === 'money'" />
              <TrendCharts v-else-if="card.icon === 'trend'" />
              <DataLine v-else-if="card.icon === 'chart'" />
              <Timer v-else />
            </el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
            <div v-if="card.growth !== undefined" class="stat-growth" :class="formatGrowthClass(card.growth)">
              {{ formatGrowth(card.growth) }} vs yesterday
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">Revenue Trend</span>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>

        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">Revenue Forecast</span>
              <el-select v-model="forecastDays" style="width: 100px" size="small" @change="onForecastDaysChange">
                <el-option
                  v-for="option in forecastOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>
          </template>
          <div ref="forecastChartRef" class="chart-container"></div>
        </el-card>
      </div>

      <!-- Top Developers Table -->
      <el-card class="top-devs-card">
        <template #header>
          <div class="card-header">
            <span class="card-title"><Top /> Top Developers by Revenue</span>
          </div>
        </template>
        <el-table :data="topDevelopers" style="width: 100%" stripe @row-click="handleDeveloperClick">
          <el-table-column prop="developerName" label="Developer" min-width="200">
            <template #default="{ row }">
              <span class="clickable-name">{{ row.developerName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="revenue" label="Revenue" width="150">
            <template #default="{ row }">
              {{ formatCurrency(row.revenue) }}
            </template>
          </el-table-column>
          <el-table-column prop="transactionCount" label="Transactions" width="130">
            <template #default="{ row }">
              {{ row.transactionCount.toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column prop="avgFeeRate" label="Avg Fee" width="120">
            <template #default="{ row }">
              {{ formatCurrency(row.avgFeeRate) }}
            </template>
          </el-table-column>
          <el-table-column label="Revenue Breakdown" min-width="250">
            <template #default="{ row }">
              <div class="breakdown-bars">
                <div class="breakdown-item">
                  <span class="breakdown-label">API Calls</span>
                  <el-progress
                    :percentage="Math.round((row.serviceTypes[SERVICE_TYPE_API_CALLS] / row.revenue) * 100)"
                    :stroke-color="'#1677ff'"
                    :show-text="false"
                    :stroke-width="8"
                  />
                  <span class="breakdown-value">{{ formatCurrency(row.serviceTypes[SERVICE_TYPE_API_CALLS]) }}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Transactions</span>
                  <el-progress
                    :percentage="Math.round((row.serviceTypes[SERVICE_TYPE_TRANSACTION_FEES] / row.revenue) * 100)"
                    :stroke-color="'#52c41a'"
                    :show-text="false"
                    :stroke-width="8"
                  />
                  <span class="breakdown-value">{{ formatCurrency(row.serviceTypes[SERVICE_TYPE_TRANSACTION_FEES]) }}</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Subscription</span>
                  <el-progress
                    :percentage="Math.round((row.serviceTypes[SERVICE_TYPE_SUBSCRIPTION] / row.revenue) * 100)"
                    :stroke-color="'#722ed1'"
                    :show-text="false"
                    :stroke-width="8"
                  />
                  <span class="breakdown-value">{{ formatCurrency(row.serviceTypes[SERVICE_TYPE_SUBSCRIPTION]) }}</span>
                </div>
              </div>
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
              <span class="summary-label">Today</span>
              <span class="summary-value">{{ formatCurrency(summary.todayRevenue) }}</span>
              <span class="summary-growth" :class="formatGrowthClass(summary.todayGrowth)">
                {{ formatGrowth(summary.todayGrowth) }}
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">This Week</span>
              <span class="summary-value">{{ formatCurrency(summary.weekRevenue) }}</span>
              <span class="summary-growth" :class="formatGrowthClass(summary.weekGrowth)">
                {{ formatGrowth(summary.weekGrowth) }}
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">This Month</span>
              <span class="summary-value">{{ formatCurrency(summary.monthRevenue) }}</span>
              <span class="summary-growth" :class="formatGrowthClass(summary.monthGrowth)">
                {{ formatGrowth(summary.monthGrowth) }}
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">All Time</span>
              <span class="summary-value">{{ formatCurrency(summary.totalRevenue) }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.revenue-analytics-container {
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

.stat-growth {
  font-size: 12px;
  margin-top: 4px;
}

.growth-positive {
  color: #52c41a;
}

.growth-negative {
  color: #ff4d4f;
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.top-devs-card {
  border-radius: 12px;
  margin-bottom: 24px;
}

.breakdown-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-item {
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  align-items: center;
  gap: 12px;
}

.breakdown-label {
  font-size: 12px;
  color: #8c8c8c;
}

.clickable-name {
  cursor: pointer;
  color: #1677ff;
}

.clickable-name:hover {
  text-decoration: underline;
}

.breakdown-value {
  font-size: 12px;
  color: #1a1a1a;
  text-align: right;
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

.summary-growth {
  font-size: 13px;
}

.summary-growth.growth-positive {
  color: #52c41a;
}

.summary-growth.growth-negative {
  color: #ff4d4f;
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
