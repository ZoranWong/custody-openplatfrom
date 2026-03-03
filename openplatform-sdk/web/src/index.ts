/**
 * Cregis OpenPlatform Web SDK
 * Main entry point
 */

import {
  SDKConfig,
  SDKEvent,
  SDKEventType,
  SDKError,
  AuthorizationResult,
  AuthorizationOptions,
  TokenInfo,
  IframeMessage,
} from './types';

// Allowed origins for postMessage (configure in production)
const ALLOWED_ORIGINS = new Set<string>();

/**
 * Set allowed origins for postMessage validation
 * @param origins - Array of allowed origins
 */
export function setAllowedOrigins(origins: string[]): void {
  ALLOWED_ORIGINS.clear();
  origins.forEach((origin) => ALLOWED_ORIGINS.add(origin));
}

/**
 * Get allowed origins
 */
export function getAllowedOrigins(): string[] {
  return Array.from(ALLOWED_ORIGINS);
}

/**
 * Error codes
 */
export const ErrorCodes = {
  INVALID_APP_ID: 'INVALID_APP_ID',
  INVALID_CONTAINER: 'INVALID_CONTAINER',
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  ALREADY_INITIALIZED: 'ALREADY_INITIALIZED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  IFRAME_ERROR: 'IFRAME_ERROR',
} as const;

/**
 * Cregis Web SDK class
 */
export class CregisWebSDK {
  private config: SDKConfig | null = null;
  private initialized = false;
  private iframe: HTMLIFrameElement | null = null;
  private tokenInfo: TokenInfo | null = null;
  private messageHandler: ((event: MessageEvent<IframeMessage>) => void) | null = null;
  private modalElement: HTMLElement | null = null;

  /**
   * Initialize the SDK with configuration
   * @param config - SDK configuration
   */
  constructor(config: SDKConfig) {
    this.validateConfig(config);
    this.config = config;
    this.initialized = true;
    this.emitEvent('ready');
  }

  /**
   * Validate SDK configuration
   */
  private validateConfig(config: SDKConfig): void {
    // Validate appId
    if (!config.appId || typeof config.appId !== 'string') {
      throw new SDKError_class({
        code: ErrorCodes.INVALID_APP_ID,
        message: 'appId is required and must be a string',
      });
    }

    // Validate container
    if (!config.container) {
      throw new SDKError_class({
        code: ErrorCodes.INVALID_CONTAINER,
        message: 'container is required',
      });
    }
  }

  /**
   * Get container element
   */
  private getContainerElement(): HTMLElement {
    if (!this.config) {
      throw new SDKError_class({
        code: ErrorCodes.NOT_INITIALIZED,
        message: 'SDK is not initialized',
      });
    }

    if (typeof this.config.container === 'string') {
      const element = document.querySelector(this.config.container);
      if (!element) {
        throw new SDKError_class({
          code: ErrorCodes.INVALID_CONTAINER,
          message: `Container element not found: ${this.config.container}`,
        });
      }
      return element as HTMLElement;
    }

    return this.config.container;
  }

  /**
   * Emit event to callback
   */
  private emitEvent(type: SDKEventType, data?: unknown, error?: SDKError): void {
    if (this.config?.onEvent) {
      const event: SDKEvent = {
        type,
        data,
        error,
        timestamp: Date.now(),
      };
      this.config.onEvent(event);
    }
  }

  /**
   * Check if SDK is initialized
   */
  private checkInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new SDKError_class({
        code: ErrorCodes.NOT_INITIALIZED,
        message: 'SDK is not initialized',
      });
    }
  }

  /**
   * Open authorization page
   * @param options - Authorization options
   */
  public async openAuthorization(options?: AuthorizationOptions): Promise<AuthorizationResult> {
    this.checkInitialized();

    // Clean up existing iframe and modal if any
    this.closeModal();

    this.emitEvent('authorization_started');

    try {
      // Determine mode: popup or inline
      const mode = this.config?.mode || 'inline';

      // Build authorization URL
      const baseUrl = this.config?.baseUrl || 'https://openplatform.cregis.com';
      const params = new URLSearchParams();
      params.set('appId', this.config!.appId);

      // Add appToken from config
      if (this.config?.appToken) {
        params.set('appToken', this.config.appToken);
      }

      // Add appName from config
      if (this.config?.appName) {
        params.set('appName', this.config.appName);
      }

      // Add appLogoUrl from config
      if (this.config?.appLogoUrl) {
        params.set('appLogoUrl', this.config.appLogoUrl);
      }

      // Add token if available (legacy support)
      const token = this.getToken();
      if (token?.accessToken) {
        params.set('token', token.accessToken);
      }

      // Add optional parameters
      if (options?.state) {
        params.set('state', options.state);
      }
      if (options?.redirectUri) {
        params.set('redirectUri', options.redirectUri);
      }
      if (options?.permissions) {
        params.set('permissions', options.permissions.join(','));
      }

      const authUrl = `${baseUrl}/auth/authorize?${params.toString()}`;

      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.src = authUrl;
      this.iframe.style.width = '100%';
      this.iframe.style.height = '100%';
      this.iframe.style.border = 'none';

      // Get or create container
      let container: HTMLElement;
      if (mode === 'popup') {
        // Create modal overlay
        container = this.createModal(this.iframe);
      } else {
        // Use inline container
        container = this.getContainerElement();
        container.innerHTML = '';
        container.appendChild(this.iframe);
      }

      // Set up message listener
      this.setupMessageListener();

      return new Promise((resolve) => {
        (window as unknown as { __cregisResolve: (result: AuthorizationResult) => void }).__cregisResolve = resolve;
      });
    } catch (error) {
      const sdkError: SDKError = {
        code: ErrorCodes.AUTHORIZATION_FAILED,
        message: error instanceof Error ? error.message : 'Authorization failed',
      };
      this.emitEvent('authorization_error', undefined, sdkError);
      return {
        status: 'error',
        error: sdkError,
      };
    }
  }

  /**
   * Set up postMessage listener for iframe communication
   */
  private setupMessageListener(): void {
    const messageHandler = (event: MessageEvent<IframeMessage>) => {
      // Validate message origin for security
      if (ALLOWED_ORIGINS.size > 0 && !ALLOWED_ORIGINS.has(event.origin)) {
        if (this.config?.debug) {
          console.warn('Ignored message from untrusted origin:', event.origin);
        }
        return;
      }

      if (this.config?.debug) {
        console.log('Received message:', event.data);
      }

      const { data } = event;

      if (data?.action === 'authorization_result') {
        const result: AuthorizationResult = {
          status: data.type === 'success' ? 'success' : 'error',
          resourceKey: data.data as string,
          error: data.error,
        };

        this.emitEvent(
          result.status === 'success' ? 'authorization_complete' : 'authorization_error',
          result,
          result.error
        );

        // Resolve promise
        const resolve = (window as unknown as { __cregisResolve?: (result: AuthorizationResult) => void }).__cregisResolve;
        if (resolve) {
          resolve(result);
          delete (window as unknown as { __cregisResolve?: unknown }).__cregisResolve;
        }

        // Remove iframe and modal
        this.closeModal();

        // Remove listener
        this.removeMessageListener();
      } else if (data?.action === 'close') {
        // Handle close action from auth page (e.g., countdown closing)
        this.closeModal();

        // Resolve promise with cancelled status
        const resolve = (window as unknown as { __cregisResolve?: (result: AuthorizationResult) => void }).__cregisResolve;
        if (resolve) {
          resolve({ status: 'cancelled' });
          delete (window as unknown as { __cregisResolve?: unknown }).__cregisResolve;
        }

        // Remove listener
        this.removeMessageListener();
      }
    };

    this.messageHandler = messageHandler;
    window.addEventListener('message', messageHandler);
  }

  /**
   * Remove message listener
   */
  private removeMessageListener(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }

  /**
   * Set access token
   * @param token - Token information
   */
  public setToken(token: TokenInfo): void {
    this.tokenInfo = token;
  }

  /**
   * Get access token
   */
  public getToken(): TokenInfo | null {
    return this.tokenInfo;
  }

  /**
   * Check if SDK is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get SDK configuration
   */
  public getConfig(): SDKConfig | null {
    return this.config;
  }

  /**
   * Destroy SDK instance
   */
  /**
   * Create modal overlay for popup mode
   */
  private createModal(iframe: HTMLIFrameElement): HTMLElement {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal container
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: relative;
      width: 90%;
      max-width: 420px;
      height: 600px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      border: none;
      background: #f3f4f6;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      z-index: 10;
      line-height: 1;
    `;
    closeBtn.onclick = () => {
      this.closeModal();
      const sdkError: SDKError = {
        code: ErrorCodes.AUTHORIZATION_FAILED,
        message: 'User cancelled authorization',
      };
      this.emitEvent('authorization_error', undefined, sdkError);
      const resolveFn = (window as unknown as { __cregisResolve?: (result: AuthorizationResult) => void }).__cregisResolve;
      if (resolveFn) {
        resolveFn({ status: 'error', error: sdkError });
        delete (window as unknown as { __cregisResolve?: unknown }).__cregisResolve;
      }
    };

    // Append elements
    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    this.modalElement = overlay;
    return modal;
  }

  /**
   * Close modal overlay
   */
  public closeModal(): void {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    this.removeMessageListener();
  }

  public destroy(): void {
    // Remove iframe if exists
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    // Remove message listener to prevent memory leaks
    this.removeMessageListener();
    this.config = null;
    this.initialized = false;
    this.tokenInfo = null;
  }
}

/**
 * SDK Error class
 */
class SDKError_class extends Error {
  code: string;
  details?: unknown;

  constructor(error: SDKError) {
    super(error.message);
    this.name = 'SDKError';
    this.code = error.code;
    this.details = error.details;
  }
}

export { SDKError_class as SDKError };
export default CregisWebSDK;

// Re-export message module functions
export { sendToParent, listenFromParent } from './message';
export * from './types';
