<!-- ISV 详情页面 -->
<template>
  <div class="isv-detail-page">
    <ElCard>
      <template #header>
        <div class="flex items-center">
          <ElButton @click="router.back()" v-ripple>
            <span class="i-ri:arrow-left-line mr-1"></span>
            返回
          </ElButton>
          <span class="text-lg font-medium ml-4">ISV详情</span>
        </div>
      </template>

      <div v-loading="loading">
        <ElDescriptions v-if="isv" :column="2" border>
          <ElDescriptionsItem label="ISV名称">{{ isv.name }}</ElDescriptionsItem>
          <ElDescriptionsItem label="App ID">{{ isv.appId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">{{ isv.status }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">{{ isv.createdAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="更新时间">{{ isv.updatedAt }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElEmpty v-else description="暂无数据" />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { fetchISVStatus } from '@/api/isv'

  defineOptions({ name: 'ISVStatusDetail' })

  const router = useRouter()
  const route = useRoute()
  const loading = ref(false)
  const isv = ref<any>(null)

  onMounted(async () => {
    const id = route.params.id as string
    if (!id) return
    loading.value = true
    try {
      const res = await fetchISVStatus(id)
      isv.value = res.data
    } catch (error) {
      console.error('[ISVStatusDetail] Failed to fetch ISV status:', error)
    } finally {
      loading.value = false
    }
  })
</script>