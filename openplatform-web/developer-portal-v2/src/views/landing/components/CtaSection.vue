<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <section class="bg-brand py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 class="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
        Ready to Get Started?
      </h2>
      <p class="text-lg text-slate-900/80 mb-8 max-w-2xl mx-auto">
        Register now to experience the Cregis Open Platform and quickly provide secure and reliable cryptocurrency custody services for your enterprise users.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          @click="navigateTo('/register')"
          class="btn-primary-dark text-lg px-8 py-3"
        >
          Register Now
        </button>
        <button
          @click="navigateTo('/docs')"
          class="btn-outline-dark text-lg px-8 py-3"
        >
          View API Documentation
        </button>
      </div>
    </div>
  </section>
</template>
