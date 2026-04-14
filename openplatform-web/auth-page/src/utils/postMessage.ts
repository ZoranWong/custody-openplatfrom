/**
 * PostMessage utilities for iframe and tab/window communication
 */

/**
 * Check if this page was opened via window.open() (tab/window mode)
 */
export function isOpenedByWindowOpen(): boolean {
  return typeof window.opener !== 'undefined' && window.opener !== null;
}

/**
 * Check if this page is running inside an iframe
 */
export function isRunningInIframe(): boolean {
  return window.parent !== window;
}

// Allowed origins for receiving messages (configure in production)
const ALLOWED_ORIGINS = new Set<string>();

/**
 * Set allowed origins for message validation
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
 * Message received from parent (SDK)
 * Data is passed via URL query parameters, not postMessage
 */
export interface ParentMessage {
  action: 'init' | 'close' | 'cancel';
}

/**
 * SDK Event types - matches SDK SDKEventType
 */
export type AuthEventType =
  | 'ready'
  | 'authorization_started'
  | 'authorization_succeed'
  | 'authorization_failed'
  | 'close';

/**
 * Message to send to parent (SDK) - matches SDK SDKEvent
 */
export interface AuthPageEvent {
  /** SDK instance UUID for message validation (optional for backward compatibility) */
  uuid?: string;
  /** Event type */
  type: AuthEventType;
  /** Event data (optional) */
  data?: unknown;
  /** Error information (optional) */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** Timestamp when event was created */
  timestamp?: number;
}

// Store the parent origin when received
let parentOrigin: string | null = null;
// Track the target window for communication
let targetWindow: Window | null = null;
// Track if communication channel is established
let isChannelReady = false;
// Store the SDK UUID for validation
let sdkUuid: string | null = null;

/**
 * Get SDK UUID from URL parameters
 */
export function getSDKUUIDFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('sdkUuid');
}

/**
 * Determine the target window for communication
 * - If opened via window.open(): use window.opener
 * - If in iframe: use window.parent
 */
function getTargetWindow(): Window | null {
  if (targetWindow) {
    return targetWindow;
  }

  if (isOpenedByWindowOpen()) {
    // Opened via window.open() - communicate via opener
    targetWindow = window.opener;
  } else if (isRunningInIframe()) {
    // Running in iframe - communicate via parent
    targetWindow = window.parent;
  }

  return targetWindow;
}

/**
 * Listen for messages from parent window
 */
export function listenFromParent(
  callback: (data: ParentMessage, origin: string) => void
): () => void {
  // Initialize SDK UUID from URL if available
  sdkUuid = getSDKUUIDFromUrl();

  const handler = (event: MessageEvent) => {
    // Validate message origin for security
    if (ALLOWED_ORIGINS.size > 0 && !ALLOWED_ORIGINS.has(event.origin)) {
      console.warn('Auth Page: Ignored message from untrusted origin:', event.origin);
      return;
    }

    // Store parent origin for sending responses
    parentOrigin = event.origin;
    targetWindow = event.source as Window;
    isChannelReady = true;

    // Validate SDK UUID if we have one
    if (sdkUuid && event.data?.uuid && event.data.uuid !== sdkUuid) {
      console.warn('Auth Page: Ignored message with invalid UUID:', event.data.uuid);
      return;
    }

    if (event.data && event.data.action === 'init') {
      callback(event.data as ParentMessage, event.origin);
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/**
 * Send event to parent window
 * Unified message format matching SDK SDKEvent
 */
export function sendEventToParent(event: AuthPageEvent): void {
  const target = getTargetWindow();

  if (!target) {
    console.warn('Auth Page: No parent window found for communication');
    return;
  }

  // Include SDK UUID and timestamp in all events
  const eventWithUuid = {
    ...event,
    uuid: sdkUuid || '',
    timestamp: event.timestamp || Date.now(),
  };

  const targetOrigin = parentOrigin || '*';
  target.postMessage(eventWithUuid, targetOrigin);
}

/**
 * Send success event to parent
 */
export function sendSuccessToParent(authorizationId: string): void {
  sendEventToParent({
    type: 'authorization_succeed',
    data: { authorizationId },
    timestamp: Date.now(),
  });
}

/**
 * Send failed event to parent
 */
export function sendFailedToParent(code: string, message: string, details?: unknown): void {
  sendEventToParent({
    type: 'authorization_failed',
    data: { code, message },
    error: { code, message, details },
    timestamp: Date.now(),
  });
}

/**
 * Check if communication channel is ready
 */
export function isCommunicationReady(): boolean {
  return isChannelReady;
}

/**
 * Get the stored parent origin
 */
export function getParentOrigin(): string | null {
  return parentOrigin;
}
