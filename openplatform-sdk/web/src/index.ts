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
} from './types';

// Global mapping for static API backward compatibility
const GLOBAL_ORIGINS_MAP = new Map<string, Set<string>>();

// Allowed origins for postMessage (configure in production) - fallback for backward compatibility
const ALLOWED_ORIGINS = new Set<string>();

/**
 * Set allowed origins for postMessage validation
 * @param origins - Array of allowed origins
 * @param uuid - Optional SDK instance UUID (if not provided, sets global fallback)
 */
export function setAllowedOrigins(origins: string[], uuid?: string): void {
    if (uuid) {
        // Instance-specific origins
        let originsSet = GLOBAL_ORIGINS_MAP.get(uuid);
        if (!originsSet) {
            originsSet = new Set<string>();
            GLOBAL_ORIGINS_MAP.set(uuid, originsSet);
        }
        originsSet.clear();
        origins.forEach((origin) => originsSet!.add(origin));
    } else {
        // Global fallback (backward compatibility)
        ALLOWED_ORIGINS.clear();
        origins.forEach((origin) => ALLOWED_ORIGINS.add(origin));
    }
}

/**
 * Get allowed origins for this SDK instance or global fallback
 * @param uuid - Optional SDK instance UUID
 */
export function getAllowedOrigins(uuid?: string): string[] {
    if (uuid) {
        const originsSet = GLOBAL_ORIGINS_MAP.get(uuid);
        if (originsSet) {
            return Array.from(originsSet);
        }
    }
    return Array.from(ALLOWED_ORIGINS);
}

/**
 * Default timeout for authorization in milliseconds
 */
const DEFAULT_AUTH_TIMEOUT = 30000;

/**
 * Default modal overlay styles
 */
const DEFAULT_MODAL_STYLES = {
    overlay: `
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
    `,
    modal: `
        position: relative;
        width: 90%;
        max-width: 420px;
        height: 600px;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `,
    closeButton: `
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
    `,
};

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
    TIMEOUT: 'TIMEOUT',
} as const;

/**
 * Cregis Web SDK class
 */
export class CregisWebSDK {
    private config: SDKConfig | null = null;
    private initialized = false;
    private iframe: HTMLIFrameElement | null = null;
    private tokenInfo: TokenInfo | null = null;
    private messageHandler:
        | ((event: MessageEvent<SDKEvent>) => void)
        | null = null;
    private modalElement: HTMLElement | null = null;
    /** Unique identifier for this SDK instance, used for message validation */
    private uuid: string;
    /** Pending authorization promises */
    private pendingAuths = new Map<
        string,
        {
            resolve: (result: AuthorizationResult) => void;
            timeoutId: number;
        }
    >();

    /**
     * Initialize the SDK with configuration
     * @param config - SDK configuration
     */
    constructor(config: SDKConfig) {
        this.validateConfig(config);
        this.config = config;
        this.uuid = this.generateUUID();

        // Set instance-specific allowed origins
        if (config.allowedOrigins) {
            setAllowedOrigins(config.allowedOrigins, this.uuid);
        }

        this.initialized = true;
        this.emitEvent('ready');
    }

    /**
     * Generate a unique identifier for this SDK instance
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /**
     * Validate message origin against allowed origins
     * @param event - Message event
     * @returns true if origin is allowed, false otherwise
     */
    private validateOrigin(event: MessageEvent): boolean {
        // Check instance-specific origins first
        const instanceOrigins = GLOBAL_ORIGINS_MAP.get(this.uuid);
        if (instanceOrigins && instanceOrigins.size > 0) {
            return instanceOrigins.has(event.origin);
        }
        // Fall back to global origins
        if (ALLOWED_ORIGINS.size > 0) {
            return ALLOWED_ORIGINS.has(event.origin);
        }
        // No origins configured - allow all (backward compatibility, use allowedOrigins config for production)
        return true;
    }

    /**
     * Validate message UUID
     * @param data - Message data
     * @returns true if UUID matches, false otherwise
     */
    private validateUUID(data: SDKEvent): boolean {
        return data?.uuid === this.uuid;
    }

    /**
     * Handle authorization timeout
     * @param authId - Authorization ID (UUID)
     */
    private handleAuthTimeout(authId: string): void {
        const pending = this.pendingAuths.get(authId);
        if (pending) {
            const timeoutError: SDKError = {
                code: ErrorCodes.TIMEOUT,
                message: 'Authorization timed out',
            };
            this.emitEvent('authorization_failed', undefined, timeoutError);
            pending.resolve({ status: 'error', error: timeoutError });
            this.pendingAuths.delete(authId);

            // Clean up resources
            this.closeModal();
            this.removeMessageListener();

            if (this.config?.debug) {
                console.warn('Authorization timed out:', authId);
            }
        }
    }

    /**
     * Resolve authorization result and clean up
     * @param result - Authorization result
     */
    private resolveAuth(result: AuthorizationResult): void {
        const pending = this.pendingAuths.get(this.uuid);
        if (pending) {
            // Clear timeout
            clearTimeout(pending.timeoutId);
            // Resolve promise
            pending.resolve(result);
            // Remove from map
            this.pendingAuths.delete(this.uuid);

            if (this.config?.debug) {
                console.log('Authorization resolved:', result.status);
            }
        }
    }

    /**
     * Get the SDK instance UUID
     */
    public getUUID(): string {
        return this.uuid;
    }

    /**
     * Append SDK UUID to authorizeUrl
     */
    private appendUUID(url: string): string {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}sdkUuid=${this.uuid}`;
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

        // Validate authUrl
        if (!config.authUrl || typeof config.authUrl !== 'string') {
            throw new SDKError_class({
                code: ErrorCodes.INVALID_APP_ID,
                message: 'authUrl is required and must be a string',
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
     * Emit event to callback
     */
    private emitEvent(
        type: SDKEventType,
        data?: unknown,
        error?: SDKError,
    ): void {
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
     * @param options - Authorization URL string OR options object with oauthUrl
     *
     * Usage:
     *   // Direct: pass authorizeUrl string
     *   sdk.openAuthorization('https://openplatform.../authorize?appId=xxx&...')
     *
     *   // Via options object with oauthUrl
     *   sdk.openAuthorization({ oauthUrl: '...' })
     *
     *   // Legacy: build URL from config (deprecated)
     *   sdk.openAuthorization({ permissions: ['read'], state: 'xxx' })
     */
    public async openAuthorization(
        options?: AuthorizationOptions,
    ): Promise<AuthorizationResult> {
        this.checkInitialized();

        // Clean up existing iframe and modal if any
        this.closeModal();

        this.emitEvent('authorization_started');

        try {
            // Determine mode: popup, tab, or window
            const mode = this.config?.mode || 'popup';

            // Resolve authorizeUrl
            let authorizeUrl: string;

            if (typeof options === 'string') {
                // Direct string: append uuid to oauthUrl
                authorizeUrl = this.appendUUID(options);
            } else if (options?.oauthUrl) {
                // Object with oauthUrl: append uuid
                authorizeUrl = this.appendUUID(options.oauthUrl);
            } else {
                // Legacy: build URL from config
                const baseUrl = this.config!.authUrl.replace(/\/$/, '');
                const params = new URLSearchParams();
                params.set('appId', this.config!.appId);

                if (this.config?.appToken) {
                    params.set('appToken', this.config.appToken);
                }
                if (this.config?.appName) {
                    params.set('appName', this.config.appName);
                }
                if (this.config?.appLogoUrl) {
                    params.set('appLogoUrl', this.config.appLogoUrl);
                }

                const token = this.getToken();
                if (token?.accessToken) {
                    params.set('token', token.accessToken);
                }

                if (options?.state) {
                    params.set('state', options.state);
                }
                if (options?.redirectUri) {
                    params.set('redirectUri', options.redirectUri);
                }
                if (options?.permissions) {
                    params.set('permissions', options.permissions.join(','));
                }

                authorizeUrl = `${baseUrl}?${params.toString()}&sdkUuid=${this.uuid}`;
            }

            if (mode === 'popup') {
                // popup mode: use iframe in modal overlay
                this.iframe = document.createElement('iframe');
                this.iframe.src = authorizeUrl;
                this.iframe.style.width = '100%';
                this.iframe.style.height = '100%';
                this.iframe.style.border = 'none';
                this.createModal(this.iframe);
                this.setupMessageListener();
            } else if (mode === 'tab') {
                // tab mode: open in new tab, rely on postMessage from redirectUri page
                window.open(authorizeUrl, '_blank');
                this.setupWindowListener();
            } else if (mode === 'window') {
                // window mode: open popup window, rely on postMessage from redirectUri page
                const win = window.open(
                    authorizeUrl,
                    'auth',
                    'width=600,height=700',
                );
                if (!win) {
                    const sdkError: SDKError = {
                        code: ErrorCodes.AUTHORIZATION_FAILED,
                        message:
                            'Failed to open popup window. Please allow popups for this site.',
                    };
                    this.emitEvent('authorization_failed', undefined, sdkError);
                    return { status: 'error', error: sdkError };
                }
                this.setupWindowListener(win);
            }

            // Create promise and store resolver in Map
            const authId = this.uuid;
            const timeoutId = window.setTimeout(() => {
                this.handleAuthTimeout(authId);
            }, DEFAULT_AUTH_TIMEOUT);

            const promise = new Promise<AuthorizationResult>((resolve) => {
                this.pendingAuths.set(authId, { resolve, timeoutId });
            });

            return promise;
        } catch (error) {
            const sdkError: SDKError = {
                code: ErrorCodes.AUTHORIZATION_FAILED,
                message:
                    error instanceof Error
                        ? error.message
                        : 'Authorization failed',
            };
            this.emitEvent('authorization_failed', undefined, sdkError);
            return {
                status: 'error',
                error: sdkError,
            };
        }
    }

    /**
     * Handle authorization message from iframe/window
     * @param data - Message data
     * @param closeModalOnComplete - Whether to close modal on authorization complete
     */
    private handleAuthMessage(data: SDKEvent, closeModalOnComplete: boolean): void {
        if (data?.type === 'ready') {
            this.config?.onReady?.({ uuid: data.uuid || this.uuid });
        } else if (data?.type === 'authorization_started') {
            this.config?.onAuthorizationStarted?.();
        } else if (data?.type === 'authorization_succeed') {
            const authorizeData = data.data as { authorizationId: string } | undefined;
            this.config?.onAuthorizationComplete?.({
                authorizeId: authorizeData?.authorizationId || '',
            });

            const result: AuthorizationResult = {
                status: !data.error ? 'success' : 'error',
                authorizeId: authorizeData?.authorizationId || '',
                error: data.error,
            };

            this.emitEvent(
                result.status === 'success' ? 'authorization_succeed' : 'authorization_failed',
                result,
                result.error,
            );

            this.resolveAuth(result);
            if (closeModalOnComplete) {
                this.closeModal();
            }
            this.removeMessageListener();
        } else if (data?.type === 'authorization_failed') {
            const errorData = data.data as { code: string; message: string } | undefined;
            this.config?.onAuthorizationError?.({
                code: errorData?.code || 'UNKNOWN',
                message: errorData?.message || 'Authorization failed',
            });

            const sdkError: SDKError = {
                code: errorData?.code || 'UNKNOWN',
                message: errorData?.message || 'Authorization failed',
            };
            const result: AuthorizationResult = {
                status: 'error',
                error: sdkError,
            };

            this.emitEvent('authorization_failed', result, sdkError);
            this.resolveAuth(result);
            if (closeModalOnComplete) {
                this.closeModal();
            }
            this.removeMessageListener();
        } else if (data?.type === 'close') {
            if (closeModalOnComplete) {
                this.closeModal();
            }
            this.config?.onAuthorizationCancelled?.();
            this.resolveAuth({ status: 'cancelled' });
            this.removeMessageListener();
        }
    }

    /**
     * Validate and handle incoming message event
     * @param event - Message event
     * @param closeModalOnComplete - Whether to close modal on authorization complete
     * @returns true if message was handled, false otherwise
     */
    private validateAndHandleMessage(event: MessageEvent<SDKEvent>, closeModalOnComplete: boolean): boolean {
        const { data } = event;

        if (!this.validateUUID(data)) {
            if (this.config?.debug) {
                console.warn('Ignored message with invalid UUID:', data?.uuid);
            }
            return false;
        }

        if (this.config?.debug) {
            console.log('Received message:', event.data);
        }

        this.handleAuthMessage(data, closeModalOnComplete);
        return true;
    }

    /**
     * Set up postMessage listener for iframe communication
     */
    private setupMessageListener(): void {
        // Clean up any existing listener first
        this.removeMessageListener();

        const messageHandler = (event: MessageEvent<SDKEvent>) => {
            // Validate message origin for security
            if (!this.validateOrigin(event)) {
                if (this.config?.debug) {
                    console.warn('Ignored message from untrusted origin:', event.origin);
                }
                return;
            }

            this.validateAndHandleMessage(event, true);
        };

        this.messageHandler = messageHandler;
        window.addEventListener('message', messageHandler);
    }

    /**
     * Set up postMessage listener for tab/window communication
     * @param targetWindow - Optional target window to listen from (for window mode)
     */
    private setupWindowListener(targetWindow?: Window): void {
        // Clean up any existing listener first
        this.removeMessageListener();

        const messageHandler = (event: MessageEvent<SDKEvent>) => {
            // If targetWindow specified, only accept messages from that window
            if (targetWindow && event.source !== targetWindow) {
                return;
            }

            // Validate message origin for security
            if (!this.validateOrigin(event)) {
                if (this.config?.debug) {
                    console.warn('Ignored message from untrusted origin:', event.origin);
                }
                return;
            }

            this.validateAndHandleMessage(event, false);
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
     * Create modal overlay for popup mode
     * @param iframe - Iframe element to embed in the modal
     */
    private createModal(iframe: HTMLIFrameElement): HTMLElement {
        const customStyles = this.config?.modalStyles || {};

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = customStyles.overlay || DEFAULT_MODAL_STYLES.overlay;

        // Create modal container
        const modal = document.createElement('div');
        modal.style.cssText = customStyles.modal || DEFAULT_MODAL_STYLES.modal;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = customStyles.closeButton || DEFAULT_MODAL_STYLES.closeButton;
        closeBtn.onclick = () => {
            this.closeModal();
            const sdkError: SDKError = {
                code: ErrorCodes.AUTHORIZATION_FAILED,
                message: 'User cancelled authorization',
            };
            this.emitEvent('authorization_failed', undefined, sdkError);
            // Resolve with error using the new method
            this.resolveAuth({ status: 'error', error: sdkError });
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
        // Clear any pending authorization promises
        this.pendingAuths.forEach((pending) => {
            clearTimeout(pending.timeoutId);
            pending.resolve({ status: 'error', error: { code: ErrorCodes.NOT_INITIALIZED, message: 'SDK destroyed' } });
        });
        this.pendingAuths.clear();

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

        // Clean up instance-specific origins
        GLOBAL_ORIGINS_MAP.delete(this.uuid);
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

// Re-export Transfer Task Detail Dialog
export {
    TransferTaskDetailDialog,
    openTransferTaskDetailDialog,
} from './components/transfer/TransferTaskDetailDialog';
export type {
    TransferTaskDetailDialogOptions,
    TransferTaskDetailData,
    TransferParty,
    TravelRuleInfo,
    ApprovalStep,
    TransferTaskMeta,
} from './components/transfer/types';
