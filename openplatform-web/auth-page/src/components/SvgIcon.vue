<template>
  <svg :class="svgClass" aria-hidden="true">
    <use :xlink:href="iconName" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    default: () => '',
  },
})

const iconName = computed(() => {
  return `#icon-${props.name}`
})

const svgClass = computed(() => {
  return props.class ? 'svg-icon ' + props.class : 'svg-icon';
})
</script>

<style scoped>
.svg-icon {
  fill: currentColor;
}
</style>
