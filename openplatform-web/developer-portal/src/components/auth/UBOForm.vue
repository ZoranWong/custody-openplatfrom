<script setup lang="ts">
import { Plus, Delete, User, Ticket, Location, Phone, Grid } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

export interface UBO {
  name: string
  idType: 'passport' | 'national_id'
  idNumber: string
  nationality: string
  phone: string
}

const [uboList] = defineModel<UBO[]>()

const idTypes = [
  { label: 'Passport', value: 'passport' },
  { label: 'National ID', value: 'national_id' }
]

const countries = [
  { label: 'China', value: 'CN' },
  { label: 'United States', value: 'US' },
  { label: 'Singapore', value: 'SG' },
  { label: 'Hong Kong', value: 'HK' },
  { label: 'United Kingdom', value: 'UK' },
  { label: 'Other', value: 'OTHER' }
]

const validateUBO = (index: number): boolean => {
  if (!uboList.value) return false
  const ubo = uboList.value[index]
  const errors: string[] = []

  if (!ubo.name?.trim()) errors.push('Name')
  if (!ubo.idNumber?.trim()) errors.push('ID Number')
  if (!ubo.nationality) errors.push('Nationality')
  if (!ubo.phone?.trim()) errors.push('Phone')

  // Phone validation
  const phoneRegex = /^1[3-9]\d{9}$/
  if (ubo.phone && !phoneRegex.test(ubo.phone)) {
    errors.push('Phone format')
  }

  if (errors.length > 0) {
    ElMessage.error(`UBO ${index + 1}: Please fill in ${errors.join(', ')}`)
    return false
  }
  return true
}

const addUBO = () => {
  if (!uboList.value) {
    uboList.value = []
  }
  uboList.value.push({
    name: '',
    idType: 'national_id',
    idNumber: '',
    nationality: '',
    phone: ''
  })
}

const removeUBO = (index: number) => {
  if (!uboList.value || uboList.value.length <= 1) {
    ElMessage.warning('At least one beneficial owner is required')
    return
  }
  uboList.value.splice(index, 1)
}

// Expose validation method
defineExpose({
  validate: () => {
    if (!uboList.value) return false
    return uboList.value.every((_, index) => validateUBO(index))
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900">Ultimate Beneficial Owners (UBO)</h3>
      <el-button type="primary" :icon="Plus" @click="addUBO">
        Add UBO
      </el-button>
    </div>

    <p class="text-sm text-gray-500">
      According to anti-money laundering regulations, please provide information about all ultimate beneficial owners of the company. UBO refers to individuals who directly or indirectly hold more than 25% of the company's shares or control rights.
    </p>

    <div class="space-y-6">
      <div
        v-for="(ubo, index) in uboList"
        :key="index"
        class="border rounded-lg p-6 bg-gray-50"
      >
        <div class="flex items-center justify-between mb-4">
          <h4 class="font-medium text-gray-900">UBO {{ index + 1 }}</h4>
          <el-button
            v-if="(uboList ?? []).length > 1"
            type="danger"
            :icon="Delete"
            size="small"
            @click="removeUBO(index)"
          >
            Remove
          </el-button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Name <span class="text-red-500">*</span>
            </label>
            <el-input
              v-model="ubo.name"
              placeholder="Enter name"
              :prefix-icon="User"
              class="h-10"
            />
          </div>

          <!-- ID Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              ID Type <span class="text-red-500">*</span>
            </label>
            <el-select v-model="ubo.idType" placeholder="Select" class="w-full h-10">
              <template #prefix>
                <el-icon class="el-input__icon"><Grid /></el-icon>
              </template>
              <el-option
                v-for="item in idTypes"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>

          <!-- ID Number -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              ID Number <span class="text-red-500">*</span>
            </label>
            <el-input
              v-model="ubo.idNumber"
              placeholder="Enter ID number"
              :prefix-icon="Ticket"
              class="h-10"
            />
          </div>

          <!-- Nationality -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nationality <span class="text-red-500">*</span>
            </label>
            <el-select v-model="ubo.nationality" placeholder="Select" class="w-full h-10">
              <template #prefix>
                <el-icon class="el-input__icon"><Location /></el-icon>
              </template>
              <el-option
                v-for="item in countries"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Phone <span class="text-red-500">*</span>
            </label>
            <el-input
              v-model="ubo.phone"
              placeholder="Enter phone number"
              maxlength="11"
              :prefix-icon="Phone"
              class="h-10"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
