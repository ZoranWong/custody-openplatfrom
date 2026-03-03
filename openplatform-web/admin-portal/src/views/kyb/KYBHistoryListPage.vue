<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { kybApiService, type KYBHistoryItem, type HistoryFilters, KYBStatus } from '@/services/kyb-api'
import { usePermissionStore } from '@/stores/permission.store'
import {
  Search,
  Refresh,
  Document
} from '@element-plus/icons-vue'
import type { ElTable } from 'element-plus'

const router = useRouter()
const permissionStore = usePermissionStore()

// State
const loading = ref(true)
const refreshing = ref(false)
const historyItems = ref<KYBHistoryItem[]>([])
const totalItems = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// Filter state
const statusFilter = ref<string>('')
const searchQuery = ref('')
const dateRange = ref<[string, string] | null>(null)
const sortBy = ref<'reviewedAt' | 'submittedAt'>('reviewedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const tableRef = ref<InstanceType<typeof ElTable>>()

// Computed
const filteredItems = computed(() => {
  let result = historyItems.value

  // Apply status filter
  if (statusFilter.value) {
    result = result.filter(item => item.decision === statusFilter.value)
  }

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(item =>
      item.legalName.toLowerCase().includes(query) ||
      item.reviewerId.toLowerCase().includes(query) ||
      item.jurisdiction.toLowerCase().includes(query)
    )
  }

  return result
})

const statusCounts = computed(() => {
  return {
    all: historyItems.value.length,
    approved: historyItems.value.filter(i => i.decision === KYBStatus.APPROVED).length,
    rejected: historyItems.value.filter(i => i.decision === KYBStatus.REJECTED).length,
    pendingInfo: historyItems.value.filter(i => i.decision === KYBStatus.PENDING_INFO).length
  }
})

// Methods
async function fetchHistory() {
  try {
    loading.value = true

    const filters: HistoryFilters = {
      status: statusFilter.value as KYBStatus || undefined,
      search: searchQuery.value || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
      page: currentPage.value,
      limit: pageSize.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    }

    const response = await kybApiService.getHistoryApplications(filters)

    if (response.code === 0 && response.data) {
      historyItems.value = response.data.items || []
      totalItems.value = response.data.total || 0
    }
  } catch (err: any) {
    console.error('Failed to fetch KYB history:', err)
  } finally {
    loading.value = false
  }
}

async function refreshList() {
  try {
    refreshing.value = true
    await fetchHistory()
  } finally {
    refreshing.value = false
  }
}

function viewDetails(id: string) {
  router.push(`/kyb/history/${id}`)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusType(status: KYBStatus): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case KYBStatus.APPROVED:
      return 'success'
    case KYBStatus.PENDING_INFO:
      return 'info'
    case KYBStatus.REJECTED:
      return 'danger'
    default:
      return 'info'
  }
}

function getStatusLabel(status: KYBStatus): string {
  switch (status) {
    case KYBStatus.APPROVED:
      return 'Approved'
    case KYBStatus.PENDING_INFO:
      return 'Pending Info'
    case KYBStatus.REJECTED:
      return 'Rejected'
    default:
      return status
  }
}

function handleSortChange({ prop, order }: { prop: string; order: string }) {
  if (prop === 'reviewedAt') {
    sortBy.value = 'reviewedAt'
  } else if (prop === 'submittedAt') {
    sortBy.value = 'submittedAt'
  }
  sortOrder.value = order === 'ascending' ? 'asc' : 'desc'
  fetchHistory()
}

function handleSizeChange() {
  currentPage.value = 1
  fetchHistory()
}

function handleCurrentChange() {
  fetchHistory()
}

function handleRowClick(row: KYBHistoryItem): void {
  viewDetails(row.id)
}

function clearFilters() {
  statusFilter.value = ''
  searchQuery.value = ''
  dateRange.value = null
  currentPage.value = 1
  fetchHistory()
}

// Lifecycle
onMounted(async () => {
  await permissionStore.loadPermissions()
  await fetchHistory()
})
</script>

<template>
  <div class="kyb-history-container">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">KYB Review History</h1>
        <p class="page-subtitle">View past KYB review decisions and audit records</p>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="refreshing"
          @click="refreshList"
        >
          Refresh
        </el-button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-row">
      <div
        class="stat-card"
        :class="{ active: !statusFilter }"
        @click="statusFilter = ''; fetchHistory()"
      >
        <div class="stat-value">{{ statusCounts.all }}</div>
        <div class="stat-label">All History</div>
      </div>
      <div
        class="stat-card approved"
        :class="{ active: statusFilter === 'approved' }"
        @click="statusFilter = 'approved'; fetchHistory()"
      >
        <div class="stat-value">{{ statusCounts.approved }}</div>
        <div class="stat-label">Approved</div>
      </div>
      <div
        class="stat-card info"
        :class="{ active: statusFilter === 'pending_info' }"
        @click="statusFilter = 'pending_info'; fetchHistory()"
      >
        <div class="stat-value">{{ statusCounts.pendingInfo }}</div>
        <div class="stat-label">Pending Info</div>
      </div>
      <div
        class="stat-card rejected"
        :class="{ active: statusFilter === 'rejected' }"
        @click="statusFilter = 'rejected'; fetchHistory()"
      >
        <div class="stat-value">{{ statusCounts.rejected }}</div>
        <div class="stat-label">Rejected</div>
      </div>
    </div>

    <!-- Filters -->
    <el-card class="filter-card" shadow="never">
      <div class="filters-row">
        <div class="filter-group">
          <el-input
            v-model="searchQuery"
            placeholder="Search by company or reviewer"
            :prefix-icon="Search"
            clearable
            style="width: 280px"
            @clear="fetchHistory"
            @keyup.enter="fetchHistory"
          />

          <el-date-picker
            v-model="dateRange"
            type="daterange"
            start-placeholder="Start date"
            end-placeholder="End date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 280px"
            clearable
            @clear="fetchHistory"
          />

          <el-button
            v-if="statusFilter || searchQuery || dateRange"
            type="text"
            @click="clearFilters"
          >
            Clear Filters
          </el-button>
        </div>

        <div class="filter-actions">
          <el-tag
            v-if="statusFilter"
            closable
            @close="statusFilter = ''; fetchHistory()"
            class="filter-tag"
          >
            {{ getStatusLabel(statusFilter as KYBStatus) }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- Table -->
    <el-card class="table-card" shadow="hover">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="filteredItems"
        style="width: 100%"
        :default-sort="{ prop: 'reviewedAt', order: 'descending' }"
        @sort-change="handleSortChange"
        @row-click="handleRowClick"
      >
        <el-table-column prop="legalName" label="Company" min-width="200">
          <template #default="{ row }">
            <div class="company-cell">
              <el-icon class="company-icon"><Document /></el-icon>
              <span class="company-name">{{ row.legalName }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="jurisdiction" label="Jurisdiction" width="140" />

        <el-table-column prop="reviewerId" label="Reviewer" width="150" />

        <el-table-column prop="decision" label="Decision" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.decision)" size="small">
              {{ getStatusLabel(row.decision) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="reviewedAt" label="Review Date" width="170" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.reviewedAt) }}
          </template>
        </el-table-column>

        <el-table-column prop="submittedAt" label="Submitted" width="170" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.submittedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="Actions" width="120" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              text
              @click.stop="viewDetails(row.id)"
            >
              View
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container" v-if="totalItems > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalItems"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <!-- Empty State -->
      <el-empty
        v-if="!loading && filteredItems.length === 0"
        description="No history records found"
      >
        <template v-if="statusFilter || searchQuery || dateRange">
          <el-button type="primary" @click="clearFilters">
            Clear Filters
          </el-button>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<style scoped>
.kyb-history-container {
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

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.active {
  border-color: #1677ff;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-top: 4px;
}

.stat-card.approved .stat-value { color: #52c41a; }
.stat-card.info .stat-value { color: #1677ff; }
.stat-card.rejected .stat-value { color: #ff4d4f; }

.filter-card {
  margin-bottom: 16px;
  border-radius: 12px;
}

.filters-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-tag {
  cursor: pointer;
}

.table-card {
  border-radius: 12px;
}

.company-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.company-icon {
  color: #8c8c8c;
  font-size: 18px;
}

.company-name {
  font-weight: 500;
  color: #1a1a1a;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}

:deep(.el-table) {
  --el-table-border-color: #f0f0f0;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>
