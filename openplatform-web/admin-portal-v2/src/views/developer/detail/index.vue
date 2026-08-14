<!-- 开发者详情页面 -->
<template>
  <div class="developer-detail-page">
    <ElCard>
      <template #header>
        <div class="flex items-center">
          <ElButton @click="router.back()" v-ripple>
            <span class="i-ri:arrow-left-line mr-1"></span>
            返回
          </ElButton>
          <span class="text-lg font-medium ml-4">开发者详情</span>
        </div>
      </template>

      <div v-loading="loading">
        <ElDescriptions v-if="developer" :column="2" border>
          <ElDescriptionsItem label="开发者名称">{{ developer.name }}</ElDescriptionsItem>
          <ElDescriptionsItem label="邮箱">{{ developer.email }}</ElDescriptionsItem>
          <ElDescriptionsItem label="公司名称">{{ developer.companyName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">{{ developer.status }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">{{ developer.createdAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="更新时间">{{ developer.updatedAt }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElEmpty v-else description="暂无数据" />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { fetchDeveloperById } from '@/api/developer'

  defineOptions({ name: 'DeveloperDetail' })

  const router = useRouter()
  const route = useRoute()
  const loading = ref(false)
  const developer = ref<any>(null)

  onMounted(async () => {
    const id = route.params.id as string
    if (!id) return
    loading.value = true
    try {
      const res = await fetchDeveloperById(id)
      developer.value = res.data
    } catch (error) {
      console.error('[DeveloperDetail] Failed to fetch developer:', error)
    } finally {
      loading.value = false
    }
  })
</script>