<script setup lang="ts">
defineOptions({ name: 'ApplicationEdit' })
const router = useRouter()
onMounted(() => router.replace({ name: 'ApplicationsList' }))
</script>
<template><div /></template>