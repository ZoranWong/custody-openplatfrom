<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status: 'success' | 'pending' | 'failed'
}

const props = defineProps<Props>()

const statusConfig = computed(() => {
  const configs: Record<string, { label: string; type: 'success' | 'warning' | 'danger' | 'info' }> = {
    success: { label: '成功', type: 'success' },
    pending: { label: '处理中', type: 'warning' },
    failed: { label: '失败', type: 'danger' }
  }
  return configs[props.status] || { label: props.status, type: 'info' }
})
</script>

<template>
  <el-tag
    :type="statusConfig.type"
    size="small"
  >
    {{ statusConfig.label }}
  </el-tag>
</template>
