<!-- 一个让 SVG 图片跟随主题的组件，只对特定 svg 图片生效，不建议开发者使用 -->
<!-- 图片地址 https://iconpark.oceanengine.com/illustrations/13 -->
<template>
  <div class="theme-svg" :style="sizeStyle">
    <div v-if="src" class="svg-container" v-html="svgContent"></div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watchEffect } from 'vue'

  interface Props {
    size?: string | number
    themeColor?: string
    src?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 500,
    themeColor: 'var(--el-color-primary)'
  })

  const svgContent = ref('')

  // 计算样式
  const sizeStyle = computed(() => {
    const sizeValue = typeof props.size === 'number' ? `${props.size}px` : props.size
    return {
      width: sizeValue,
      height: sizeValue
    }
  })

  // 颜色映射配置
  const COLOR_MAPPINGS = {
    '#C7DEFF': 'var(--el-color-primary-light-6)',
    '#071F4D': 'var(--el-color-primary-dark-2)',
    '#00E4E5': 'var(--el-color-primary-light-1)',
    '#006EFF': 'var(--el-color-primary)',
    '#fff': 'var(--default-box-color)',
    '#ffffff': 'var(--default-box-color)',
    '#DEEBFC': 'var(--el-color-primary-light-7)',
    '#f3f6fa': 'var(--default-box-color)',
    '#f1f6ff': 'var(--default-box-color)',
    '#f7f8f8': 'var(--default-box-color)',
    '#6179ef': 'var(--el-color-primary)',
    '#2a5cd0': 'var(--el-color-primary)',
    '#5b9bfd': 'var(--el-color-primary-light-6)',
    '#b4d1ff': 'var(--el-color-primary-light-6)',
    '#c1deff': 'var(--el-color-primary-light-6)',
    '#8aaaff': 'var(--el-color-primary-light-6)',
    '#856cf2': 'var(--el-color-primary-light-1)',
    '#faca00': 'var(--el-color-warning)',
    '#f9bc00': 'var(--el-color-warning)',
    '#fce088': 'var(--el-color-primary-light-7)',
    '#fbcfbc': 'var(--el-color-primary-light-7)',
    '#ec6941': 'var(--el-color-danger)',
    '#eb3f17': 'var(--el-color-danger)',
    '#f385b5': 'var(--el-color-primary-light-1)',
    '#e26da5': 'var(--el-color-primary)',
    '#efb594': 'var(--el-color-primary-light-7)',
    '#f5634a': 'var(--el-color-danger)',
    '#53c8ce': 'var(--el-color-primary-light-1)',
    '#1a96cf': 'var(--el-color-primary)',
    '#193d9d': 'var(--el-color-primary-dark-2)',
    '#365ece': 'var(--el-color-primary)',
    '#211d42': 'var(--el-color-primary-dark-2)',
    '#322d76': 'var(--el-color-primary)',
    '#e59a05': 'var(--el-color-warning)',
    '#0b1066': 'var(--el-color-primary-dark-2)',
    '#405ab1': 'var(--el-color-primary)',
    '#202875': 'var(--el-color-primary-dark-2)',
    '#140944': 'var(--el-color-primary-dark-2)',
  } as const

  // 将主题色应用到 SVG 内容
  const applyThemeToSvg = (content: string): string => {
    return Object.entries(COLOR_MAPPINGS).reduce(
      (processedContent, [originalColor, themeColor]) => {
        const fillRegex = new RegExp(`fill="${originalColor}"`, 'gi')
        const strokeRegex = new RegExp(`stroke="${originalColor}"`, 'gi')

        return processedContent
          .replace(fillRegex, `fill="${themeColor}"`)
          .replace(strokeRegex, `stroke="${themeColor}"`)
      },
      content
    )
  }

  // 加载 SVG 文件内容
  const loadSvgContent = async () => {
    if (!props.src) {
      svgContent.value = ''
      return
    }

    try {
      const response = await fetch(props.src)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const content = await response.text()
      svgContent.value = applyThemeToSvg(content)
    } catch (error) {
      console.error('Failed to load SVG:', error)
      svgContent.value = ''
    }
  }

  watchEffect(() => {
    loadSvgContent()
  })
</script>

<style lang="scss" scoped>
  .theme-svg {
    display: inline-block;

    .svg-container {
      width: 100%;
      height: 100%;

      :deep(svg) {
        width: 100%;
        height: 100%;
      }
    }
  }
</style>
