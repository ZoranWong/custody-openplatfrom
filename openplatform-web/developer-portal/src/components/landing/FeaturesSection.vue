<script setup lang="ts">
const useCases = [
  {
    icon: 'Building',
    title: 'Corporate Treasury',
    description: 'Manage cross-border crypto settlements with bank-grade security. Ideal for international trading firms and institutions managing their own balance sheet.',
    features: [
      'Multi-person approval workflows',
      'Automated receivable sweeping'
    ],
    gradient: 'from-amber-500 to-amber-600'
  },
  {
    icon: 'CreditCard',
    title: 'Payment Processing',
    description: 'Enable crypto acceptance for merchants. Automated pay-in processing, risk quarantine for large amounts, and streamlined payouts.',
    features: [
      'High-volume transaction handling',
      'Real-time risk engine'
    ],
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    icon: 'User',
    title: 'Individual Custody',
    description: 'Infrastructure for banks and fintechs to offer crypto wallets to their retail users (B2B2C). We handle the custody; you own the experience.',
    features: [
      'Segregated deposit addresses',
      'Whitelabel integration'
    ],
    gradient: 'from-emerald-500 to-emerald-600'
  }
]

const platformFeatures = [
  {
    number: '01',
    title: 'Embedded Plug-in Pages',
    description: 'Secure UI components for transaction signing, policy configuration, and risk authorization that live inside your app.'
  },
  {
    number: '02',
    title: 'Granular Policy Engine',
    description: 'Define strict rules for withdrawals, approvals, and whitelists. Enforce compliance programmatically.'
  },
  {
    number: '03',
    title: 'Automated Reconciliation',
    description: 'Real-time ledger matching between on-chain reality and your internal records. Never lose track of a cent.'
  }
]
</script>

<template>
  <!-- Use Cases Section -->
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section header -->
      <div class="text-center mb-16">
        <h2 class="text-sm font-bold text-brand tracking-widest uppercase mb-3">
          Developer-First Platform
        </h2>
        <h3 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Business-Finance Integration
        </h3>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Don't just manage assets; program them. Cregis provides the primitives for developers to unify operational flows with financial settlement.
        </p>
      </div>

      <!-- Use Cases grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div
          v-for="(useCase, index) in useCases"
          :key="index"
          class="group"
        >
          <div class="bg-gray-50 rounded-xl p-8 border border-gray-100 h-full hover:shadow-xl hover:shadow-brand/10 hover:border-brand/30 transition-all duration-300">
            <!-- Icon -->
            <div
              class="w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform bg-white border border-gray-200"
              :class="useCase.gradient"
            >
              <svg v-if="useCase.icon === 'Building'" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <svg v-else-if="useCase.icon === 'CreditCard'" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <svg v-else-if="useCase.icon === 'User'" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>

            <!-- Title -->
            <h4 class="text-xl font-bold text-gray-900 mb-4">
              {{ useCase.title }}
            </h4>

            <!-- Description -->
            <p class="text-gray-600 mb-6 leading-relaxed">
              {{ useCase.description }}
            </p>

            <!-- Features -->
            <ul class="space-y-2">
              <li
                v-for="(feature, fIndex) in useCase.features"
                :key="fIndex"
                class="flex items-center gap-2 text-sm text-gray-500"
              >
                <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ feature }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Platform Features Section -->
  <section class="py-20 bg-slate-950 text-white relative overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950" />

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <!-- Left content -->
        <div>
          <h2 class="text-sm font-bold text-brand tracking-widest uppercase mb-3">
            API-First Architecture
          </h2>
          <h3 class="text-3xl md:text-4xl font-bold text-white mb-6">
            Programmable Custody
          </h3>
          <p class="text-slate-400 text-lg mb-8 leading-relaxed">
            Cregis is built for developers. Our "Invisible Banking" architecture allows you to abstract complex crypto operations into simple API calls, embedding financial capabilities directly into your application code.
          </p>

          <!-- Feature list -->
          <div class="space-y-6">
            <div
              v-for="(feature, index) in platformFeatures"
              :key="index"
              class="flex gap-4"
            >
              <div class="flex-shrink-0 w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-brand font-bold text-sm">
                {{ feature.number }}
              </div>
              <div>
                <h4 class="text-lg font-bold text-white mb-2">
                  {{ feature.title }}
                </h4>
                <p class="text-slate-400">
                  {{ feature.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right visual -->
        <div class="relative hidden lg:block">
          <div class="absolute inset-0 bg-gradient-to-r from-brand/20 to-purple-500/20 blur-3xl rounded-full" />
          <div class="relative bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-2xl">
            <div class="font-mono text-xs text-slate-500 mb-4 flex justify-between">
              <span>API Request: Create Payment Task</span>
              <span>POST /api/v1/tasks/payment</span>
            </div>
            <pre class="text-xs text-green-400 overflow-x-auto">
{
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
            <div class="mt-4 pt-4 border-t border-slate-800">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span class="text-white text-sm">201 Created - Task queued for signing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
