/**
 * Cregis OpenPlatform SDK - Authentication Service
 *
 * Implements OAuth endpoints from thirdparty-integration-guide.md:
 * - POST /api/thirdparty/oauth/authorizeUrl - 获取授权 URL
 * - POST /api/thirdparty/oauth/verify - 验证授权并存储
 */

import { SDKConfig, OAuthToken } from '../types';
import { HttpClient } from '../core/http';
import {
  generateNonce,
  getTimestamp,
  buildBasicInfo,
  BasicSignatureParams,
} from '../core/signature';

/**
 * Authorization Info
 */
export interface Authorization {
  authorizationId: string;
  resourceKey: string;
  permissions: string[];
  status: 'active' | 'expired';
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
}

/**
 * Token Manager for handling OAuth tokens
 */
export class TokenManager {
  private accessToken?: string;
  private refreshToken?: string;
  private expiresAt?: number;
  private onTokenRefreshed?: (token: OAuthToken) => void;

  constructor(onTokenRefreshed?: (token: OAuthToken) => void) {
    this.onTokenRefreshed = onTokenRefreshed;
  }

  setTokens(token: OAuthToken): void {
    this.accessToken = token.accessToken;
    this.refreshToken = token.refreshToken;
    this.expiresAt = Date.now() + token.expiresIn * 1000;
    this.onTokenRefreshed?.(token);
  }

  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  getRefreshToken(): string | undefined {
    return this.refreshToken;
  }

  isExpired(): boolean {
    if (!this.expiresAt) {
      return true;
    }
    return Date.now() >= this.expiresAt - 60000;
  }

  hasToken(): boolean {
    return !!this.accessToken;
  }

  clear(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.expiresAt = undefined;
  }
}

/**
 * Authorization Manager
 */
export class AuthorizationManager {
  private authorizations: Map<string, Authorization> = new Map();

  setAuthorization(auth: Authorization): void {
    this.authorizations.set(auth.authorizationId, auth);
  }

  getAuthorization(authorizationId: string): Authorization | undefined {
    return this.authorizations.get(authorizationId);
  }

  getFirstAuthorization(): Authorization | undefined {
    for (const auth of this.authorizations.values()) {
      if (auth.status === 'active') {
        return auth;
      }
    }
    return undefined;
  }

  clear(): void {
    this.authorizations.clear();
  }
}

/**
 * Authentication Service
 */
export class AuthService {
  private readonly http: HttpClient;
  private readonly config: SDKConfig;
  private readonly tokenManager: TokenManager;
  private readonly authorizationManager: AuthorizationManager;

  constructor(http: HttpClient, config: SDKConfig) {
    this.http = http;
    this.config = config;
    this.tokenManager = new TokenManager();
    this.authorizationManager = new AuthorizationManager();
  }

  getTokenManager(): TokenManager {
    return this.tokenManager;
  }

  getAuthorizationManager(): AuthorizationManager {
    return this.authorizationManager;
  }

  /**
   * Get authorization URL for OAuth flow
   * POST /api/thirdparty/oauth/authorizeUrl
   */
  async getAuthorizationUrl(params: {
    permissions: string[];
    redirectUri: string;
    state: string;
  }): Promise<{
    authorizeUrl: string;
    expiresIn: number;
  }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();

    const business = {
      permissions: params.permissions,
      redirectUri: params.redirectUri,
      state: params.state,
    };

    const signatureParams: BasicSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      timestamp,
      nonce,
      business,
    };

    const basic = buildBasicInfo(signatureParams);

    const response = await this.http.post<{
      authorizeUrl: string;
      expiresIn: number;
    }>('/api/thirdparty/oauth/authorizeUrl', {
      basic,
      business,
    });

    return response;
  }

  /**
   * Verify OAuth token and store authorization
   * POST /api/thirdparty/oauth/verify
   */
  async verifyOAuthToken(oauthToken: string): Promise<{
    authorizeId: string;
  }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();

    const params: BasicSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      timestamp,
      nonce,
      business: { oauthToken },
    };

    const basic = buildBasicInfo(params);

    const response = await this.http.post<{
      authorizeId: string;
    }>('/api/thirdparty/oauth/verify', {
      basic,
      business: { oauthToken },
    });

    return response;
  }

  /**
   * Store authorization info locally
   */
  storeAuthorization(auth: Authorization): void {
    this.authorizationManager.setAuthorization(auth);
  }

  /**
   * Get authorization by ID
   */
  getAuthorization(authorizationId: string): Authorization | undefined {
    return this.authorizationManager.getAuthorization(authorizationId);
  }

  /**
   * Get first active authorization
   */
  getFirstAuthorization(): Authorization | undefined {
    return this.authorizationManager.getFirstAuthorization();
  }
}
