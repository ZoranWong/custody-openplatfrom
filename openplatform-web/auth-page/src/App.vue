<template>
  <div class="auth-page">
    <div v-if="currentView === 'loading'" class="loading-view">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <div v-else-if="currentView === 'error'" class="error-view">
      <div class="error-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" stroke="#dc2626" stroke-width="4"/>
          <path d="M32 20v16" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
          <circle cx="32" cy="42" r="3" fill="#dc2626"/>
        </svg>
      </div>
      <h2>Authorization Failed</h2>
      <p>{{ errorMessage }}</p>
      <button @click="resetFlow" class="retry-btn">Try Again</button>
    </div>

    <LoginForm
      v-else-if="currentView === 'login'"
      :app-name="appName"
      :loading="submitting"
      :error-message="loginError"
      :failed-attempts="failedAttempts"
      @submit="handleLogin"
    />

    <TotpForm
      v-else-if="currentView === 'totp'"
      :loading="submitting"
      :error-message="totpError"
      @submit="handleTotpVerify"
      @back="goBackToLogin"
    />

    <EnterpriseSelector
      v-else-if="currentView === 'enterprise'"
      :username="username"
      @select="handleEnterpriseSelect"
      @back="goBackToTotp"
    />

    <div v-else-if="currentView === 'authorize'" class="authorize-view">
      <div class="authorize-header">
        <button @click="handleCancel" class="close-btn" :disabled="submitting">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="authorize-content">
        <h2>Authorize Access</h2>
        <p>
          <strong>{{ selectedEnterprise?.name || 'Enterprise' }}</strong>
          will authorize
          <strong>{{ appName }}</strong>
          to access vault permissions.
        </p>
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <div class="authorize-actions">
          <button @click="handleAuthorize" class="auth-btn authorize" :disabled="submitting">
            {{ submitting ? 'Authorizing...' : 'Authorize' }}
          </button>
          <button @click="goBackToEnterprise" class="auth-btn cancel" :disabled="submitting">
            Back
          </button>
        </div>
      </div>
    </div>

    <!-- Success View -->
    <div v-else-if="currentView === 'success'" class="success-view">
      <div class="success-content">
        <svg class="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="22 4 12 14.01 9 11.01" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h2>Authorization Successful</h2>
        <p>You have successfully authorized {{ appName }} to access your vault permissions.</p>
        <p class="success-info">This window will close automatically in {{ countdown }}s</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import LoginForm from './components/LoginForm.vue'
import TotpForm from './components/TotpForm.vue'
import EnterpriseSelector from './components/EnterpriseSelector.vue'
import { listenFromParent, sendToParent } from './utils/postMessage'
import { login, secondAuthenticate, submitAuthorization } from './services/auth'
import { setToken, setUserInfo, isTokenValid, clearToken, getUserInfo } from './utils/tokenStorage'
import type { AuthInitData, AuthView, Enterprise } from './types'

const MAX_FAILED_ATTEMPTS = 3

const currentView = ref<AuthView>('loading')
const authData = ref<AuthInitData | null>(null)
const errorMessage = ref('')
const loginError = ref('')
const totpError = ref('')
const submitting = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setTimeout> | null = null
const appName = ref('Third-party Application')
const appLogoUrl = ref('')
const appToken = ref('')
const permissions = ref<string[]>([])

// Auth state
const username = ref('')
const email = ref('')
const mfaToken = ref('')  // Renamed from tempToken for clarity
const failedAttempts = ref(0)
const totpFailedAttempts = ref(0)
const selectedEnterprise = ref<Enterprise | null>(null)

let unsubscribe: (() => void) | null = null

// Check if user has valid token and skip to enterprise selection on init
function checkExistingSession(): boolean {
  if (isTokenValid()) {
    const userInfo = getUserInfo();
    if (userInfo && userInfo.email) {
      username.value = userInfo.username || userInfo.email;
      email.value = userInfo.email;
      currentView.value = 'enterprise';
      return true;
    }
  }
  return false;
}

// Initialize: check session first, then setup listeners
checkExistingSession()

// Validate appToken format
function validateToken(token: string): { valid: boolean; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing or invalid appToken' };
  }
  if (token.trim().length === 0) {
    return { valid: false, error: 'appToken cannot be empty' };
  }
  return { valid: true };
}

// Read token from URL query parameters
function getTokenFromUrl(): AuthInitData | null {
  const urlParams = new URLSearchParams(window.location.search);
  const appToken = urlParams.get('appToken');
  const appId = urlParams.get('appId') || '';
  const appName = urlParams.get('appName') || '';
  const appLogoUrl = urlParams.get('appLogoUrl') || '';
  const permissionsStr = urlParams.get('permissions');
  const redirectUri = urlParams.get('redirectUri') || undefined;
  const state = urlParams.get('state') || undefined;

  if (!appToken) {
    return null;
  }

  return {
    appId,
    appToken,
    appName: appName || undefined,
    appLogoUrl: appLogoUrl || undefined,
    permissions: permissionsStr ? permissionsStr.split(',') : ['read'],
    redirectUri,
    state,
  };
}

function initWithData(data: AuthInitData) {
  authData.value = data;
  permissions.value = data.permissions || ['read'];
  appName.value = data.appName || 'Third-party Application';
  appLogoUrl.value = data.appLogoUrl || '';
  appToken.value = data.appToken || '';

  // Check if user is already logged in
  if (isTokenValid()) {
    const userInfo = getUserInfo();
    if (userInfo && userInfo.email) {
      username.value = userInfo.username || userInfo.email;
      email.value = userInfo.email;
      currentView.value = 'enterprise';
      return;
    }
  }

  currentView.value = 'login';
}

onMounted(() => {
  // Session check already done at init, now try to get token from URL
  const urlData = getTokenFromUrl();
  if (urlData) {
    const validation = validateToken(urlData.appToken);
    if (!validation.valid) {
      currentView.value = 'error';
      errorMessage.value = validation.error || 'Invalid appToken';
      return;
    }
    initWithData(urlData);
    return;
  }

  // Then, listen for postMessage from parent (just triggers init, data from URL)
  unsubscribe = listenFromParent((message) => {
    if (message.action === 'init') {
      // Try to get data from URL after init trigger
      const urlData = getTokenFromUrl();
      if (urlData) {
        const validation = validateToken(urlData.appToken);
        if (!validation.valid) {
          currentView.value = 'error';
          errorMessage.value = validation.error || 'Invalid appToken';
          return;
        }
        initWithData(urlData);
      }
    } else if (message.action === 'close' || message.action === 'cancel') {
      // Send cancelled result to parent
      sendToParent({
        action: 'authorization_result',
        type: 'error',
        error: {
          code: 'USER_CANCELLED',
          message: 'User cancelled authorization',
        },
      });
    }
  });

  setTimeout(() => {
    if (currentView.value === 'loading') {
      currentView.value = 'error';
      errorMessage.value = 'Unable to initialize authorization. Please refresh and try again.';
    }
  }, 5000);
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

function resetFlow() {
  // Clear token and session
  clearToken();

  currentView.value = 'loading';
  errorMessage.value = '';
  loginError.value = '';
  totpError.value = '';
  failedAttempts.value = 0;
  totpFailedAttempts.value = 0;
  username.value = '';
  email.value = '';
  mfaToken.value = '';
  selectedEnterprise.value = null;

  setTimeout(() => {
    if (currentView.value === 'loading' && authData.value) {
      currentView.value = 'login';
    } else if (currentView.value === 'loading') {
      currentView.value = 'error';
      errorMessage.value = 'Unable to initialize authorization. Please refresh and try again.';
    }
  }, 5000);
}

function goBackToLogin() {
  currentView.value = 'login';
  totpError.value = '';
}

function goBackToTotp() {
  currentView.value = 'totp';
}

async function handleLogin(credentials: { type: 'PASSWORD' | 'EMAIL'; account: string; password: string }) {
  if (!authData.value) return;

  submitting.value = true;
  loginError.value = '';

  try {
    const response = await login(credentials);

    if (response.success && response.data) {
      // Save email for later use
      username.value = credentials.account;
      email.value = response.data.email || credentials.account;

      if (response.data.mfaRequired && response.data.mfaToken) {
        // Proceed to TOTP verification
        mfaToken.value = response.data.mfaToken;
        currentView.value = 'totp';
      } else {
        // No 2FA required, proceed to enterprise selection
        // Set mock token for development
        const mockToken = 'dev-token-' + Date.now();
        setToken(mockToken, 24 * 60 * 60 * 1000);
        setUserInfo({
          userId: '1',
          email: email.value,
          role: ['user'],
          permission: ['read'],
          username: username.value,
        });
        currentView.value = 'enterprise';
      }
    } else {
      // Check if account is locked
      failedAttempts.value++;
      loginError.value = response.error?.message || 'Login failed';

      if (failedAttempts.value >= MAX_FAILED_ATTEMPTS) {
        loginError.value = `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again later.`;
      }
    }
  } catch (error) {
    loginError.value = 'Network error. Please try again.';
  } finally {
    submitting.value = false;
  }
}

async function handleTotpVerify(credentials: { code: string; mode: 'GOOGLE_CODE' | 'RECOVERY_CODE' }) {
  if (!mfaToken.value || !email.value) return;

  submitting.value = true;
  totpError.value = '';

  try {
    const response = await secondAuthenticate(
      mfaToken.value,
      credentials.code,
      email.value,
      credentials.mode
    );

    if (response && response.token) {
      // Reset TOTP failed attempts on success
      totpFailedAttempts.value = 0;

      // Save token and user info
      const tokenTimeout = Number(response.tokenTimeout);
      const tokenExpiresIn = tokenTimeout - Date.now();
      if (tokenExpiresIn > 0) {
        setToken(response.token, tokenExpiresIn);
      }
      setUserInfo({
        userId: String(response.user?.id || ''),
        email: response.user?.email || response.email || '',
        role: response.role || [],
        permission: response.permission || [],
        username: response.user?.username || '',
      });

      // Proceed to enterprise selection
      currentView.value = 'enterprise';
    } else {
      // Track failed attempts
      totpFailedAttempts.value++;

      if (totpFailedAttempts.value >= MAX_FAILED_ATTEMPTS) {
        // Lock after 3 failures - clear mfa token and go back to login
        totpError.value = `Too many failed attempts. Please try again.`;
        mfaToken.value = '';
        setTimeout(() => {
          currentView.value = 'login';
          totpFailedAttempts.value = 0;
          totpError.value = '';
        }, 2000);
      } else {
        totpError.value = 'Invalid verification code';
      }
    }
  } catch (error) {
    totpError.value = 'Network error. Please try again.';
  } finally {
    submitting.value = false;
  }
}

function handleEnterpriseSelect(enterprise: Enterprise) {
  selectedEnterprise.value = enterprise;
  currentView.value = 'authorize';
}

async function handleAuthorize() {
  if (!authData.value || !selectedEnterprise.value) return;

  submitting.value = true;

  try {
    // Submit authorization to backend
    const result = await submitAuthorization({
      appId: authData.value.appId,
      enterpriseId: selectedEnterprise.value.id,
    });

    // Check if we got valid authorization id
    if (!result.authorizationId) {
      errorMessage.value = 'Authorization failed: No authorization ID returned';
      sendToParent({
        action: 'authorization_result',
        type: 'error',
        error: {
          code: 'AUTHORIZATION_FAILED',
          message: 'No authorization ID returned',
        },
      });
      return;
    }

    // Send success message to parent
    sendToParent({
      action: 'authorization_result',
      type: 'success',
      data: result.authorizationId,
    });

    // Show success view
    currentView.value = 'success';
    startCountdown();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Authorization failed';
    sendToParent({
      action: 'authorization_result',
      type: 'error',
      error: {
        code: 'AUTHORIZATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to complete authorization',
      },
    });
  } finally {
    submitting.value = false;
  }
}

function goBackToEnterprise() {
  currentView.value = 'enterprise';
}

function handleCancel() {
  // Send cancelled result to parent
  sendToParent({
    action: 'authorization_result',
    type: 'error',
    error: {
      code: 'USER_CANCELLED',
      message: 'User cancelled authorization',
    },
  });
}

function startCountdown() {
  countdown.value = 10;
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      // Close the window/iframe
      sendToParent({
        action: 'close',
        type: 'success',
      });
    }
  }, 1000);
}
</script>

<style scoped>
.auth-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #4ecdc4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-view p {
  color: #6b7280;
  font-size: 14px;
}

.error-view {
  text-align: center;
  max-width: 400px;
}

.error-icon {
  margin-bottom: 24px;
}

.error-view h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 12px 0;
}

.error-view p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
}

.retry-btn {
  padding: 12px 24px;
  background: #4ecdc4;
  color: #1a1a2e;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #3dbdb5;
}

.success-view {
  text-align: center;
  max-width: 400px;
}

.success-icon {
  width: 64px;
  height: 64px;
  color: #10b981;
  margin-bottom: 24px;
}

.success-content h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 12px 0;
}

.success-content p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px 0;
}

.success-info {
  font-size: 12px;
  color: #9ca3af;
}

.authorize-view {
  width: 100%;
  max-width: 400px;
}

.authorize-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #6b7280;
}

.authorize-content {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 32px;
  text-align: center;
}

.authorize-content h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 12px 0;
}

.authorize-content p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
}

.authorize-content strong {
  color: #1a1a2e;
}

.error-text {
  color: #dc2626;
  font-size: 14px;
  padding: 12px;
  background: #fee2e2;
  border-radius: 8px;
  margin-bottom: 16px;
}

.authorize-actions {
  display: flex;
  gap: 12px;
}

.auth-btn {
  flex: 1;
  padding: 14px 24px;
  border: none;
  border-radius: 48px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.auth-btn.authorize {
  background: #00be78;
  color: #ffffff;
}

.auth-btn.authorize:hover:not(:disabled) {
  background: #00a06a;
}

.auth-btn.authorize:active:not(:disabled) {
  transform: scale(0.98);
}

.auth-btn.cancel {
  background: #f3f4f6;
  color: #6b7280;
}

.auth-btn.cancel:hover:not(:disabled) {
  background: #e5e7eb;
}

.auth-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
