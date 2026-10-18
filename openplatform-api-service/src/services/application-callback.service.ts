/**
 * Application Callback Service
 * Handles webhook-style callback push to developer servers
 * with HMAC-SHA256 signature and retry logic
 */

import crypto from 'crypto'
import axios, { AxiosError, AxiosResponse } from 'axios'
import { logger } from '../utils/logger'
import { Application } from '../types/isv.types'

/**
 * Recursively sort object keys for deterministic JSON serialization.
 * Matches the sortKeys semantics used by the message signature spec.
 */
function sortObjectKeys(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => sortObjectKeys(item))
    }
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
        sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
    }
    return sorted
}

// Callback event types
export type CallbackEventType =
    | 'authorization.created'
    | 'authorization.revoked'
    | 'authorization.expired'
    | 'transaction.submitted'
    | 'transaction.confirming'
    | 'transaction.completed'
    | 'transaction.failed'
    | 'task.approved'
    | 'task.rejected'

// Callback metadata — carried in request headers (body carries only business data).
export interface CallbackMeta {
    appId: string
    event?: CallbackEventType
    timestamp: string
}

// Callback payload body — pure business data.
export type CallbackBody = Record<string, unknown>

// Push result
export interface PushResult {
    success: boolean
    error?: string
    attempts?: number
}

// Configuration
const CALLBACK_CONFIG = {
    maxRetries: 3, // 4 attempts total (initial + 3 retries)
    retryDelays: [0, 1000, 5000, 30000] as const, // 0s, 1s, 5s, 30s
    timeout: 30000, // 30 seconds
    maxPayloadSize: 64 * 1024, // 64KB max payload
}

// Shared axios instance for connection pooling
const httpClient = axios.create({
    timeout: CALLBACK_CONFIG.timeout,
    headers: {
        'Content-Type': 'application/json',
    },
    httpAgent: undefined,
    httpsAgent: undefined,
})

/**
 * Application Callback Service
 */
export class ApplicationCallbackService {
  /**
   * Build HMAC-SHA256 signature.
   * signData = appId + "." + [event] + "." + timestamp + "." + md5(sortedJSON(data))
   */
  buildSignature(appSecret: string, meta: CallbackMeta, data: Record<string, unknown>): string {
    const { appId, event, timestamp } = meta;
    let signData = `${appId}`;
    if (event) {
      signData += `.${event}`;
    }
    signData += `.${timestamp}`;
    if (data !== undefined) {
      signData += `.${this.buildDataDigest(data)}`;
    }

    return crypto
      .createHmac('sha256', appSecret)
      .update(signData)
      .digest('hex');
  }

  /**
   * Build a deterministic digest of the data payload for signature inclusion.
   * Uses sorted-key JSON serialization (matches signature-spec sortKeys semantics),
   * then MD5 hashes it, so callers can sign/verify identical data independently of
   * key insertion order.
   */
  private buildDataDigest(data: Record<string, unknown>): string {
    const sorted = sortObjectKeys(data);
    const jsonString = JSON.stringify(sorted);
    return crypto.createHash('md5').update(jsonString).digest('hex');
  }

  /**
   * Validate URL security requirement
   * Production: HTTPS required
   * Development: HTTP allowed for localhost testing
   *
   * @param url - Callback URL to validate
   * @returns Validation result with valid flag and optional error
   */
  validateUrl(url: string): { valid: boolean; error?: string } {
    const isHttps = url.toLowerCase().startsWith('https://');
    const isHttp = url.toLowerCase().startsWith('http://');
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

    // Production: must be HTTPS
    if (process.env.NODE_ENV === 'production') {
      if (!isHttps) {
        return { valid: false, error: 'https_required' };
      }
    }

    // Development: allow HTTP for localhost testing
    if (isHttp && !isLocalhost) {
      return { valid: false, error: 'https_required' };
    }

    return { valid: true };
  }

  /**
   * Push event to callback URL
   * This is async and non-blocking - errors are logged but don't affect main flow
   *
   * @param params - Push parameters including application object, event type, and event data
   * @returns Promise resolving to push result
   */
  async pushEvent(params: {
    /** Application object with required fields */
    application: {
      id: string;
      appSecret: string;
      callbackUrl?: string | null;
    };
    event?: CallbackEventType | '';
    data: Record<string, unknown>;
  }): Promise<PushResult> {
    const { application, event, data } = params;

    // Validate payload size (F4)
    const payloadSize = JSON.stringify(data).length;
    if (payloadSize > CALLBACK_CONFIG.maxPayloadSize) {
      logger.warn(
        `Callback payload too large: ${payloadSize} bytes (max: ${CALLBACK_CONFIG.maxPayloadSize})`,
      );
      return { success: false, error: 'payload_too_large' };
    }

    try {
      // Skip if no callback URL configured
      if (!application.callbackUrl) {
        logger.debug(`Callback push skipped - no callbackUrl configured`);
        return { success: true, error: 'no_callback_url' };
      }

      const callbackUrl = application.callbackUrl;

      // Validate URL security
      const urlValidation = this.validateUrl(callbackUrl);
      if (!urlValidation.valid) {
        logger.warn(
          `Callback URL validation failed: ${urlValidation.error} - ${callbackUrl}`,
        );
        return { success: false, error: urlValidation.error };
      }

      // Send with retry
      const meta: CallbackMeta = {
        appId: application.id,
        timestamp: Date.now().toString(),
      };
      if (event) {
        meta.event = event;
      }
      await this.sendWithRetry(callbackUrl, meta, data, application.appSecret);

      logger.info(`Callback pushed successfully: ${event} to ${callbackUrl}`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        `Callback push failed for ${application.id}: ${errorMessage}`,
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send request with retry logic.
   *
   * Retry policy:
   * - HTTP 429 / 5xx  → retry
   * - Network error   → retry
   * - Other 4xx       → no retry
   * - 2xx             → success
   *
   * A total of maxRetries + 1 attempts are made (initial + retries), with an
   * exponential-ish backoff from CALLBACK_CONFIG.retryDelays.
   */
  private async sendWithRetry(
    url: string,
    meta: CallbackMeta,
    data: CallbackBody,
    appSecret: string,
  ): Promise<void> {
    const maxAttempts = CALLBACK_CONFIG.maxRetries + 1; // initial + retries

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Fresh timestamp per attempt, so receivers can validate freshness
      // (and the signature depends on it).
      meta.timestamp = Date.now().toString();
      const signature = this.buildSignature(appSecret, meta, data);
      const headers: Record<string, string> = {
        'X-App-Id': meta.appId,
        'X-Timestamp': meta.timestamp,
        'X-Signature': `sha256=${signature}`,
      };
      if (meta.event) {
        headers['X-Event'] = meta.event;
      }

      try {
        // Use shared HTTP client (connection pooling) (F3)
        const response = await httpClient.post(url, data, { headers });

        // 2xx is success (F1)
        if (response.status >= 200 && response.status < 300) {
          return;
        }

        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < maxAttempts) {
          const delay = this.retryDelay(attempt);
          logger.info(
            `Callback retry: attempt ${attempt + 1}/${maxAttempts}, delay ${delay}ms, status ${response.status}`,
          );
          await this.delay(delay);
          continue;
        }

        throw new Error(`Callback failed with status ${response.status}`);
      } catch (error) {
        const retryable = this.isRetryableNetworkError(error);
        if (retryable && attempt < maxAttempts) {
          const delay = this.retryDelay(attempt);
          logger.info(
            `Callback retry: attempt ${attempt + 1}/${maxAttempts}, delay ${delay}ms (network error)`,
          );
          await this.delay(delay);
          continue;
        }

        if (
          error instanceof Error &&
          error.message.startsWith('Callback failed with status')
        ) {
          throw error;
        }

        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          `Callback push failed after ${attempt} attempt(s) to ${url} (appId: ${meta.appId}): ${message}`,
        );
        throw error;
      }
    }

    throw new Error(
      `Callback push failed after ${maxAttempts} attempts to ${url}`,
    );
  }

  /** True if the thrown error is a retryable network/transport error. */
  private isRetryableNetworkError(error: unknown): boolean {
    const axiosError = error as AxiosError;
    return (
      axiosError.code === 'ECONNABORTED' ||
      axiosError.code === 'ETIMEDOUT' ||
      (axiosError.isAxiosError === true && axiosError.response === undefined)
    );
  }

  /** Backoff delay for the attempt-th attempt (1-based), with a 30s fallback. */
  private retryDelay(attempt: number): number {
    const idx = attempt - 1;
    return CALLBACK_CONFIG.retryDelays[idx] ?? 30000;
  }

  /**
   * Helper to create a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    callbackServiceInstance = null;
  }
}

// Singleton instance
let callbackServiceInstance: ApplicationCallbackService | null = null

/**
 * Get singleton callback service instance
 */
export function getApplicationCallbackService(): ApplicationCallbackService {
    if (!callbackServiceInstance) {
        callbackServiceInstance = new ApplicationCallbackService()
    }
    return callbackServiceInstance
}

/**
 * Factory function for dependency injection
 * Returns new instance each call
 */
export function createApplicationCallbackService(): ApplicationCallbackService {
    return new ApplicationCallbackService()
}