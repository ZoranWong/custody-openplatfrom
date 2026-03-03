<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning, DocumentCopy, CircleCheck } from '@element-plus/icons-vue'
import Button from '@/components/common/Button.vue'
import apiService from '@/services/api'

interface Props {
  modelValue: boolean
  applicationId: string
  applicationName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'regenerated'): void
}>()

const step = ref<'confirm' | 'success'>('confirm')
const confirmName = ref('')
const loading = ref(false)
const newAppSecret = ref('')
const copied = ref(false)

const showDialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isConfirmed = computed(() => confirmName.value === props.applicationName)

const warningText = 'After regenerating the secret, the old secret will immediately become invalid and all integrations using the old secret will stop working. Please make sure to update all application configurations before proceeding.'

const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(newAppSecret.value)
    copied.value = true
    ElMessage.success('Copied to clipboard')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (e) {
    // Handle clipboard permission errors gracefully
    ElMessage.error('Copy failed, please copy manually')
  }
}

const resetDialogState = () => {
  step.value = 'confirm'
  confirmName.value = ''
  newAppSecret.value = ''
  loading.value = false
  copied.value = false
}

const handleRegenerate = async () => {
  if (!isConfirmed.value) return

  loading.value = true
  try {
    const response = await apiService.regenerateISVAppSecret(props.applicationId)
    // Handle both wrapped {data: {appSecret}} and direct {appSecret} response formats
    const responseData = (response as any).data || response
    newAppSecret.value = responseData.appSecret || responseData.app_secret || ''
    step.value = 'success'
    ElMessage.success('Secret reset successfully')
    emit('regenerated')
  } catch (e: any) {
    const code = e.response?.data?.code
    const message = e.response?.data?.message || 'Reset failed, please try again later'

    if (code === 1003) {
      ElMessage.error('You do not have permission to operate on this application')
    } else if (code === 1005) {
      ElMessage.error('Application status does not allow this operation')
    } else {
      ElMessage.error(message)
    }
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  showDialog.value = false
}

const handleSuccessClose = () => {
  showDialog.value = false
  // Reset state after dialog closes
  setTimeout(resetDialogState, 300)
}

// Reset state when dialog opens
watch(showDialog, (val) => {
  if (val) {
    resetDialogState()
  }
})
</script>

<template>
  <el-dialog
    v-model="showDialog"
    :title="step === 'confirm' ? 'Regenerate AppSecret' : 'Secret Reset Successfully'"
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="step === 'confirm'"
    @close="step === 'confirm' ? undefined : handleSuccessClose"
  >
    <!-- Confirm Step -->
    <template v-if="step === 'confirm'">
      <div class="flex items-start gap-3 mb-4">
        <el-icon class="w-6 h-6 text-warning mt-0.5">
          <Warning />
        </el-icon>
        <div>
          <p class="text-sm text-gray-600 mb-2">Warning: {{ warningText }}</p>
        </div>
      </div>

      <div class="mb-4">
        <label for="confirm-app-name" class="block text-sm font-medium text-gray-700 mb-2">
          Enter application name <span class="font-mono text-brand">{{ applicationName }}</span> to confirm
        </label>
        <el-input
          id="confirm-app-name"
          v-model="confirmName"
          :placeholder="`Enter: ${applicationName}`"
          size="large"
          aria-label="Confirm application name"
          @keyup.enter="isConfirmed && handleRegenerate()"
        />
      </div>
    </template>

    <!-- Success Step -->
    <template v-else>
      <div class="text-center py-4">
        <el-icon class="w-12 h-12 text-success mx-auto mb-4">
          <CircleCheck />
        </el-icon>
        <p class="text-gray-600 mb-4">New secret has been generated. Please copy and save it immediately.</p>

        <div class="flex gap-2">
          <el-input
            :value="newAppSecret"
            readonly
            size="large"
            class="font-mono flex-1 h-10"
            type="password"
            aria-label="New secret"
          />
          <Button :type="copied ? 'success' : 'primary'" @click="copySecret">
            <el-icon class="mr-1"><DocumentCopy /></el-icon>
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>

        <p class="text-xs text-gray-400 mt-3">
          Note: This secret will only be shown once. Please keep it safe.
        </p>
      </div>
    </template>

    <!-- Footer -->
    <template #footer>
      <template v-if="step === 'confirm'">
        <Button @click="handleClose">Cancel</Button>
        <Button
          type="danger"
          :loading="loading"
          :disabled="!isConfirmed"
          @click="handleRegenerate"
        >
          Confirm Reset
        </Button>
      </template>
      <template v-else>
        <Button type="primary" @click="handleSuccessClose">I Have Copied</Button>
      </template>
    </template>
  </el-dialog>
</template>
