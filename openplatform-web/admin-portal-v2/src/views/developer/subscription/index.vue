<template>
  <div class="art-full-height">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ developerName }} - 订阅信息</h2>
      <ElButton @click="goBack">返回</ElButton>
    </div>
    <ElCard>
      <ElEmpty description="订阅功能将在计费系统完成后启用" />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DeveloperSubscription' })

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchDeveloperById } from '@/api/developer'

const route = useRoute()
const router = useRouter()
const developerId = route.params.developerId as string
const developerName = ref('')

onMounted(async () => {
  try {
    const response = await fetchDeveloperById(developerId)
    if (response) {
      developerName.value = response.legalName || ''
    }
  } catch {
    // error handled by http interceptor
  }
})

const goBack = () => router.back()
</script>
