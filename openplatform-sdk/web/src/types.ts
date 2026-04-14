/**
 * Cregis OpenPlatform Web SDK
 * Types and interfaces
 */

/**
 * SDK Configuration
 */
export interface SDKConfig {
    /** Application ID - required */
    appId: string;
    /** DOM container for iframe - required */
    container: HTMLElement | string;
    /** Event callback - optional (receives all events) */
    onEvent?: (event: SDKEvent) => void;
    /** Authorization page URL - required, e.g., 'https://openplatform.cregis.com/openplatform/oauth/' */
    authUrl: string;
    /** Debug mode - optional, defaults to false */
    debug?: boolean;
    /** App Token - for authorization */
    appToken?: string;
    /** App Name - displayed in authorization page */
    appName?: string;
    /** App Logo URL - displayed in authorization page */
    appLogoUrl?: string;
    /** Display mode: 'tab', 'window', or 'popup', defaults to 'popup' */
    mode?: 'tab' | 'window' | 'popup';
    /** Custom CSS for modal overlay - optional */
    modalStyles?: {
        overlay?: string;
        modal?: string;
        closeButton?: string;
    };
    /** Allowed origins for postMessage validation - optional, defaults to all origins allowed */
    allowedOrigins?: string[];
    /** Callback when auth page is ready */
    onReady?: (data: { uuid: string }) => void;
    /** Callback when authorization starts */
    onAuthorizationStarted?: () => void;
    /** Callback when authorization completes successfully */
    onAuthorizationComplete?: (data: { authorizeId: string }) => void;
    /** Callback when authorization fails */
    onAuthorizationError?: (error: { code: string; message: string }) => void;
    /** Callback when authorization is cancelled */
    onAuthorizationCancelled?: () => void;
}

/**
 * SDK Event types
 */
export type SDKEventType =
    | 'ready'
    | 'error'
    | 'close'
    | 'authorization_started'
    | 'authorization_succeed'
    | 'authorization_failed'
    | 'message_received';

/**
 * SDK Event
 */
export interface SDKEvent {
    /** SDK instance UUID for message validation */
    uuid?: string;
    type: SDKEventType;
    data?: unknown;
    error?: SDKError;
    timestamp?: number;
}

/**
 * SDK Error
 */
export interface SDKError {
    code: string;
    message: string;
    details?: unknown;
}

/**
 * Authorization Result
 */
export interface AuthorizationResult {
    status: 'success' | 'error' | 'cancelled';
    /** Authorization ID from /oauth/verify endpoint */
    authorizeId?: string;
    error?: SDKError;
}

/**
 * Authorization options - can be a string (authorizeUrl) or an options object
 * If string: directly use as authorizeUrl
 * If object: use openAuthorizationWithUrl(url) from options
 */
export type AuthorizationOptions =
    | string
    | {
        /** Full authorization URL from /oauth/authorizeUrl API */
        oauthUrl?: string;
        /** Permissions to request (used when oauthUrl not provided) */
        permissions?: string[];
        /** Custom state for callback */
        state?: string;
        /** Redirect URI after completion */
        redirectUri?: string;
    };

/**
 * Token information
 */
export interface TokenInfo {
    accessToken: string;
    expiresAt: number;
    tokenType: string;
}
