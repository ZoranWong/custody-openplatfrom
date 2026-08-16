<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  status: 'success' | 'pending' | 'failed'
}

const props = defineProps<Props>()

const { t } = useI18n()

const statusConfig = computed(() => {
  const configs: Record<string, { label: string; type: 'success' | 'warning' | 'danger' | 'info' }> = {
    success: { label: t('developer.paymentHistory.status.success'), type: 'success' },
    pending: { label: t('developer.paymentHistory.status.pending'), type: 'warning' },
    failed: { label: t('developer.paymentHistory.status.failed'), type: 'danger' }
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
