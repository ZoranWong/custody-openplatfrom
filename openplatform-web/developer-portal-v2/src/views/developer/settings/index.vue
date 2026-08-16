<template>
  <div class="settings-page" style="padding: 24px; overflow-y: auto; height: 100%;">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">{{ $t('menus.developer.settings') }}</h2>
      <p class="mt-2 text-gray-500">{{ $t('common.comingSoon') }}</p>
    </div>
    <ElCard>
      <ElEmpty :description="$t('common.comingSoon')" />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DeveloperSettings' })
</script>