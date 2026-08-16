<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import Button from '@/components/common/Button.vue'
import { fetchDeleteApplication } from '@/api/application'

interface Props {
  modelValue: boolean
  applicationId: string
  applicationName: string
  appId: string
}

const props = defineProps<Props>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'deleted'): void
}>()

const confirmName = ref('')
const loading = ref(false)
const hasTyped = ref(false)

const showDialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isConfirmed = computed(() =>
  confirmName.value.trim().toLowerCase() === props.applicationName.toLowerCase()
)

const resetDialogState = () => {
  confirmName.value = ''
  loading.value = false
  hasTyped.value = false
}

const handleDelete = async () => {
  if (!isConfirmed.value) {
    ElMessage.warning(t('developer.applications.deleteDialog.enterCorrectName'))
    return
  }

  loading.value = true
  try {
    await fetchDeleteApplication(props.applicationId)
    ElMessage.success(t('developer.applications.deleteDialog.deleteSuccess'))
    emit('deleted')
  } catch (e: any) {
    const code = e.response?.data?.code
    const message = e.response?.data?.message || t('developer.applications.deleteDialog.deleteFailed')

    if (code === 1006) {
      ElMessage.error(t('developer.applications.deleteDialog.hasActiveResources'))
    } else if (code === 1003) {
      ElMessage.error(t('developer.applications.deleteDialog.permissionDenied'))
    } else if (code === 1004) {
      ElMessage.error(t('developer.applications.deleteDialog.notFound'))
      showDialog.value = false
    } else {
      ElMessage.error(message)
    }
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  if (hasTyped.value) {
    ElMessageBox.confirm(
      t('developer.applications.deleteDialog.confirmCancel'),
      t('developer.applications.deleteDialog.confirmCancelTitle'),
      {
        confirmButtonText: t('developer.applications.deleteDialog.leave'),
        cancelButtonText: t('developer.applications.deleteDialog.cancelDelete'),
        type: 'warning'
      }
    ).then(() => {
      showDialog.value = false
    }).catch(() => {
      // User cancelled, stay on dialog
    })
  } else {
    showDialog.value = false
  }
}

watch(showDialog, (val) => {
  if (val) {
    resetDialogState()
  }
})

watch(confirmName, () => {
  hasTyped.value = confirmName.value.trim().length > 0
})
</script>

<template>
  <el-dialog
    v-model="showDialog"
    :title="t('developer.applications.deleteDialog.title')"
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="!hasTyped"
    @close="handleClose"
  >
    <!-- Warning Section -->
    <div class="flex items-start gap-3 mb-4" role="alert" aria-live="polite">
      <el-icon class="w-6 h-6 text-danger mt-0.5">
        <Warning />
      </el-icon>
      <div>
        <p class="text-sm text-gray-600 mb-2">{{ t('developer.applications.deleteDialog.warning') }}</p>
        <p class="text-sm text-gray-500">{{ t('developer.applications.deleteDialog.appIdNote', { appId }) }}</p>
      </div>
    </div>

    <!-- Confirmation Input -->
    <div class="mb-4">
      <label :for="'delete-confirm-' + applicationId" class="block text-sm font-medium text-gray-700 mb-2">
        {{ t('developer.applications.deleteDialog.confirmLabel') }} <span class="font-mono text-brand">{{ applicationName }}</span> {{ t('developer.applications.deleteDialog.confirmDelete') }}
      </label>
      <el-input
        :id="'delete-confirm-' + applicationId"
        v-model="confirmName"
        :placeholder="t('developer.applications.deleteDialog.confirmPlaceholder') + applicationName"
        size="large"
        aria-label="Confirm application name"
        aria-describedby="delete-confirm-error"
        :class="{ 'is-error': confirmName && !isConfirmed }"
        @keyup.enter="isConfirmed && handleDelete()"
      />
      <p
        v-if="confirmName && !isConfirmed"
        id="delete-confirm-error"
        class="mt-1 text-sm text-red-500"
        role="alert"
      >
        {{ t('developer.applications.deleteDialog.nameMismatch') }}
      </p>
    </div>

    <!-- Footer -->
    <template #footer>
      <Button @click="handleClose">{{ t('developer.applications.deleteDialog.cancel') }}</Button>
      <Button
        type="danger"
        :loading="loading"
        :disabled="!isConfirmed || loading"
        @click="handleDelete"
      >
        {{ t('developer.applications.deleteDialog.confirmDelete') }}
      </Button>
    </template>
  </el-dialog>
</template>
