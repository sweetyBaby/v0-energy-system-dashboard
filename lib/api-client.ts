import { clearStoredAuthToken, getAuthHeaderValue } from "@/lib/auth-storage"

const SERVER_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8080"

const BASE_URL = typeof window === "undefined" ? SERVER_BASE_URL : "/api/proxy"
export const AUTH_EXPIRED_EVENT = "enercloud:auth-expired"
export const AUTH_EXPIRED_MESSAGE = "认证信息无效，请重新登录"

let authExpiredDispatched = false

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface ApiRequestOptions extends RequestInit {
  includeAuth?: boolean
}

function isObjectPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getPayloadCode(payload: unknown) {
  if (!isObjectPayload(payload) || payload.code === undefined || payload.code === null) {
    return null
  }

  const numericCode = Number(payload.code)
  return Number.isNaN(numericCode) ? null : numericCode
}

function getPayloadMessage(payload: unknown) {
  if (!isObjectPayload(payload)) return null

  const message =
    typeof payload.msg === "string"
      ? payload.msg
      : typeof payload.message === "string"
        ? payload.message
        : null

  return message?.trim() || null
}

function triggerAuthExpired(message = AUTH_EXPIRED_MESSAGE) {
  if (typeof window === "undefined" || authExpiredDispatched) return

  authExpiredDispatched = true
  clearStoredAuthToken()
  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { message },
    })
  )

  window.setTimeout(() => {
    authExpiredDispatched = false
  }, 3000)
}

async function requestRaw<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const normalizedBase = BASE_URL.endsWith("/")
    ? BASE_URL.slice(0, -1)
    : BASE_URL
  const url = `${normalizedBase}${normalizedPath}`
  const { includeAuth = true, ...requestOptions } = options
  const authHeaderValue = includeAuth ? getAuthHeaderValue() : null

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(authHeaderValue ? { Authorization: authHeaderValue } : {}),
      ...requestOptions.headers,
    },
    ...requestOptions,
  })

  const payload =
    res.status === 204
      ? null
      : await res.json().catch(() => null)
  const payloadCode = getPayloadCode(payload)

  if (includeAuth && (res.status === 401 || payloadCode === 401)) {
    triggerAuthExpired(AUTH_EXPIRED_MESSAGE)
    if (typeof window !== "undefined") {
      return new Promise<T>(() => {
        // Keep callers pending while the auth-expired handler shows a toast and redirects.
      })
    }

    throw new Error(AUTH_EXPIRED_MESSAGE)
  }

  if (!res.ok) {
    throw new Error(getPayloadMessage(payload) || `HTTP ${res.status}: ${res.statusText}`)
  }

  return payload as T
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  return requestRaw<ApiResponse<T>>(path, options)
}

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>(path, { method: "GET", ...options }),

  getRaw: <T>(path: string, options?: ApiRequestOptions) =>
    requestRaw<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),

  postRaw: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    requestRaw<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),

  put: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>(path, { method: "DELETE", ...options }),
}

export { BASE_URL }
