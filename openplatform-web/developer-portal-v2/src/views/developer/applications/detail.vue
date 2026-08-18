<template>
  <div class="app-detail-page" style="padding: 24px; overflow-y: auto; height: 100%;">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ $t('menus.developer.applicationsDetail') }}</h2>
      <ElButton @click="goBack">{{ $t('developer.applications.backToApplications') }}</ElButton>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <ElIcon class="is-loading text-3xl text-gray-400"><Loading /></ElIcon>
    </div>

    <template v-else-if="app">
      <!-- 基本信息 -->
      <ElCard class="mb-4">
        <template #header><span class="font-semibold">{{ $t('developer.applications.basicInfo') }}</span></template>
        <ElDescriptions :column="2" border label-class-name="detail-label">
          <ElDescriptionsItem :label="$t('developer.applications.appName')">{{ app.appName || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem :label="'App ID'"><span class="font-mono text-sm">{{ app.id }}</span></ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.applications.appType')">{{ app.appType || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.billing.payment.status')">
            <ElTag :type="app.status === 'active' ? 'success' : app.status === 'pending_review' ? 'warning' : 'info'">{{ app.status }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.applications.callbackUrl')" :span="2">{{ app.callbackUrl || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.applications.appDescription')" :span="2">{{ app.appDescription || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.profile.registrationTime')">{{ formatDate(app.createdAt, undefined, locale) }}</ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('developer.profile.lastUpdated')">{{ formatDate(app.updatedAt, undefined, locale) }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <!-- AppSecret -->
      <ElCard class="mb-4">
        <template #header><span class="font-semibold">{{ $t('developer.applications.appSecret') }}</span></template>
        <AppSecretDisplay :app-secret="app.appSecret" />
      </ElCard>

      <!-- 操作 -->
      <ElCard class="mb-4">
        <template #header><span class="font-semibold">{{ $t('package.actions') }}</span></template>
        <div class="flex gap-3">
          <ElButton type="primary" @click="showEditDialog = true">
            <ElIcon><Edit /></ElIcon>
            {{ $t('developer.profile.edit') }}
          </ElButton>
          <ElButton type="warning" @click="showRegenerate = true">
            <ElIcon><Refresh /></ElIcon>
            {{ $t('developer.applications.regenerateDialog.title') }}
          </ElButton>
          <ElButton type="danger" @click="showDelete = true">
            <ElIcon><Delete /></ElIcon>
            {{ $t('developer.applications.deleteDialog.title') }}
          </ElButton>
        </div>
      </ElCard>
    </template>

    <ElCard v-else>
      <ElEmpty :description="$t('common.noData')" />
    </ElCard>

    <!-- Edit Dialog -->
    <ElDialog
      v-model="showEditDialog"
      :title="$t('developer.applications.editAppTitle')"
      width="600px"
      :close-on-click-modal="false"
      @close="resetEditForm"
    >
      <ElForm :model="editForm" label-width="140px">
        <ElFormItem :label="$t('developer.applications.appName')" required>
          <ElInput v-model="editForm.appName" maxlength="50" show-word-limit />
        </ElFormItem>
        <ElFormItem :label="$t('developer.applications.appType')">
          <ElInput :model-value="app.appType" disabled />
        </ElFormItem>
        <ElFormItem :label="$t('developer.applications.appDescription')">
          <ElInput v-model="editForm.appDescription" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </ElFormItem>
        <ElFormItem :label="$t('developer.applications.callbackUrl')">
          <ElInput v-model="editForm.callbackUrl" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showEditDialog = false">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="editSubmitting" @click="handleEditSubmit">
          {{ $t('common.confirm') }}
        </ElButton>
      </template>
    </ElDialog>

    <!-- Regenerate Dialog -->
    <RegenerateSecretDialog v-model="showRegenerate" :application-id="app?.id" :application-name="(app?.appName || '')" @regenerated="loadApp" />

    <!-- Delete Dialog -->
    <DeleteApplicationDialog v-model="showDelete" :application-id="app?.id" :application-name="(app?.appName || '')" :app-id="(app?.id || '')" @deleted="goBack" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ApplicationDetail' })

import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Loading, Edit, Refresh, Delete } from '@element-plus/icons-vue'
import { fetchApplicationById, fetchUpdateApplication } from '@/api/application'
import { formatDate } from '@/utils/date'
import AppSecretDisplay from '@/components/applications/AppSecretDisplay.vue'
import RegenerateSecretDialog from '@/components/applications/RegenerateSecretDialog.vue'
import DeleteApplicationDialog from '@/components/applications/DeleteApplicationDialog.vue'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

const app = ref<any>(null)
const loading = ref(false)
const showEditDialog = ref(false)
const showRegenerate = ref(false)
const showDelete = ref(false)
const editSubmitting = ref(false)

const editForm = reactive({
  appName: '',
  appDescription: '',
  callbackUrl: ''
})

const loadApp = async () => {
  const id = route.params.id as string
  if (!id) return
  loading.value = true
  try {
    const result = await fetchApplicationById(id)
    // http 层解包返回 { application: { ... } }，提取 application
    app.value = result?.application || result
  } catch {
    ElMessage.error(t('developer.applications.appNotFound'))
  } finally {
    loading.value = false
  }
}

const resetEditForm = () => {
  editForm.appName = app.value?.appName || ''
  editForm.appDescription = app.value?.appDescription || ''
  editForm.callbackUrl = app.value?.callbackUrl || ''
}

const showEditDialogOpen = () => {
  resetEditForm()
  showEditDialog.value = true
}

const handleEditSubmit = async () => {
  if (!editForm.appName.trim()) { ElMessage.warning(t('developer.applications.nameRequired')); return }
  editSubmitting.value = true
  try {
    await fetchUpdateApplication(app.value.id, {
      appName: editForm.appName.trim(),
      appDescription: editForm.appDescription.trim() || undefined,
      callbackUrl: editForm.callbackUrl.trim() || undefined
    })
    ElMessage.success(t('developer.applications.updateSuccess'))
    showEditDialog.value = false
    await loadApp()
  } catch (e: any) {
    ElMessage.error(e?.message || t('developer.applications.updateFailed'))
  } finally {
    editSubmitting.value = false
  }
}

const goBack = () => {
  router.push({ name: 'ApplicationsList' })
}

// 监听编辑弹窗打开，初始化表单
watch(showEditDialog, (val) => {
  if (val) resetEditForm()
})

onMounted(() => loadApp())
</script>

<style scoped>
:deep(.detail-label) {
  white-space: nowrap;
}
</style>