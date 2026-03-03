<script setup lang="ts">
import { reactive } from 'vue'
import { OfficeBuilding, Ticket, Location, Calendar, Link } from '@element-plus/icons-vue'

const [form] = defineModel<{
  legalName: string
  registrationNumber: string
  jurisdiction: string
  dateOfIncorporation: string
  registeredAddress: string
}>()

const jurisdictions = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'UK' },
  { label: 'Singapore', value: 'SG' },
  { label: 'Hong Kong', value: 'HK' },
  { label: 'Cayman Islands', value: 'KY' },
  { label: 'British Virgin Islands', value: 'VG' },
  { label: 'Other', value: 'OTHER' }
]

const errors = reactive({
  legalName: '',
  registrationNumber: '',
  jurisdiction: '',
  dateOfIncorporation: '',
  registeredAddress: ''
})

const validateLegalName = () => {
  errors.legalName = form.value?.legalName.trim() ? '' : 'Please enter legal name'
}

const validateRegistrationNumber = () => {
  errors.registrationNumber = form.value?.registrationNumber.trim() ? '' : 'Please enter registration number'
}

const validateJurisdiction = () => {
  errors.jurisdiction = form.value?.jurisdiction ? '' : 'Please select jurisdiction'
}

const validateDateOfIncorporation = () => {
  errors.dateOfIncorporation = form.value?.dateOfIncorporation ? '' : 'Please select date of incorporation'
}

const validateRegisteredAddress = () => {
  errors.registeredAddress = form.value?.registeredAddress.trim() ? '' : 'Please enter registered address'
}
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-lg font-medium text-gray-900">Company Information (KYB)</h3>

    <!-- Legal Name -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Legal Name <span class="text-red-500">*</span>
      </label>
      <el-input
        v-model="form!.legalName"
        placeholder="Enter full legal company name"
        :prefix-icon="OfficeBuilding"
        class="h-10"
        @blur="validateLegalName"
        @input="errors.legalName = ''"
      />
      <p v-if="errors.legalName" class="mt-1 text-sm text-red-500">{{ errors.legalName }}</p>
    </div>

    <!-- Registration Number -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Registration Number <span class="text-red-500">*</span>
      </label>
      <el-input
        v-model="form!.registrationNumber"
        placeholder="Enter registration number"
        :prefix-icon="Ticket"
        class="h-10"
        @blur="validateRegistrationNumber"
        @input="errors.registrationNumber = ''"
      />
      <p v-if="errors.registrationNumber" class="mt-1 text-sm text-red-500">{{ errors.registrationNumber }}</p>
    </div>

    <!-- Jurisdiction -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Jurisdiction <span class="text-red-500">*</span>
      </label>
      <el-select
        v-model="form!.jurisdiction"
        placeholder="Select jurisdiction"
        class="w-full h-10"
        @change="validateJurisdiction"
      >
        <template #prefix>
          <el-icon class="el-input__icon"><Location /></el-icon>
        </template>
        <el-option
          v-for="item in jurisdictions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <p v-if="errors.jurisdiction" class="mt-1 text-sm text-red-500">{{ errors.jurisdiction }}</p>
    </div>

    <!-- Date of Incorporation -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Date of Incorporation <span class="text-red-500">*</span>
      </label>
      <el-date-picker
        v-model="form!.dateOfIncorporation"
        type="date"
        placeholder="Select date"
        class="w-full h-10"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        @change="validateDateOfIncorporation"
      />
      <p v-if="errors.dateOfIncorporation" class="mt-1 text-sm text-red-500">{{ errors.dateOfIncorporation }}</p>
    </div>

    <!-- Registered Address -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Registered Address <span class="text-red-500">*</span>
      </label>
      <el-input
        v-model="form!.registeredAddress"
        placeholder="Enter full registered address"
        :prefix-icon="Location"
        class="h-10"
        @blur="validateRegisteredAddress"
        @input="errors.registeredAddress = ''"
      />
      <p v-if="errors.registeredAddress" class="mt-1 text-sm text-red-500">{{ errors.registeredAddress }}</p>
    </div>
  </div>
</template>
