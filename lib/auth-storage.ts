const AUTH_TOKEN_STORAGE_KEY = "enercloud.auth.token"

function isBrowser() {
  return typeof window !== "undefined"
}

function normalizeToken(token: string) {
  return token.trim()
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

export function clearStoredAuthToken() {
  if (!isBrowser()) return

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}
