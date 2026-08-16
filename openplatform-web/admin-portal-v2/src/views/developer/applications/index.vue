<template>
  <div class="art-full-height">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ developerName }} - 应用列表</h2>
      <ElButton @click="goBack">返回</ElButton>
    </div>
    <ElCard class="art-table-card">
      <ArtTable :data="applications" :columns="columns" v-loading="loading" />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DeveloperApplications' })

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElTag } from 'element-plus'
import { fetchDeveloperById } from '@/api/developer'

const route = useRoute()
const router = useRouter()
const developerId = route.params.developerId as string
const developerName = ref('')
const applications = ref<any[]>([])
const loading = ref(false)

const columns = [
  { type: 'index' as const, width: 60, label: '序号' },
  { prop: 'appName', label: '应用名称', minWidth: 150 },
  { prop: 'id', label: 'App ID', width: 280 },
  { prop: 'appType', label: '类型', width: 120 },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    formatter: (row: any) => {
      return h(ElTag, { type: row.status === 'active' ? 'success' : 'info' }, () => row.status)
    },
  },
  { prop: 'createdAt', label: '创建时间', width: 180 },
]

onMounted(async () => {
  loading.value = true
  try {
    const response = await fetchDeveloperById(developerId)
    if (response) {
      developerName.value = response.legalName || ''
      applications.value = response.applications || []
    }
  } finally {
    loading.value = false
  }
})

const goBack = () => router.back()
</script>
