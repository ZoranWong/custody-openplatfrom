<template>
  <div class="login-page">
    <AuthTopBar />

    <div class="auth-center-wrap">
      <div class="card p-8">
        <div class="text-center mb-8">
          <div class="logo-wrap mb-6">
            <ArtLogo size="46" />
          </div>
          <h2 class="text-2xl font-bold text-g-900">{{ $t('forgetPassword.title') }}</h2>
          <p class="mt-2 text-g-600">{{ $t('forgetPassword.subTitle') }}</p>
        </div>
          <div class="mt-5">
            <ElInput
              class="custom-height"
              :placeholder="$t('forgetPassword.placeholder')"
              v-model.trim="username"
            />
          </div>

          <div style="margin-top: 15px">
            <ElButton
              class="w-full custom-height"
              type="primary"
              @click="register"
              :loading="loading"
              v-ripple
            >
              {{ $t('forgetPassword.submitBtnText') }}
            </ElButton>
          </div>

          <div style="margin-top: 15px">
            <ElButton class="w-full custom-height" plain @click="toLogin">
              {{ $t('forgetPassword.backBtnText') }}
            </ElButton>
          </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { fetchISVForgotPassword } from '@/api/auth'
  import { useI18n } from 'vue-i18n'

  defineOptions({ name: 'ForgetPassword' })

  const { t } = useI18n()
  const router = useRouter()

  const username = ref('')
  const loading = ref(false)

  const register = async () => {
    if (!username.value) {
      ElMessage.warning(t('forgetPassword.placeholder'))
      return
    }
    loading.value = true
    try {
      await fetchISVForgotPassword({ email: username.value })
      ElMessage.success(t('forgetPassword.success'))
      router.push({ name: 'Login' })
    } catch (error) {
      ElMessage.success(t('forgetPassword.success'))
      router.push({ name: 'Login' })
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
