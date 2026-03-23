<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AccountForm from '@/components/auth/AccountForm.vue'
import KYBForm from '@/components/auth/KYBForm.vue'
import UBOForm, { type UBO } from '@/components/auth/UBOForm.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const BASE_PATH = import.meta.env.VITE_BASE || '/'
const loginUrl = computed(() => `${BASE_PATH}login`)

const currentStep = ref(1)
const totalSteps = 3
const loading = ref(false)
const agreeTerms = ref(false)

const accountData = reactive({
  email: '',
  password: '',
  confirmPassword: ''
})

const kybData = reactive({
  legalName: '',
  registrationNumber: '',
  jurisdiction: '',
  dateOfIncorporation: '',
  registeredAddress: '',
  website: ''
})

const uboData = ref<UBO[]>([
  { name: '', idType: 'national_id', idNumber: '', nationality: '', phone: '' }
])

const steps = [
  { title: 'Account', description: 'Set up your account' },
  { title: 'Company', description: 'KYB information' },
  { title: 'UBOs', description: 'Beneficial owner info' }
]

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return accountData.email &&
           accountData.password &&
           accountData.confirmPassword === accountData.password &&
           accountData.password.length >= 8
  }
  if (currentStep.value === 2) {
    return kybData.legalName &&
           kybData.registrationNumber &&
           kybData.jurisdiction &&
           kybData.dateOfIncorporation &&
           kybData.registeredAddress
  }
  if (currentStep.value === 3) {
    return uboData.value.length > 0 &&
           uboData.value.every((ubo: UBO) =>
             ubo.name && ubo.idNumber && ubo.nationality && ubo.phone
           )
  }
  return false
})

const nextStep = () => {
  if (currentStep.value < totalSteps && canProceed.value) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleSubmit = async () => {
  if (!agreeTerms.value) {
    ElMessage.warning('Please read and agree to the Terms of Service and Privacy Policy')
    return
  }

  if (!uboFormRef.value?.validate()) {
    return
  }

  loading.value = true

  try {
    // Submit registration data to ISV API
    await authStore.register({
      email: accountData.email,
      password: accountData.password,
      legalName: kybData.legalName,
      registrationNumber: kybData.registrationNumber,
      jurisdiction: kybData.jurisdiction,
      dateOfIncorporation: kybData.dateOfIncorporation,
      registeredAddress: kybData.registeredAddress,
      website: kybData.website,
      uboInfo: uboData.value
    })

    ElMessage.success('Registration successful! Please wait for KYB approval. You will be notified by email.')
    router.push({ name: 'login' })
  } catch (error: any) {
    const message = error.response?.data?.message || 'Registration failed, please try again later'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

const uboFormRef = ref()
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <a href="/" class="inline-block">
          <img src="/logo.svg" alt="Cregis" class="h-8 mx-auto" />
        </a>
      </div>

      <!-- Card -->
      <div class="card p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-gray-900">Create Developer Account</h2>
          <p class="mt-2 text-gray-600">Please fill in the information below to complete registration</p>
        </div>

        <!-- Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div
              v-for="(step, index) in steps"
              :key="index"
              class="flex items-center"
              :class="{ 'flex-1': index < totalSteps - 1 }"
            >
              <div class="flex flex-col items-center">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
                  :class="currentStep > index + 1
                    ? 'bg-brand text-white'
                    : currentStep === index + 1
                      ? 'bg-brand text-white'
                      : 'bg-gray-200 text-gray-600'"
                >
                  <svg v-if="currentStep > index + 1" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span v-else>{{ index + 1 }}</span>
                </div>
                <div class="mt-2 text-center">
                  <p class="text-sm font-medium text-gray-900">{{ step.title }}</p>
                  <p class="text-xs text-gray-500">{{ step.description }}</p>
                </div>
              </div>
              <div
                v-if="index < totalSteps - 1"
                class="flex-1 h-0.5 mx-4"
                :class="currentStep > index + 1 ? 'bg-brand' : 'bg-gray-200'"
              />
            </div>
          </div>
        </div>

        <!-- Form -->
        <div class="mb-6">
          <AccountForm
            v-show="currentStep === 1"
            v-model="accountData"
          />
          <KYBForm
            v-show="currentStep === 2"
            v-model="kybData"
          />
          <UBOForm
            v-show="currentStep === 3"
            ref="uboFormRef"
            v-model="uboData"
          />
        </div>

        <!-- Terms -->
        <div v-if="currentStep === totalSteps" class="mb-6">
          <el-checkbox v-model="agreeTerms">
            I agree to the
            <a href="/terms" class="text-brand hover:underline">Terms of Service</a>
            and
            <a href="/privacy" class="text-brand hover:underline">Privacy Policy</a>
          </el-checkbox>
        </div>

        <!-- Actions -->
        <div class="flex justify-between">
          <el-button
            v-if="currentStep > 1"
            @click="prevStep"
          >
            Previous
          </el-button>
          <div v-else />

          <el-button
            v-if="currentStep < totalSteps"
            type="primary"
            color="var(--el-color-primary)"
            :disabled="!canProceed"
            @click="nextStep"
          >
            Next
          </el-button>

          <el-button
            v-if="currentStep === totalSteps"
            type="primary"
            color="var(--el-color-primary)"
            :loading="loading"
            :disabled="!agreeTerms"
            @click="handleSubmit"
          >
            Submit for Review
          </el-button>
        </div>

        <!-- Login Link -->
        <div class="mt-6 text-center">
          <p class="text-gray-600">
            Already have an account?
            <a :href="loginUrl" class="text-brand hover:underline font-medium">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
