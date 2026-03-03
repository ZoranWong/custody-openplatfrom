<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { apiService, type DashboardStats, type DashboardTrends, type TrendData, type DashboardDetails } from '@/services/api'
import { usePermissionStore } from '@/stores/permission.store'
import type { Resource } from '@/shared/admin-permissions'
import StatsCard from '@/components/dashboard/StatsCard.vue'
import TrendChart from '@/components/dashboard/TrendChart.vue'
import {
  User,
  Folder,
  Connection,
  Warning,
  Refresh,
  Loading,
  Top,
  TrendCharts
} from '@element-plus/icons-vue'

const permissionStore = usePermissionStore()

// State
const loading = ref(true)
const refreshing = ref(false)
const stats = ref<DashboardStats | null>(null)
const trends = ref<DashboardTrends | null>(null)
const details = ref<DashboardDetails | null>(null)
const lastUpdated = ref<Date | null>(null)
const error = ref<string | null>(null)

// Auto-refresh interval
let refreshInterval: ReturnType<typeof setInterval> | null = null

const REFRESH_INTERVAL = 60000 // 1 minute

// Computed
const hasAnalyticsPermission = computed(() => {
  return permissionStore.user?.role === 'super_admin' ||
    permissionStore.hasPermission(Resource.ANALYTICS_VIEW)
})

// Trend chart data
const apiCallsData = computed<TrendData[]>(() => {
  return trends.value?.apiCalls || []
})

const errorRateData = computed<TrendData[]>(() => {
  return trends.value?.errorRate || []
})

// Stats card configurations
const statsCards = computed(() => [
  {
    label: 'Total Developers',
    value: stats.value?.totalDevelopers || 0,
    icon: 'user',
    iconBgColor: '#e6f4ff',
    iconColor: '#1677ff',
    trend: undefined
  },
  {
    label: 'Total Applications',
    value: stats.value?.totalApplications || 0,
    icon: 'folder',
    iconBgColor: '#f6ffed',
    iconColor: '#52c41a',
    trend: undefined
  },
  {
    label: 'Pending KYB Reviews',
    value: stats.value?.pendingKYBReviews || 0,
    icon: 'warning',
    iconBgColor: '#fff7e6',
    iconColor: '#fa8c16',
    trend: undefined
  },
  {
    label: 'API Calls Today',
    value: stats.value?.apiCalls?.today || 0,
    icon: 'connection',
    iconBgColor: '#f9f0ff',
    iconColor: '#722ed1',
    trend: undefined
  }
])

// Format large numbers
function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

// Current time range for trends
const trendDays = ref(7)

// Fetch dashboard data
async function fetchDashboardData() {
  try {
    loading.value = true
    error.value = null

    const [statsRes, trendsRes, detailsRes] = await Promise.all([
      apiService.getDashboardStats(),
      apiService.getDashboardTrends(trendDays.value),
      apiService.getDashboardDetails()
    ])

    if (statsRes.code === 0 && statsRes.data) {
      stats.value = statsRes.data
      lastUpdated.value = new Date(statsRes.data.lastUpdated)
    }

    if (trendsRes.code === 0 && trendsRes.data) {
      trends.value = trendsRes.data
    }

    if (detailsRes.code === 0 && detailsRes.data) {
      details.value = detailsRes.data
    }
  } catch (err: any) {
    console.error('Failed to fetch dashboard data:', err)
    error.value = err.message || 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}

// Handle time range change from chart
function onTimeRangeChange(range: string) {
  trendDays.value = range === '7d' ? 7 : 1
  fetchDashboardData()
}

// Refresh dashboard data
async function refreshDashboard() {
  try {
    refreshing.value = true
    await apiService.refreshDashboardStats()
    await fetchDashboardData()
  } catch (err: any) {
    console.error('Failed to refresh dashboard:', err)
  } finally {
    refreshing.value = false
  }
}

// Start auto-refresh
function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(() => {
    fetchDashboardData()
  }, REFRESH_INTERVAL)
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// Load permissions and data
onMounted(async () => {
  await permissionStore.loadPermissions()
  await fetchDashboardData()
  startAutoRefresh()
})

// Cleanup
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-left">
        <h1 class="dashboard-title">Dashboard Overview</h1>
        <p class="dashboard-subtitle">Platform statistics and performance metrics</p>
      </div>
      <div class="header-right">
        <span v-if="lastUpdated" class="last-updated">
          Last updated: {{ lastUpdated.toLocaleTimeString() }}
        </span>
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="refreshing"
          @click="refreshDashboard"
        >
          Refresh
        </el-button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !stats" class="loading-container">
      <el-icon class="loading-spinner" :size="40"><Loading /></el-icon>
      <p>Loading dashboard data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <el-alert
        title="Failed to load dashboard"
        :description="error"
        type="error"
        show-icon
        :closable="false"
      />
      <el-button type="primary" @click="fetchDashboardData">Retry</el-button>
    </div>

    <!-- Dashboard Content -->
    <template v-else>
      <!-- Stats Cards -->
      <div class="stats-grid">
        <StatsCard
          v-for="(card, index) in statsCards"
          :key="index"
          :label="card.label"
          :value="card.value"
          :icon="card.icon"
          :icon-bg-color="card.iconBgColor"
          :icon-color="card.iconColor"
          :trend="card.trend"
        />
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-row">
          <div class="chart-col">
            <TrendChart
              title="API Calls Trend"
              :data="apiCallsData"
              color="#1677ff"
              :area-style="true"
              @timeRangeChange="onTimeRangeChange"
            />
          </div>
          <div class="chart-col">
            <TrendChart
              title="Error Rate Trend"
              :data="errorRateData"
              color="#ff4d4f"
              :area-style="true"
              @timeRangeChange="onTimeRangeChange"
            />
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats">
        <el-card class="quick-stats-card">
          <template #header>
            <span class="card-title">Quick Statistics</span>
          </template>
          <div class="quick-stats-content">
            <div class="quick-stat-item">
              <span class="stat-label">API Calls This Week</span>
              <span class="stat-value">{{ formatNumber(stats?.apiCalls?.thisWeek || 0) }}</span>
            </div>
            <div class="quick-stat-item">
              <span class="stat-label">API Calls This Month</span>
              <span class="stat-value">{{ formatNumber(stats?.apiCalls?.thisMonth || 0) }}</span>
            </div>
            <div class="quick-stat-item">
              <span class="stat-label">Error Rate</span>
              <span class="stat-value" :class="{ 'error-high': (stats?.errorRate || 0) > 5 }">
                {{ (stats?.errorRate || 0).toFixed(2) }}%
              </span>
            </div>
          </div>
        </el-card>
      </div>

      <!-- Detailed Statistics (E.2.3) -->
      <div class="details-section" v-if="details">
        <div class="details-grid">
          <!-- Developer Status Breakdown -->
          <el-card class="details-card">
            <template #header>
              <div class="card-header">
                <el-icon><User /></el-icon>
                <span>Developer Status</span>
              </div>
            </template>
            <div class="status-grid">
              <div class="status-item">
                <span class="status-value">{{ details.developers.active }}</span>
                <span class="status-label">Active</span>
              </div>
              <div class="status-item">
                <span class="status-value status-pending">{{ details.developers.pending }}</span>
                <span class="status-label">Pending</span>
              </div>
              <div class="status-item">
                <span class="status-value status-suspended">{{ details.developers.suspended }}</span>
                <span class="status-label">Suspended</span>
              </div>
              <div class="status-item">
                <span class="status-value status-total">{{ details.developers.total }}</span>
                <span class="status-label">Total</span>
              </div>
            </div>
          </el-card>

          <!-- Application Status Breakdown -->
          <el-card class="details-card">
            <template #header>
              <div class="card-header">
                <el-icon><Folder /></el-icon>
                <span>Application Status</span>
              </div>
            </template>
            <div class="status-grid">
              <div class="status-item">
                <span class="status-value">{{ details.applications.active }}</span>
                <span class="status-label">Active</span>
              </div>
              <div class="status-item">
                <span class="status-value status-pending">{{ details.applications.pendingReview }}</span>
                <span class="status-label">Pending Review</span>
              </div>
              <div class="status-item">
                <span class="status-value status-suspended">{{ details.applications.suspended }}</span>
                <span class="status-label">Suspended</span>
              </div>
              <div class="status-item">
                <span class="status-value status-total">{{ details.applications.total }}</span>
                <span class="status-label">Total</span>
              </div>
            </div>
          </el-card>
        </div>

        <!-- Top Applications -->
        <el-card class="top-apps-card">
          <template #header>
            <div class="card-header">
              <el-icon><Top /></el-icon>
              <span>Top Applications by API Calls</span>
            </div>
          </template>
          <el-table :data="details.topApplications" stripe style="width: 100%">
            <el-table-column prop="appName" label="Application" min-width="200" />
            <el-table-column prop="appId" label="App ID" width="180" />
            <el-table-column prop="calls" label="API Calls" width="140">
              <template #default="{ row }">
                {{ formatNumber(row.calls) }}
              </template>
            </el-table-column>
            <el-table-column prop="errorRate" label="Error Rate" width="120">
              <template #default="{ row }">
                <span :class="{ 'error-high': row.errorRate > 5 }">
                  {{ row.errorRate.toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100%;
}

.dashboard-header {
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

.dashboard-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.dashboard-subtitle {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.last-updated {
  font-size: 13px;
  color: #8c8c8c;
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.charts-section {
  margin-bottom: 24px;
}

.chart-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-col {
  min-width: 0;
}

.quick-stats {
  margin-bottom: 24px;
}

.quick-stats-card {
  border-radius: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.quick-stats-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 24px;
  padding: 8px 0;
}

.quick-stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-value.error-high {
  color: #ff4d4f;
}

.details-section {
  margin-bottom: 24px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.details-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 8px 0;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.status-value {
  font-size: 24px;
  font-weight: 700;
  color: #1677ff;
}

.status-value.status-pending {
  color: #fa8c16;
}

.status-value.status-suspended {
  color: #ff4d4f;
}

.status-value.status-total {
  color: #722ed1;
}

.status-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.top-apps-card {
  border-radius: 12px;
}

.error-high {
  color: #ff4d4f;
}
</style>
