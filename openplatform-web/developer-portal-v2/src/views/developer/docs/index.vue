<script setup lang="ts">
defineOptions({ name: 'DeveloperDocs' })
</script>

<template>
  <div class="p-5 flex items-center justify-center" style="min-height: 60vh;">
    <div class="text-center">
      <ElIcon class="w-16 h-16 mx-auto text-gray-300 mb-4">
        <Document />
      </ElIcon>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">{{ $t('common.comingSoon') }}</h2>
      <p class="text-gray-500">Documentation is coming soon.</p>
    </div>
  </div>
</template>