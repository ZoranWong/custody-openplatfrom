<!-- 系统logo -->
<template>
  <div
    class="flex-cc flex items-center justify-center"
    :style="{ width: `${props.size}px`, height: `${props.size}px` }"
  >
    <img src="@imgs/common/logo.svg" alt="logo" class="h-full" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ArtLogo' })

  interface Props {
    /** logo 大小 */
    size?: number | string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 36
  })

  const logoStyle = computed(() => ({ width: `${props.size}px` }))
</script>
