const TOKEN_KEY = 'auth_token'
const TOKEN_EXPIRY_KEY = 'auth_token_expiry'
const USER_INFO_KEY = 'auth_user_info'

export interface StoredUserInfo {
  userId: string
  email: string
  username: string
  role: string[]
  permission: string[]
}

export function setToken(token: string, expiresIn: number): void {
  const expiryTime = Date.now() + expiresIn
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime))
}

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY)

  if (!token || !expiryStr) {
    return null
  }

  const expiryTime = parseInt(expiryStr, 10)
  if (Date.now() > expiryTime) {
    // Token expired, clear storage
    clearToken()
    return null
  }

  return token
}

export function setUserInfo(info: StoredUserInfo): void {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(info))
}

export function getUserInfo(): StoredUserInfo | null {
  const infoStr = localStorage.getItem(USER_INFO_KEY)
  if (!infoStr) {
    return null
  }
  try {
    return JSON.parse(infoStr)
  } catch {
    return null
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}

export function isTokenValid(): boolean {
  const token = getToken()
  return token !== null
}
