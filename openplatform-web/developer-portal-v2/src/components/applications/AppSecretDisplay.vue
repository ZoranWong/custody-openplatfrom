<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { DocumentCopy, Warning, Lock, Refresh } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import Button from '@/components/common/Button.vue'

interface Props {
  appId?: string
  /** Masked secret returned by the detail endpoint, e.g. `sk_beta_xK9...O5p`. */
  appSecretMasked?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'regenerate'): void
}>()

const { t } = useI18n()

const copyAppId = async () => {
  if (!props.appId) return

  try {
    await navigator.clipboard.writeText(props.appId)
    ElMessage.success(t('developer.applications.copySuccess'))
  } catch {
    ElMessage.error(t('developer.applications.copyFailed'))
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-3">
      <el-icon class="w-4 h-4 text-warning"><Warning /></el-icon>
      <span class="text-sm text-warning">{{ t('developer.applications.secretDialog.maskedHint') }}</span>
    </div>

    <!-- App ID -->
    <div v-if="appId" class="mb-4">
      <label class="block text-sm font-medium text-gray-500 mb-2">App ID</label>
      <div class="flex gap-2">
        <el-input :model-value="appId" readonly size="large" class="font-mono flex-1 h-10" />
        <Button type="primary" @click="copyAppId">
          <el-icon class="mr-1"><DocumentCopy /></el-icon>
          {{ t('developer.applications.copy') }}
        </Button>
      </div>
    </div>

    <!-- Masked AppSecret + Regenerate -->
    <div v-if="appSecretMasked">
      <label class="block text-sm font-medium text-gray-500 mb-2">{{ t('developer.applications.appSecret') }}</label>
      <div class="flex gap-2">
        <el-input :model-value="appSecretMasked" readonly size="large" class="font-mono flex-1 h-10" />
        <Button type="warning" @click="emit('regenerate')">
          <el-icon class="mr-1"><Refresh /></el-icon>
          {{ t('developer.applications.regenerateDialog.title') }}
        </Button>
      </div>
      <p class="text-xs text-gray-400 mt-2">{{ t('developer.applications.secretDialog.maskedDesc') }}</p>
    </div>

    <!-- 无 AppSecret 提示 -->
    <div v-else class="text-center py-4">
      <el-icon class="w-8 h-8 text-gray-300 mb-2"><Lock /></el-icon>
      <p class="text-gray-500 text-sm mb-3">{{ t('developer.applications.secretDialog.noSecret') }}</p>
      <p class="text-gray-400 text-xs">{{ t('developer.applications.secretDialog.noSecretDesc') }}</p>
    </div>
  </div>
</template>

