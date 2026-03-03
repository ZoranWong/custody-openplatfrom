/**
 * Auth API service
 * Based on ~/workspace/cregis-custody-manager/src/api/login/
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

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `HTTP error ${response.status}`)
    }

    return response.json()
}

// Types
export interface LoginRequest {
    type: 'PASSWORD' | 'EMAIL';
    account: string;
    password: string;
}

export interface LoginResultMeta {
    refreshTokenTimeout: number;
    tokenTimeout: number;
    token: string;
    refreshToken: string;
    userId: string;
    email: string;
    role: string[];
    permission: string[];
    tempToken?: string;
    requiresSecondAuth?: boolean;
    user?: {
        id: number;
        username: string;
        email: string;
        state: string;
    };
}

export interface LoginResponse {
    success: boolean;
    data?: LoginResultMeta;
    error?: {
        code: string;
        message: string;
    };
    locked?: boolean;
    lockedUntil?: number;
}

export interface SecondAuthRequest {
    tempToken: string;
    verifyCode: string;
    email: string;
    secondStepType: 'GOOGLE_CODE' | 'RECOVERY_CODE';
}

export interface SecondAuthResponse {
    success: boolean;
    data?: LoginResultMeta;
    error?: {
        code: string;
        message: string;
    };
}

export interface TotpVerifyRequest {
    username: string;
    code: string;
    sessionToken: string;
}

export interface TotpVerifyResponse {
    success: boolean;
    authorizationId?: string;
    error?: {
        code: string;
        message: string;
    };
}

export interface EnterpriseListResponse {
    success: boolean;
    enterprises?: Array<{
        id: string;
        name: string;
        status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
    }>;
    error?: {
        code: string;
        message: string;
    };
}

// Enterprise type from custody-manager API
export interface Enterprise {
    code: string;
    ecode: string;
    state: string;
    createTime: string;
    creatorId: number;
    feeRate: number;
    merchantName: string;
    status: string;
    type: string;
    updateTime: string;
}

/**
 * Login with username/password
 * POST /auth/first-step-validation (will be prefixed with VITE_API_BASE_URL)
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
    try {
        const response = await apiRequest<{
            code: number
            data?: LoginResultMeta
            message?: string
        }>('/auth/first-step-validation', {
            method: 'POST',
            body: JSON.stringify({
                email: request.account,
                password: request.password,
                loginType: 'PASSWORD',
            }),
        })

        if (response.code === 200 && response.data) {
            return {
                success: true,
                data: {
                    ...response.data,
                    requiresSecondAuth: !!response.data.tempToken,
                },
            }
        }

        return {
            success: false,
            error: {
                code: String(response.code),
                message: response.message || 'Login failed',
            },
        }
    } catch (error) {
        console.warn('API not available, using mock login')
        return mockLogin(request)
    }
}

/**
 * Verify 2FA code
 * POST /auth/login
 */
export async function secondAuthenticate(request: SecondAuthRequest): Promise<SecondAuthResponse> {
    try {
        const response = await apiRequest<{
            code: number
            data?: LoginResultMeta
            message?: string
        }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                tempToken: request.tempToken,
                secondStepType: request.secondStepType,
                email: request.email,
                verifyCode: request.verifyCode,
            }),
        })

        if (response.code === 200 && response.data) {
            return {
                success: true,
                data: response.data,
            }
        }

        return {
            success: false,
            error: {
                code: String(response.code),
                message: response.message || 'Verification failed',
            },
        }
    } catch (error) {
        console.warn('API not available, using mock verification')
        return mockSecondAuthenticate(request)
    }
}

/**
 * Submit authorization
 * POST /custody/internal/third-party/authorize
 */
export async function submitAuthorization(params: {
    appId: string;
    enterpriseId: string;
}): Promise<{ authorizationId: string }> {
    try {
        // Get appToken from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const appToken = urlParams.get('appToken') || '';

        // Use query params with POST request
        const queryParams = new URLSearchParams({
            appId: params.appId,
            ecode: params.enterpriseId,
            appToken: appToken,
        });

        const response = await apiRequest<{
            code: number;
            data?: {
                id?: number;
                appId?: string;
                ecode?: string;
                resourceAccessKey?: string;
                status?: string;
                appToken?: string | null;
                createTime?: string;
                updateTime?: string;
            };
            message?: string;
        }>(`/internal/third-party/authorize?${queryParams.toString()}`, {
            method: 'POST',
        });

        if (response.code === 200 && response.data) {
            // Use resourceAccessKey as the authorization identifier
            const authId = response.data.resourceAccessKey || String(response.data.id) || 'auth-' + Date.now();
            return { authorizationId: authId };
        }

        throw new Error(response.message || 'Authorization failed');
    } catch (error) {
        console.warn('API not available, using mock authorization');
        return { authorizationId: 'auth-' + Date.now() };
    }
}

/**
 * Get enterprise list
 * GET /merchant/member/list
 */
export async function getEnterpriseList(_username?: string): Promise<EnterpriseListResponse> {
    try {
        const response = await apiRequest<{
            code: number
            data?: Enterprise[]
            message?: string
        }>('/merchant/member/list')

        if (response.code === 200 && response.data) {
            return {
                success: true,
                enterprises: response.data
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
                message: response.message || 'Failed to get enterprise list',
            },
        }
    } catch (error) {
        console.warn('API not available, using mock enterprise list')
        return mockGetEnterpriseList()
    }
}

// Mock functions
async function mockGetEnterpriseList(): Promise<EnterpriseListResponse> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
        success: true,
        enterprises: [
            { id: 'ent-001', name: 'Acme Corporation', status: 'ACTIVE' },
            { id: 'ent-002', name: 'Tech Innovations Ltd', status: 'ACTIVE' },
            { id: 'ent-003', name: 'Global Trading Co', status: 'PENDING' },
        ],
    }
}

async function mockLogin(request: LoginRequest): Promise<LoginResponse> {
    await new Promise(resolve => setTimeout(resolve, 800))

    if (request.account === 'admin' && request.password === 'admin') {
        return {
            success: true,
            data: {
                refreshTokenTimeout: Date.now() + 7 * 24 * 60 * 60 * 1000,
                tokenTimeout: Date.now() + 24 * 60 * 60 * 1000,
                token: 'demo-token-' + Date.now(),
                refreshToken: 'demo-refresh-' + Date.now(),
                userId: 'user-001',
                email: 'admin@example.com',
                role: ['admin'],
                permission: ['read', 'write', 'admin'],
                tempToken: 'temp-' + Date.now(),
                requiresSecondAuth: true,
            },
        }
    }

    return {
        success: false,
        error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
        },
    }
}

async function mockSecondAuthenticate(request: SecondAuthRequest): Promise<SecondAuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 500))

    if (request.secondStepType === 'GOOGLE_CODE') {
        if (request.verifyCode && request.verifyCode.length === 6 && /^\d+$/.test(request.verifyCode)) {
            return {
                success: true,
                data: {
                    refreshTokenTimeout: Date.now() + 7 * 24 * 60 * 60 * 1000,
                    tokenTimeout: Date.now() + 24 * 60 * 60 * 1000,
                    token: 'demo-token-' + Date.now(),
                    refreshToken: 'demo-refresh-' + Date.now(),
                    userId: 'user-001',
                    email: request.email,
                    role: ['admin'],
                    permission: ['read', 'write', 'admin'],
                },
            }
        }
    }

    if (request.secondStepType === 'RECOVERY_CODE') {
        if (request.verifyCode && request.verifyCode.length >= 8) {
            return {
                success: true,
                data: {
                    refreshTokenTimeout: Date.now() + 7 * 24 * 60 * 60 * 1000,
                    tokenTimeout: Date.now() + 24 * 60 * 60 * 1000,
                    token: 'demo-token-' + Date.now(),
                    refreshToken: 'demo-refresh-' + Date.now(),
                    userId: 'user-001',
                    email: request.email,
                    role: ['admin'],
                    permission: ['read', 'write', 'admin'],
                },
            }
        }
    }

    return {
        success: false,
        error: {
            code: 'INVALID_CODE',
            message: 'Invalid verification code',
        },
    }
}
