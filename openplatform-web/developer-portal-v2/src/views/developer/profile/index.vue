<template>
  <div class="profile-page" style="padding: 24px; overflow-y: auto; height: 100%;">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">{{ $t('developer.profile.title') }}</h2>
      <p class="mt-1 text-sm text-gray-500">{{ user?.email }}</p>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <ElIcon class="is-loading text-3xl text-gray-400"><Loading /></ElIcon>
    </div>

    <template v-else-if="user">
      <ElRow :gutter="20">
        <!-- Left Column -->
        <ElCol :span="16">
          <!-- 基本信息 -->
          <ElCard class="mb-4">
            <template #header>
              <div class="flex justify-between items-center">
                <span class="font-semibold">{{ $t('developer.profile.basicInfo') }}</span>
                <ElButton type="primary" size="small" @click="showEditDialog = true" v-if="!showEditDialog">
                  <ElIcon><Edit /></ElIcon>
                  {{ $t('developer.profile.edit') }}
                </ElButton>
              </div>
            </template>

            <!-- View Mode -->
            <ElDescriptions v-if="!showEditDialog" :column="2" border label-class-name="detail-label">
              <ElDescriptionsItem :label="$t('developer.profile.email')">{{ user.email }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.name')">{{ user.name || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.phone')">{{ user.phone || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.role')">
                <ElTag :type="user.role === 'owner' ? 'warning' : 'info'">{{ user.role }}</ElTag>
              </ElDescriptionsItem>
            </ElDescriptions>

            <!-- Edit Mode -->
            <ElForm v-else :model="editForm" label-width="80px">
              <ElFormItem :label="$t('developer.profile.name')">
                <ElInput v-model="editForm.name" />
              </ElFormItem>
              <ElFormItem :label="$t('developer.profile.phone')">
                <ElInput v-model="editForm.phone" />
              </ElFormItem>
              <ElFormItem>
                <ElButton type="primary" :loading="saving" @click="handleSave">{{ $t('developer.profile.save') }}</ElButton>
                <ElButton class="ml-2" @click="showEditDialog = false">{{ $t('developer.profile.cancel') }}</ElButton>
              </ElFormItem>
            </ElForm>
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
              <ElDescriptionsItem :label="$t('developer.profile.website')" :span="2">{{ isvInfo.website || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.kybStatus')">
                <ElTag :type="kybStatusConfig.type" size="large">{{ kybStatusConfig.text }}</ElTag>
              </ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.status')">
                <ElTag :type="isvInfo.status === 'active' ? 'success' : isvInfo.status === 'suspended' ? 'warning' : 'danger'">{{ isvInfo.status || '-' }}</ElTag>
              </ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>

          <!-- UBO 信息 -->
          <ElCard v-if="isvInfo?.uboInfo?.length" class="mb-4">
            <template #header><span class="font-semibold">{{ $t('register.uboInfo') }}</span></template>
            <ElTable :data="isvInfo.uboInfo" border>
              <ElTableColumn type="index" label="#" width="50" />
              <ElTableColumn prop="name" :label="$t('register.placeholder.uboName')" />
              <ElTableColumn prop="idType" :label="$t('register.placeholder.uboIdNumber')" />
              <ElTableColumn prop="idNumber" :label="$t('register.placeholder.uboIdNumber')" />
              <ElTableColumn prop="nationality" :label="$t('register.placeholder.uboNationality')" />
              <ElTableColumn prop="phone" :label="$t('register.placeholder.uboPhone')" />
            </ElTable>
          </ElCard>
        </ElCol>

        <!-- Right Column -->
        <ElCol :span="8">
          <!-- 账户信息 -->
          <ElCard class="mb-4">
            <template #header><span class="font-semibold">{{ $t('developer.profile.accountInfo') }}</span></template>
            <ElDescriptions :column="1" border>
              <ElDescriptionsItem :label="$t('developer.profile.accountId')"><span class="font-mono text-xs">{{ user.id }}</span></ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.registrationTime')">{{ formatDate(user.createdAt, undefined, locale) }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="$t('developer.profile.lastUpdated')">{{ formatDate(user.updatedAt, undefined, locale) }}</ElDescriptionsItem>
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
import { ElMessage } from 'element-plus'
import { Loading, Edit } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { fetchUpdateDeveloperProfile } from '@/api/developer'
import { formatDate } from '@/utils/date'

const { t, locale } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(true)
const showEditDialog = ref(false)
const saving = ref(false)

const user = computed(() => userStore.isvUserData as any)
const isvInfo = computed(() => userStore.isvInfo as any)

const editForm = reactive({
  name: '',
  phone: ''
})

const kybStatusConfig = computed(() => {
  const status = isvInfo.value?.kybStatus || 'pending'
  const configs: Record<string, { type: 'primary' | 'success' | 'warning' | 'info' | 'danger'; text: string }> = {
    pending: { type: 'warning', text: t('developer.profile.underReview') },
    approved: { type: 'success', text: t('developer.profile.approved') },
    rejected: { type: 'danger', text: t('developer.profile.rejected') }
  }
  return configs[status] || configs.pending
})

const handleSave = async () => {
  saving.value = true
  try {
    await fetchUpdateDeveloperProfile({ name: editForm.name, phone: editForm.phone })
    userStore.info = { ...user.value, name: editForm.name, phone: editForm.phone }
    ElMessage.success(t('developer.profile.save'))
    showEditDialog.value = false
  } catch (e: any) {
    ElMessage.error(e?.message || 'Failed')
  } finally {
    saving.value = false
  }
}

const handleLogout = () => {
  userStore.logOut()
}

onMounted(async () => {
  try {
    await userStore.fetchISVInfo()
    editForm.name = user.value?.name || ''
    editForm.phone = user.value?.phone || ''
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