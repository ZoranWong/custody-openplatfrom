<template>
  <div class="totp-form">
    <div class="totp-header">
      <div class="logo-header-wrapper">
        <svg-icon name="logo" class="logo-svg" />
      </div>
    </div>

    <div class="totp-content">
      <h1>Two-Factor Authentication</h1>
      <p class="subtitle">
        Enter the 6-digit code from your Google Authenticator app to continue signing in.
      </p>

      <!-- Google Authenticator icon -->
      <div class="auth-icon-wrapper">
        <svg-icon name="google-auth" class="google-auth-icon" />
      </div>

      <form @submit.prevent="handleSubmit" class="form">
        <div class="form-group">
          <label for="totp-code">Google Authenticator Code</label>
          <div class="code-input-wrapper">
            <input
              id="totp-code"
              ref="codeInput"
              v-model="code"
              type="text"
              placeholder="000000"
              :disabled="loading"
              maxlength="6"
              autocomplete="one-time-code"
              class="code-input"
              @input="handleCodeInput"
            />
          </div>

          <!-- Countdown timer -->
          <div class="countdown-wrapper">
            <span class="countdown-label">Code refreshes in</span>
            <span class="countdown-timer" :class="{ warning: countdown <= 10 }">
              {{ formattedCountdown }}s
            </span>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="submit-btn" :disabled="loading || !isValid">
          <span v-if="loading">Verifying...</span>
          <span v-else>Verify</span>
        </button>
      </form>

      <div class="totp-footer">
        <button @click="$emit('back')" class="back-btn" :disabled="loading">
          ← Back to login
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  loading?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  (e: 'submit', credentials: { code: string; mode: 'GOOGLE_CODE' }): void;
  (e: 'back'): void;
}>();

const code = ref('');
const codeInput = ref<HTMLInputElement | null>(null);

// Clear input when error message changes (failed attempt)
watch(() => props.errorMessage, (newError) => {
  if (newError) {
    code.value = '';
    // Focus input for retry
    setTimeout(() => {
      codeInput.value?.focus();
    }, 100);
  }
});

// Countdown for Google Authenticator (30-second refresh cycle)
const countdown = ref(0);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

// Calculate remaining seconds for Google Authenticator code refresh
const calculateRemainingSeconds = (): number => {
  const now = Math.floor(Date.now() / 1000);
  const remaining = 30 - (now % 30);
  return remaining === 30 ? 0 : remaining;
};

const updateCountdown = () => {
  countdown.value = calculateRemainingSeconds();
};

const startCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  updateCountdown();
  countdownInterval = setInterval(() => {
    updateCountdown();
  }, 1000);
};

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
};

const formattedCountdown = computed(() => {
  const seconds = countdown.value;
  return seconds < 10 ? `0${seconds}` : `${seconds}`;
});

const isValid = computed(() => {
  return code.value.length === 6 && /^\d+$/.test(code.value);
});

function handleCodeInput() {
  // Auto-submit when code is valid
  if (isValid.value && !props.loading) {
    handleSubmit();
  }
}

function handleSubmit() {
  if (!isValid.value || props.loading) return;

  emit('submit', {
    code: code.value,
    mode: 'GOOGLE_CODE',
  });
}

onMounted(() => {
  startCountdown();
  codeInput.value?.focus();
});

onUnmounted(() => {
  stopCountdown();
});
</script>

<style scoped>
.totp-form {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.totp-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-header-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.logo-svg {
  width: 160px;
  height: 32px;
}

.font-semibold {
  font-weight: 600;
}

.totp-content {
  text-align: center;
}

.totp-content h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.auth-icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.google-auth-icon {
  width: 48px;
  height: 48px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.code-input-wrapper {
  position: relative;
}

.code-input {
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(31, 33, 31, 0.2);
  border-radius: 12px;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  letter-spacing: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.code-input:focus {
  outline: none;
  border-color: #00be78;
  box-shadow: 0 0 0 3px rgba(0, 190, 120, 0.1);
}

.code-input:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
}

.code-input::placeholder {
  color: #9ca3af;
  letter-spacing: 4px;
}

.countdown-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 13px;
  color: #6b7280;
}

.countdown-timer {
  font-weight: 600;
  font-family: monospace;
  min-width: 24px;
  text-align: right;
}

.countdown-timer.warning {
  color: #f59e0b;
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

.totp-footer {
  margin-top: 24px;
  text-align: center;
}

.back-btn {
  background: none;
  border: none;
  color: #00be78;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s;
}

.back-btn:hover:not(:disabled) {
  color: #00a06a;
}

.back-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
