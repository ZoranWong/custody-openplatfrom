<template>
  <div class="art-full-height">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ developerName }} - 订阅信息</h2>
      <ElButton @click="goBack">返回</ElButton>
    </div>
    <ElCard v-loading="loading">
      <template v-if="subscription">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="套餐名称">{{ subscription.packageName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="套餐编码">{{ subscription.packageCode }}</ElDescriptionsItem>
          <ElDescriptionsItem label="月价格">{{ subscription.monthlyPrice || 0 }} CNY</ElDescriptionsItem>
          <ElDescriptionsItem label="年价格">{{ subscription.yearlyPrice ? `${subscription.yearlyPrice} CNY` : '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="计费周期">
            <ElTag :type="subscription.billingCycle === 'yearly' ? 'primary' : 'success'">
              {{ subscription.billingCycle === 'yearly' ? '年付' : '月付' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="订阅状态">
            <ElTag :type="STATUS_MAP[subscription.status]?.type || 'info'">
              {{ STATUS_MAP[subscription.status]?.text || subscription.status }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="开始日期">{{ formatDate(subscription.startDate) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="结束日期">{{ formatDate(subscription.endDate) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="自动续费">
            <ElTag :type="subscription.autoRenew ? 'success' : 'info'">
              {{ subscription.autoRenew ? '是' : '否' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="今日API用量">{{ subscription.dailyApiUsage || 0 }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">{{ formatDate(subscription.createdAt) }}</ElDescriptionsItem>
        </ElDescriptions>
      </template>
      <ElEmpty v-else description="暂无订阅信息" />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DeveloperSubscription' })

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchDeveloperById } from '@/api/developer'
import { fetchDeveloperSubscription } from '@/api/subscription'

const route = useRoute()
const router = useRouter()
const developerId = route.params.developerId as string
const developerName = ref('')
const loading = ref(false)
const subscription = ref<any>(null)

const STATUS_MAP: Record<string, { type: 'success' | 'warning' | 'danger' | 'info'; text: string }> = {
  active: { type: 'success', text: '生效中' },
  expired: { type: 'warning', text: '已过期' },
  cancelled: { type: 'danger', text: '已取消' },
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(async () => {
  loading.value = true
  try {
    const [devResponse, subResponse] = await Promise.all([
      fetchDeveloperById(developerId),
      fetchDeveloperSubscription(developerId),
    ])
    if (devResponse) {
      developerName.value = devResponse.legalName || ''
    }
    if (subResponse) {
      subscription.value = subResponse
    }
  } catch {
    // error handled by http interceptor
  } finally {
    loading.value = false
  }
})

const goBack = () => router.back()
</script>