/**
 * Message Module
 * Handles iframe postMessage communication
 */

/**
 * Send message to parent window
 */
export function sendToParent(data: unknown): void {
  if (window.parent === window) {
    console.warn('SDK: Not running in iframe, cannot send message to parent');
    return;
  }
  window.parent.postMessage(data, '*');
}

/**
 * Listen for messages from parent
 */
export function listenFromParent(
  callback: (data: unknown) => void
): () => void {
  const handler = (event: MessageEvent) => {
    callback(event.data);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
