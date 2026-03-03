<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import type { ISVUser } from '@/services/api'
import Button from '@/components/common/Button.vue'

interface Props {
  user: ISVUser
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const authStore = useAuthStore()
const loading = ref(false)
const isEditing = ref(false)

const form = reactive({
  name: props.user.name || '',
  phone: props.user.phone || ''
})

const originalForm = { ...form }

const validateForm = () => {
  if (!form.name.trim()) {
    ElMessage.warning('Please enter your name')
    return false
  }
  return true
}

const handleEdit = () => {
  form.name = props.user.name || ''
  form.phone = props.user.phone || ''
  originalForm.name = form.name
  originalForm.phone = form.phone
  isEditing.value = true
}

const handleCancel = () => {
  form.name = originalForm.name
  form.phone = originalForm.phone
  isEditing.value = false
}

const handleSave = async () => {
  if (!validateForm()) return

  loading.value = true

  try {
    await authStore.updateProfile({ name: form.name, phone: form.phone })
    isEditing.value = false
    emit('updated')
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Update failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card p-6" role="region" aria-labelledby="edit-profile-heading">
    <div class="flex justify-between items-center mb-4">
      <h2 id="edit-profile-heading" class="text-lg font-semibold text-gray-900">Edit Profile</h2>
      <Button v-if="!isEditing" type="primary" size="small" @click="handleEdit" aria-label="Edit profile">
        Edit
      </Button>
    </div>

    <!-- View Mode -->
    <div v-if="!isEditing" class="space-y-4" role="group" aria-label="Profile information">
      <div>
        <label class="block text-sm font-medium text-gray-500 mb-1">Name</label>
        <p class="text-gray-900">{{ user.name || 'Not provided' }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-500 mb-1">Phone</label>
        <p class="text-gray-900">{{ user.phone || 'Not provided' }}</p>
      </div>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        role="note"
      >
        <template #title>
          Email address cannot be modified. Please contact support to make changes.
        </template>
      </el-alert>
    </div>

    <!-- Edit Mode -->
    <form v-else @submit.prevent="handleSave" class="space-y-4" role="form" aria-label="Edit profile form">
      <div>
        <label for="profile-name" class="block text-sm font-medium text-gray-700 mb-1">
          Name <span class="text-red-500">*</span>
        </label>
        <el-input
          id="profile-name"
          v-model="form.name"
          placeholder="Enter your name"
          size="large"
          maxlength="50"
          aria-required="true"
        />
      </div>
      <div>
        <label for="profile-phone" class="block text-sm font-medium text-gray-700 mb-1">
          Phone
        </label>
        <el-input
          id="profile-phone"
          v-model="form.phone"
          placeholder="Enter your phone number"
          size="large"
          maxlength="20"
        />
      </div>

      <div class="flex justify-end gap-3" role="group" aria-label="Form actions">
        <Button type="info" @click="handleCancel" aria-label="Cancel editing">
          Cancel
        </Button>
        <Button type="primary" :loading="loading" aria-label="Save changes">
          Save
        </Button>
      </div>
    </form>
  </div>
</template>
