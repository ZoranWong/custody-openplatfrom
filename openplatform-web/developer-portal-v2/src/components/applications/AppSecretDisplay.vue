<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Hide, DocumentCopy, Warning, Lock } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import Button from '@/components/common/Button.vue'

interface Props {
  appId?: string
  appSecret?: string
}

const props = defineProps<Props>()

const { t } = useI18n()

const secretVisible = ref(false)

const maskedSecret = (secret: string) => {
  if (!secret) return ''
  // appSecret 32位，显示前8位 + 8个星号
  return secret.substring(0, 8) + '••••••••'
}

const copySecret = async () => {
  if (!props.appSecret) return

  try {
    await navigator.clipboard.writeText(props.appSecret)
    ElMessage.success(t('developer.applications.copySuccess'))
  } catch (e) {
    ElMessage.error(t('developer.applications.copyFailed'))
  }
}

const toggleSecretVisibility = () => {
  secretVisible.value = !secretVisible.value
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-2">
      <el-icon class="w-4 h-4 text-warning"><Warning /></el-icon>
      <span class="text-sm text-warning">{{ t('developer.applications.secretDialog.warning') }}</span>
    </div>

    <!-- AppSecret -->
    <div v-if="appSecret">
      <label class="block text-sm font-medium text-gray-500 mb-2">{{ t('developer.applications.appSecret') }}</label>
      <div class="flex gap-2">
        <el-input
          :model-value="secretVisible ? appSecret : maskedSecret(appSecret || '')"
          readonly
          size="large"
          class="font-mono flex-1 h-10"
          :type="secretVisible ? 'text' : 'password'"
        />
        <Button type="info" @click="toggleSecretVisibility">
          <el-icon class="mr-1"><Hide v-if="secretVisible" /><View v-else /></el-icon>
          {{ secretVisible ? t('developer.applications.secretDialog.hide') : t('developer.applications.secretDialog.show') }}
        </Button>
        <Button type="primary" @click="copySecret">
          <el-icon class="mr-1"><DocumentCopy /></el-icon>
          {{ t('developer.applications.copy') }}
        </Button>
      </div>
    </div>

    <!-- 无 AppSecret 提示 -->
    <div v-else class="text-center py-4">
      <el-icon class="w-8 h-8 text-gray-300 mb-2"><Lock /></el-icon>
      <p class="text-gray-500 text-sm mb-3">{{ t('developer.applications.secretDialog.noSecret') }}</p>
      <p class="text-gray-400 text-xs">{{ t('developer.applications.secretDialog.noSecretDesc') }}</p>
    </div>
  </div>
</template>
