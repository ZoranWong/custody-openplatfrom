<script setup lang="ts">
  import type { ButtonType, ButtonNativeType } from 'element-plus'

  const props = defineProps({
    type: { type: String as () => ButtonType, default: 'primary' },
    size: { type: String as () => '' | 'default' | 'small' | 'large', default: 'default' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    nativeType: { type: String as () => ButtonNativeType, default: 'button' }
  })
</script>

<template>
  <ElButton
    v-bind="$attrs"
    :type="type"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    :native-type="nativeType"
  >
    <slot />
  </ElButton>
</template>