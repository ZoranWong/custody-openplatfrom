<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import Button from '@/components/common/Button.vue'
import apiService from '@/services/api'

interface Props {
  modelValue: boolean
  applicationId: string
  applicationName: string
  appId: string
}

const props = defineProps<Props>()

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

const warningText = 'This action will permanently delete the application and cannot be undone.'
const appIdNote = `Note: The AppID (${props.appId}) cannot be reused by other applications.`

const resetDialogState = () => {
  confirmName.value = ''
  loading.value = false
  hasTyped.value = false
}

const handleDelete = async () => {
  if (!isConfirmed.value) {
    ElMessage.warning('Please enter the correct application name')
    return
  }

  loading.value = true
  try {
    await apiService.deleteISVApplication(props.applicationId)
    ElMessage.success('Application deleted')
    emit('deleted')
  } catch (e: any) {
    const code = e.response?.data?.code
    const message = e.response?.data?.message || 'Deletion failed, please try again later'

    if (code === 1006) {
      ElMessage.error('This application has active resources and cannot be deleted')
    } else if (code === 1003) {
      ElMessage.error('You do not have permission to delete this application')
    } else if (code === 1004) {
      ElMessage.error('Application not found')
      // Close dialog if app not found
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
    // User has typed something, confirm before closing
    ElMessageBox.confirm(
      'You have entered the application name. Are you sure you want to cancel deletion?',
      'Confirmation',
      {
        confirmButtonText: 'Leave',
        cancelButtonText: 'Cancel',
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

// Reset state when dialog opens and track typing
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
    title="Delete Application"
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
        <p class="text-sm text-gray-600 mb-2">Warning: {{ warningText }}</p>
        <p class="text-sm text-gray-500">{{ appIdNote }}</p>
      </div>
    </div>

    <!-- Confirmation Input -->
    <div class="mb-4">
      <label :for="'delete-confirm-' + applicationId" class="block text-sm font-medium text-gray-700 mb-2">
        Enter application name <span class="font-mono text-brand">{{ applicationName }}</span> to confirm deletion
      </label>
      <el-input
        :id="'delete-confirm-' + applicationId"
        v-model="confirmName"
        :placeholder="`Enter: ${applicationName}`"
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
        Application name does not match, please enter again
      </p>
    </div>

    <!-- Footer -->
    <template #footer>
      <Button @click="handleClose">Cancel</Button>
      <Button
        type="danger"
        :loading="loading"
        :disabled="!isConfirmed || loading"
        @click="handleDelete"
      >
        Confirm Delete
      </Button>
    </template>
  </el-dialog>
</template>
