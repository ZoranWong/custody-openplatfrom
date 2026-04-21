<template>
  <div class="organization-selector">
    <div class="selector-header">
      <div class="icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="24" fill="#EEF2FF"/>
          <path d="M24 14V34M14 24H34" stroke="#4F46E5" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </div>
      <h1>Select Organization</h1>
      <p class="subtitle">Choose an organization to authorize access for</p>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading organizations...</p>
    </div>

    <div v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div v-else class="organization-select-wrapper">
      <el-select
        v-model="selectedOrganizationId"
        placeholder="Select an organization"
        class="organization-select"
        :disabled="loading"
      >
        <el-option
          v-for="organization in organizations"
          :key="organization.id"
          :label="organization.name"
          :value="organization.id"
        />
      </el-select>
    </div>

    <div class="selector-actions">
      <button @click="$emit('back')" class="back-btn" :disabled="loading">
        Back
      </button>
      <button @click="handleContinue" class="continue-btn" :disabled="loading || !selectedOrganizationId">
        Continue
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Organization } from '../types'
import { getOrganizationList } from '../services/auth'

const props = defineProps<{
  username: string;
}>();

const emit = defineEmits<{
  (e: 'select', organization: Organization): void;
  (e: 'back'): void;
  (e: 'error', error: string): void;
}>();

const organizations = ref<Organization[]>([]);
const selectedOrganizationId = ref<string>('');
const loading = ref(false);
const errorMessage = ref('');

function handleContinue() {
  const selected = organizations.value.find(org => org.id === selectedOrganizationId.value);
  if (selected) {
    emit('select', selected);
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const response = await getOrganizationList(props.username);
    if (response.success && response.organizations) {
      organizations.value = response.organizations;
    } else {
      errorMessage.value = response.error?.message || 'Failed to load organizations';
      emit('error', errorMessage.value);
    }
  } catch (error) {
    errorMessage.value = 'Network error. Please try again.';
    emit('error', errorMessage.value);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.organization-selector {
  width: 100%;
  max-width: 440px;
  padding: 40px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.selector-header {
  text-align: center;
  margin-bottom: 32px;
}

.icon {
  margin-bottom: 16px;
}

.selector-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #4ecdc4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading p {
  color: #6b7280;
  font-size: 14px;
}

.error-message {
  padding: 16px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  text-align: center;
}

.organization-select-wrapper {
  margin-bottom: 24px;
}

.organization-select {
  width: 100%;
}

.organization-select :deep(.el-select__wrapper) {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(31, 33, 31, 0.2);
  box-shadow: none;
}

.organization-select :deep(.el-select__wrapper:hover) {
  border-color: #00be78;
}

.organization-select :deep(.el-select__wrapper.is-focused) {
  border-color: #00be78;
  box-shadow: 0 0 0 3px rgba(0, 190, 120, 0.1);
}

.organization-select :deep(.el-select__placeholder) {
  color: #6b7280;
}

.selector-actions {
  display: flex;
  gap: 12px;
}

.back-btn,
.continue-btn {
  flex: 1;
  padding: 14px 24px;
  border: none;
  border-radius: 48px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.back-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.back-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.continue-btn {
  background: #00be78;
  color: #ffffff;
}

.continue-btn:hover:not(:disabled) {
  background: #00a06a;
}

.continue-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.back-btn:disabled,
.continue-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
