/**
 * Authorization page types
 */

export interface AuthInitData {
  appId: string;
  appToken: string;
  appName?: string;
  appLogoUrl?: string;
  permissions?: string[];
  redirectUri?: string;
  state?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  requiresTotp?: boolean;
  error?: {
    code: string;
    message: string;
  };
  locked?: boolean;
  lockedUntil?: number;
}

export interface TotpCredentials {
  code: string;
}

export interface TotpResponse {
  success: boolean;
  authorizationId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export type AuthView = 'loading' | 'login' | 'totp' | 'enterprise' | 'authorize' | 'success' | 'error';

export interface AuthState {
  username: string;
  sessionToken?: string;
  failedAttempts: number;
  lockedUntil?: number;
}

export interface Enterprise {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

export interface EnterpriseListResponse {
  success: boolean;
  enterprises?: Enterprise[];
  error?: {
    code: string;
    message: string;
  };
}
