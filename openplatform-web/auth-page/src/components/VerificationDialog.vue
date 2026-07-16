<template>
  <Teleport to="body">
    <div v-if="visible" class="captcha-overlay">
      <!-- Mask overlay -->
      <div class="captcha-mask" @click="isLoading ? null : handleClose()"></div>
      <!-- Captcha container -->
      <div class="captcha-wrapper">
        <!-- Loading state -->
        <div v-if="isLoading" class="captcha-loading">
          <div class="captcha-spinner"></div>
          <p>Loading verification...</p>
        </div>
        <!-- Error state -->
        <div v-else-if="errorMessage" class="captcha-error">
          <p>{{ errorMessage }}</p>
          <button class="captcha-retry-btn" @click="retryInit">Retry</button>
        </div>
        <!-- TAC mount point (hidden while loading) -->
        <div id="tianai-captcha-box" v-show="!isLoading && !errorMessage"></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .captcha-overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .captcha-mask {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }
  .captcha-wrapper {
    position: relative;
    z-index: 10;
  }
  .captcha-loading {
    text-align: center;
    color: #fff;
  }
  .captcha-spinner {
    /* width: 36px;
  height: 36px; */
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: captcha-spin 0.8s linear infinite;
    margin: 0 auto 12px;
  }
  @keyframes captcha-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .captcha-loading p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }
  .captcha-error {
    text-align: center;
    color: #fff;
    padding: 24px;
  }
  .captcha-error p {
    font-size: 14px;
    margin-bottom: 16px;
  }
  .captcha-retry-btn {
    padding: 8px 20px;
    background: #fff;
    color: #333;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
  }
  .captcha-retry-btn:hover {
    background: #e5e7eb;
  }
</style>

<script setup lang="ts">
  import { ref, watch, onUnmounted } from 'vue';

  // ─── Tianai TAC type declaration ───

  interface TACConfig {
    requestCaptchaDataUrl: string;
    validCaptchaUrl: string;
    bindEl: string;
    validSuccess: (
      res: any,
      captchaInstance: any,
      tacInstance: TACInstance,
    ) => void;
    validFail: (
      res: any,
      captchaInstance: any,
      tacInstance: TACInstance,
    ) => void;
    btnRefreshFun: (el: any, tacInstance: TACInstance) => void;
    btnCloseFun: (el: any, tacInstance: TACInstance) => void;
    requestHeaders?: Record<string, string>;
    timeToTimestamp?: boolean;
  }

  interface TACInstance {
    init(): void;
    destroyWindow(): void;
    reloadCaptcha(): void;
  }

  declare global {
    interface Window {
      TAC: new (config: TACConfig, style: Record<string, any>) => TACInstance;
    }
  }

  const props = defineProps<{
    visible: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'verify', code: string): void;
  }>();

  let tacInstance: TACInstance | null = null;
  const isLoading = ref(false);
  const errorMessage = ref('');

  // Abort flag to prevent TAC init from completing after dialog closed
  let initAborted = false;
  let initSeqId = 0;

  function handleClose() {
    initAborted = true;
    if (tacInstance && typeof tacInstance.destroyWindow === 'function') {
      tacInstance.destroyWindow();
    }
    tacInstance = null;
    isLoading.value = false;
    errorMessage.value = '';
    emit('update:visible', false);
  }

  // ─── Tianai TAC SDK bootstrap ───

  function getBaseApiUrl(): string {
    return (import.meta.env?.VITE_API_BASE_URL || '') as string;
  }

  function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${url}"]`);
      if (existing) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load: ${url}`));
      document.head.appendChild(s);
    });
  }

  function loadCSS(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`link[href="${url}"]`);
      if (existing) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load CSS: ${url}`));
      document.head.appendChild(link);
    });
  }

  async function initTAC(): Promise<void> {
    const seqId = ++initSeqId;
    initAborted = false;
    isLoading.value = true;
    errorMessage.value = '';

    // Vite base URL for static assets in public/
    const base = import.meta.env.BASE_URL || '/';
    const prefix = base.endsWith('/') ? base : base + '/';

    try {
      // Load CSS
      await loadCSS(prefix + 'tac/css/tac.css');

      if (initAborted || seqId !== initSeqId) return;

      // Load JS
      await loadScript(prefix + 'tac/js/tac.min.js');

      if (initAborted || seqId !== initSeqId) return;

      if (typeof window.TAC !== 'function') {
        errorMessage.value =
          'Verification service unavailable. Please try again.';
        isLoading.value = false;
        return;
      }

      tacInstance = new window.TAC(
        {
          requestCaptchaDataUrl: `${getBaseApiUrl()}/v1/auth/captcha/gen`,
          validCaptchaUrl: `${getBaseApiUrl()}/v1/auth/captcha/check`,
          bindEl: '#tianai-captcha-box',
          validSuccess: (res: any, _c: any, tac: TACInstance) => {
            tac.destroyWindow();
            emit('verify', res?.data?.code || '');
            emit('update:visible', false);
          },
          validFail: () => {
            // Validation failed; user can refresh or close
          },
          btnRefreshFun: (_el: any, tac: TACInstance) => {
            tac.reloadCaptcha();
          },
          btnCloseFun: (_el: any, tac: TACInstance) => {
            // TAC handles its own DOM; just emit close. Don't double-destroy.
            tac.destroyWindow();
            tacInstance = null;
            emit('update:visible', false);
          },
        },
        {
          i18n: {
            tips_4001: 'No match, please refresh captcha',
          },
        }
      );

      if (initAborted || seqId !== initSeqId) {
        tacInstance.destroyWindow();
        tacInstance = null;
        return;
      }

      tacInstance.init();
      isLoading.value = false;
    } catch (e: any) {
      if (initAborted || seqId !== initSeqId) return;
      console.error('[captcha] TAC init error:', e);
      errorMessage.value =
        'Verification service unavailable. Please try again.';
      isLoading.value = false;
    }
  }

  async function retryInit() {
    // Clean up any partial instance
    if (tacInstance && typeof tacInstance.destroyWindow === 'function') {
      tacInstance.destroyWindow();
    }
    tacInstance = null;
    await initTAC();
  }

  // ─── Lifecycle ───

  watch(
    () => props.visible,
    async (val) => {
      if (val) {
        await initTAC();
      } else {
        initAborted = true;
        if (tacInstance && typeof tacInstance.destroyWindow === 'function') {
          tacInstance.destroyWindow();
        }
        tacInstance = null;
        isLoading.value = false;
        errorMessage.value = '';
      }
    },
  );

  onUnmounted(() => {
    initAborted = true;
    if (tacInstance && typeof tacInstance.destroyWindow === 'function') {
      tacInstance.destroyWindow();
    }
    tacInstance = null;
  });
</script>
