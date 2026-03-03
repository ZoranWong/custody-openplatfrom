<template>
  <div class="login-form">
    <div class="login-header">
      <div class="logo-header-wrapper">
        <svg-icon name="logo" class="logo-svg" />
        <!-- <span class="font-semibold">Cregis Custody</span> -->
      </div>
      <p class="subtitle">Sign in to authorize access</p>
    </div>

    <form @submit.prevent="handleSubmit" class="form">
      <div class="form-group">
        <label for="account">User ID (Your Email)</label>
        <input
          id="account"
          v-model="account"
          type="text"
          placeholder="Please enter username/email"
          :disabled="loading"
          autocomplete="username"
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <div class="password-input-wrapper">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Please enter password"
            :disabled="loading"
            autocomplete="current-password"
          />
          <button
            type="button"
            class="toggle-password"
            @click="showPassword = !showPassword"
          >
            <svg v-if="showPassword" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2.5 10C2.5 10 5 4 10 4C15 4 17.5 10 17.5 10C17.5 10 15 16 10 16C5 16 2.5 10 2.5 10Z" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="10" cy="10" r="2.5" stroke="#6B7280" stroke-width="1.5"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 3L17 17M8.5 8.5C7.84 9.16 7.84 10.84 8.5 11.5C9.16 12.16 10.84 12.16 11.5 11.5M2.5 10C2.5 10 5 4 10 4C11.5 4 12.8 4.5 14 5.3M17.5 10C17.5 10 15 16 10 16C8.5 16 7.2 15.5 6 14.7" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <button type="submit" class="submit-btn" :disabled="loading || !isValid">
        <span v-if="loading">Signing in...</span>
        <span v-else>Login</span>
      </button>
    </form>

    <div class="login-footer">
      <p class="app-info">Authorizing: <strong>{{ appName }}</strong></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  appName?: string;
  loading?: boolean;
  errorMessage?: string;
  failedAttempts?: number;
}>();

const emit = defineEmits<{
  (e: 'submit', credentials: { type: 'PASSWORD'; account: string; password: string }): void;
}>();

const account = ref('');
const password = ref('');
const showPassword = ref(false);

const isValid = computed(() => {
  return account.value.trim().length > 0 && password.value.length > 0;
});

function handleSubmit() {
  if (!isValid.value || props.loading) return;

  emit('submit', {
    type: 'PASSWORD',
    account: account.value.trim(),
    password: password.value,
  });
}
</script>

<style scoped>
.login-form {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  margin-bottom: 16px;
}

.logo svg {
  display: inline-block;
}

.font-semibold {
  font-weight: 600;
}

.logo-header-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  gap: 8px;
}

.logo-svg {
  width: 160px;
  height: 32px;
}

.login-header h1 {
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

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 14px 16px;
  border: 1px solid rgba(31, 33, 31, 0.2);
  border-radius: 12px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #00be78;
  box-shadow: 0 0 0 3px rgba(0, 190, 120, 0.1);
}

.form-group input:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
}

.form-group input::placeholder {
  color: #9ca3af;
}

/* Password input with toggle */
.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  width: 100%;
  padding-right: 48px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-message {
  padding: 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  text-align: center;
}

.submit-btn {
  padding: 14px 24px;
  background: #00be78;
  color: #ffffff;
  border: none;
  border-radius: 48px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.submit-btn:hover:not(:disabled) {
  background: #00a06a;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.app-info {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.app-info strong {
  color: #374151;
}
</style>
