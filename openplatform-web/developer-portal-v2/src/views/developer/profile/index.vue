<template>
  <div class="profile-page" style="padding: 24px; overflow-y: auto; height: 100%;">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">{{ $t('developer.profile.title') }}</h2>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <ElIcon class="is-loading text-3xl text-gray-400"><Loading /></ElIcon>
    </div>

    <template v-else-if="user">
      <ElRow :gutter="20">
        <ElCol :span="16">
          <!-- 基本信息 -->
          <ElCard class="mb-4">
            <template #header><span class="font-semibold">{{ $t('developer.profile.basicInfo') }}</span></template>
            <ElDescriptions :column="2" border label-class-name="detail-label">
              <ElDescriptionsItem :label="$t('developer.profile.email')">{{ user.email }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.name')">{{ user.name || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.role')">
                <ElTag :type="user.role === 'owner' ? 'warning' : 'info'">{{ user.role }}</ElTag>
              </ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>

          <!-- 公司信息 -->
          <ElCard v-if="isvInfo" class="mb-4">
            <template #header><span class="font-semibold">{{ $t('developer.profile.companyInfo') }}</span></template>
            <ElDescriptions :column="2" border label-class-name="detail-label">
              <ElDescriptionsItem :label="$t('developer.profile.legalName')">{{ isvInfo.legalName || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.registrationNumber')">{{ isvInfo.registrationNumber || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.jurisdiction')">{{ isvInfo.jurisdiction || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.dateOfIncorporation')">{{ isvInfo.dateOfIncorporation || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.registeredAddress')" :span="2">{{ isvInfo.registeredAddress || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.kybStatus')">
                <ElTag :type="kybStatusConfig.type" size="large">{{ kybStatusConfig.text }}</ElTag>
              </ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>
        </ElCol>

        <ElCol :span="8">
          <!-- 账户信息 -->
          <ElCard class="mb-4">
            <template #header><span class="font-semibold">{{ $t('developer.profile.accountInfo') }}</span></template>
            <ElDescriptions :column="1" border>
              <ElDescriptionsItem :label="$t('developer.profile.accountId')"><span class="font-mono text-sm">{{ user.id }}</span></ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.registrationTime')">{{ formatDate(user.createdAt) }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.lastUpdated')">{{ formatDate(user.updatedAt) }}</ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>

          <!-- 安全操作 -->
          <ElCard class="mb-4">
            <template #header><span class="font-semibold">{{ $t('developer.profile.security') }}</span></template>
            <p class="text-sm text-gray-500 mb-4">{{ $t('developer.profile.logoutDesc') }}</p>
            <ElButton type="danger" class="w-full" @click="handleLogout">{{ $t('developer.profile.logout') }}</ElButton>
          </ElCard>
        </ElCol>
      </ElRow>
    </template>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DeveloperProfile' })

import { useI18n } from 'vue-i18n'
import { ElMessage, ElTag, ElDescriptions, ElDescriptionsItem } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { formatDate } from '@/utils/date'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(true)

const user = computed(() => userStore.info as any)
const isvInfo = computed(() => userStore.isvInfo as any)

const kybStatusConfig = computed(() => {
  const status = isvInfo.value?.kybStatus || 'pending'
  const configs: Record<string, { type: 'primary' | 'success' | 'warning' | 'info' | 'danger'; text: string }> = {
    pending: { type: 'warning', text: t('developer.profile.underReview') },
    approved: { type: 'success', text: t('developer.profile.approved') },
    rejected: { type: 'danger', text: t('developer.profile.rejected') }
  }
  return configs[status] || configs.pending
})

const handleLogout = () => {
  userStore.logOut()
}

onMounted(async () => {
  try {
    await userStore.fetchISVInfo()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
:deep(.detail-label) {
  white-space: nowrap;
}
</style>