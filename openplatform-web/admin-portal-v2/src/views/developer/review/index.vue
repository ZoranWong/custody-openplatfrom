<template>
  <div class="developer-review-page art-full-height">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">开发者审核</h2>
      <ElButton @click="goBack">返回列表</ElButton>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <ElIcon class="is-loading text-3xl text-gray-400"><Loading /></ElIcon>
    </div>

    <template v-else-if="developer">
      <!-- 审核操作 -->
      <ElCard class="mb-4">
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500 mr-2">审核操作：</span>
          <ElButton type="success" @click="handleApprove" :loading="actionLoading">
            审核通过
          </ElButton>
          <ElButton type="danger" @click="handleReject" :loading="actionLoading">
            审核拒绝
          </ElButton>
        </div>
      </ElCard>

      <!-- 公司信息 -->
      <ElCard class="mb-4">
        <template #header>
          <span class="font-semibold">公司信息</span>
        </template>
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="公司名称">{{ developer.legalName || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="注册号">{{ developer.registrationNumber || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="注册地">{{ developer.jurisdiction || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="成立日期">{{ developer.dateOfIncorporation || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="注册地址" :span="2">{{ developer.registeredAddress || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="官网" :span="2">{{ developer.website || '-' }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <!-- KYB 信息 -->
      <ElCard class="mb-4">
        <template #header>
          <span class="font-semibold">KYB 信息</span>
        </template>
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="KYB状态">
            <ElTag :type="kybStatusConfig.type">{{ kybStatusConfig.text }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="审核时间">{{ developer.kybReviewedAt || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="审核人" :span="2">{{ developer.kybReviewedBy || '-' }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <!-- 联系信息 -->
      <ElCard class="mb-4">
        <template #header>
          <span class="font-semibold">联系信息</span>
        </template>
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="邮箱">{{ developer.email || '-' }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <!-- UBO信息 -->
      <ElCard v-if="developer.uboInfo && developer.uboInfo.length > 0">
        <template #header>
          <span class="font-semibold">UBO 信息</span>
        </template>
        <ElTable :data="developer.uboInfo" border>
          <ElTableColumn type="index" label="序号" width="60" />
          <ElTableColumn prop="name" label="姓名" />
          <ElTableColumn prop="nationality" label="国籍" />
          <ElTableColumn prop="idType" label="证件类型" />
          <ElTableColumn prop="idNumber" label="证件号码" />
          <ElTableColumn prop="ownershipPercentage" label="持股比例" />
        </ElTable>
      </ElCard>
    </template>

    <ElCard v-else>
      <ElEmpty description="未找到开发者信息" />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DeveloperReview' })

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElTag, ElDescriptions, ElDescriptionsItem } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import {
  fetchDeveloperById,
  fetchApproveDeveloper,
  fetchRejectDeveloper,
} from '@/api/developer'

const route = useRoute()
const router = useRouter()

const developer = ref<any>(null)
const loading = ref(false)
const actionLoading = ref(false)

const KYB_STATUS_MAP: Record<string, { type: 'warning' | 'success' | 'danger' | 'info'; text: string }> = {
  pending: { type: 'warning', text: '待审核' },
  approved: { type: 'success', text: '已通过' },
  rejected: { type: 'danger', text: '已拒绝' },
}

const kybStatusConfig = computed(() => {
  if (!developer.value) return { type: 'info' as const, text: '-' }
  return KYB_STATUS_MAP[developer.value.kybStatus] || { type: 'info' as const, text: developer.value.kybStatus || '-' }
})

const loadDeveloper = async () => {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    developer.value = await fetchDeveloperById(id)
  } catch {
    // error handled by http interceptor
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push({ name: 'DeveloperList' })
}

const handleApprove = async () => {
  try {
    await ElMessageBox.confirm(
      '审核通过后，该开发者将可以正常使用平台服务。确定要通过审核吗？',
      '审核通过确认',
      {
        confirmButtonText: '确定通过',
        cancelButtonText: '取消',
        type: 'success',
      }
    )
    actionLoading.value = true
    await fetchApproveDeveloper(developer.value.id)
    ElMessage.success('审核通过')
    await loadDeveloper()
  } catch {
    // cancelled or error
  } finally {
    actionLoading.value = false
  }
}

const handleReject = async () => {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      '请输入拒绝原因',
      '审核拒绝',
      {
        confirmButtonText: '确定拒绝',
        cancelButtonText: '取消',
        type: 'warning',
        inputType: 'textarea',
        inputPlaceholder: '请输入拒绝原因',
        inputValidator: (val) => {
          if (!val || !val.trim()) return '拒绝原因不能为空'
          return true
        },
      }
    )
    actionLoading.value = true
    await fetchRejectDeveloper(developer.value.id, reason.trim())
    ElMessage.success('已拒绝该申请')
    await loadDeveloper()
  } catch {
    // cancelled or error
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  loadDeveloper()
})
</script>