<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <section class="relative bg-slate-950 overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
    <div class="absolute -top-40 -right-40 w-96 h-96 bg-brand/20 rounded-full blur-3xl" />
    <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-dark/10 rounded-full blur-3xl" />
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/5 rounded-full blur-3xl" />

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <!-- Left content -->
        <div>
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-brand text-sm font-medium mb-8">
            <span class="w-2 h-2 bg-brand rounded-full animate-pulse" />
            For Corporate Developers
          </div>

          <!-- Heading -->
          <h1 class="text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
            The Infrastructure for
            <span class="text-brand">Business-Finance Integration</span>
          </h1>

          <!-- Subheading -->
          <p class="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl">
            Embed banking-grade custody directly into your business logic. Empower your engineering team to build automated, secure, and compliant digital asset workflows that seamlessly unify business operations with financial settlement.
          </p>

          <!-- CTAs -->
          <div class="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              @click="navigateTo('/register')"
              class="btn-primary text-lg px-8 py-3 flex items-center justify-center gap-2"
            >
              Start Building
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            <button
              @click="navigateTo('/docs')"
              class="btn-outline text-lg px-8 py-3 flex items-center justify-center gap-2"
            >
              View API Docs
            </button>
          </div>

          <!-- Trust indicators -->
          <div class="flex flex-wrap items-center gap-8 text-slate-500 text-sm">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Bank-Grade Security</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>99.9% Uptime</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Real-Time Settlement</span>
            </div>
          </div>
        </div>

        <!-- Right visual - API Code Example -->
        <div class="relative hidden lg:block">
          <div class="absolute inset-0 bg-brand/20 blur-[100px] rounded-full" />
          <div class="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
            <!-- Window controls -->
            <div class="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500" />
                <div class="w-3 h-3 rounded-full bg-yellow-500" />
                <div class="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div class="text-xs text-slate-500 font-mono">Cregis Secure Enclave</div>
            </div>

            <!-- Code content -->
            <div class="font-mono text-sm space-y-4">
              <!-- Request -->
              <div>
                <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>POST /api/v1/tasks/payment</span>
                  <span class="text-green-400">201 Created</span>
                </div>
                <pre class="text-xs text-slate-300 bg-black/30 p-4 rounded border border-white/5 overflow-x-auto">{
  "request_id": "req_123456789",
  "treasury_unit": "tu_corp_001",
  "amount": "50000.00",
  "asset": "USDT-ERC20",
  "destination": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "policy_check": {
    "status": "PENDING_APPROVAL",
    "required_signatures": 3,
    "current_signatures": 0
  }
}</pre>
              </div>

              <!-- Response -->
              <div class="pt-4 border-t border-white/5">
                <div class="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span>System Response</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span class="text-white text-sm">Task queued for signing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
