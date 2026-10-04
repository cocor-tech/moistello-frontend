import { logger } from "@/lib/logger"
import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"
import { API_BASE_URL } from "./constants"
import { getCsrfHeaders, getCsrfToken } from "./auth/csrf"
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./auth/token-store"

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

function isSameOriginApiRequest(config: InternalAxiosRequestConfig): boolean {
  if (typeof window === "undefined") return false;
  try {
    const base = new URL(config.baseURL || API_BASE_URL, window.location.origin);
    const requestUrl = new URL(config.url || "", base);
    const isApiPath =
      requestUrl.pathname.startsWith("/api/") || base.pathname.startsWith("/api/");
    return requestUrl.origin === window.location.origin && isApiPath;
  } catch {
    return false;
  }
}

let refreshInFlight: Promise<string> | null = null

/**
* Resets in-memory client auth state and clears any in-flight refresh promise.
 */
export function clearApiClientState(): void {
  refreshInFlight = null
  clearAccessToken()
}

/**
 * Latches the sign-out side effects so a burst of concurrent 401s produces one
 * sign-out rather than one per request.
 *
 * Without this, a page that fires six requests at once and has an expired token
 * issues six `DELETE /api/auth/session` round trips, dispatches six
 * `auth:required` events, and attempts six navigations. It does not loop — the
 * `_retry` marker bounds each request to one attempt — but it is enough
 * duplicate work to fill the network panel during exactly the moment a user is
 * being signed out.
 *
 * Deliberately never reset: the tab is navigating to /login, and if the user
 * does come back the module is re-initialised on the next full page load.
 */
let signOutInFlight = false

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

  const initialToken = getAccessToken()

  refreshInFlight = (async () => {
    try {
      const response = await axios.post("/api/auth/refresh", undefined, {
        headers: getCsrfHeaders(),
      })

      const newToken = response.data?.token
      if (!newToken) {
        throw new Error("No token in refresh response")
      }

      if (getAccessToken() === initialToken || getAccessToken() === null) {
        setAccessToken(newToken)
      }
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
    if (
      method &&
      ["post", "put", "patch", "delete"].includes(method) &&
      isSameOriginApiRequest(config)
    ) {
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
        if (typeof window !== "undefined" && !signOutInFlight) {
          signOutInFlight = true
          clearAccessToken()
          // The session cookies are HttpOnly, so only the server can drop
          // them. Wait for that before leaving, otherwise the middleware may
          // still see a stale cookie and bounce us straight back in.
          try {
            await axios.delete("/api/auth/session", { headers: getCsrfHeaders() })
          } catch (e) {
            logger.warn("[api] Failed to clear session on refresh failure:", e)
          }
          window.dispatchEvent(new CustomEvent("auth:required"))
          window.location.href = "/login"
        }
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status) {
      logger.error("API request failed", { status: error.response.status })
    }

    // Attach request ID from response headers to error for display in toasts
    const requestId = error.response?.headers?.['x-request-id'] as string | undefined
    if (requestId) {
      ;(error as any).requestId = requestId
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
