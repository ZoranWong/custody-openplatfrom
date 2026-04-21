/**
 * Application Callback Service
 * Handles webhook-style callback push to developer servers
 * with HMAC-SHA256 signature and retry logic
 */

import crypto from 'crypto'
import axios, { AxiosError, AxiosResponse } from 'axios'
import { logger } from '../utils/logger'
import { Application } from '../types/isv.types'

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

// Callback payload structure
export interface CallbackPayload {
    appId: string
    event?: CallbackEventType
    timestamp: string
    data: Record<string, unknown>
}

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
     * Build HMAC-SHA256 signature
     * Signature is computed over the string:
     * signData = appId + "." + timestamp
     * signData = appId + "." + event + "." + timestamp
     *
     * @param appSecret - Application secret key
     * @param appId - Application ID (database UUID)
     * @param event - Event type
     * @param timestamp - Unix timestamp in milliseconds (string)
     * @returns HMAC-SHA256 signature in hex format
     */
    buildSignature(appSecret: string, appId: string, timestamp: string, event?: string): string {
        // const signData = `${appId}.${event}.${timestamp}`
        let signData = `${appId}`
        if (event) {
            signData += `.${event}`
        }
        signData += `.${timestamp}`

        return crypto
            .createHmac('sha256', appSecret)
            .update(signData)
            .digest('hex')
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
        const isHttps = url.toLowerCase().startsWith('https://')
        const isHttp = url.toLowerCase().startsWith('http://')
        const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1')

        // Production: must be HTTPS
        if (process.env.NODE_ENV === 'production') {
            if (!isHttps) {
                return { valid: false, error: 'https_required' }
            }
        }

        // Development: allow HTTP for localhost testing
        if (isHttp && !isLocalhost) {
            return { valid: false, error: 'https_required' }
        }

        return { valid: true }
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
            id: string
            appSecret: string
            callbackUrl?: string | null
        }
        event?: CallbackEventType | ''
        data: Record<string, unknown>
    }): Promise<PushResult> {
        const { application, event, data } = params

        // Validate payload size (F4)
        const payloadSize = JSON.stringify(data).length
        if (payloadSize > CALLBACK_CONFIG.maxPayloadSize) {
            logger.warn(`Callback payload too large: ${payloadSize} bytes (max: ${CALLBACK_CONFIG.maxPayloadSize})`)
            return { success: false, error: 'payload_too_large' }
        }

        try {
            // Skip if no callback URL configured
            if (!application.callbackUrl) {
                logger.debug(`Callback push skipped - no callbackUrl configured`)
                return { success: true, error: 'no_callback_url' }
            }

            const callbackUrl = application.callbackUrl

            // Validate URL security
            const urlValidation = this.validateUrl(callbackUrl)
            if (!urlValidation.valid) {
                logger.warn(`Callback URL validation failed: ${urlValidation.error} - ${callbackUrl}`)
                return { success: false, error: urlValidation.error }
            }

            // Send with retry
            const timestamp = Date.now().toString()
            const payload: CallbackPayload = {
                appId: application.id,
                // event,
                timestamp,
                data,
            }
            if (event) {
                payload.event = event
            }
            await this.sendWithRetry(callbackUrl, payload, application.appSecret, application.id)

            logger.info(`Callback pushed successfully: ${event} to ${callbackUrl}`)
            return { success: true }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            logger.error(`Callback push failed for ${application.id}: ${errorMessage}`)
            return { success: false, error: errorMessage }
        }
    }

    /**
     * Send request with retry logic
     * Handles response validation and retry on 429/5xx/network errors
     */
    private async sendWithRetry(
        url: string,
        payload: CallbackPayload,
        appSecret: string,
        appIdForLog?: string,
        attempt: number = 0
    ): Promise<void> {
        const timestamp = payload.timestamp
        const signature = this.buildSignature(appSecret, payload.appId, timestamp, payload.event)

        let response: AxiosResponse | undefined

        try {
            const headers: Record<string, string> = {
                'X-Timestamp': timestamp,
                'X-Signature': `sha256=${signature}`,
            }
            if (payload.event) {
                headers['X-Event'] = payload.event
            }
            // Use shared HTTP client (connection pooling) (F3)
            const axiosResponse = await httpClient.post(url, payload, {
                headers: headers,
            })
            response = axiosResponse

            // Validate response status - 2xx is success (F1)
            if (response.status >= 200 && response.status < 300) {
                return // Success
            }

            // Check if we should retry based on status code (F2: 429 is retryable)
            const statusCode = response.status
            const shouldRetry = attempt < CALLBACK_CONFIG.maxRetries &&
                (statusCode === 429 || // Rate limited
                    statusCode >= 500)   // Server error

            if (shouldRetry) {
                const delay = CALLBACK_CONFIG.retryDelays[attempt] ?? 0 // F7: nullable fallback
                logger.info(`Callback retry: attempt ${attempt + 2}, delay ${delay}ms, status ${statusCode}`)

                await this.delay(delay)
                return this.sendWithRetry(url, payload, appSecret, appIdForLog, attempt + 1)
            }

            // Non-retryable status code (4xx except 429)
            throw new Error(`Callback failed with status ${statusCode}`)

        } catch (error) {
            const axiosError = error as AxiosError

            // Network errors are retryable
            const isNetworkError =
                axiosError.code === 'ECONNABORTED' ||
                axiosError.code === 'ETIMEDOUT' ||
                !axiosError.response // Network error (no response)

            // Check if we should retry
            const shouldRetry = attempt < CALLBACK_CONFIG.maxRetries && isNetworkError

            if (shouldRetry) {
                const delay = CALLBACK_CONFIG.retryDelays[attempt] ?? 0
                logger.info(`Callback retry: attempt ${attempt + 2}, delay ${delay}ms (network error)`)

                await this.delay(delay)
                return this.sendWithRetry(url, payload, appSecret, appIdForLog, attempt + 1)
            }

            // Max retries reached or non-retryable error
            if (attempt >= CALLBACK_CONFIG.maxRetries) {
                logger.error(`Callback push failed after ${attempt + 1} attempts to ${url} (appId: ${appIdForLog || 'unknown'})`)
                throw new Error(`Callback push failed after ${attempt + 1} attempts`)
            }

            throw error
        }
    }

    /**
     * Helper to create a delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * Reset singleton instance (for testing)
     */
    static resetInstance(): void {
        callbackServiceInstance = null
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