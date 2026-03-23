<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { kybApiService, type KYBPendingItem, type KYBStatus, KYBStatus as StatusEnum } from '@/services/kyb-api'
import { usePermissionStore } from '@/stores/permission.store'
import {
  Document,
  Search,
  Refresh
} from '@element-plus/icons-vue'
import type { ElTable } from 'element-plus'

const router = useRouter()
const permissionStore = usePermissionStore()

// State
const loading = ref(true)
const refreshing = ref(false)
const applications = ref<KYBPendingItem[]>([])
const totalApplications = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const statusFilter = ref<KYBStatus | undefined>(undefined)
const searchQuery = ref('')
const tableRef = ref<InstanceType<typeof ElTable>>()

// Computed
const filteredApplications = computed(() => {
  let result = applications.value

  // Apply status filter
  if (statusFilter.value) {
    result = result.filter(app => app.status === statusFilter.value)
  }

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(app =>
      app.legalName.toLowerCase().includes(query) ||
      app.registrationNumber.toLowerCase().includes(query) ||
      app.jurisdiction.toLowerCase().includes(query)
    )
  }

  return result
})

const statusCounts = computed(() => {
  return {
    pending: applications.value.filter(a => a.status === StatusEnum.PENDING).length,
    pendingInfo: applications.value.filter(a => a.status === StatusEnum.PENDING_INFO).length,
    approved: applications.value.filter(a => a.status === StatusEnum.APPROVED).length,
    rejected: applications.value.filter(a => a.status === StatusEnum.REJECTED).length
  }
})

// Methods
async function fetchApplications() {
  try {
    loading.value = true

    const response = await kybApiService.getAllApplications(statusFilter.value, {
      page: currentPage.value,
      limit: pageSize.value
    })

    if (response.code === 0 && response.data) {
      applications.value = response.data.items || []
      totalApplications.value = response.data.total || 0
    }
  } catch (err: any) {
    console.error('Failed to fetch KYB applications:', err)
  } finally {
    loading.value = false
  }
}

async function refreshList() {
  try {
    refreshing.value = true
    await fetchApplications()
  } finally {
    refreshing.value = false
  }
}

function viewDetails(id: string) {
  router.push(`/kyb/${id}`)
}

function setStatusFilter(status: KYBStatus | undefined) {
  statusFilter.value = status
}

function tableRowClassName(_row: { row: KYBPendingItem }): string {
  return 'kyb-row'
}

function handleRowClick({ row }: { row: KYBPendingItem }): void {
  viewDetails(row.id)
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
    case StatusEnum.APPROVED:
      return 'success'
    case StatusEnum.PENDING:
      return 'warning'
    case StatusEnum.PENDING_INFO:
      return 'info'
    case StatusEnum.REJECTED:
      return 'danger'
    default:
      return 'info'
  }
}

function getStatusLabel(status: KYBStatus): string {
  switch (status) {
    case StatusEnum.APPROVED:
      return 'Approved'
    case StatusEnum.PENDING:
      return 'Pending Review'
    case StatusEnum.PENDING_INFO:
      return 'Pending Info'
    case StatusEnum.REJECTED:
      return 'Rejected'
    default:
      return status
  }
}

// Lifecycle
onMounted(async () => {
  await permissionStore.loadPermissions()
  await fetchApplications()
})
</script>

<template>
  <div class="kyb-list-container">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">KYB Review</h1>
        <p class="page-subtitle">Review and manage ISV Know Your Business applications</p>
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
      <div class="stat-card" :class="{ active: !statusFilter }" @click="setStatusFilter(undefined)">
        <div class="stat-value">{{ applications.length }}</div>
        <div class="stat-label">All Applications</div>
      </div>
      <div class="stat-card pending" :class="{ active: statusFilter === 'pending' }" @click="setStatusFilter('pending' as KYBStatus)">
        <div class="stat-value">{{ statusCounts.pending }}</div>
        <div class="stat-label">Pending Review</div>
      </div>
      <div class="stat-card info" :class="{ active: statusFilter === 'pending_info' }" @click="setStatusFilter('pending_info' as KYBStatus)">
        <div class="stat-value">{{ statusCounts.pendingInfo }}</div>
        <div class="stat-label">Pending Info</div>
      </div>
      <div class="stat-card approved" :class="{ active: statusFilter === 'approved' }" @click="setStatusFilter('approved' as KYBStatus)">
        <div class="stat-value">{{ statusCounts.approved }}</div>
        <div class="stat-label">Approved</div>
      </div>
      <div class="stat-card rejected" :class="{ active: statusFilter === 'rejected' }" @click="setStatusFilter('rejected' as KYBStatus)">
        <div class="stat-value">{{ statusCounts.rejected }}</div>
        <div class="stat-label">Rejected</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="Search by company name or registration number"
          :prefix-icon="Search"
          clearable
          style="width: 320px"
        />
      </div>
      <div class="filter-actions">
        <el-tag
          v-if="statusFilter"
          closable
          @close="setStatusFilter(undefined)"
          class="filter-tag"
        >
          Status: {{ getStatusLabel(statusFilter) }}
        </el-tag>
      </div>
    </div>

    <!-- Table -->
    <el-card class="table-card" shadow="hover">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="filteredApplications"
        style="width: 100%"
        :row-class-name="tableRowClassName"
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

        <el-table-column prop="registrationNumber" label="Registration #" width="180" />

        <el-table-column prop="submittedAt" label="Submitted" width="180">
          <template #default="{ row }">
            {{ formatDate(row.submittedAt) }}
          </template>
        </el-table-column>

        <el-table-column prop="status" label="Status" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
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
              Review
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container" v-if="totalApplications > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalApplications"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchApplications"
          @current-change="fetchApplications"
        />
      </div>

      <!-- Empty State -->
      <el-empty
        v-if="!loading && filteredApplications.length === 0"
        description="No applications found"
      >
        <template v-if="searchQuery || statusFilter">
          <el-button type="primary" @click="searchQuery = ''; setStatusFilter(undefined)">
            Clear Filters
          </el-button>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<style scoped>
.kyb-list-container {
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

.stat-card.pending .stat-value { color: #fa8c16; }
.stat-card.info .stat-value { color: #1677ff; }
.stat-card.approved .stat-value { color: #52c41a; }
.stat-card.rejected .stat-value { color: #ff4d4f; }

.filters-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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

:deep(.el-table) {
  --el-table-border-color: #f0f0f0;
}

:deep(.kyb-row) {
  cursor: pointer;
}

:deep(.kyb-row:hover) {
  background-color: #f5f7fa;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}
</style>
