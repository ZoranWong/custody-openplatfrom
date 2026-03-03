<script setup lang="ts">
import { computed } from 'vue'
import { ElButton } from 'element-plus'

interface Props {
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'large' | 'default' | 'small'
  disabled?: boolean
  loading?: boolean
  nativeType?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'default',
  disabled: false,
  loading: false,
  nativeType: 'button'
})

// Map type to CSS variable
const color = computed(() => {
  const colors: Record<string, string> = {
    primary: 'var(--el-color-primary)',
    success: 'var(--el-color-success)',
    warning: 'var(--el-color-warning)',
    danger: 'var(--el-color-danger)',
    info: 'var(--el-color-info)'
  }
  return colors[props.type] || ''
})
</script>

<template>
  <ElButton
    :type="type"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    :native-type="nativeType"
    :color="color"
  >
    <slot />
  </ElButton>
</template>
