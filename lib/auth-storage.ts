const AUTH_TOKEN_STORAGE_KEY = "enercloud.auth.token"
const AUTH_USERNAME_STORAGE_KEY = "enercloud.auth.username"

function isBrowser() {
  return typeof window !== "undefined"
}

function normalizeToken(token: string) {
  return token.trim()
}

function normalizeUsername(username: string) {
  return username.trim()
}

function decodeJwtPayload(token: string) {
  const rawToken = token.startsWith("Bearer ") ? token.slice(7) : token
  const parts = rawToken.split(".")
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
    const decoded = window.atob(padded)
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

function getUsernameFromToken(token: string | null) {
  if (!token) return null

  const payload = decodeJwtPayload(token)
  if (!payload) return null

  const candidateKeys = ["username", "user_name", "preferred_username", "account", "loginName", "name", "sub"]
  for (const key of candidateKeys) {
    const value = payload[key]
    if (typeof value === "string" && normalizeUsername(value)) {
      return normalizeUsername(value)
    }
  }

  return null
}

export function getStoredAuthToken() {
  if (!isBrowser()) return null

  return (
    window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ||
    window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  )
}

export function getAuthHeaderValue() {
  const token = getStoredAuthToken()
  if (!token) return null

  return token.startsWith("Bearer ") ? token : `Bearer ${token}`
}

export function persistAuthToken(token: string, remember: boolean) {
  if (!isBrowser()) return

  const normalizedToken = normalizeToken(token)
  if (!normalizedToken) return

  const primaryStorage = remember ? window.localStorage : window.sessionStorage
  const secondaryStorage = remember ? window.sessionStorage : window.localStorage

  primaryStorage.setItem(AUTH_TOKEN_STORAGE_KEY, normalizedToken)
  secondaryStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export function getStoredAuthUsername() {
  if (!isBrowser()) return null

  const storedUsername =
    window.localStorage.getItem(AUTH_USERNAME_STORAGE_KEY) ||
    window.sessionStorage.getItem(AUTH_USERNAME_STORAGE_KEY)
  if (storedUsername) return storedUsername

  const derivedUsername = getUsernameFromToken(getStoredAuthToken())
  if (derivedUsername) {
    const tokenInLocalStorage = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    persistAuthUsername(derivedUsername, Boolean(tokenInLocalStorage))
    return derivedUsername
  }

  return null
}

export function persistAuthUsername(username: string, remember: boolean) {
  if (!isBrowser()) return

  const normalizedUsername = normalizeUsername(username)
  if (!normalizedUsername) return

  const primaryStorage = remember ? window.localStorage : window.sessionStorage
  const secondaryStorage = remember ? window.sessionStorage : window.localStorage

  primaryStorage.setItem(AUTH_USERNAME_STORAGE_KEY, normalizedUsername)
  secondaryStorage.removeItem(AUTH_USERNAME_STORAGE_KEY)
}

export function clearStoredAuthUsername() {
  if (!isBrowser()) return

  window.localStorage.removeItem(AUTH_USERNAME_STORAGE_KEY)
  window.sessionStorage.removeItem(AUTH_USERNAME_STORAGE_KEY)
}

export function clearStoredAuthToken() {
  if (!isBrowser()) return

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}
