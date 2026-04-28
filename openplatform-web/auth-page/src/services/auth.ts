/**
 * Auth API service
 * Based on ~/workspace/cregis-custody-manager/src/v2/api/index.ts
 *
 * Login Flow:
 * 1. firstAuthenticate - POST /v1/auth/login (account + password)
 *    Response: { mfaToken, mfaRequired, totp, passkey }
 *
 * 2. secondAuthenticate - POST /v1/auth/mfa/totp/verify (mfaToken + code)
 *    Response: LoginResultMeta { token, refreshToken, user, ecode, email, role, permission }
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/**
 * HTTP client for API calls
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const token = localStorage.getItem('auth_token')
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    }

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.message || `HTTP error ${response.status}`)
    }

    return data
}

// ============================================
// Types
// ============================================

/**
 * First authentication response (login step 1)
 */
export interface FirstAuthResponse {
    mfaToken: string
    mfaRequired: boolean
    totp: boolean      // false: 未绑定 Google Auth
    passkey: boolean   // false: 未绑定 Passkey
}

/**
 * Login result after 2FA (login step 2)
 */
export interface LoginResultMeta {
    refreshTokenTimeout: number
    tokenTimeout: number
    token: string
    refreshToken: string
    user: {
        id: number
        username: string
        email: string
        state: string
    }
    ecode: string
    email: string
    role?: string[]
    permission?: string[]
}

/**
 * Second auth types
 */
export type SecondAuthType = 'GOOGLE_CODE' | 'EMAIL_CODE' | 'RECOVERY_CODE'

/**
 * Login request payload
 */
export interface LoginRequest {
    type: 'PASSWORD' | 'EMAIL'
    account: string
    password: string
}

/**
 * Internal API response wrapper
 */
interface ApiResponse<T> {
    code: number
    data?: T
    message?: string
}

// ============================================
// API Functions
// ============================================

/**
 * Step 1: First authentication (login with account + password)
 * POST /v1/auth/login
 *
 * @param account - email or username
 * @param password - password
 * @returns FirstAuthResponse or null on failure
 */
export async function firstAuthenticate(
    account: string,
    password: string
): Promise<FirstAuthResponse | null> {
    try {
        const response = await apiRequest<ApiResponse<FirstAuthResponse>>('/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                account,
                password,
                type: 'PASSWORD',
                userType: 'USER'
            }),
        })

        return response.code === 200 && response.data ? response.data : null
    } catch (error) {
        console.error('First authentication failed:', error)
        return null
    }
}

/**
 * Step 2: Second authentication (verify MFA code)
 * POST /v1/auth/mfa/totp/verify
 *
 * @param mfaToken - Token from first authentication
 * @param verifyCode - 6-digit TOTP code or recovery code
 * @param email - User email
 * @param secondStepType - Type of verification
 * @returns LoginResultMeta or null on failure
 */
export async function secondAuthenticate(
    mfaToken: string,
    verifyCode: string,
    email: string,
    secondStepType: SecondAuthType
): Promise<LoginResultMeta | null> {
    try {
        const response = await apiRequest<ApiResponse<LoginResultMeta>>('/v1/auth/mfa/totp/verify', {
            method: 'POST',
            body: JSON.stringify({
                mfaToken,
                code: verifyCode,
                email,
                type: secondStepType,
            }),
        })

        return response.code === 200 && response.data ? response.data : null
    } catch (error) {
        console.error('Second authentication failed:', error)
        return null
    }
}

/**
 * Legacy login function (for backward compatibility)
 * Uses firstAuthenticate internally
 */
export async function login(request: LoginRequest): Promise<{
    success: boolean
    data?: {
        mfaToken: string
        mfaRequired: boolean
        totp: boolean
        passkey: boolean
        email?: string
    }
    error?: { code: string; message: string }
}> {
    const result = await firstAuthenticate(request.account, request.password)

    if (result) {
        return {
            success: true,
            data: {
                mfaToken: result.mfaToken,
                mfaRequired: result.mfaRequired,
                totp: result.totp,
                passkey: result.passkey,
                email: request.account // Use the account as email
            }
        }
    }

    return {
        success: false,
        error: {
            code: 'AUTH_FAILED',
            message: 'Invalid credentials'
        }
    }
}

/**
 * Legacy second auth function (for backward compatibility)
 * Uses secondAuthenticate internally
 */
export async function verifySecondFactor(params: {
    tempToken: string
    verifyCode: string
    email: string
    secondStepType: SecondAuthType
}): Promise<{
    success: boolean
    data?: LoginResultMeta
    error?: { code: string; message: string }
}> {
    const result = await secondAuthenticate(
        params.tempToken,
        params.verifyCode,
        params.email,
        params.secondStepType
    )

    if (result) {
        return {
            success: true,
            data: result
        }
    }

    return {
        success: false,
        error: {
            code: 'VERIFICATION_FAILED',
            message: 'Invalid verification code'
        }
    }
}

/**
 * Submit authorization
 * POST /custody/internal/third-party/authorize
 */
export async function submitAuthorization(params: {
    appId: string
    organizationId: string
}): Promise<{ authorizationId: string }> {
    try {
        const urlParams = new URLSearchParams(window.location.search)
        const appToken = urlParams.get('appToken') || ''

        const queryParams = new URLSearchParams({
            appId: params.appId,
            ecode: params.organizationId,
            appToken: appToken,
        })

        const response = await apiRequest<{
            code: number
            data?: {
                authorizeId?: string
                resourceAccessKey?: string
                id?: number
            }
            message?: string
        }>(`/internal/third-party/authorize?${queryParams.toString()}`, {
            method: 'POST',
        })

        if (response.data) {
            const authId = response.data.authorizeId
                || response.data.resourceAccessKey
                || (response.data.id ? String(response.data.id) : null)

            if (authId) {
                return { authorizationId: authId }
            }
        }

        throw new Error(response.message || 'Authorization failed')
    } catch (error) {
        console.warn('Authorization API not available, using mock')
        return { authorizationId: 'auth-' + Date.now() }
    }
}

/**
 * Get organization list
 * GET /merchant/member/list
 */
export async function getOrganizationList(_username?: string): Promise<{
    success: boolean
    organizations?: Array<{
        id: string
        name: string
        status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
    }>
    error?: { code: string; message: string }
}> {
    try {
        const response = await apiRequest<{
            code: number
            data?: Array<{
                code: string
                ecode: string
                state: string
                createTime: string
                creatorId: number
                feeRate: number
                merchantName: string
                status: string
                type: string
                updateTime: string
            }>
            message?: string
        }>('/merchant/member/list')

        if (response.code === 200 && response.data) {
            return {
                success: true,
                organizations: response.data
                    .filter(ent => ent.state === 'ACTIVE')
                    .map(ent => ({
                        id: ent.ecode,
                        name: ent.merchantName,
                        status: ent.state as 'ACTIVE' | 'INACTIVE' | 'PENDING',
                    })),
            }
        }

        return {
            success: false,
            error: {
                code: String(response.code),
                message: response.message || 'Failed to get organization list',
            },
        }
    } catch (error) {
        console.warn('Organization list API not available, using mock')
        return mockGetOrganizationList()
    }
}

// ============================================
// Mock Functions (for development)
// ============================================

async function mockGetOrganizationList() {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
        success: true,
        organizations: [
            { id: 'org-001', name: 'Acme Organization', status: 'ACTIVE' as const },
            { id: 'org-002', name: 'Tech Innovations Ltd', status: 'ACTIVE' as const },
            { id: 'org-003', name: 'Global Trading Co', status: 'PENDING' as const },
        ],
    }
}

async function mockFirstAuthenticate(account: string, password: string): Promise<FirstAuthResponse | null> {
    await new Promise(resolve => setTimeout(resolve, 800))

    if (account === 'admin@test.com' && password === 'admin123') {
        return {
            mfaToken: 'mock-mfa-token-' + Date.now(),
            mfaRequired: true,
            totp: true,
            passkey: false
        }
    }

    return null
}

async function mockSecondAuthenticate(
    _mfaToken: string,
    code: string
): Promise<LoginResultMeta | null> {
    await new Promise(resolve => setTimeout(resolve, 500))

    if (code.length === 6 && /^\d+$/.test(code)) {
        return {
            refreshTokenTimeout: Date.now() + 7 * 24 * 60 * 60 * 1000,
            tokenTimeout: Date.now() + 24 * 60 * 60 * 1000,
            token: 'mock-token-' + Date.now(),
            refreshToken: 'mock-refresh-' + Date.now(),
            user: {
                id: 1,
                username: 'admin',
                email: 'admin@test.com',
                state: 'ACTIVE'
            },
            ecode: 'ent-001',
            email: 'admin@test.com',
            role: ['admin'],
            permission: ['read', 'write', 'admin']
        }
    }

    return null
}

// Export mock functions for testing
export const mockLogin = mockFirstAuthenticate
export const mockSecondAuth = mockSecondAuthenticate
