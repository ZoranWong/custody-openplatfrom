<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import apiService from '@/services/api'
import Button from '@/components/common/Button.vue'
import type { DeveloperItem, DevelopersResponse } from '@/types/developer'

const router = useRouter()

// State
const developerList = ref<DeveloperItem[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const activeTab = ref('all')

// Status mapping
const statusMap: Record<string, string> = {
  active: 'success',
  suspended: 'warning',
  banned: 'danger',
  pending: 'info'
}

const kybStatusMap: Record<string, string> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger'
}

// Fetch developers list
const fetchDevelopers = async () => {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: currentPage.value,
      pageSize: pageSize.value
    }

    // Add filter conditions
    if (activeTab.value === 'pending') {
      params.kybStatus = 'pending'
    } else if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }

    const response = await apiService.getDevelopers(params)
    if (response.code === 0 && response.data) {
      developerList.value = response.data.list
      total.value = response.data.total
    }
  } catch (error) {
    console.error('Failed to fetch developers list:', error)
  } finally {
    loading.value = false
  }
}

// Tab change handler
const handleTabChange = () => {
  currentPage.value = 1
  fetchDevelopers()
}

// Page change handler
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchDevelopers()
}

// Page size change handler
const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  fetchDevelopers()
}

// View detail handler
const handleViewDetail = (id: string) => {
  router.push(`/developer/${id}`)
}

// Review handler
const handleReview = (id: string) => {
  router.push(`/developer/${id}/review`)
}

// Format date
const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

// Initialize
onMounted(() => {
  fetchDevelopers()
})
</script>

<template>
  <div class="developer-list-page">
    <div class="page-header">
      <h1>Developer Management</h1>
    </div>

    <el-card class="list-card">
      <div class="tabs">
        <el-radio-group v-model="activeTab" size="large" @change="handleTabChange">
          <el-radio-button value="all">All</el-radio-button>
          <el-radio-button value="pending">Pending Review</el-radio-button>
          <el-radio-button value="approved">Approved</el-radio-button>
          <el-radio-button value="rejected">Rejected</el-radio-button>
          <el-radio-button value="active">Active</el-radio-button>
          <el-radio-button value="suspended">Suspended</el-radio-button>
        </el-radio-group>
      </div>

      <el-table
        :data="developerList"
        style="width: 100%"
        stripe
        v-loading="loading"
        empty-text="No data available"
      >
        <el-table-column prop="legalName" label="Legal Name" min-width="180" />
        <el-table-column prop="jurisdiction" label="Jurisdiction" width="120" />
        <el-table-column prop="contactEmail" label="Contact Email" min-width="200" />
        <el-table-column prop="kybStatus" label="KYB Status" width="120">
          <template #default="{ row }">
            <el-tag :type="kybStatusMap[row.kybStatus] || 'info'">
              {{ row.kybStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Account Status" width="120">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status] || 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="Registration Date" width="150">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="180" fixed="right">
          <template #default="{ row }">
            <Button type="primary" size="small" @click="handleViewDetail(row.id)">
              View Details
            </Button>
            <Button
              v-if="row.kybStatus === 'pending'"
              type="warning"
              size="small"
              @click="handleReview(row.id)"
            >
              Review
            </Button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.developer-list-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.list-card {
  border-radius: 8px;
}

.tabs {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
