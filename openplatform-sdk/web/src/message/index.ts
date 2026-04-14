/**
 * Message Module
 * Handles iframe postMessage communication
 */

// Default parent origin for postMessage
let defaultParentOrigin = '*';

/**
 * Configure the default parent origin for postMessage validation
 * @param origin - The expected parent origin, or '*' for any origin
 */
export function setParentOrigin(origin: string): void {
    defaultParentOrigin = origin;
}

/**
 * Get the configured parent origin
 */
export function getParentOrigin(): string {
    return defaultParentOrigin;
}

/**
 * Send message to parent window
 * @param data - Message data to send
 * @param targetOrigin - Target origin for postMessage (optional, uses default if not provided)
 */
export function sendToParent(data: unknown, targetOrigin?: string): void {
  if (window.parent === window) {
    console.warn('SDK: Not running in iframe, cannot send message to parent');
    return;
  }
  const origin = targetOrigin || defaultParentOrigin;
  window.parent.postMessage(data, origin);
}

/**
 * Listen for messages from parent
 * @param callback - Callback function to handle incoming messages
 * @param options - Additional options for message listening
 */
export function listenFromParent(
  callback: (data: unknown, event: MessageEvent) => void,
  options?: {
    /** Required origin for validation (optional) */
    requiredOrigin?: string;
    /** SDK instance UUID for validation (optional) */
    expectedUUID?: string;
  }
): () => void {
  const handler = (event: MessageEvent) => {
    // Validate origin if required
    if (options?.requiredOrigin && options.requiredOrigin !== '*') {
      if (event.origin !== options.requiredOrigin) {
        console.warn('SDK: Message from unexpected origin:', event.origin);
        return;
      }
    }
    callback(event.data, event);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
