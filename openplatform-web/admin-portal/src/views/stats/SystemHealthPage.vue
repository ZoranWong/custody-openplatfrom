<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { healthApiService, type HealthStatsSummary, type ServiceHealth, type ResourceUsage, type HealthHistory } from '@/services/health-api'
import { usePermissionStore } from '@/stores/permission.store'
import { Resource } from '@/shared/admin-permissions'
import { ElMessage } from 'element-plus'
import {
  Monitor,
  CircleCheck,
  Warning,
  Refresh,
  Loading,
  Timer
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

const permissionStore = usePermissionStore()

// State
const loading = ref(true)
const refreshing = ref(false)
const healthSummary = ref<HealthStatsSummary | null>(null)
const services = ref<ServiceHealth[]>([])
const resources = ref<ResourceUsage | null>(null)
const healthHistory = ref<HealthHistory[]>([])
const error = ref<string | null>(null)

// Auto-refresh
let refreshInterval: ReturnType<typeof setInterval> | null = null

// Chart refs
const historyChartRef = ref<HTMLElement>()
const resourceChartRef = ref<HTMLElement>()
let historyChart: ECharts | null = null
let resourceChart: ECharts | null = null

// Refresh interval options
const refreshOptions = [
  { label: '15 seconds', value: 15000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '5 minutes', value: 300000 }
]
const selectedRefreshInterval = ref(30000)

// Computed
const hasAnalyticsPermission = computed(() => {
  return permissionStore.hasPermission(Resource.ANALYTICS_VIEW)
})

// Format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatResponseTime(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.round(ms)}ms`
}

function formatNetworkSpeed(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} MB/s`
  return `${kbps} KB/s`
}

// Fetch all health data
async function fetchHealthData() {
  if (!hasAnalyticsPermission.value) {
    error.value = 'You do not have permission to view health metrics'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    const [summaryRes, servicesRes, resourcesRes, historyRes] = await Promise.all([
      healthApiService.getHealthStatus(),
      healthApiService.getServicesHealth(),
      healthApiService.getResourceUsage(),
      healthApiService.getHealthHistory(24)
    ])

    if (summaryRes.code === 0 && summaryRes.data) {
      healthSummary.value = summaryRes.data
    }

    if (servicesRes.code === 0 && servicesRes.data) {
      services.value = servicesRes.data
    }

    if (resourcesRes.code === 0 && resourcesRes.data) {
      resources.value = resourcesRes.data
      updateResourceChart()
    }

    if (historyRes.code === 0 && historyRes.data) {
      healthHistory.value = historyRes.data
      updateHistoryChart()
    }
  } catch (err: any) {
    console.error('Failed to fetch health data:', err)
    error.value = err.message || 'Failed to load health metrics'
  } finally {
    loading.value = false
  }
}

// Refresh data
async function refreshStats() {
  try {
    refreshing.value = true
    await fetchHealthData()
  } catch (err: any) {
    console.error('Failed to refresh stats:', err)
  } finally {
    refreshing.value = false
  }
}

// Handle refresh interval change
function onRefreshIntervalChange() {
  startAutoRefresh()
}

// History chart
function updateHistoryChart() {
  if (!historyChartRef.value || !historyChart) return

  const timestamps = healthHistory.value.map(h => h.timestamp)
  const cpuData = healthHistory.value.map(h => h.cpu)
  const memoryData = healthHistory.value.map(h => h.memory)

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
          result += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['CPU', 'Memory'],
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
      data: timestamps,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: string) => {
          const date = new Date(value)
          return date.toLocaleTimeString('en-US', { hour: '2-digit' })
        }
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: {
        color: '#8c8c8c',
        formatter: (value: number) => `${value}%`
      },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
      max: 100
    },
    series: [
      {
        name: 'CPU',
        type: 'line',
        smooth: true,
        data: cpuData,
        lineStyle: { color: '#1677ff', width: 2 },
        itemStyle: { color: '#1677ff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1677ff40' },
            { offset: 1, color: '#1677ff05' }
          ])
        }
      },
      {
        name: 'Memory',
        type: 'line',
        smooth: true,
        data: memoryData,
        lineStyle: { color: '#722ed1', width: 2 },
        itemStyle: { color: '#722ed1' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#722ed140' },
            { offset: 1, color: '#722ed105' }
          ])
        }
      }
    ]
  }

  historyChart.setOption(option)
}

// Resource chart (gauge)
function updateResourceChart() {
  if (!resourceChartRef.value || !resourceChart || !resources.value) return

  const option = {
    series: [
      {
        type: 'gauge',
        center: ['25%', '50%'],
        radius: '80%',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 5,
        progress: {
          show: true,
          width: 12,
          itemStyle: { color: '#1677ff' }
        },
        axisLine: {
          lineStyle: { width: 12, color: [[1, '#f0f0f0']] }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { show: true, offsetCenter: [0, '30px'], fontSize: 12, color: '#8c8c8c' },
        detail: {
          valueAnimation: true,
          fontSize: 20,
          offsetCenter: [0, '0'],
          formatter: '{value}%',
          color: '#1a1a1a'
        },
        data: [{ value: resources.value.cpu, name: 'CPU' }]
      },
      {
        type: 'gauge',
        center: ['75%', '50%'],
        radius: '80%',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 5,
        progress: {
          show: true,
          width: 12,
          itemStyle: { color: '#722ed1' }
        },
        axisLine: {
          lineStyle: { width: 12, color: [[1, '#f0f0f0']] }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { show: true, offsetCenter: [0, '30px'], fontSize: 12, color: '#8c8c8c' },
        detail: {
          valueAnimation: true,
          fontSize: 20,
          offsetCenter: [0, '0'],
          formatter: '{value}%',
          color: '#1a1a1a'
        },
        data: [{ value: resources.value.memory, name: 'Memory' }]
      }
    ]
  }

  resourceChart.setOption(option)
}

// Status cards
const statusCards = computed(() => {
  if (!healthSummary.value) return []

  const summary = healthSummary.value
  const statusColor = summary.overall.status === 'healthy'
    ? { bg: '#f6ffed', border: '#52c41a', text: '#52c41a' }
    : summary.overall.status === 'degraded'
      ? { bg: '#fff7e6', border: '#fa8c16', text: '#fa8c16' }
      : { bg: '#fff1f0', border: '#ff4d4f', text: '#ff4d4f' }

  return [
    {
      label: 'Overall Status',
      value: summary.overall.status.toUpperCase(),
      status: summary.overall.status,
      icon: summary.overall.status,
      iconBgColor: statusColor.bg,
      iconBorderColor: statusColor.border,
      iconColor: statusColor.text,
      detail: `Uptime: ${formatUptime(summary.overall.uptime)}`
    },
    {
      label: 'Services Healthy',
      value: summary.servicesCount.healthy,
      total: summary.servicesCount.total,
      icon: 'check',
      iconBgColor: '#f6ffed',
      iconColor: '#52c41a',
      detail: `${summary.servicesCount.degraded} degraded, ${summary.servicesCount.down} down`
    },
    {
      label: 'Last Check',
      value: new Date(summary.overall.lastCheck).toLocaleTimeString(),
      icon: 'timer',
      iconBgColor: '#e6f4ff',
      iconColor: '#1677ff',
      detail: new Date(summary.overall.lastCheck).toLocaleDateString()
    }
  ]
})

// Get status icon
function getStatusIcon(status: string) {
  switch (status) {
    case 'healthy': return CircleCheck
    case 'degraded': return Warning
    case 'down': return Warning
    default: return Monitor
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'healthy': return '#52c41a'
    case 'degraded': return '#fa8c16'
    case 'down': return '#ff4d4f'
    default: return '#8c8c8c'
  }
}

// Start auto-refresh
function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(() => {
    fetchHealthData()
  }, selectedRefreshInterval.value)
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
  if (historyChartRef.value) {
    historyChart = echarts.init(historyChartRef.value)
    updateHistoryChart()
  }
  if (resourceChartRef.value) {
    resourceChart = echarts.init(resourceChartRef.value)
    if (resources.value) {
      updateResourceChart()
    }
  }
}

// Resize handler
function handleResize() {
  historyChart?.resize()
  resourceChart?.resize()
}

// ============================================
// Alert Configuration (AC: Alert configuration for threshold-based notifications)
// ============================================

interface AlertConfig {
  enabled: boolean
  cpuThreshold: number
  memoryThreshold: number
  errorRateThreshold: number
  responseTimeThreshold: number
  notifyEmail: string
  notifySlack: string
}

const alertDialogVisible = ref(false)
const alertConfig = ref<AlertConfig>({
  enabled: true,
  cpuThreshold: 80,
  memoryThreshold: 85,
  errorRateThreshold: 2,
  responseTimeThreshold: 500,
  notifyEmail: '',
  notifySlack: ''
})

const alerts = ref<Array<{ id: string; type: string; message: string; time: string; severity: 'info' | 'warning' | 'critical' }>>([
  { id: '1', type: 'cpu', message: 'CPU usage exceeded 80% threshold', time: new Date().toISOString(), severity: 'warning' }
])

const activeAlertCount = computed(() => alerts.value.filter(a => a.severity === 'critical').length)

function saveAlertConfig() {
  // In production, this would call API to save alert configuration
  console.log('Saving alert config:', alertConfig.value)
  alertDialogVisible.value = false
  ElMessage.success('Alert configuration saved successfully')
}

function openAlertConfig() {
  alertDialogVisible.value = true
}

// Initialize alerts from localStorage
onMounted(async () => {
  await permissionStore.loadPermissions()
  await fetchHealthData()
  startAutoRefresh()
  initCharts()
  window.addEventListener('resize', handleResize)

  // Load saved alert config
  const savedConfig = localStorage.getItem('healthAlertConfig')
  if (savedConfig) {
    try {
      alertConfig.value = JSON.parse(savedConfig)
    } catch (e) {
      console.warn('Failed to parse saved alert config')
    }
  }
})

onUnmounted(() => {
  stopAutoRefresh()
  window.removeEventListener('resize', handleResize)
  historyChart?.dispose()
  resourceChart?.dispose()
})
</script>

<template>
  <div class="health-container">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">System Health</h1>
        <p class="page-subtitle">Monitor platform health, services, and resources</p>
      </div>
      <div class="header-right">
        <el-badge :value="activeAlertCount" :hidden="activeAlertCount === 0" type="danger">
          <el-button :icon="Warning" @click="openAlertConfig">
            Alerts
          </el-button>
        </el-badge>
        <el-select v-model="selectedRefreshInterval" style="width: 150px" @change="onRefreshIntervalChange">
          <el-option
            v-for="option in refreshOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-button type="primary" :icon="Refresh" :loading="refreshing" @click="refreshStats">
          Refresh
        </el-button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !healthSummary" class="loading-container">
      <el-icon class="loading-spinner" :size="40"><Loading /></el-icon>
      <p>Loading health metrics...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <el-alert
        title="Failed to load health metrics"
        :description="error"
        type="error"
        show-icon
        :closable="false"
      />
      <el-button type="primary" @click="fetchHealthData">Retry</el-button>
    </div>

    <!-- Health Content -->
    <template v-else-if="healthSummary">
      <!-- Status Cards -->
      <div class="stats-grid">
        <div v-for="(card, index) in statusCards" :key="index" class="stat-card">
          <div class="stat-icon" :style="{ backgroundColor: card.iconBgColor }">
            <el-icon :size="24" :color="card.iconColor">
              <component :is="getStatusIcon(card.status || 'healthy')" v-if="card.status" />
              <Monitor v-else-if="card.icon === 'monitor'" />
              <Timer v-else-if="card.icon === 'timer'" />
              <CircleCheck v-else />
            </el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value" :style="{ color: getStatusColor(card.status || 'healthy') }">
              {{ card.value }}
              <span v-if="card.total" class="stat-total">/{{ card.total }}</span>
            </div>
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-detail">{{ card.detail }}</div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">Resource Usage (CPU & Memory)</span>
          </template>
          <div ref="resourceChartRef" class="chart-container"></div>
        </el-card>

        <el-card class="chart-card">
          <template #header>
            <span class="card-title">Health History (24h)</span>
          </template>
          <div ref="historyChartRef" class="chart-container"></div>
        </el-card>
      </div>

      <!-- Services Table -->
      <el-card class="services-card">
        <template #header>
          <span class="card-title"><Monitor /> Service Health</span>
        </template>
        <el-table :data="services" style="width: 100%" stripe>
          <el-table-column prop="serviceName" label="Service" min-width="200" />
          <el-table-column label="Status" width="120">
            <template #default="{ row }">
              <el-tag :type="row.status === 'healthy' ? 'success' : row.status === 'degraded' ? 'warning' : 'danger'">
                <el-icon><component :is="getStatusIcon(row.status)" /></el-icon>
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Response Time" width="180">
            <template #default="{ row }">
              <div class="response-times">
                <span class="rt-p50">P50: {{ formatResponseTime(row.responseTime.p50) }}</span>
                <span class="rt-p95">P95: {{ formatResponseTime(row.responseTime.p95) }}</span>
                <span class="rt-p99">P99: {{ formatResponseTime(row.responseTime.p99) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="errorRate" label="Error Rate" width="120">
            <template #default="{ row }">
              <span :class="{ 'error-high': row.errorRate > 2 }">
                {{ row.errorRate.toFixed(2) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Last Check" width="150">
            <template #default="{ row }">
              {{ new Date(row.lastCheck).toLocaleTimeString() }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Resource Details -->
      <div class="resource-details">
        <el-card class="resource-card">
          <template #header>
            <span class="card-title"><Storage /> Disk Usage</span>
          </template>
          <div class="resource-content">
            <div class="resource-value">{{ resources?.disk || 0 }}%</div>
            <el-progress
              :percentage="resources?.disk || 0"
              :stroke-color="(resources?.disk || 0) > 80 ? '#ff4d4f' : '#1677ff'"
              :show-text="false"
              :stroke-width="10"
            />
          </div>
        </el-card>

        <el-card class="resource-card">
          <template #header>
            <span class="card-title"><Network /> Network In</span>
          </template>
          <div class="resource-content">
            <div class="resource-value">{{ formatNetworkSpeed(resources?.network?.in || 0) }}</div>
          </div>
        </el-card>

        <el-card class="resource-card">
          <template #header>
            <span class="card-title"><Network /> Network Out</span>
          </template>
          <div class="resource-content">
            <div class="resource-value">{{ formatNetworkSpeed(resources?.network?.out || 0) }}</div>
          </div>
        </el-card>
      </div>

      <!-- Active Alerts Panel -->
      <el-card class="alerts-card">
        <template #header>
          <span class="card-title"><Warning /> Active Alerts ({{ activeAlertCount }})</span>
        </template>
        <el-table v-if="alerts.length > 0" :data="alerts" style="width: 100%">
          <el-table-column label="Severity" width="100">
            <template #default="{ row }">
              <el-tag :type="row.severity === 'critical' ? 'danger' : row.severity === 'warning' ? 'warning' : 'info'">
                {{ row.severity }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="type" label="Type" width="120" />
          <el-table-column prop="message" label="Message" />
          <el-table-column label="Time" width="150">
            <template #default="{ row }">
              {{ new Date(row.time).toLocaleString() }}
            </template>
          </el-table-column>
        </el-table>
        <div v-else class="no-alerts">
          <el-icon color="#52c41a" :size="24"><CircleCheck /></el-icon>
          <p>No active alerts - all systems operational</p>
        </div>
      </el-card>
    </template>

    <!-- Alert Configuration Dialog -->
    <el-dialog v-model="alertDialogVisible" title="Alert Configuration" width="500px">
      <el-form :model="alertConfig" label-width="160px">
        <el-form-item label="Enable Alerts">
          <el-switch v-model="alertConfig.enabled" />
        </el-form-item>
        <el-divider content-position="left">Thresholds</el-divider>
        <el-form-item label="CPU Threshold (%)">
          <el-slider v-model="alertConfig.cpuThreshold" :min="50" :max="100" show-input />
        </el-form-item>
        <el-form-item label="Memory Threshold (%)">
          <el-slider v-model="alertConfig.memoryThreshold" :min="50" :max="100" show-input />
        </el-form-item>
        <el-form-item label="Error Rate (%)">
          <el-slider v-model="alertConfig.errorRateThreshold" :min="0.1" :max="10" :step="0.1" show-input />
        </el-form-item>
        <el-form-item label="Response Time (ms)">
          <el-slider v-model="alertConfig.responseTimeThreshold" :min="100" :max="5000" :step="100" show-input />
        </el-form-item>
        <el-divider content-position="left">Notifications</el-divider>
        <el-form-item label="Email">
          <el-input v-model="alertConfig.notifyEmail" placeholder="email@example.com" />
        </el-form-item>
        <el-form-item label="Slack Webhook">
          <el-input v-model="alertConfig.notifySlack" placeholder="https://hooks.slack.com/..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="alertDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="saveAlertConfig">Save Configuration</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.health-container {
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

.stat-total {
  font-size: 16px;
  color: #8c8c8c;
  font-weight: normal;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
}

.stat-detail {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
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

.services-card {
  border-radius: 12px;
  margin-bottom: 24px;
}

.response-times {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.rt-p50 { color: #52c41a; }
.rt-p95 { color: #fa8c16; }
.rt-p99 { color: #ff4d4f; }

.error-high {
  color: #ff4d4f;
  font-weight: 500;
}

.resource-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.resource-card {
  border-radius: 12px;
}

.alerts-card {
  border-radius: 12px;
  margin-bottom: 24px;
}

.no-alerts {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  gap: 12px;
  color: #52c41a;
}

.resource-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-value {
  font-size: 24px;
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
