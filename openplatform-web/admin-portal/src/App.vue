<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'

const route = useRoute()

// Routes that should use the admin layout (authenticated routes)
const usesAdminLayout = computed(() => {
  return route.meta?.requiresAuth !== false
})
</script>

<template>
  <AdminLayout v-if="usesAdminLayout">
    <RouterView />
  </AdminLayout>
  <RouterView v-else />
</template>
