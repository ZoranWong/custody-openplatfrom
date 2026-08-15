<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Hide, DocumentCopy, Warning, Lock } from '@element-plus/icons-vue'
import Button from '@/components/common/Button.vue'

interface Props {
  appId?: string
  appSecret?: string
}

const props = defineProps<Props>()

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
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败，请手动复制')
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
      <span class="text-sm text-warning">请妥善保管您的密钥，不要泄露给他人</span>
    </div>

    <!-- AppSecret -->
    <div v-if="appSecret">
      <label class="block text-sm font-medium text-gray-500 mb-2">AppSecret</label>
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
          {{ secretVisible ? '隐藏' : '显示' }}
        </Button>
        <Button type="primary" @click="copySecret">
          <el-icon class="mr-1"><DocumentCopy /></el-icon>
          复制
        </Button>
      </div>
    </div>

    <!-- 无 AppSecret 提示 -->
    <div v-else class="text-center py-4">
      <el-icon class="w-8 h-8 text-gray-300 mb-2"><Lock /></el-icon>
      <p class="text-gray-500 text-sm mb-3">AppSecret 暂未显示</p>
      <p class="text-gray-400 text-xs">请联系管理员或使用重置密钥功能获取</p>
    </div>
  </div>
</template>
