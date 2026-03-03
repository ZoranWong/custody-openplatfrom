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
  /** Event callback - optional */
  onEvent?: (event: SDKEvent) => void;
  /** API base URL - optional, defaults to production */
  baseUrl?: string;
  /** Debug mode - optional, defaults to false */
  debug?: boolean;
  /** App Token - for authorization */
  appToken?: string;
  /** App Name - displayed in authorization page */
  appName?: string;
  /** App Logo URL - displayed in authorization page */
  appLogoUrl?: string;
  /** Display mode: 'inline' or 'popup', defaults to 'inline' */
  mode?: 'inline' | 'popup';
}

/**
 * SDK Event types
 */
export type SDKEventType =
  | 'ready'
  | 'error'
  | 'authorization_started'
  | 'authorization_complete'
  | 'authorization_error'
  | 'message_received';

/**
 * SDK Event
 */
export interface SDKEvent {
  type: SDKEventType;
  data?: unknown;
  error?: SDKError;
  timestamp: number;
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
  /** Resource access key - unique identifier for the authorized resource access */
  resourceKey?: string;
  error?: SDKError;
}

/**
 * Authorization options
 */
export interface AuthorizationOptions {
  /** Permissions to request */
  permissions?: string[];
  /** Custom state for callback */
  state?: string;
  /** Redirect URI after completion */
  redirectUri?: string;
}

/**
 * Token information
 */
export interface TokenInfo {
  accessToken: string;
  expiresAt: number;
  tokenType: string;
}

/**
 * Message from iframe
 */
export interface IframeMessage {
  action: string;
  type: string;
  data?: unknown;
  error?: SDKError;
}
