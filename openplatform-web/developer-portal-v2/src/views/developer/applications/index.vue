<template>
  <div class="applications-page">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ $t('menus.developer.applications') }}</h2>
      <ElButton type="primary" @click="openCreateDialog">
        <ElIcon><Plus /></ElIcon>
        {{ $t('developer.applications.create') }}
      </ElButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <ElIcon class="is-loading text-3xl text-gray-400"><Loading /></ElIcon>
    </div>

    <!-- Empty -->
    <ElCard v-else-if="applications.length === 0" shadow="never">
      <ElEmpty :description="$t('developer.applications.noApps')">
        <ElButton type="primary" @click="openCreateDialog">
          {{ $t('developer.applications.create') }}
        </ElButton>
      </ElEmpty>
    </ElCard>

    <!-- Application Cards -->
    <ElRow v-else :gutter="20">
      <ElCol v-for="app in applications" :key="app.id" :sm="24" :md="12" :lg="8" class="mb-5">
        <ElCard class="app-card" shadow="hover" @click="handleViewDetail(app)">
          <template #header>
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                <div
                  class="w-9 h-9 rounded-lg flex items-center justify-center"
                  :class="
                    app.appType === 'corporate'
                      ? 'bg-amber-100 text-amber-600'
                      : app.appType === 'payment'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-emerald-100 text-emerald-600'
                  "
                >
                  <ElIcon :size="18"
                    ><OfficeBuilding v-if="app.appType === 'corporate'" /><CreditCard
                      v-else-if="app.appType === 'payment'" /><UserFilled v-else
                  /></ElIcon>
                </div>
                <span class="font-semibold text-sm">{{ app.appName }}</span>
              </div>
              <ElTag
                :type="
                  app.status === 'active'
                    ? 'success'
                    : app.status === 'pending_review'
                      ? 'warning'
                      : 'info'
                "
                size="small"
              >
                {{
                  app.status === 'active'
                    ? $t('developer.applications.active')
                    : app.status === 'pending_review'
                      ? $t('developer.applications.pendingReview')
                      : app.status
                }}
              </ElTag>
            </div>
          </template>

          <ElDescriptions :column="1" size="small" border label-class-name="app-card-label">
            <ElDescriptionsItem :label="$t('developer.applications.appType')">
              {{ app.appType || '-' }}
            </ElDescriptionsItem>
            <ElDescriptionsItem
              :label="$t('developer.applications.appDescription')"
              v-if="app.appDescription"
            >
              <span class="line-clamp-2">{{ app.appDescription }}</span>
            </ElDescriptionsItem>
            <ElDescriptionsItem :label="$t('package.createdAt')">
              {{ formatDate(app.createdAt, undefined, locale) }}
            </ElDescriptionsItem>
          </ElDescriptions>

          <div class="flex gap-2 mt-4" @click.stop>
            <ElButton type="primary" size="small" @click="openEditDialog(app)">{{
              $t('developer.profile.edit')
            }}</ElButton>
            <ElButton type="danger" size="small" plain @click="handleDelete(app)">{{
              $t('developer.applications.cancel')
            }}</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- Create/Edit Dialog -->
    <ElDialog
      v-model="dialogVisible"
      :title="
        editingApp
          ? $t('developer.applications.editAppTitle')
          : $t('developer.applications.createAppTitle')
      "
      width="800px"
      :close-on-click-modal="false"
      :destroy-on-close="false"
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" label-width="140px">
        <ElFormItem :label="$t('developer.applications.appName')" required>
          <ElInput
            v-model="form.appName"
            :placeholder="$t('developer.applications.appNamePlaceholder')"
            maxlength="50"
            show-word-limit
          />
        </ElFormItem>

        <ElFormItem :label="$t('developer.applications.appType')" required v-if="!editingApp">
          <ElRow :gutter="12">
            <ElCol v-for="type in appTypes" :key="type.value" :span="8">
              <div
                class="app-type-card"
                :class="{ selected: form.appType === type.value }"
                @click="form.appType = type.value as any"
              >
                <div class="flex items-center gap-2 mb-1">
                  <div
                    class="w-7 h-7 rounded flex items-center justify-center"
                    :class="
                      type.value === 'corporate'
                        ? 'bg-amber-100 text-amber-600'
                        : type.value === 'payment'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-emerald-100 text-emerald-600'
                    "
                  >
                    <ElIcon :size="14"><component :is="type.icon" /></ElIcon>
                  </div>
                  <span class="text-xs font-medium">{{ type.title }}</span>
                </div>
                <p class="text-xs text-gray-400 leading-relaxed">{{ type.description }}</p>
              </div>
            </ElCol>
          </ElRow>
        </ElFormItem>

        <ElFormItem :label="$t('developer.applications.appType')" v-else>
          <ElInput :model-value="form.appType" disabled />
        </ElFormItem>

        <ElFormItem :label="$t('developer.applications.appDescription')">
          <ElInput
            v-model="form.appDescription"
            type="textarea"
            :rows="3"
            :placeholder="$t('developer.applications.appDescriptionPlaceholder')"
            maxlength="500"
            show-word-limit
          />
        </ElFormItem>

        <ElFormItem :label="$t('developer.applications.callbackUrl')">
          <ElInput
            v-model="form.callbackUrl"
            :placeholder="$t('developer.applications.callbackUrlPlaceholder')"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="dialogVisible = false">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">
          {{ $t('common.confirm') }}
        </ElButton>
      </template>
    </ElDialog>

    <!-- Delete Dialog -->
    <DeleteApplicationDialog
      v-model="showDelete"
      :application-id="deleteTarget?.id"
      :application-name="deleteTarget?.appName || ''"
      :app-id="deleteTarget?.id || ''"
      @deleted="loadApps"
    />

    <!-- AppSecret Dialog -->
    <AppSecretDialog v-model="showSecret" :application="createdApplication" @confirm="loadApps" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ApplicationsList' })

  import { useI18n } from 'vue-i18n'
  import { ElMessage } from 'element-plus'
  import { Plus, OfficeBuilding, CreditCard, UserFilled, Loading } from '@element-plus/icons-vue'
  import {
    fetchApplications,
    fetchCreateApplication,
    fetchUpdateApplication
  } from '@/api/application'
  import DeleteApplicationDialog from '@/components/applications/DeleteApplicationDialog.vue'
  import AppSecretDialog from '@/components/applications/AppSecretDialog.vue'
import { formatDate } from '@/utils/date'

  const { t, locale } = useI18n()
  const router = useRouter()

  const loading = ref(true)
  const submitting = ref(false)
  const applications = ref<any[]>([])
  const dialogVisible = ref(false)
  const editingApp = ref<any>(null)
  const showDelete = ref(false)
  const showSecret = ref(false)
  const deleteTarget = ref<any>(null)
  const createdApplication = ref<any>(null)

  const form = reactive({
    appName: '',
    appDescription: '',
    callbackUrl: '',
    appType: '' as string
  })

  const appTypes = [
    {
      value: 'corporate',
      title: t('developer.applications.types.corporate.title'),
      description: t('developer.applications.types.corporate.description'),
      icon: OfficeBuilding
    },
    {
      value: 'payment',
      title: t('developer.applications.types.payment.title'),
      description: t('developer.applications.types.payment.description'),
      icon: CreditCard
    },
    {
      value: 'custody',
      title: t('developer.applications.types.custody.title'),
      description: t('developer.applications.types.custody.description'),
      icon: UserFilled
    }
  ]

  const loadApps = async () => {
    loading.value = true
    try {
      const result = await fetchApplications()
      applications.value = result?.list || []
    } catch {
      ElMessage.error(t('developer.applications.fetchApplicationInfoFailed'))
    } finally {
      loading.value = false
    }
  }

  const resetForm = () => {
    form.appName = ''
    form.appDescription = ''
    form.callbackUrl = ''
    form.appType = ''
  }

  const openCreateDialog = () => {
    editingApp.value = null
    resetForm()
    dialogVisible.value = true
  }

  const openEditDialog = (app: any) => {
    editingApp.value = app
    form.appName = app.appName || ''
    form.appDescription = app.appDescription || ''
    form.appType = app.appType || ''
    form.callbackUrl = app.callbackUrl || ''
    dialogVisible.value = true
  }

  const handleDialogClose = () => {
    resetForm()
    editingApp.value = null
  }

  const handleSubmit = async () => {
    if (!form.appName.trim()) {
      ElMessage.warning(t('developer.applications.nameRequired'))
      return
    }
    if (!editingApp.value && !form.appType) {
      ElMessage.warning(t('developer.applications.typeRequired'))
      return
    }

    submitting.value = true
    try {
      if (editingApp.value) {
        await fetchUpdateApplication(editingApp.value.id, {
          appName: form.appName.trim(),
          appDescription: form.appDescription.trim() || undefined,
          callbackUrl: form.callbackUrl.trim() || undefined
        })
        ElMessage.success(t('developer.applications.updateSuccess'))
        dialogVisible.value = false
        loadApps()
      } else {
        const result = await fetchCreateApplication({
          appName: form.appName.trim(),
          appDescription: form.appDescription.trim() || undefined,
          callbackUrl: form.callbackUrl.trim() || undefined,
          appType: form.appType
        })
        dialogVisible.value = false
        createdApplication.value = result?.application || result
        showSecret.value = true
      }
    } catch (e: any) {
      ElMessage.error(e?.message || t('developer.applications.creationFailed'))
    } finally {
      submitting.value = false
    }
  }

  const handleViewDetail = (app: any) =>
    router.push({ name: 'DeveloperApplicationDetail', params: { id: app.id } })
  const handleDelete = (app: any) => {
    deleteTarget.value = app
    showDelete.value = true
  }

  onMounted(() => loadApps())
</script>

<style scoped>
  .app-card {
    cursor: pointer;
    transition: transform 0.2s;
  }
  .app-card:hover {
    transform: translateY(-2px);
  }

  :deep(.app-card-label) {
    white-space: nowrap;
  }

  .app-type-card {
    cursor: pointer;
    border: 2px solid var(--el-border-color);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s;
    height: 100%;
  }
  .app-type-card:hover {
    border-color: var(--el-color-primary);
  }
  .app-type-card.selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
</style>
