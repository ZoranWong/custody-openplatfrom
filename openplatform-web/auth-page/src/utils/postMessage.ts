/**
 * PostMessage utilities for iframe communication
 */

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
 * Message to send to parent (SDK)
 */
export interface AuthResultMessage {
  action: 'authorization_result' | 'close';
  type?: 'success' | 'error';
  data?: string;
  error?: {
    code: string;
    message: string;
  };
}

// Store the parent origin when received
let parentOrigin: string | null = null;

/**
 * Listen for messages from parent window
 */
export function listenFromParent(
  callback: (data: ParentMessage, origin: string) => void
): () => void {
  const handler = (event: MessageEvent) => {
    // Validate message origin for security
    if (ALLOWED_ORIGINS.size > 0 && !ALLOWED_ORIGINS.has(event.origin)) {
      console.warn('Auth Page: Ignored message from untrusted origin:', event.origin);
      return;
    }

    // Store parent origin for sending responses
    parentOrigin = event.origin;

    if (event.data && event.data.action === 'init') {
      callback(event.data as ParentMessage, event.origin);
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/**
 * Send message to parent window
 */
export function sendToParent(data: AuthResultMessage): void {
  if (window.parent === window) {
    console.warn('Auth Page: Not running in iframe, cannot send message to parent');
    return;
  }

  // Use stored parent origin if available, otherwise use '*' (fallback)
  const targetOrigin = parentOrigin || '*';
  window.parent.postMessage(data, targetOrigin);
}

/**
 * Get the stored parent origin
 */
export function getParentOrigin(): string | null {
  return parentOrigin;
}
