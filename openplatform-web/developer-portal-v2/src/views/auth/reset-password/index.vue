<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">{{ $t('resetPassword.title') }}</h3>
          <p class="sub-title">{{ $t('resetPassword.subTitle') }}</p>
          <ElForm
            class="mt-7.5"
            ref="formRef"
            :model="formData"
            :rules="rules"
            label-position="top"
          >
            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                v-model.trim="formData.password"
                :placeholder="$t('resetPassword.placeholder.password')"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>

            <ElFormItem prop="confirmPassword">
              <ElInput
                class="custom-height"
                v-model.trim="formData.confirmPassword"
                :placeholder="$t('resetPassword.placeholder.confirmPassword')"
                type="password"
                autocomplete="off"
                @keyup.enter="submit"
                show-password
              />
            </ElFormItem>

            <div style="margin-top: 15px">
              <ElButton
                class="w-full custom-height"
                type="primary"
                @click="submit"
                :loading="loading"
                v-ripple
              >
                {{ $t('resetPassword.submitBtnText') }}
              </ElButton>
            </div>

            <div style="margin-top: 15px">
              <ElButton class="w-full custom-height" plain @click="toLogin">
                {{ $t('resetPassword.backBtnText') }}
              </ElButton>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { fetchISVResetPassword } from '@/api/auth'
  import type { FormInstance, FormRules } from 'element-plus'

  defineOptions({ name: 'ResetPassword' })

  const { t } = useI18n()
  const router = useRouter()
  const route = useRoute()
  const formRef = ref<FormInstance>()

  const loading = ref(false)

  const token = computed(() => (route.query.token as string) || '')

  const formData = reactive({
    password: '',
    confirmPassword: ''
  })

  const validatePassword = (_rule: any, value: string, callback: (error?: Error) => void) => {
    if (!value) {
      callback(new Error(t('resetPassword.placeholder.password')))
      return
    }
    if (value.length < 6) {
      callback(new Error(t('register.rule.passwordLength')))
      return
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

  const rules = computed<FormRules>(() => ({
    password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
    confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }]
  }))

  const submit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      loading.value = true

      if (!token.value) {
        ElMessage.error('Invalid reset token')
        return
      }

      await fetchISVResetPassword({
        token: token.value,
        password: formData.password
      })

      ElMessage.success('Password reset successfully')
      router.push({ name: 'Login' })
    } catch (error: any) {
      console.error('Reset password failed:', error)
    } finally {
      loading.value = false
    }
  }

  const toLogin = () => {
    router.push({ name: 'Login' })
  }
</script>

<style scoped>
  @import '../login/style.css';
</style>