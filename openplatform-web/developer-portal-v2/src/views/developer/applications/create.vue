<script setup lang="ts">
defineOptions({ name: 'ApplicationCreate' })
const router = useRouter()
onMounted(() => router.replace({ name: 'ApplicationsList' }))
</script>
<template><div /></template>