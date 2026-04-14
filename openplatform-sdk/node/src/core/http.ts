/**
 * Cregis OpenPlatform SDK - HTTP Client
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SDKConfig, ApiResponse } from '../types';
import { SDKError, SDKErrorCode } from './error';

/**
 * HTTP Client for API requests
 */
export class HttpClient {
  private readonly client: AxiosInstance;

  constructor(config: SDKConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '@cregis-kit/openplatform-node',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        if (config.baseURL?.includes('debug')) {
          console.debug('[SDK Request]', config.method?.toUpperCase(), config.url);
        }
        return config;
      },
      (error) => {
        return Promise.reject(SDKError.networkError(error));
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.code === 'ECONNABORTED') {
          return Promise.reject(
            new SDKError(SDKErrorCode.HTTP_TIMEOUT, 'Request timeout', 408)
          );
        }

        if (!error.response) {
          return Promise.reject(SDKError.networkError(error));
        }

        const httpStatus = error.response.status;
        const responseData = error.response.data;

        // Handle API error response
        if (responseData && typeof responseData === 'object' && 'code' in responseData) {
          const apiResponse = responseData as ApiResponse;
          return Promise.reject(
            SDKError.fromApiResponse(
              apiResponse.code,
              apiResponse.message || 'Unknown error',
              httpStatus,
              apiResponse.traceId
            )
          );
        }

        // Handle HTTP error status
        let message = `HTTP ${httpStatus}`;
        switch (httpStatus) {
          case 400:
            message = 'Bad request';
            break;
          case 401:
            message = 'Unauthorized';
            break;
          case 403:
            message = 'Forbidden';
            break;
          case 404:
            message = 'Not found';
            break;
          case 429:
            message = 'Rate limit exceeded';
            break;
          case 500:
            message = 'Internal server error';
            break;
          case 502:
            message = 'Bad gateway';
            break;
          case 503:
            message = 'Service unavailable';
            break;
          case 504:
            message = 'Gateway timeout';
            break;
        }

        return Promise.reject(
          new SDKError(
            httpStatus >= 500 ? SDKErrorCode.API_SERVER_ERROR : SDKErrorCode.API_ERROR,
            message,
            httpStatus
          )
        );
      }
    );
  }

  /**
   * Send GET request
   */
  async get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return this.handleResponse(response);
  }

  /**
   * Send POST request
   */
  async post<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return this.handleResponse(response);
  }

  /**
   * Send PUT request
   */
  async put<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return this.handleResponse(response);
  }

  /**
   * Send DELETE request
   */
  async delete<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, { params });
    return this.handleResponse(response);
  }

  /**
   * Handle API response
   */
  private handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const { code, message, data } = response.data;

    if (code === 0 || code === 200) {
      if (data === undefined) {
        return response.data as unknown as T;
      }
      return data;
    }

    // Throw error for non-success responses
    throw SDKError.fromApiResponse(code, message, response.status, response.data.traceId);
  }

  /**
   * Get raw axios client for advanced use cases
   */
  getClient(): AxiosInstance {
    return this.client;
  }
}
