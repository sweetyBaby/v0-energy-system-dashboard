import { getAuthHeaderValue } from "@/lib/auth-storage"

const SERVER_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8080"

const BASE_URL = typeof window === "undefined" ? SERVER_BASE_URL : "/api/proxy"

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface ApiRequestOptions extends RequestInit {
  includeAuth?: boolean
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

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  return res.json()
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
