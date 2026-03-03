<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Hide, DocumentCopy, CircleCheck } from '@element-plus/icons-vue'
import type { Application } from '@/services/api'
import Button from '@/components/common/Button.vue'

interface Props {
  modelValue: boolean
  application: Application | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()

const secretVisible = ref(false)
const copied = ref(false)
const confirmed = ref(false)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const appSecret = computed(() => props.application?.appSecret || '')

const maskedSecret = (secret: string) => {
  if (!secret) return ''
  // appSecret is 32 characters, show first 8 + 8 asterisks
  return secret.substring(0, 8) + '********'
}

const toggleSecretVisibility = () => {
  secretVisible.value = !secretVisible.value
}

const copyAppSecret = async () => {
  if (!appSecret.value) return

  try {
    await navigator.clipboard.writeText(appSecret.value)
    copied.value = true
    ElMessage.success('Copied to clipboard')
  } catch (e) {
    ElMessage.error('Copy failed, please copy manually')
  }
}

const handleConfirm = () => {
  if (!confirmed.value) {
    ElMessage.warning('Please confirm that you have saved the AppSecret')
    return
  }
  dialogVisible.value = false
  emit('confirm')
}

const handleClose = () => {
  dialogVisible.value = false
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="Application Secret"
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <div class="space-y-4">
      <!-- Warning -->
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
      >
        <template #title>
          Please keep your AppSecret safe. This value will only be shown once.
        </template>
      </el-alert>

      <!-- App Info -->
      <div v-if="application">
        <p class="text-sm text-gray-600 mb-2">Application Name: {{ application.name }}</p>
        <p class="text-sm text-gray-600 mb-4">AppID: {{ application.appId }}</p>
      </div>

      <!-- AppSecret Display -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          AppSecret
        </label>
        <div class="flex gap-2">
          <el-input
            :value="secretVisible ? appSecret : maskedSecret(appSecret)"
            readonly
            size="large"
            class="font-mono flex-1"
            :type="secretVisible ? 'text' : 'password'"
          />
          <Button type="info" @click="toggleSecretVisibility">
            <el-icon class="mr-1"><Hide v-if="secretVisible" /><View v-else /></el-icon>
            {{ secretVisible ? 'Hide' : 'Show' }}
          </Button>
          <Button
            :type="copied ? 'success' : 'primary'"
            @click="copyAppSecret"
          >
            <el-icon class="mr-1"><CircleCheck v-if="copied" /><DocumentCopy v-else /></el-icon>
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
      </div>

      <!-- Confirmation -->
      <el-checkbox v-model="confirmed" class="mt-4">
        I understand and have saved the AppSecret. I understand this value will not be shown again.
      </el-checkbox>
    </div>

    <template #footer>
      <Button type="primary" :disabled="!confirmed" @click="handleConfirm">
        I Have Saved
      </Button>
    </template>
  </el-dialog>
</template>
