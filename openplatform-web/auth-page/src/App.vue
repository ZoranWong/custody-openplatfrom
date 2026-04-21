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

    <OrganizationSelector
      v-else-if="currentView === 'organization'"
      :username="username"
      @select="handleOrganizationSelect"
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
          <strong>{{ selectedOrganization?.name || 'Organization' }}</strong>
          will authorize
          <strong>{{ appName }}</strong>
          to access vault permissions.
        </p>
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <div class="authorize-actions">
          <button @click="goBackToOrganization" class="auth-btn cancel" :disabled="submitting">
            Back
          </button>
          <button @click="handleAuthorize" class="auth-btn authorize" :disabled="submitting">
            {{ submitting ? 'Authorizing...' : 'Authorize' }}
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
import OrganizationSelector from './components/OrganizationSelector.vue'
// sendEventToParent auto-injects SDK UUID from module-level sdkUuid variable
import { listenFromParent, sendEventToParent, sendSuccessToParent, sendFailedToParent } from './utils/postMessage'
import { login, secondAuthenticate, submitAuthorization } from './services/auth'
import { setToken, setUserInfo, isTokenValid, clearToken, getUserInfo } from './utils/tokenStorage'
import type { AuthInitData, AuthView, Organization } from './types'

const MAX_FAILED_ATTEMPTS = 3

const currentView = ref<AuthView>('loading')
const authData = ref<AuthInitData | null>(null)
const errorMessage = ref('')
const loginError = ref('')
const totpError = ref('')
const submitting = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setTimeout> | null = null
let initTimeout: ReturnType<typeof setTimeout> | null = null
const appName = ref('Third-party Application')
const appLogoUrl = ref('')
const appToken = ref('')
const permissions = ref<string[]>([])

// Auth state
const username = ref('')
const email = ref('')
const mfaToken = ref('')
const failedAttempts = ref(0)
const totpFailedAttempts = ref(0)
const selectedOrganization = ref<Organization | null>(null)

let unsubscribe: (() => void) | null = null

// ---------- Validators ----------

function validateToken(token: string): { valid: boolean; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing or invalid appToken' };
  }
  if (token.trim().length === 0) {
    return { valid: false, error: 'appToken cannot be empty' };
  }
  const jwtParts = token.split('.');
  if (jwtParts.length !== 3) {
    return { valid: false, error: 'Invalid appToken format: expected JWT structure' };
  }
  return { valid: true };
}

function validateAppId(appId: string): { valid: boolean; error?: string } {
  if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
    return { valid: false, error: 'Missing or invalid appId' };
  }
  return { valid: true };
}

const ALLOWED_PERMISSIONS = new Set(['read', 'write', 'admin', 'transfer', 'view']);

function validatePermissions(perms: string[]): { valid: boolean; error?: string } {
  if (!perms || !Array.isArray(perms) || perms.length === 0) {
    return { valid: false, error: 'Missing permissions' };
  }
  for (const perm of perms) {
    if (!ALLOWED_PERMISSIONS.has(perm)) {
      return { valid: false, error: `Invalid permission: ${perm}` };
    }
  }
  return { valid: true };
}

function validateRedirectUri(uri: string): { valid: boolean; error?: string } {
  if (!uri) return { valid: true };
  try {
    const url = new URL(uri);
    if (!['https:', 'http:'].includes(url.protocol)) {
      return { valid: false, error: 'redirectUri must use http or https protocol' };
    }
    if (url.protocol === 'http:' && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
      return { valid: false, error: 'redirectUri http allowed only for localhost' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid redirectUri format' };
  }
}

function validateState(state: string): { valid: boolean; error?: string } {
  if (!state) return { valid: true };
  if (typeof state !== 'string' || state.trim().length === 0) {
    return { valid: false, error: 'Invalid state' };
  }
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const parts = state.split('|');
  const possibleUuid = parts[0];
  if (!uuidPattern.test(possibleUuid)) {
    console.warn('Auth Page: state does not contain valid UUID format');
  }
  return { valid: true };
}

/** Unified validation entry point */
function validateAuthData(data: AuthInitData): { valid: boolean; error?: string } {
  const tokenValidation = validateToken(data.appToken);
  if (!tokenValidation.valid) return tokenValidation;

  const appIdValidation = validateAppId(data.appId);
  if (!appIdValidation.valid) return appIdValidation;

  const permissionsValidation = validatePermissions(data.permissions || ['read']);
  if (!permissionsValidation.valid) return permissionsValidation;

  if (data.redirectUri) {
    const redirectUriValidation = validateRedirectUri(data.redirectUri);
    if (!redirectUriValidation.valid) return redirectUriValidation;
  }

  if (data.state) {
    const stateValidation = validateState(data.state);
    if (!stateValidation.valid) return stateValidation;
  }

  return { valid: true };
}

// ---------- URL Parsing ----------

function getTokenFromUrl(): AuthInitData | null {
  const urlParams = new URLSearchParams(window.location.search);
  const appToken = urlParams.get('appToken');
  if (!appToken) return null;

  return {
    appId: urlParams.get('appId') || '',
    appToken,
    appName: urlParams.get('appName') || undefined,
    appLogoUrl: urlParams.get('appLogoUrl') || undefined,
    permissions: urlParams.get('permissions')?.split(',') || ['read'],
    redirectUri: urlParams.get('redirectUri') || undefined,
    state: urlParams.get('state') || undefined,
  };
}

// ---------- Initialization ----------

function tryInitialize(data: AuthInitData) {
  const validation = validateAuthData(data);
  if (!validation.valid) {
    currentView.value = 'error';
    errorMessage.value = validation.error || 'Invalid authorization data';
    return;
  }
  initWithData(data);
}

function initWithData(data: AuthInitData) {
  authData.value = data;
  permissions.value = data.permissions || ['read'];
  appName.value = data.appName || 'Third-party Application';
  appLogoUrl.value = data.appLogoUrl || '';
  appToken.value = data.appToken || '';

  if (isTokenValid()) {
    const userInfo = getUserInfo();
    if (userInfo && userInfo.email) {
      username.value = userInfo.username || userInfo.email;
      email.value = userInfo.email;
      currentView.value = 'organization';
      sendEventToParent({ type: 'ready' });
      return;
    }
  }

  currentView.value = 'login';
  sendEventToParent({ type: 'ready' });
}

onMounted(() => {
  const urlData = getTokenFromUrl();
  if (urlData) {
    tryInitialize(urlData);
    return;
  }

  unsubscribe = listenFromParent((message) => {
    if (message.action === 'init') {
      const urlData = getTokenFromUrl();
      if (urlData) {
        tryInitialize(urlData);
      }
    } else if (message.action === 'close' || message.action === 'cancel') {
      sendFailedToParent('USER_CANCELLED', 'User cancelled authorization');
    }
  });

  initTimeout = setTimeout(() => {
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

// ---------- Flow Handlers ----------

function resetFlow() {
  clearToken();

  if (initTimeout) {
    clearTimeout(initTimeout);
    initTimeout = null;
  }

  currentView.value = 'loading';
  errorMessage.value = '';
  loginError.value = '';
  totpError.value = '';
  failedAttempts.value = 0;
  totpFailedAttempts.value = 0;
  username.value = '';
  email.value = '';
  mfaToken.value = '';
  selectedOrganization.value = null;

  initTimeout = setTimeout(() => {
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
      username.value = credentials.account;
      email.value = response.data.email || credentials.account;

      if (response.data.mfaRequired && response.data.mfaToken) {
        mfaToken.value = response.data.mfaToken;
        currentView.value = 'totp';
      } else {
        const mockToken = 'dev-token-' + Date.now();
        setToken(mockToken, 24 * 60 * 60 * 1000);
        setUserInfo({
          userId: '1',
          email: email.value,
          role: ['user'],
          permission: ['read'],
          username: username.value,
        });
        currentView.value = 'organization';
      }
    } else {
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
      totpFailedAttempts.value = 0;

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

      currentView.value = 'organization';
    } else {
      totpFailedAttempts.value++;

      if (totpFailedAttempts.value >= MAX_FAILED_ATTEMPTS) {
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

function handleOrganizationSelect(organization: Organization) {
  selectedOrganization.value = organization;
  currentView.value = 'authorize';
}

async function handleAuthorize() {
  if (!authData.value || !selectedOrganization.value) return;

  submitting.value = true;
  sendEventToParent({ type: 'authorization_started' });

  try {
    const result = await submitAuthorization({
      appId: authData.value.appId,
      organizationId: selectedOrganization.value.id,
    });

    if (!result.authorizationId) {
      errorMessage.value = 'Authorization failed: No authorization ID returned';
      sendFailedToParent('AUTHORIZATION_FAILED', 'No authorization ID returned');
      return;
    }

    sendSuccessToParent(result.authorizationId);

    currentView.value = 'success';
    startCountdown();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Authorization failed';
    sendFailedToParent('AUTHORIZATION_FAILED', errorMessage.value);
  } finally {
    submitting.value = false;
  }
}

function goBackToOrganization() {
  selectedOrganization.value = null;
  currentView.value = 'organization';
}

function handleCancel() {
  sendFailedToParent('USER_CANCELLED', 'User cancelled authorization');
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
      sendEventToParent({ type: 'close' });
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
