<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Mock ISV data
const isvList = ref([
  {
    id: 'isv-001',
    name: 'TechCorp Inc.',
    email: 'admin@techcorp.com',
    status: 'active',
    kybStatus: 'approved',
    createdAt: '2026-01-15'
  },
  {
    id: 'isv-002',
    name: 'CryptoExchange Ltd.',
    email: 'admin@cryptoex.com',
    status: 'active',
    kybStatus: 'approved',
    createdAt: '2026-01-20'
  },
  {
    id: 'isv-003',
    name: 'FinTech Solutions',
    email: 'admin@fintech.io',
    status: 'suspended',
    kybStatus: 'pending',
    createdAt: '2026-02-01'
  }
])

const statusMap: Record<string, string> = {
  active: 'success',
  suspended: 'warning',
  banned: 'danger'
}

const kybStatusMap: Record<string, string> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger'
}

const handleViewStatus = (id: string) => {
  router.push(`/isv/${id}/status`)
}
</script>

<template>
  <div class="isv-list-page">
    <div class="page-header">
      <h1>ISV Management</h1>
    </div>

    <el-card class="list-card">
      <el-table :data="isvList" style="width: 100%" stripe>
        <el-table-column prop="name" label="Company Name" min-width="180" />
        <el-table-column prop="email" label="Contact Email" min-width="200" />
        <el-table-column prop="status" label="Status" width="120">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status] || 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="kybStatus" label="KYB Status" width="120">
          <template #default="{ row }">
            <el-tag :type="kybStatusMap[row.kybStatus] || 'info'">
              {{ row.kybStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="Created At" width="180" />
        <el-table-column label="Actions" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewStatus(row.id)">
              View Details
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.isv-list-page {
  padding: 0 24px;
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
</style>
