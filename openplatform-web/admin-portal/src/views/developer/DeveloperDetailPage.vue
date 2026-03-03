<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, User, OfficeBuilding, Location, Ticket, Calendar, Link } from '@element-plus/icons-vue'
import apiService from '@/services/api'
import Button from '@/components/common/Button.vue'
import type { DeveloperDetail } from '@/types/developer'

const route = useRoute()
const router = useRouter()

const developerId = route.params.id as string
const developer = ref<DeveloperDetail | null>(null)
const loading = ref(false)

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

// Fetch developer detail
const fetchDeveloperDetail = async () => {
  if (!developerId) return

  loading.value = true
  try {
    const response = await apiService.getDeveloperById(developerId)
    if (response.code === 0 && response.data) {
      developer.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch developer detail:', error)
  } finally {
    loading.value = false
  }
}

// Go back handler
const handleGoBack = () => {
  router.push('/developer')
}

// Format date
const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

// Get UBO label
const getIdTypeLabel = (type: string) => {
  return type === 'passport' ? 'Passport' : 'National ID'
}

onMounted(() => {
  fetchDeveloperDetail()
})
</script>

<template>
  <div class="developer-detail-page" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <Button type="info" size="small" @click="handleGoBack">
          <el-icon><ArrowLeft /></el-icon>
          Back to List
        </Button>
        <h1>{{ developer?.legalName || 'Loading...' }}</h1>
      </div>
    </div>

    <template v-if="developer">
      <!-- Company Information Card -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <el-icon><OfficeBuilding /></el-icon>
            <span>Company Information</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Legal Name">{{ developer.legalName }}</el-descriptions-item>
          <el-descriptions-item label="Registration Number">
            <span class="font-mono">{{ developer.registrationNumber }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="Jurisdiction">{{ developer.jurisdiction }}</el-descriptions-item>
          <el-descriptions-item label="Date of Incorporation">{{ developer.dateOfIncorporation }}</el-descriptions-item>
          <el-descriptions-item label="Registered Address" :span="2">{{ developer.registeredAddress }}</el-descriptions-item>
          <el-descriptions-item label="Website">
            <a v-if="developer.website" :href="developer.website" target="_blank" class="link">
              <el-icon><Link /></el-icon>
              {{ developer.website }}
            </a>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- KYB Information Card -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <el-icon><Ticket /></el-icon>
            <span>KYB Information</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="KYB Status">
            <el-tag :type="kybStatusMap[developer.kybStatus] || 'info'">
              {{ developer.kybStatus }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Review Time">{{ formatDate(developer.kybReviewedAt) }}</el-descriptions-item>
          <el-descriptions-item label="Reviewer">{{ developer.kybReviewedBy || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Account Status">
            <el-tag :type="statusMap[developer.status] || 'info'">
              {{ developer.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Registration Date">{{ formatDate(developer.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="Last Updated">{{ formatDate(developer.updatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Contact Information Card -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>Contact Information</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Contact Email">{{ developer.contactEmail }}</el-descriptions-item>
          <el-descriptions-item label="Contact Phone">{{ developer.contactPhone || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- UBO Information Card -->
      <el-card class="info-card" v-if="developer.uboInfo && developer.uboInfo.length > 0">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>UBO Information</span>
          </div>
        </template>
        <div class="ubo-list">
          <div v-for="(ubo, index) in developer.uboInfo" :key="index" class="ubo-card">
            <div class="ubo-header">
              <el-icon><User /></el-icon>
              <span class="ubo-name">UBO {{ index + 1 }}</span>
            </div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="Name">{{ ubo.name }}</el-descriptions-item>
              <el-descriptions-item label="ID Type">{{ getIdTypeLabel(ubo.idType) }}</el-descriptions-item>
              <el-descriptions-item label="ID Number">
                <span class="font-mono">{{ ubo.idNumber }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="Nationality">{{ ubo.nationality }}</el-descriptions-item>
              <el-descriptions-item label="Phone">{{ ubo.phone }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.developer-detail-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.info-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.font-mono {
  font-family: monospace;
}

.ubo-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ubo-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
}

.ubo-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  font-weight: 600;
}

.ubo-name {
  font-weight: 600;
}
</style>
