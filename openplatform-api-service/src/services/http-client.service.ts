/**
 * HTTP Client Service
 * Wrapper around axios for backend service communication
 * With trace context propagation
 */

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { BackendServiceConfig } from '../types/routing.types';
import { getCurrentTraceId, propagateTrace, generateTraceId, generateSpanId } from './trace.service';

// Re-export for external use
export { generateTraceId };

/**
 * Configuration for HTTP client
 */
export interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Extended axios error with additional context
 */
export interface HttpClientError extends AxiosError {
  retryCount?: number;
  isRetryable?: boolean;
}

/**
 * HTTP Client wrapper for backend service communication
 * Provides connection pooling, timeout handling, and retry logic
 */
export class HttpClient {
  private client: AxiosInstance;
  private config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Enable connection pooling
      httpAgent: undefined, // Use Node.js default (keep-alive)
      httpsAgent: undefined,
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Try to get existing trace context
        const existingTraceId = getCurrentTraceId();

        // Get trace headers for propagation
        let traceHeaders: Record<string, string> = {};

        if (existingTraceId) {
          // Propagate existing trace context
          traceHeaders = propagateTrace({
            traceId: existingTraceId,
            spanId: generateSpanId(),
            sampled: true,
          });
        } else {
          // Generate new trace ID for this downstream call
          const newTraceId = generateTraceId();
          traceHeaders = propagateTrace({
            traceId: newTraceId,
            spanId: generateSpanId(),
            sampled: true,
          });
        }

        // Apply trace headers
        if (traceHeaders['x-trace-id']) {
          config.headers.set('x-trace-id', traceHeaders['x-trace-id']);
        }
        if (traceHeaders['traceparent']) {
          config.headers.set('traceparent', traceHeaders['traceparent']);
        }
        if (traceHeaders['tracestate']) {
          config.headers.set('tracestate', traceHeaders['tracestate']);
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(this.wrapError(error, 0));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const wrappedError = this.wrapError(error, 0);

        // Check if retryable
        if (this.isRetryableError(wrappedError) && this.config.maxRetries! > 0) {
          return this.retryRequest(error.config as AxiosRequestConfig);
        }

        return Promise.reject(wrappedError);
      }
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: HttpClientError): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // 5xx errors are retryable (server errors)
    if (error.response && error.response.status >= 500) {
      return true;
    }

    // 429 Too Many Requests is retryable
    if (error.response && error.response.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Retry a failed request
   */
  private async retryRequest(
    config: AxiosRequestConfig | undefined
  ): Promise<AxiosResponse> {
    if (!config) {
      throw new Error('No config available for retry');
    }

    let attempt = 0;
    const maxAttempts = this.config.maxRetries!;

    while (attempt < maxAttempts) {
      attempt++;

      // Add retry count to error
      const retryConfig = {
        ...config,
        'X-Retry-Count': attempt.toString(),
      };

      // Wait before retry (exponential backoff)
      const delay = this.config.retryDelay! * Math.pow(2, attempt - 1);
      await this.delay(delay);

      try {
        const response = await this.client.request(retryConfig);
        return response;
      } catch (error) {
        const axiosError = error as AxiosError;

        // If last attempt, throw the error
        if (attempt >= maxAttempts) {
          const wrappedError = this.wrapError(axiosError, attempt);
          (wrappedError as HttpClientError).isRetryable = false;
          throw wrappedError;
        }

        // Check if still retryable
        if (!this.isRetryableError(error as HttpClientError)) {
          throw error;
        }
      }
    }

    throw new Error(`Request failed after ${maxAttempts} retries`);
  }

  /**
   * Helper to create a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wrap axios error with additional context
   */
  private wrapError(error: AxiosError, retryCount: number): HttpClientError {
    const wrapped = error as HttpClientError;
    wrapped.retryCount = retryCount;

    // Add more context
    if (error.response) {
      wrapped.isRetryable = this.isRetryableError(wrapped);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      wrapped.isRetryable = true;
    } else {
      wrapped.isRetryable = false;
    }

    return wrapped;
  }

  /**
   * Generic request method
   */
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Check backend service health
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number }> {
    const startTime = Date.now();
    try {
      await this.client.get('/health');
      return {
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get the underlying axios instance for advanced use
   */
  getClient(): AxiosInstance {
    return this.client;
  }
}

/**
 * Create HTTP client from BackendServiceConfig
 */
export function createHttpClient(
  config: BackendServiceConfig
): HttpClient {
  return new HttpClient({
    baseUrl: config.baseUrl,
    timeout: config.defaultTimeout,
    maxRetries: config.maxRetries,
    retryDelay: config.retryDelay,
  });
}
