<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { useI18n } from 'vue-i18n'
import type { ISVUser } from '@/types/api/developer'

interface Props {
  user: ISVUser
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  name: props.user?.name || '',
  phone: props.user?.phone || ''
})

const validateForm = () => {
  if (!form.name.trim()) {
    ElMessage.warning(t('register.placeholder.uboName'))
    return false
  }
  return true
}

const handleCancel = () => {
  emit('cancel')
}

const handleSave = async () => {
  if (!validateForm()) return

  loading.value = true

  try {
    await userStore.updateISVProfile({ name: form.name, phone: form.phone })
    ElMessage.success(t('developer.profile.save'))
    emit('success')
  } catch (e: any) {
    ElMessage.error(e?.message || 'Update failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-4" role="form" aria-label="Edit profile form">
    <form @submit.prevent="handleSave" class="space-y-4">
      <div>
        <label for="profile-name" class="block text-sm font-medium text-gray-700 mb-1">
          {{ $t('developer.profile.name') }} <span class="text-red-500">*</span>
        </label>
        <ElInput
          id="profile-name"
          v-model="form.name"
          :placeholder="$t('developer.profile.name')"
          size="large"
          maxlength="50"
          aria-required="true"
        />
      </div>
      <div>
        <label for="profile-phone" class="block text-sm font-medium text-gray-700 mb-1">
          {{ $t('developer.profile.phone') }}
        </label>
        <ElInput
          id="profile-phone"
          v-model="form.phone"
          :placeholder="$t('developer.profile.phone')"
          size="large"
          maxlength="20"
        />
      </div>

      <ElAlert
        type="info"
        :closable="false"
        show-icon
        role="note"
      >
        <template #title>
          {{ $t('developer.profile.cannotModify') }}
        </template>
      </ElAlert>

      <div class="flex justify-end gap-3" role="group" aria-label="Form actions">
        <ElButton @click="handleCancel" aria-label="Cancel editing">
          {{ $t('developer.profile.cancel') }}
        </ElButton>
        <ElButton type="primary" :loading="loading" aria-label="Save changes" native-type="submit">
          {{ $t('developer.profile.save') }}
        </ElButton>
      </div>
    </form>
  </div>
</template>