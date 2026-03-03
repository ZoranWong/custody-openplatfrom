<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import apiService, { type ListResponse, type Application } from '@/services/api'
import ApplicationCard from '@/components/applications/ApplicationCard.vue'
import Button from '@/components/common/Button.vue'

const router = useRouter()

// State
const loading = ref(false)
const applications = ref<Application[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const searchForm = reactive({
  keyword: ''
})

// Fetch applications
const fetchApplications = async () => {
  loading.value = true

  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchForm.keyword.trim() || undefined
    }

    const response = await apiService.getISVApplications() as { data?: { list: Application[], total: number } }
    applications.value = response.data?.list || []
    total.value = response.data?.total || 0
  } catch (e: any) {
    const message = e.response?.data?.message || 'Failed to fetch application list'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

// Search
const handleSearch = () => {
  page.value = 1
  fetchApplications()
}

// Reset search
const handleReset = () => {
  searchForm.keyword = ''
  page.value = 1
  fetchApplications()
}

// Pagination
const handlePageChange = (newPage: number) => {
  page.value = newPage
  fetchApplications()
}

const handlePageSizeChange = (newSize: number) => {
  pageSize.value = newSize
  page.value = 1
  fetchApplications()
}

// Create new application
const handleCreate = () => {
  router.push('/applications/new')
}

// Watch for search input
watch(() => searchForm.keyword, (newVal) => {
  if (!newVal) {
    handleSearch()
  }
})

onMounted(() => {
  fetchApplications()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="w-full mx-auto px-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">My Applications</h1>
          <p class="mt-2 text-gray-600">Manage all your applications</p>
        </div>
        <Button type="primary" @click="handleCreate">
          <el-icon class="mr-1"><Plus /></el-icon>
          Create Application
        </Button>
      </div>

      <!-- Search Bar -->
      <div class="card p-4 mb-6">
        <div class="flex gap-4">
          <el-input
            v-model="searchForm.keyword"
            placeholder="Search application name..."
            size="large"
            class="h-10 max-w-md"
            :prefix-icon="Search"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
          <Button type="primary" @click="handleSearch">
            Search
          </Button>
          <Button type="info" @click="handleReset">
            Reset
          </Button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <el-icon class="is-loading w-8 h-8 text-brand">
          <Loading />
        </el-icon>
      </div>

      <!-- Empty State -->
      <div v-else-if="applications.length === 0" class="card p-12 text-center">
        <el-icon class="w-16 h-16 mx-auto text-gray-300 mb-4">
          <Document />
        </el-icon>
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          {{ searchForm.keyword ? 'No applications found' : 'No applications yet' }}
        </h3>
        <p class="text-gray-500 mb-6">
          {{ searchForm.keyword ? 'Please try other search keywords' : 'Create your first application to start using Cregis Open Platform' }}
        </p>
        <Button v-if="!searchForm.keyword" type="primary" @click="handleCreate">
          <el-icon class="mr-1"><Plus /></el-icon>
          Create Application
        </Button>
        <Button v-else type="info" @click="handleReset">
          Clear Search
        </Button>
      </div>

      <!-- Application List -->
      <div v-else class="space-y-4">
        <ApplicationCard
          v-for="app in applications"
          :key="app.id"
          :application="app"
        />

        <!-- Pagination -->
        <div class="flex items-center justify-between pt-6">
          <span class="text-sm text-gray-500">
            {{ total }} applications in total
          </span>
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="prev, pager, next, sizes"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>
