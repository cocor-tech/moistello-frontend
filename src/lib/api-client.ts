import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"
import { API_BASE_URL } from "./constants"
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./auth/token-store"

function getCsrfToken(): string {
  if (typeof document === "undefined") return ""
  const meta = document.querySelector('meta[name="csrf-token"]')
  const metaContent = meta?.getAttribute("content")
  if (metaContent) return metaContent

  // Fallback: derive from auth token if meta tag hasn't been populated yet
  const token = getAccessToken()
  if (!token) return ""
  return token.slice(-32)
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

let refreshInFlight: Promise<string> | null = null

/**
 * Mints a new access token.
 *
 * The refresh token is held in an `HttpOnly` cookie that only this app's own
 * origin receives, so the exchange is delegated to /api/auth/refresh, which
 * reads the cookie server-side. Nothing here ever sees the refresh token; the
 * access token that comes back is held in memory for the life of the tab.
 */
async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    try {
      const response = await axios.post("/api/auth/refresh")

      const newToken = response.data?.token
      if (!newToken) {
        throw new Error("No token in refresh response")
      }

      setAccessToken(newToken)
      return newToken
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const method = config.method?.toLowerCase()
    if (method && ["post", "put", "patch", "delete"].includes(method)) {
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken
      }
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const newToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          clearAccessToken()
          // The session cookies are HttpOnly, so only the server can drop
          // them. Wait for that before leaving, otherwise the middleware may
          // still see a stale cookie and bounce us straight back in.
          try {
            await axios.delete("/api/auth/session")
          } catch (e) {
            console.warn("[api] Failed to clear session on refresh failure:", e)
          }
          window.location.href = "/login"
        }
        return Promise.reject(refreshError)
      }
    }

    if (typeof console !== "undefined") {
      const message = getErrorMessage(error)
      if (error.response?.status) {
        console.error(`[API ${error.response.status}] ${message}`)
      }
    }

    return Promise.reject(error)
  }
)

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    if (data?.error) return data.error
    if (data?.message) return data.message
    if (typeof data === "string") return data

    switch (error.response?.status) {
      case 400:
        return "Invalid request. Please check your inputs."
      case 401:
        return "Authentication required. Please log in."
      case 403:
        return "You do not have permission to perform this action."
      case 404:
        return "The requested resource was not found."
      case 409:
        return "A conflict occurred. The resource may already exist."
      case 422:
        return "Validation failed. Please check your inputs."
      case 429:
        return "Too many requests. Please try again later."
      case 500:
        return "Internal server error. Please try again later."
      default:
        return error.message || "An unexpected error occurred."
    }
  }

  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "An unexpected error occurred."
}

export async function get<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.get<T>(url, config)
  return response.data
}

export async function post<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.post<T>(url, data, config)
  return response.data
}

export async function put<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.put<T>(url, data, config)
  return response.data
}

export async function patch<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.patch<T>(url, data, config)
  return response.data
}

export async function del<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.delete<T>(url, config)
  return response.data
}

export { apiClient }
export default apiClient
