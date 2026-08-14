<!-- KYB 详情页面 -->
<template>
  <div class="kyb-detail-page">
    <ElCard>
      <template #header>
        <div class="flex items-center">
          <ElButton @click="router.back()" v-ripple>
            <span class="i-ri:arrow-left-line mr-1"></span>
            返回
          </ElButton>
          <span class="text-lg font-medium ml-4">KYB详情</span>
        </div>
      </template>

      <div v-loading="loading">
        <ElDescriptions v-if="kyb" :column="2" border>
          <ElDescriptionsItem label="公司名称">{{ kyb.companyName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="营业执照号">{{ kyb.businessLicense }}</ElDescriptionsItem>
          <ElDescriptionsItem label="申请人">{{ kyb.applicantName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">{{ kyb.status }}</ElDescriptionsItem>
          <ElDescriptionsItem label="提交时间">{{ kyb.submittedAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="审核时间">{{ kyb.reviewedAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="审核人">{{ kyb.reviewerName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="审核备注" :span="2">{{ kyb.reviewNote }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElEmpty v-else description="暂无数据" />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { fetchKYBDetail } from '@/api/kyb'

  defineOptions({ name: 'KYBDetail' })

  const router = useRouter()
  const route = useRoute()
  const loading = ref(false)
  const kyb = ref<any>(null)

  onMounted(async () => {
    const id = route.params.id as string
    if (!id) return
    loading.value = true
    try {
      const res = await fetchKYBDetail(id)
      kyb.value = res.data
    } catch (error) {
      console.error('[KYBDetail] Failed to fetch KYB detail:', error)
    } finally {
      loading.value = false
    }
  })
</script>