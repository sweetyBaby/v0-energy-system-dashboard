const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  return res.json()
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),

  put: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: "DELETE", ...options }),
}

export { BASE_URL }
