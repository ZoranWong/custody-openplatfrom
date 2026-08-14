<!-- 开发者审核页面 -->
<template>
  <div class="developer-review-page">
    <ElCard>
      <template #header>
        <div class="flex items-center">
          <ElButton @click="router.back()" v-ripple>
            <span class="i-ri:arrow-left-line mr-1"></span>
            返回
          </ElButton>
          <span class="text-lg font-medium ml-4">开发者审核</span>
        </div>
      </template>

      <div v-loading="loading">
        <ElDescriptions v-if="developer" :column="2" border>
          <ElDescriptionsItem label="开发者名称">{{ developer.name }}</ElDescriptionsItem>
          <ElDescriptionsItem label="邮箱">{{ developer.email }}</ElDescriptionsItem>
          <ElDescriptionsItem label="公司名称">{{ developer.companyName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">{{ developer.status }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">{{ developer.createdAt }}</ElDescriptionsItem>
        </ElDescriptions>

        <div v-if="developer" class="mt-6 flex justify-center gap-4">
          <ElButton type="success" @click="handleApprove" :loading="approving" v-ripple>
            审核通过
          </ElButton>
          <ElButton type="danger" @click="handleReject" :loading="rejecting" v-ripple>
            驳回
          </ElButton>
        </div>
        <ElEmpty v-else description="暂无数据" />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { fetchDeveloperById, fetchApproveDeveloper, fetchRejectDeveloper } from '@/api/developer'
  import { ElMessage, ElMessageBox } from 'element-plus'

  defineOptions({ name: 'DeveloperReview' })

  const router = useRouter()
  const route = useRoute()
  const loading = ref(false)
  const approving = ref(false)
  const rejecting = ref(false)
  const developer = ref<any>(null)

  const fetchDetail = async () => {
    const id = route.params.id as string
    if (!id) return
    loading.value = true
    try {
      const res = await fetchDeveloperById(id)
      developer.value = res.data
    } catch (error) {
      console.error('[DeveloperReview] Failed to fetch developer:', error)
    } finally {
      loading.value = false
    }
  }

  const handleApprove = async () => {
    const id = route.params.id as string
    try {
      await ElMessageBox.confirm('确定要通过该开发者的审核吗？', '审核确认', {
        type: 'warning'
      })
      approving.value = true
      await fetchApproveDeveloper(id)
      ElMessage.success('审核通过')
      router.back()
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('[DeveloperReview] Approve failed:', error)
      }
    } finally {
      approving.value = false
    }
  }

  const handleReject = async () => {
    const id = route.params.id as string
    try {
      const { value: reason } = await ElMessageBox.prompt('请输入驳回原因', '驳回', {
        type: 'warning'
      })
      if (!reason) return
      rejecting.value = true
      await fetchRejectDeveloper(id, reason)
      ElMessage.success('已驳回')
      router.back()
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('[DeveloperReview] Reject failed:', error)
      }
    } finally {
      rejecting.value = false
    }
  }

  onMounted(() => {
    fetchDetail()
  })
</script>