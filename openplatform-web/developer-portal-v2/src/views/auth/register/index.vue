<!-- 注册页面 - ISV Developer Portal (三步注册流程) -->
<template>
  <div class="login-page">
    <AuthTopBar />

    <div class="auth-center-wrap">
      <div class="card p-8 register-card">
        <div class="text-center mb-6">
          <div class="logo-wrap mb-4">
            <ArtLogo size="40" />
          </div>
          <h2 class="text-2xl font-bold text-g-900">{{ $t('register.title') }}</h2>
          <p class="mt-2 text-g-600">{{ $t('register.subTitle') }}</p>
        </div>

        <!-- Steps -->
        <ElSteps :active="currentStep" align-center class="mb-6">
          <ElStep :title="$t('register.stepAccount')" />
          <ElStep :title="$t('register.stepCompany')" />
          <ElStep :title="$t('register.stepUbo')" />
        </ElSteps>

        <ElForm
          ref="formRef"
          :model="formData"
          :rules="currentRules"
          label-position="top"
          :key="formKey"
          @keyup.enter="handleNext"
        >
          <!-- Step 1: Account -->
          <div v-show="currentStep === 0">
            <ElFormItem prop="email">
              <ElInput
                class="custom-height"
                v-model.trim="formData.email"
                :placeholder="$t('register.placeholder.email')"
              />
            </ElFormItem>

            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                v-model.trim="formData.password"
                :placeholder="$t('register.placeholder.password')"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>

            <ElFormItem prop="confirmPassword">
              <ElInput
                class="custom-height"
                v-model.trim="formData.confirmPassword"
                :placeholder="$t('register.placeholder.confirmPassword')"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>
          </div>

          <!-- Step 2: Company Info -->
          <div v-show="currentStep === 1">
            <ElFormItem prop="legalName">
              <ElInput
                class="custom-height"
                v-model.trim="formData.legalName"
                :placeholder="$t('register.placeholder.legalName')"
              />
            </ElFormItem>

            <ElFormItem prop="registrationNumber">
              <ElInput
                class="custom-height"
                v-model.trim="formData.registrationNumber"
                :placeholder="$t('register.placeholder.registrationNumber')"
              />
            </ElFormItem>

            <ElFormItem prop="jurisdiction">
              <ElSelect
                class="custom-height w-full"
                v-model="formData.jurisdiction"
                :placeholder="$t('register.placeholder.jurisdiction')"
              >
                <ElOption label="Hong Kong" value="HK" />
                <ElOption label="Singapore" value="SG" />
                <ElOption label="United States" value="US" />
                <ElOption label="United Kingdom" value="UK" />
                <ElOption label="China" value="CN" />
                <ElOption label="Japan" value="JP" />
                <ElOption label="South Korea" value="KR" />
                <ElOption label="Other" value="OTHER" />
              </ElSelect>
            </ElFormItem>

            <ElFormItem prop="dateOfIncorporation">
              <ElDatePicker
                class="w-full custom-height"
                v-model="formData.dateOfIncorporation"
                type="date"
                :placeholder="$t('register.placeholder.dateOfIncorporation')"
                value-format="YYYY-MM-DD"
              />
            </ElFormItem>

            <ElFormItem prop="registeredAddress">
              <ElInput
                class="custom-height"
                v-model.trim="formData.registeredAddress"
                :placeholder="$t('register.placeholder.registeredAddress')"
                type="textarea"
                :rows="2"
              />
            </ElFormItem>

            <ElFormItem prop="website">
              <ElInput
                class="custom-height"
                v-model.trim="formData.website"
                :placeholder="$t('register.placeholder.website')"
              />
            </ElFormItem>
          </div>

          <!-- Step 3: UBO Info -->
          <div v-show="currentStep === 2">
            <div
              v-for="(ubo, index) in formData.uboInfo"
              :key="index"
              class="card p-4 mb-4"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-medium text-g-700">UBO #{{ index + 1 }}</span>
                <ElButton
                  v-if="formData.uboInfo.length > 1"
                  type="danger"
                  size="small"
                  plain
                  @click="removeUbo(index)"
                >
                  {{ $t('common.cancel') }}
                </ElButton>
              </div>

              <ElFormItem :prop="`uboInfo.${index}.name`" :rules="uboNameRule">
                <ElInput
                  class="custom-height"
                  v-model.trim="ubo.name"
                  :placeholder="$t('register.placeholder.uboName')"
                />
              </ElFormItem>

              <ElFormItem :prop="`uboInfo.${index}.idType`" :rules="uboIdTypeRule">
                <ElSelect
                  class="custom-height w-full"
                  v-model="ubo.idType"
                  :placeholder="$t('register.placeholder.uboIdNumber')"
                >
                  <ElOption label="Passport" value="passport" />
                  <ElOption label="National ID" value="national_id" />
                </ElSelect>
              </ElFormItem>

              <ElFormItem :prop="`uboInfo.${index}.idNumber`" :rules="uboIdNumberRule">
                <ElInput
                  class="custom-height"
                  v-model.trim="ubo.idNumber"
                  :placeholder="$t('register.placeholder.uboIdNumber')"
                />
              </ElFormItem>

              <ElFormItem :prop="`uboInfo.${index}.nationality`" :rules="uboNationalityRule">
                <ElSelect
                  class="custom-height w-full"
                  v-model="ubo.nationality"
                  :placeholder="$t('register.placeholder.uboNationality')"
                >
                  <ElOption label="Hong Kong" value="HK" />
                  <ElOption label="Singapore" value="SG" />
                  <ElOption label="United States" value="US" />
                  <ElOption label="United Kingdom" value="UK" />
                  <ElOption label="China" value="CN" />
                  <ElOption label="Japan" value="JP" />
                  <ElOption label="South Korea" value="KR" />
                  <ElOption label="Other" value="OTHER" />
                </ElSelect>
              </ElFormItem>

              <ElFormItem :prop="`uboInfo.${index}.phone`" :rules="uboPhoneRule">
                <ElInput
                  class="custom-height"
                  v-model.trim="ubo.phone"
                  :placeholder="$t('register.placeholder.uboPhone')"
                />
              </ElFormItem>
            </div>

            <ElButton type="primary" plain class="w-full" @click="addUbo">
              + {{ $t('register.addUbo') }}
            </ElButton>
          </div>

          <!-- Agreement (shown on last step) -->
          <ElFormItem v-if="currentStep === 2" prop="agreement">
            <ElCheckbox v-model="formData.agreement">
              {{ $t('register.agreeText') }}
              <RouterLink
                style="color: var(--theme-color); text-decoration: none"
                to="/privacy-policy"
                >{{ $t('register.privacyPolicy') }}</RouterLink
              >
            </ElCheckbox>
          </ElFormItem>

          <!-- Navigation Buttons -->
          <div class="flex gap-3 mt-6">
            <ElButton
              v-if="currentStep > 0"
              class="flex-1 custom-height"
              @click="handlePrev"
              v-ripple
            >
              {{ $t('register.prevStep') }}
            </ElButton>
            <ElButton
              v-if="currentStep < 2"
              class="flex-1 custom-height"
              type="primary"
              @click="handleNext"
              v-ripple
            >
              {{ $t('register.nextStep') }}
            </ElButton>
            <ElButton
              v-if="currentStep === 2"
              class="flex-1 custom-height"
              type="primary"
              @click="handleSubmit"
              :loading="loading"
              v-ripple
            >
              {{ $t('register.submitBtnText') }}
            </ElButton>
          </div>

          <div class="mt-5 text-sm text-center text-g-600">
            <span>{{ $t('register.hasAccount') }}</span>
            <RouterLink class="text-theme" :to="{ name: 'Login' }">{{
              $t('register.toLogin')
            }}</RouterLink>
          </div>
        </ElForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import type { FormInstance, FormRules } from 'element-plus'
  import { fetchISVRegister } from '@/api/auth'

  defineOptions({ name: 'Register' })

  interface UBOForm {
    name: string
    idType: 'passport' | 'national_id'
    idNumber: string
    nationality: string
    phone: string
  }

  interface RegisterForm {
    email: string
    password: string
    confirmPassword: string
    legalName: string
    registrationNumber: string
    jurisdiction: string
    dateOfIncorporation: string
    registeredAddress: string
    website: string
    uboInfo: UBOForm[]
    agreement: boolean
  }

  const PASSWORD_MIN_LENGTH = 6
  const REDIRECT_DELAY = 1000

  const { t, locale } = useI18n()
  const router = useRouter()
  const formRef = ref<FormInstance>()

  const loading = ref(false)
  const formKey = ref(0)
  const currentStep = ref(0)

  // 监听语言切换，重置表单
  watch(locale, () => {
    formKey.value++
  })

  const formData = reactive<RegisterForm>({
    email: '',
    password: '',
    confirmPassword: '',
    legalName: '',
    registrationNumber: '',
    jurisdiction: '',
    dateOfIncorporation: '',
    registeredAddress: '',
    website: '',
    uboInfo: [
      {
        name: '',
        idType: 'passport',
        idNumber: '',
        nationality: '',
        phone: ''
      }
    ],
    agreement: false
  })

  // Step 1 rules: account fields
  const step1Rules = computed<FormRules<RegisterForm>>(() => ({
    email: [
      { required: true, message: t('register.rule.emailRequired'), trigger: 'blur' },
      { type: 'email', message: t('register.rule.emailInvalid'), trigger: 'blur' }
    ],
    password: [
      { required: true, validator: validatePassword, trigger: 'blur' },
      { min: PASSWORD_MIN_LENGTH, message: t('register.rule.passwordLength'), trigger: 'blur' }
    ],
    confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }]
  }))

  // Step 2 rules: company fields
  const step2Rules = computed<FormRules<RegisterForm>>(() => ({
    legalName: [
      { required: true, message: t('register.rule.legalNameRequired'), trigger: 'blur' }
    ],
    registrationNumber: [
      { required: true, message: t('register.rule.registrationNumberRequired'), trigger: 'blur' }
    ],
    jurisdiction: [
      { required: true, message: t('register.rule.jurisdictionRequired'), trigger: 'change' }
    ],
    dateOfIncorporation: [
      { required: true, message: t('register.rule.dateOfIncorporationRequired'), trigger: 'change' }
    ],
    registeredAddress: [
      { required: true, message: t('register.rule.registeredAddressRequired'), trigger: 'blur' }
    ]
  }))

  // Step 3 rules: agreement only (UBO rules are inline)
  const step3Rules = computed<FormRules<RegisterForm>>(() => ({
    agreement: [{ validator: validateAgreement, trigger: 'change' }]
  }))

  const currentRules = computed(() => {
    if (currentStep.value === 0) return step1Rules.value
    if (currentStep.value === 1) return step2Rules.value
    return step3Rules.value
  })

  const validatePassword = (_rule: any, value: string, callback: (error?: Error) => void) => {
    if (!value) {
      callback(new Error(t('register.placeholder.password')))
      return
    }
    if (formData.confirmPassword) {
      formRef.value?.validateField('confirmPassword')
    }
    callback()
  }

  const validateConfirmPassword = (
    _rule: any,
    value: string,
    callback: (error?: Error) => void
  ) => {
    if (!value) {
      callback(new Error(t('register.rule.confirmPasswordRequired')))
      return
    }
    if (value !== formData.password) {
      callback(new Error(t('register.rule.passwordMismatch')))
      return
    }
    callback()
  }

  const validateAgreement = (_rule: any, value: boolean, callback: (error?: Error) => void) => {
    if (!value) {
      callback(new Error(t('register.rule.agreementRequired')))
      return
    }
    callback()
  }

  // UBO validation rules
  const uboNameRule = [{ required: true, message: t('register.placeholder.uboName'), trigger: 'blur' }]
  const uboIdTypeRule = [{ required: true, message: t('register.placeholder.uboIdNumber'), trigger: 'change' }]
  const uboIdNumberRule = [{ required: true, message: t('register.placeholder.uboIdNumber'), trigger: 'blur' }]
  const uboNationalityRule = [{ required: true, message: t('register.placeholder.uboNationality'), trigger: 'change' }]
  const uboPhoneRule = [{ required: true, message: t('register.placeholder.uboPhone'), trigger: 'blur' }]

  // Step navigation
  const handleNext = async () => {
    if (!formRef.value) return
    try {
      await formRef.value.validate()
      currentStep.value++
    } catch {
      // validation failed
    }
  }

  const handlePrev = () => {
    currentStep.value--
  }

  const addUbo = () => {
    formData.uboInfo.push({
      name: '',
      idType: 'passport',
      idNumber: '',
      nationality: '',
      phone: ''
    })
  }

  const removeUbo = (index: number) => {
    formData.uboInfo.splice(index, 1)
  }

  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      // Validate agreement + all UBO fields
      await formRef.value.validate()
      loading.value = true

      const params = {
        email: formData.email,
        password: formData.password,
        legalName: formData.legalName,
        registrationNumber: formData.registrationNumber,
        jurisdiction: formData.jurisdiction,
        dateOfIncorporation: formData.dateOfIncorporation,
        registeredAddress: formData.registeredAddress,
        website: formData.website || undefined,
        uboInfo: formData.uboInfo
      }

      await fetchISVRegister(params)
      ElMessage.success(t('register.submitBtnText') + ' ' + t('login.success.message'))
      toLogin()
    } catch (error: any) {
      console.error('Registration failed:', error)
      const message = error?.response?.data?.message || error?.message || 'Registration failed'
      ElMessage.error(message)
      loading.value = false
    }
  }

  const toLogin = () => {
    setTimeout(() => {
      router.push({ name: 'Login' })
    }, REDIRECT_DELAY)
  }
</script>

<style scoped>
  @import '../login/style.css';

  .register-card {
    max-width: 520px;
    width: 100%;
    max-height: calc(100vh - 60px);
    overflow-y: auto;
  }
</style>