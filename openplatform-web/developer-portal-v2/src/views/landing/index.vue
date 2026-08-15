<script setup lang="ts">
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import HeroSection from './components/HeroSection.vue'
import FeaturesSection from './components/FeaturesSection.vue'
import CtaSection from './components/CtaSection.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Header />
    <main class="flex-grow">
      <HeroSection />
      <FeaturesSection />
      <CtaSection />
    </main>
    <Footer />
  </div>
</template>
