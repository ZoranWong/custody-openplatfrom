<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning, DocumentCopy, CircleCheck } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import Button from '@/components/common/Button.vue'
import { fetchRegenerateAppSecret } from '@/api/application'

interface Props {
  modelValue: boolean
  applicationId: string
  applicationName: string
}

const props = defineProps<Props>()

const { t } = useI18n()

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

const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(newAppSecret.value)
    copied.value = true
    ElMessage.success(t('developer.applications.regenerateDialog.copySuccess'))
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (e) {
    ElMessage.error(t('developer.applications.regenerateDialog.copyFailed'))
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
    const result = await fetchRegenerateAppSecret(props.applicationId)
    const responseData = (result as any).data || result
    newAppSecret.value = responseData.appSecret || responseData.app_secret || ''
    step.value = 'success'
    ElMessage.success(t('developer.applications.regenerateDialog.success'))
    emit('regenerated')
  } catch (e: any) {
    const code = e.response?.data?.code
    const message = e.response?.data?.message || t('developer.applications.regenerateDialog.resetFailed')

    if (code === 1003) {
      ElMessage.error(t('developer.applications.regenerateDialog.permissionDenied'))
    } else if (code === 1005) {
      ElMessage.error(t('developer.applications.regenerateDialog.statusNotAllowed'))
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
  setTimeout(resetDialogState, 300)
}

watch(showDialog, (val) => {
  if (val) {
    resetDialogState()
  }
})
</script>

<template>
  <el-dialog
    v-model="showDialog"
    :title="step === 'confirm' ? t('developer.applications.regenerateDialog.title') : t('developer.applications.regenerateDialog.success')"
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
          <p class="text-sm text-gray-600 mb-2">{{ t('developer.applications.regenerateDialog.warning') }}</p>
        </div>
      </div>

      <div class="mb-4">
        <label for="confirm-app-name" class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('developer.applications.regenerateDialog.confirmLabel') }} <span class="font-mono text-brand">{{ applicationName }}</span> {{ t('common.confirm') }}
        </label>
        <el-input
          id="confirm-app-name"
          v-model="confirmName"
          :placeholder="t('developer.applications.regenerateDialog.confirmPlaceholder') + applicationName"
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
        <p class="text-gray-600 mb-4">{{ t('developer.applications.regenerateDialog.newSecretGenerated') }}</p>

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
            {{ copied ? t('developer.applications.regenerateDialog.copied') : t('developer.applications.regenerateDialog.copy') }}
          </Button>
        </div>

        <p class="text-xs text-gray-400 mt-3">
          {{ t('developer.applications.regenerateDialog.secretNote') }}
        </p>
      </div>
    </template>

    <!-- Footer -->
    <template #footer>
      <template v-if="step === 'confirm'">
        <Button @click="handleClose">{{ t('developer.applications.regenerateDialog.cancel') }}</Button>
        <Button
          type="danger"
          :loading="loading"
          :disabled="!isConfirmed"
          @click="handleRegenerate"
        >
          {{ t('developer.applications.regenerateDialog.confirm') }}
        </Button>
      </template>
      <template v-else>
        <Button type="primary" @click="handleSuccessClose">{{ t('developer.applications.regenerateDialog.iHaveCopied') }}</Button>
      </template>
    </template>
  </el-dialog>
</template>
